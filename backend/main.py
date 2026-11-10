from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pypdf import PdfReader
import chromadb
import requests
import os
import io
import json
import re
import time

app = FastAPI(title="Local AI Workspace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

chroma_client = chromadb.PersistentClient(path="./chroma_db")

class MessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    notebook_id: str = ""
    history: list[MessageItem] = []
    model: str = DEFAULT_MODEL
    mode: str = "study"  # "study" per spiegazioni, "exam" per interrogazione

class RenameNotebookRequest(BaseModel):
    new_name: str

def clean_collection_name(name: str) -> str:
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name.lower())
    safe_name = re.sub(r'^[^a-zA-Z0-9]+', '', safe_name)
    safe_name = safe_name[:50]
    return f"nb_{safe_name}"

def create_chunks(text: str, chunk_size: int = 600, overlap: int = 100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend Local AI Workspace attivo!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "FastAPI Backend"}

@app.get("/api/notebooks")
def get_notebooks():
    try:
        collections = chroma_client.list_collections()
        notebooks = []
        for col in collections:
            col_name = col.name if hasattr(col, "name") else str(col)
            if not col_name.startswith("nb_"):
                continue
            
            c_obj = chroma_client.get_collection(col_name)
            cnt = c_obj.count()
            
            # Recupera il nome personalizzato dai metadata se esiste
            meta = c_obj.metadata or {}
            custom_name = meta.get("display_name")
            display_name = custom_name if custom_name else col_name.replace("nb_", "").replace("_", " ").strip().title()
            
            filenames = []
            if cnt > 0:
                res = c_obj.get(include=["metadatas"])
                metas = res.get("metadatas", [])
                for m in metas:
                    if m and "filename" in m and m["filename"] not in filenames:
                        filenames.append(m["filename"])
            
            notebooks.append({
                "id": col_name,
                "name": display_name,
                "filenames": filenames,
                "total_chunks": cnt
            })
        return notebooks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero notebook: {str(e)}")

