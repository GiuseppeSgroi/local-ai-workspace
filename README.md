# 🧠 Local AI Workspace

<p align="center">
  <b>Privacy-First, Self-Hosted Document AI & Local LLM Studio</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Next.js_14-black.svg" alt="Next.js 14">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Deployment-Docker_Compose-2496ED.svg" alt="Docker Compose">
  <img src="https://img.shields.io/badge/AI_Engine-Ollama_(Qwen_2.5)-FF6F00.svg" alt="Ollama">
</p>

---

Un workspace full-stack moderno e self-hosted per indicizzare, interrogare e analizzare i tuoi documenti di studio e lavoro in totale privacy, sfruttando modelli LLM 100% locali. Nessuna dipendenza in cloud, zero invio di dati all'esterno.

---

## ✨ Funzionalità Principali

- **🔒 100% Offline & Locale:** L'elaborazione dei PDF e l'inferenza dell'IA avvengono esclusivamente sulla tua macchina.
- **📚 Smart RAG Multi-Notebook & Multi-PDF:** Organizza i tuoi appunti in quaderni separati. Carica più file PDF per ciascun quaderno con indicizzazione vettoriale gestita tramite ChromaDB.
- **✏️ Rinomina Dinamica Quaderni:** Modifica il titolo del quaderno direttamente dall'interfaccia in qualsiasi momento.
- **🎓 Doppia Modalità (Studio vs. Esame):**
  - **Modalità Studio:** Risposte chiare, riassunti ed estrazione delle fonti precise (file e numero di pagina).
  - **Modalità Esame:** L'IA veste i panni di un professore universitario severo, interrogandoti con domande tecniche sui contenuti dei tuoi PDF.
- **⚡ Esperienza Chat Avanzata:** Streaming della risposta in tempo reale (SSE), tasto di stop dell'elaborazione, rigenerazione dell'ultima risposta, copia rapida ed esportazione dell'intera chat in formato Markdown (`.md`).
- **🛡️ Persistenza dei Dati:** I file del database vettoriale ChromaDB sono mappati direttamente sul disco locale (`./backend/chroma_db`), garantendo che i quaderni rimangano salvati anche dopo il riavvio dei container.

---

## 🏗️ Architettura del Sistema

```text
┌─────────────────────────────────────────────────────────┐
│                      User Browser                       │
│                     (HTTP / Web UI)                     │
└────────────────────────────┬────────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             │  Next.js 14 UI (Port 3000)    │
             └───────────────┬───────────────┘
                             │ (REST API)
             ┌───────────────┴───────────────┐
             │  FastAPI Backend (Port 8000)  │
             └───────┬───────────────┬───────┘
                     │               │
  ┌──────────────────┴──┐         ┌──┴──────────────────┐
  │  ChromaDB Vector    │         │  Ollama Engine      │
  │  Store (Persistent) │         │  (Qwen 2.5:3b)      │
  └─────────────────────┘         └─────────────────────┘

```

---

## 🚀 Guida all'Installazione e Avvio

### Requisiti

Assicurati di aver installato sul tuo computer:

1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (deve essere avviato e in esecuzione).
2. **[Git](https://git-scm.com/)**.

---

### Passo 1: Clona il Repository

Apri il terminale (PowerShell su Windows) e scarica il progetto:

```bash
git clone [https://github.com/GiuseppeSgroi/local-ai-workspace.git](https://github.com/GiuseppeSgroi/local-ai-workspace.git)
cd local-ai-workspace

```

---

### Passo 2: Avvia i Container con Docker

Avvia l'architettura con un singolo comando:

```bash
docker compose up --build

```

---

### Passo 3: Scarica il Modello LLM (Solo la prima volta)

Alla prima installazione, scarica il modello `qwen2.5:3b` dentro il container Ollama aprendo una nuova finestra di terminale ed eseguendo:

```bash
docker exec -it local_ai_ollama ollama pull qwen2.5:3b

```

---

### Passo 4: Apri il Workspace nel Browser

Una volta completato il download del modello, apri il browser e vai all'indirizzo:

👉 **`http://localhost:3000`**

---

## 💡 Come Utilizzare il Workspace

1. **Crea un Quaderno:** Clicca su `+ Nuovo Quaderno` nella barra laterale per separare le diverse materie di studio.
2. **Carica i Documenti:** Trascina i tuoi file PDF nell'area principale per avviarne l'indicizzazione.
3. **Rinomina il Quaderno:** Clicca sull'icona della matita ✏️ accanto al titolo per personalizzare il nome del quaderno.
4. **Scegli la Modalità:**
* Seleziona **📖 Studio** per consultare i documenti e chiedere spiegazioni con fonti dettagliate.
* Seleziona **🎓 Esame** per avviare la simulazione di un'interrogazione universitaria sui contenuti caricati.


5. **Esporta la Chat:** Salva gli appunti generati in formato `.md` sul tuo PC tramite il tasto `Esporta .md`.

---

## ⚙️ Tech Stack

* **Frontend:** Next.js 14 (App Router), React, TypeScript, React Markdown.
* **Backend:** Python 3.11, FastAPI, PyPDF, Requests.
* **Database Vettoriale:** ChromaDB (con persistenza su cartella locale `./backend/chroma_db`).
* **Motore AI:** Ollama con modello `qwen2.5:3b` (ottimizzato per l'italiano e la risposta tecnica).
* **Orchestruzione:** Docker Compose.
