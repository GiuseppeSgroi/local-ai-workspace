# 🧠 Local AI Workspace

<p align="center">
  <b>Privacy-First, Self-Hosted Document AI & Local LLM Studio</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Frontend-Next.js_14-black.svg" alt="Next.js 14">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/Deployment-Docker_Compose-2496ED.svg" alt="Docker Compose">
  <img src="https://img.shields.io/badge/AI_Engine-Ollama_(Qwen_2.5)-FF6F00.svg" alt="Ollama">
</p>

---

A modern, full-stack workspace to query, index, and chat with your sensitive study documents using 100% local LLMs. No cloud dependencies, zero data leaks.

---

## ✨ Features

- **🔒 100% On-Premise & Offline:** All inference and document processing run locally on your hardware.
- **📚 Smart RAG Multi-Notebook & Multi-PDF:** Organize your courses into isolated notebooks. Upload multiple PDFs per notebook with vector embeddings stored locally via ChromaDB.
- **🎓 Dual Mode (Study vs. Exam):**
  - **Study Mode:** Get clear explanations, summaries, and precise source attributions (file and page numbers).
  - **Exam Mode:** The AI acts as a strict university professor, quizzing you on technical concepts based on your uploaded PDFs.
- **📐 Automatic Formulario / Cheat Sheet Generator:** Instant extraction of mathematical formulas, key definitions, technical protocols, and acronyms from your documents in one click.
- **⚡ Advanced Chat UX:** Real-time Server-Sent Events (SSE) streaming, active request cancellation (Stop button), answer regeneration, one-click copy, and full conversation export to Markdown (`.md`).
- **🛡️ Persistent Data Storage:** ChromaDB local disk mapping ensures your indexed documents persist securely across system restarts.

---

## 🏗️ System Architecture

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
🚀 Guida Rapida all'Installazione (Step-by-Step)
Se vuoi avviare l'applicazione sul tuo computer in pochissimi minuti, segui questi passaggi:

Requisiti Preliminari
Assicurati di aver installato sul tuo PC:

Docker Desktop (deve essere aperto e funzionante).

Git.

Passo 1: Clona il Repository
Apri il terminale (o PowerShell) e scarica il progetto:

Bash
git clone [https://github.com/GiuseppeSgroi/local-ai-workspace.git](https://github.com/GiuseppeSgroi/local-ai-workspace.git)
cd local-ai-workspace
Passo 2: Avvia il Workspace con Docker
Lancia l'intero ecosistema (Frontend Next.js, Backend FastAPI e motore Ollama) con un solo comando:

Bash
docker compose up --build
(La prima volta ci vorrà qualche minuto per scaricare le immagini e configurare il motore locale).

Passo 3: Apri l'Interfaccia Web
Una volta completato l'avvio nel terminale, apri il browser e naviga su:

👉 http://localhost:3000

💡 Come utilizzare il Workspace
Crea o seleziona un Quaderno: Usa il tasto + Nuovo Quaderno nella barra laterale per organizzare i tuoi corsi di studio.

Carica i PDF: Trascina le tue dispense o i libri di testo nell'area centrale. Il sistema indicizzerà i file estratto per estratto.

Scegli la Modalità:

📖 Studio: Fai domande sui tuoi appunti, richiedi riassunti e verifica le fonti precise (file e pagine).

🎓 Esame: Mettiti alla prova! L'IA ti farà domande tecniche e severe sui documenti per testare la tua preparazione prima dell'esame.

Stampa il Formulario: Clicca sul tasto 📐 Formulario nell'header per estrarre istantaneamente schemi, acronimi e formule chiave da studiare.

Esporta gli Appunti: Salva l'intera sessione di chat in un file .md locale con il pulsante Esporta .md.

⚙️ Tech Stack & Requisiti Tecnici
Frontend: Next.js 14, React, TypeScript, React Markdown, Tailwind / Custom Dark CSS.

Backend: Python 3.11+, FastAPI, PyPDF, Requests.

Vector DB: ChromaDB (PersistentClient su disk mount ./backend/chroma_db).

LLM Engine: Ollama running qwen2.5:3b (ottimizzato per italiano, analisi tecnica e basso consumo di RAM).

Orchestratore: Docker Compose.

📝 Licenza
Questo progetto è rilasciato sotto licenza AGPL-3.0.


---

### Per aggiornare la pagina GitHub subito dopo aver salvato:

Apri il terminale su VS Code e lancia questi tre comandi rapida sequenza:

```powershell
git add README.md
git commit -m "docs: complete overhaul of README with accurate installation and features guide"
git push origin main
