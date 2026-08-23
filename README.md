<div align="center">

# 📡 3GPP RAG Chatbot

### 🔎 AI Assistant for 3GPP / 5G / NR Standards

A **Retrieval-Augmented Generation (RAG)** chatbot that answers questions about **3GPP telecom standards** using grounded retrieval, hybrid search, citations, and hallucination guardrails.

<br/>

[🚀 Live Demo](https://3gpprag-chatbot.vercel.app) • [💚 Backend API](https://rag-chatbot-1-6loy.onrender.com/api/health)

<br/>

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![LanceDB](https://img.shields.io/badge/LanceDB-Vector%20DB-blue)
![RAG](https://img.shields.io/badge/AI-RAG-purple)
![3GPP](https://img.shields.io/badge/Domain-3GPP%205G%2FNR-orange)

</div>

---

## ⚡ How It Works

```text
┌──────────────────┐
│   User Question  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│    Embedding     │
└────────┬─────────┘
         ↓
┌──────────────────────────┐
│     Hybrid Retrieval     │
│  🔹 Vector + 🔹 BM25     │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│  Similarity Thresholding │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│      Grounded LLM        │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│  Answer + 📚 Citations   │
└──────────────────────────┘

```
## ✨ Features

- 🧩 **Section-aware chunking** — preserves spec + section metadata (e.g. `TS 23.501 §5.15.2`)
- 🔀 **Hybrid retrieval** — dense (LanceDB cosine) + sparse (BM25) search with score fusion
- 🛡️ **Hallucination guardrails** — similarity thresholding, grounding verification, and honest "I don't know" fallback
- ⚡ **Streaming responses** — SSE-based token streaming with clickable source citations
- 🧠 **Local embeddings** — runs offline via `@huggingface/transformers` (MiniLM), with no API key needed
- 🔌 **Provider-agnostic LLM** — OpenAI, Gemini, Ollama, Groq, or any OpenAI-compatible endpoint

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 🟢 **Runtime** | Node.js 18+ (ESM) |
| 🔙 **Backend API** | Express 5 |
| 🎨 **Frontend** | React 19, Vite 8, Tailwind CSS 4 |
| 📄 **PDF Parsing** | pdfjs-dist |
| 🧠 **Embeddings** | `@huggingface/transformers` (local) |
| 🗄️ **Vector Store** | LanceDB (embedded) |
| 🔤 **Keyword Search** | BM25 (in-memory) |
| 🤖 **LLM** | Any OpenAI-compatible endpoint |

```
---
## Project structure


RAG-Chatbot/
├── backend/
│   ├── src/
│   │   ├── config.js              # Environment configuration
│   │   ├── chunker.js             # Section-aware chunking
│   │   ├── embeddings.js          # Local + API embedding providers
│   │   ├── vectorStore.js         # LanceDB wrapper
│   │   ├── keywordIndex.js        # BM25 keyword index
│   │   ├── retriever.js           # Hybrid retrieval + threshold guardrail
│   │   ├── llm.js                 # OpenAI-compatible streaming client
│   │   ├── rag.js                 # Grounded generation pipeline
│   │   ├── prompt.js              # 3GPP grounding system prompt
│   │   ├── pdfParser.js           # PDF text extraction
│   │   ├── docxParser.js          # DOCX text extraction
│   │   ├── extractBody.js         # 3GPP body extraction
│   │   └── specResolver.js        # 3GPP archive version resolver
│   │
│   ├── scripts/
│   │   ├── download-specs.js      # Download 3GPP specifications
│   │   ├── specs.config.json      # Curated specification list
│   │   ├── extract-text.js        # DOCX/PDF → plain text
│   │   ├── ingest.js              # Chunk → embed → store
│   │   └── chat.js                # CLI REPL
│   │
│   ├── tests/
│   ├── server.js                  # Express API
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Chat UI with streaming + citations
│   │   ├── index.css              # Tailwind + animations
│   │   └── main.jsx               # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── .gitignore

```
---

## Getting started

### Prerequisites

- Node.js 18+ (< 23)
- An LLM API key (Gemini, OpenAI, Groq, etc.)

### Local development

```bash
# Clone and install
git clone <repo-url>
cd RAG-Chatbot/backend
npm install

# Configure
cp .env.example .env
# Edit .env with your LLM API key

# Download 3GPP specs
npm run specs

# Extract text from PDFs/DOCX
npm run extract

# Ingest into vector index
npm run ingest

# Start backend
npm run dev
```

In a separate terminal:

```bash
cd RAG-Chatbot/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Configuration

### LLM providers

Set these in `backend/.env`:

```bash
# Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.5-flash

# OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Groq (free tier)
LLM_PROVIDER=groq
OPENAI_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

### Embeddings

| `EMBEDDING_PROVIDER` | Description | Best for |
|---------------------|-------------|----------|
| `local` | MiniLM via transformers.js — fully offline, needs 512MB+ RAM | Local dev |
| `openai` | Any OpenAI-compatible embeddings API (Gemini, OpenAI, etc.) | Render / cloud |

```bash
# Gemini embeddings (recommended for Render)
EMBEDDING_PROVIDER=openai
EMBED_MODEL=gemini-embedding-001
EMBED_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
EMBED_DIMS=3072

# Local offline embeddings (for local dev only)
EMBEDDING_PROVIDER=local
EMBED_MODEL=Xenova/all-MiniLM-L6-v2
EMBED_DIMS=384
```

> If you change the embedding provider, **re-run `npm run ingest`** — the vector index stores embeddings from one model only.

---

## Data ingestion

```bash
npm run build
# → download-specs → extract-text → ingest
```

This downloads 3GPP spec PDFs/DOCX, extracts body text, chunks it, generates embeddings, and stores everything in a LanceDB index under `backend/data/index/`.

On Render, the build script checks if the index already exists — skips the full pipeline if it does. The index and text are committed to git, so subsequent deploys are fast.

**First deploy** runs the full pipeline. **Subsequent deploys** skip it.

### Ingested specs

Curated in `backend/scripts/specs.config.json`:

| Spec | Title |
|------|-------|
| TS 23.501 | System architecture for 5G System |
| TS 23.502 | Procedures for the 5G System |
| TS 23.503 | Policy and charging control framework |
| TS 33.501 | Security architecture for 5G |
| TS 38.300 | NR and NG-RAN overall description |
| TS 38.331 | NR; RRC protocol specification |

---

## Deployment

### Frontend — Vercel

- Framework: React (Vite)
- Build command: `npm run build` (root dir: `frontend`)
- **Required env var**: `VITE_API_URL` = your Render backend URL (e.g. `https://rag-chatbot-1-6loy.onrender.com`)

### Backend — Render

- Build command: `npm install && npm run build`
- Root directory: `backend`
- **Required env vars**:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `LLM_PROVIDER` | `gemini` |
| `LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `LLM_MODEL` | `gemini-2.5-flash` |
| `DATA_DIR` | `data` |

> Embeddings run locally (MiniLM) — no extra API key needed. The vector index is committed to git so deploys are fast.

---

## Hallucination minimisation

1. **Similarity thresholding** — low-confidence retrieval results are discarded
2. **Grounding prompt** — LLM instructed to answer only from provided context
3. **Citation enforcement** — every answer must reference spec + section numbers
4. **Honest fallback** — unanswered questions return "I don't know" instead of guessing
5. **Grounding verification** — answer is re-checked against retrieved context before returning

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/chat` | Non-streaming query (returns JSON) |
| POST | `/api/chat/stream` | Streaming query (SSE) |

**Request body:**
```json
{ "query": "What is NSSAI?" }
```

---

## Understanding the UI

- **Source cards** — Each card shows a retrieved text chunk from the specs. The number is its cosine similarity to your query (higher = more relevant). Up to 3 are shown; additional sources are collapsed.
- **"+N more sources"** — Additional retrieved chunks beyond the top 3 displayed cards.
- **"N weaker candidates filtered"** — The retriever gathered ~20 candidates via hybrid search, then discarded those below the similarity threshold (0.35). Low-confidence evidence is dropped rather than used — this is a core hallucination guardrail.
- **Streaming response** — The answer streams token-by-token from the LLM, constrained to the retrieved context only.
- **Confidence indicator** — If shown, the generated answer couldn't be fully grounded in the retrieved context.

---

## Testing

```bash
cd backend
npm test
```

---
