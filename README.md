<div align="center">

# 🧠 Local AI Workspace

**Privacy-First, Self-Hosted Document AI & Local LLM Studio**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?logo=docker)](https://www.docker.com/)
[![Ollama](https://img.shields.io/badge/AI_Engine-Ollama-white?logo=ollama)](https://ollama.ai/)

---

*A modern, full-stack workspace to query, index, and chat with your sensitive documents using 100% local LLMs. No cloud dependencies, zero data leaks.*

</div>

---

## ✨ Features

- 🔒 **100% On-Premise & Offline:** All inference and document processing run locally on your hardware.
- 📄 **Smart RAG (Retrieval-Augmented Generation):** Upload PDFs, Markdown, or text files and query them seamlessly.
- ⚡ **High Performance Stack:** Next.js 14 App Router UI paired with a fast Python FastAPI backend.
- 🐳 **One-Command Setup:** Containerized environment ready to deploy via Docker Compose.
- 💬 **Multi-Model Support:** Connects directly with Ollama to run Llama 3, Mistral, Gemma, or local embedding models.

---

## 🏗 System Architecture

```text
  [ User Browser ]
         │ (HTTP / WebSocket)
         ▼
 ┌────────────────┐
 │ Next.js 14 UI  │ (Frontend - Port 3000)
 └───────┬────────┘
         │ (REST API)
         ▼
 ┌────────────────┐
 │ FastAPI Engine │ (Backend - Port 8000)
 └───────┬────────┘
         ├──────────────────────────┐
         ▼                          ▼
 ┌────────────────┐        ┌────────────────┐
 │ Vector Store   │        │ Ollama Server  │ (Port 11434)
 │ (Local DB/RAG) │        │ (Local LLMs)   │
 └────────────────┘        └────────────────┘

---

## 🚀 Guida Rapida per l'installazione (Anche per principianti)

Se vuoi avviare questo workspace sul tuo computer in pochi click, segui questi passaggi:

### Requisiti
Assicurati di avere installato sul tuo PC:
1. **Docker Desktop** (scaricabile dal sito ufficiale) e assicurati che sia aperto e attivo.
2. **Git** (per clonare il progetto).

### Passo 1: Clona o scarica il progetto
Apri il terminale (o PowerShell su Windows) e digita:
\`\`\`bash
git clone https://github.com/GiuseppeSgroi/local-ai-workspace.git
cd local-ai-workspace
\`\`\`

### Passo 2: Avvia l'applicazione con Docker
Sempre nel terminale, all'interno della cartella del progetto, dai questo comando:
\`\`\`bash
docker compose up --build
\`\`\`
*(La prima volta ci vorrà qualche minuto per scaricare i componenti e configurare l'intelligenza artificiale).*

### Passo 3: Apri l'interfaccia nel browser
Una volta completato l'avvio, apri il tuo browser (Chrome, Edge, Firefox) e vai all'indirizzo:
👉 **http://localhost:3000**

### 💡 Come si usa:
1. Clicca su **"Nuovo Quaderno"** nella barra laterale.
2. Trascina un file **PDF** (es. una dispensa universitaria o un documento) nell'area di caricamento.
3. Seleziona la modalità **Studio** (per farti spiegare i concetti) o **Esame** (per farti interrogare come all'università) in alto a destra.
4. Fai le tue domande in chat in totale privacy!
