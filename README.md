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
