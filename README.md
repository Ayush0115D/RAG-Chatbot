<div align="center">

# 3GPP RAG Chatbot

A **Retrieval-Augmented Generation** chatbot that answers questions about **Telecom 3GPP standards** (5G/NR) with near-zero hallucinations.

[Live Demo](https://3gpprag-chatbot.vercel.app) · [Backend API](https://rag-chatbot-1-6loy.onrender.com/api/health)

</div>

---

## How it works

```
User Question → Embedding → Hybrid Search (Vector + BM25) → Grounded LLM → Answer with Citations
```

Retrieves the most relevant passages from 3GPP specs, then asks the LLM to answer **only from those passages** — citing exact spec and section numbers.

---

## Features

- **Section-aware chunking** — preserves spec + section metadata (e.g. `TS 23.501 §5.15.2`)
- **Hybrid retrieval** — dense (LanceDB cosine) + sparse (BM25) search with score fusion
- **Hallucination guardrails** — similarity thresholding, grounding verification, honest "I don't know" fallback
- **Streaming responses** — SSE-based token streaming with clickable source citations
- **Local embeddings** — runs offline via `@huggingface/transformers` (MiniLM), no API key needed
- **Provider-agnostic LLM** — OpenAI, Gemini, Ollama, Groq, or any OpenAI-compatible endpoint

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (ESM) |
| Backend API | Express 5 |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| PDF parsing | pdfjs-dist |
| Embeddings | @huggingface/transformers (local) |
| Vector store | LanceDB (embedded) |
| Keyword search | BM25 (in-memory) |
| LLM | Any OpenAI-compatible endpoint |

---

## Project structure

```
RAG-Chatbot/
├── backend/
│   ├── src/
│   │   ├── config.js              # Env-based configuration
│   │   ├── chunker.js             # Section-aware chunking
│   │   ├── embeddings.js          # Local + API embedding providers
│   │   ├── vectorStore.js         # LanceDB wrapper
│   │   ├── keywordIndex.js        # BM25 keyword index
│   │   ├── retriever.js           # Hybrid retrieval + threshold guardrail
│   │   ├── llm.js                 # OpenAI-compatible chat client (streaming)
│   │   ├── rag.js                 # Grounded generation pipeline
│   │   ├── prompt.js              # System prompt for 3GPP grounding
│   │   ├── pdfParser.js           # PDF text extraction
│   │   ├── docxParser.js          # DOCX text extraction
│   │   ├── extractBody.js         # Body-only extraction from 3GPP docs
│   │   └── specResolver.js        # 3GPP archive version resolver
│   ├── scripts/
│   │   ├── download-specs.js      # Download 3GPP specs from official archive
│   │   ├── specs.config.json      # Curated spec list
│   │   ├── extract-text.js        # DOCX/PDF → plain text
│   │   ├── ingest.js              # Chunk → embed → store
│   │   └── chat.js                # CLI REPL
│   ├── tests/
│   ├── server.js                  # Express API (health, chat, chat/stream)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Chat UI with streaming + citations
│   │   ├── index.css              # Tailwind + animations
│   │   └── main.jsx               # React entry
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
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

| `EMBEDDING_PROVIDER` | Description |
|---------------------|-------------|
| `local` *(default)* | MiniLM via transformers.js — fully offline |
| `openai` | Any OpenAI-compatible embeddings API |

---

## Data ingestion

### Local

The `build` script runs all three steps:

```bash
npm run build
# → download-specs → extract-text → ingest
```

This downloads 3GPP spec PDFs/DOCX, extracts body text, chunks it, generates embeddings with MiniLM, and stores everything in a LanceDB index under `backend/data/index/`.

### Render (cloud)

On Render, the build command runs `npm run build` which re-downloads specs and re-ingests on every deploy (Render free tier has no persistent disk). The index is rebuilt at startup each time.

Set `DATA_DIR=data` in Render environment variables.

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
| `CORS_ORIGIN` | `https://3gpprag-chatbot.vercel.app` |

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

## Testing

```bash
cd backend
npm test
```

---

## License

MIT