@app.put("/api/notebooks/{notebook_id}/rename")
def rename_notebook(notebook_id: str, req: RenameNotebookRequest):
    try:
        if not req.new_name.strip():
            raise HTTPException(status_code=400, detail="Il nome non può essere vuoto.")
        
        col = chroma_client.get_collection(notebook_id)
        current_meta = col.metadata or {}
        current_meta["display_name"] = req.new_name.strip()
        col.modify(metadata=current_meta)
        
        return {"id": notebook_id, "name": req.new_name.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore rinomina: {str(e)}")

@app.delete("/api/notebooks/{notebook_id}")
def delete_notebook(notebook_id: str):
    try:
        chroma_client.delete_collection(notebook_id)
        return {"message": f"Notebook {notebook_id} eliminato."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore eliminazione: {str(e)}")

@app.delete("/api/notebooks/{notebook_id}/files/{filename}")
def delete_file_from_notebook(notebook_id: str, filename: str):
    try:
        col = chroma_client.get_collection(notebook_id)
        col.delete(where={"filename": filename})
        if col.count() == 0:
            chroma_client.delete_collection(notebook_id)
        return {"message": f"File {filename} rimosso con successo."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore rimozione file: {str(e)}")

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    notebook_id: str = Form(None)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sono supportati solo i file PDF.")
    
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        documents = []
        metadatas = []
        
        for page_idx, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            if text:
                page_chunks = create_chunks(text)
                for chunk in page_chunks:
                    documents.append(chunk)
                    metadatas.append({
                        "filename": file.filename,
                        "page": page_idx
                    })
        
        if notebook_id and notebook_id.strip():
            collection_id = notebook_id
            collection = chroma_client.get_collection(collection_id)
        else:
            base_name = os.path.splitext(file.filename)[0]
            collection_id = clean_collection_name(base_name)
            display_title = base_name.replace("_", " ").replace("-", " ").title()
            collection = chroma_client.get_or_create_collection(
                name=collection_id,
                metadata={"display_name": display_title}
            )
        
        file_tag = clean_collection_name(os.path.splitext(file.filename)[0])
        ts = int(time.time())
        ids = [f"{file_tag}_{ts}_{i}" for i in range(len(documents))]
        
        collection.add(documents=documents, ids=ids, metadatas=metadatas)

        return {
            "id": collection_id,
            "filename": file.filename,
            "total_pages": len(reader.pages),
            "added_chunks": len(documents),
            "total_notebook_chunks": collection.count()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore indicizzazione: {str(e)}")

@app.post("/api/chat")
def chat_with_llm(request: ChatRequest):
    context_chunks = []
    msg_lower = request.message.lower()
    
    if request.notebook_id:
        try:
            col = chroma_client.get_collection(request.notebook_id)
            if col.count() > 0:
                if any(w in msg_lower for w in ["riassunto", "sintesi", "di cosa parla", "panoramica", "spiegamelo"]):
                    results = col.get(limit=min(4, col.count()), include=["documents", "metadatas"])
                    retrieved_docs = results.get("documents", [])
                    metadatas = results.get("metadatas", [])
                else:
                    results = col.query(
                        query_texts=[request.message],
                        n_results=min(4, col.count()),
                        include=["documents", "metadatas"]
                    )
                    retrieved_docs = results.get("documents", [[]])[0]
                    metadatas = results.get("metadatas", [[]])[0]
                
                for doc, meta in zip(retrieved_docs, metadatas):
                    fname = meta.get("filename", "Documento") if meta else "Documento"
                    page_num = meta.get("page", "?") if meta else "?"
                    context_chunks.append(f"📌 [Fonte: {fname} - Pagina {page_num}]\n{doc}")

        except Exception:
            pass

    context = "\n---\n".join(context_chunks)

    # Istruzioni differenziate per Modalità Studio vs Esame
    if request.mode == "exam":
        system_instruction = (
            "Sei un severo ed esigente professore universitario esperto dei contenuti dei documenti forniti. "
            "Rispondi TASSATIVAMENTE ed ESCLUSIVAMENTE in lingua ITALIANA. "
            "Il tuo scopo NON è spiegare i concetti, ma INTERROGARE lo studente. "
            "Basandoti sui documenti, valuta criticamente la risposta dell'utente (se presente) "
            "e ponigli una domanda d'esame specifica, tecnica e approfondita. Non parlare mai in inglese."
        )
    else:
        system_instruction = (
            "Sei un assistente per l'analisi e lo studio dei documenti forniti. "
            "Rispondi TASSATIVAMENTE ed ESCLUSIVAMENTE in lingua ITALIANA. "
            "Fornisci spiegazioni chiare e strutturate. Quando usi informazioni dai documenti, "
            "cita sempre il file e la pagina di riferimento. Non parlare mai in inglese."
        )

    history_text = ""
    if request.history:
        for msg in request.history[-4:]:
            role_label = "Studente" if msg.role == "user" else "Docente/Assistente"
            history_text += f"{role_label}: {msg.content}\n"

    prompt_parts = []
    if context:
        prompt_parts.append(f"ESTRATTI DEI DOCUMENTI CON FILE E PAGINE:\n---\n{context}\n---")
    if history_text:
        prompt_parts.append(f"CRONOLOGIA CHAT:\n{history_text}")
    
    prompt_parts.append(f"INPUT ATTUALE UTENTE: {request.message}\nRISPOSTA IN ITALIANO:")
    full_prompt = "\n\n".join(prompt_parts)

    def generate_stream():
        try:
            with requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": request.model,
                    "prompt": full_prompt,
                    "system": system_instruction,
                    "stream": True,
                    "options": {
                        "temperature": 0.2 if request.mode == "study" else 0.5,
                        "top_p": 0.9
                    }
                },
                stream=True,
                timeout=120
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        data = json.loads(line.decode("utf-8"))
                        token = data.get("response", "")
                        yield token
        except Exception as e:
            yield f"\n[Errore streaming: {str(e)}]"

    return StreamingResponse(generate_stream(), media_type="text/plain")