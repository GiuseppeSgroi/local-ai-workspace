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

[Demo Video / Screenshots Placeholder]

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
🚀 Quick Start
Prerequisites
Docker Engine and Docker Compose installed.

Ollama installed locally (or running via Docker container).

Installation
Clone the repository:

Bash
git clone [https://github.com/GiuseppeSgroi/local-ai-workspace.git](https://github.com/GiuseppeSgroi/local-ai-workspace.git)
cd local-ai-workspace
Configure environment variables:

Bash
cp .env.example .env
Launch with Docker Compose:

Bash
docker compose up -d
Access the Web Interface:
Open your browser and navigate to http://localhost:3000.

🛠 Tech Stack
Frontend: Next.js 14, React, TypeScript, Tailwind CSS

Backend: Python 3.11, FastAPI, Uvicorn, LangChain / LlamaIndex

AI / Inference: Ollama, PyPDF2, ChromaDB / FAISS

DevOps: Docker, Docker Compose, GitHub Actions

🗺 Roadmap
[ ] Add support for custom vector database connectors (Qdrant / Milvus).

[ ] Implement OCR for scanned documents.

[ ] Multi-user authentication & workspace roles.

[ ] Audio-to-text transcript processing.

🤝 Contributing
Contributions, issues, and feature requests are welcome!

Feel free to check the issues page.

📜 License
Distributed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE for more information.
