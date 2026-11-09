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
            
            filenames = []
            if cnt > 0:
                res = c_obj.get(include=["metadatas"])
                metas = res.get("metadatas", [])
                for m in metas:
                    if m and "filename" in m and m["filename"] not in filenames:
                        filenames.append(m["filename"])
            
            display_name = col_name.replace("nb_", "").replace("_", " ").strip().title()
            
            notebooks.append({
                "id": col_name,
                "name": display_name,
                "filenames": filenames,
                "total_chunks": cnt
            })
        return notebooks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore recupero notebook: {str(e)}")

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
        
        # NUOVO: Estrazione pagina per pagina mantenendo il numero di pagina reale nei metadati
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
        else:
            base_name = os.path.splitext(file.filename)[0]
            collection_id = clean_collection_name(base_name)
            
        collection = chroma_client.get_or_create_collection(name=collection_id)
        
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
                
                # Includiamo File e Numero di Pagina esatto nei metadati forniti al modello
                for doc, meta in zip(retrieved_docs, metadatas):
                    fname = meta.get("filename", "Documento") if meta else "Documento"
                    page_num = meta.get("page", "?") if meta else "?"
                    context_chunks.append(f"📌 [Fonte: {fname} - Pagina {page_num}]\n{doc}")

        except Exception:
            pass

    context = "\n---\n".join(context_chunks)

    system_instruction = (
        "Sei un assistente per l'analisi di documenti di studio. Rispondi TASSATIVAMENTE ed ESCLUSIVAMENTE in lingua ITALIANA. "
        "Quando rispondi basandoti sui documenti, indica sempre da quale file e da quale pagina tra quelle fornite hai tratto l'informazione. "
        "Mantieni le risposte chiare, ben strutturate e pertinenti. Non usare mai l'inglese."
    )

    history_text = ""
    if request.history:
        for msg in request.history[-4:]:
            role_label = "Utente" if msg.role == "user" else "Assistente"
            history_text += f"{role_label}: {msg.content}\n"

    prompt_parts = []
    if context:
        prompt_parts.append(f"ESTRATTI DEI DOCUMENTI DEL NOTEBOOK CON FILE E PAGINE DI ORIGINE:\n---\n{context}\n---")
    if history_text:
        prompt_parts.append(f"STORIA DELLA CONVERSAZIONE:\n{history_text}")
    
    prompt_parts.append(f"DOMANDA ATTUALE UTENTE: {request.message}\nRISPOSTA IN ITALIANO (citando file e pagine):")
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
                        "temperature": 0.2,
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
            yield f"\n[Errore durante lo streaming: {str(e)}]"

    return StreamingResponse(generate_stream(), media_type="text/plain")