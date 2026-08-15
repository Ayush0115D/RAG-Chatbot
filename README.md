<div align="center">

# 📡 Telecom RAG Chatbot — 3GPP Standards Assistant

A **Retrieval-Augmented Generation (RAG)** chatbot built with **Node.js** that answers questions about **Telecom 3GPP standards** (5G/NR) — designed with a strong focus on **minimal to near-zero hallucinations**.

</div>

---

## 🎯 Why this exists

> *"Please submit a project and working implementation for a Chatbot built using a Retrieval-Augmented Generation (RAG) architecture, with a focus on achieving minimal to near-zero hallucinations. The solution should use Telecom 3GPP standards documentation as the primary knowledge source."*

This project answers that brief: a grounded question-answering system over real **3GPP technical specifications** (TS 23.501, TS 23.502, TS 38.300, TS 33.501, etc.), where every answer is generated **only from retrieved evidence** and cites the exact **spec + section** it comes from.

---

## 🧠 What is RAG?

RAG (Retrieval-Augmented Generation) combines two pieces:

1. **Retrieval** — find the most relevant passages from a knowledge base for a given question.
2. **Generation** — an LLM composes an answer, but is *constrained* to the retrieved passages (the "context").

Instead of asking the LLM to recall 3GPP facts from memory (which leads to hallucination), we **give it the source text** and ask it to answer strictly from that text, with citations.

```
 User Question
      │
      ▼
┌─────────────┐      ┌───────────────────┐      ┌───────────────┐
│  Embedding  │ ───► │  Vector Search    │ ───► │  LLM (Grounded│
│  (query)    │      │  + Hybrid Retrieve│      │   Generation) │
└─────────────┘      └───────────────────┘      └───────────────┘
      ▲                        ▲                       │
      │                        │                       ▼
┌─────────────┐      ┌───────────────────┐      ┌───────────────┐
│  3GPP Specs │ ───► │  Chunking +       │      │  Answer with  │
│  (PDF/ZIP)  │      │  Embedding Index  │      │  Citations    │
└─────────────┘      └───────────────────┘      └───────────────┘
```

---

## ✨ Features

- **📥 Smart 3GPP spec downloader** — resolves and downloads the latest release of curated 3GPP specs directly from the official archive.
- **📄 Robust PDF ingestion** — parses 3GPP spec PDFs and **section-aware chunking** that preserves spec + section metadata (`TS 23.501 §5.2.3`).
- **🧮 Local embeddings by default** — runs fully offline with `transformers.js` (MiniLM), no API key needed; OpenAI-compatible embeddings also supported.
- **🔎 Hybrid retrieval** — **dense (vector) + sparse (keyword/BM25)** search fused together, improving recall without losing precision.
- **🛡️ Hallucination guardrails** (the core of this project):
  - **Similarity thresholding** — low-confidence retrieval results are discarded.
  - **Grounding prompt** — the LLM is *instructed* to answer only from context.
  - **Citation enforcement** — every answer must cite spec + section numbers.
  - **Honest fallback** — if nothing relevant is retrieved, the bot says *"I don't know"* instead of making things up.
  - **Grounding verification** — the answer is re-checked against the retrieved context before being returned.
- **💬 Clean web chat UI** — streaming answers with clickable source citations and a "confidence" indicator per retrieved passage.
- **🔌 Provider-agnostic LLM** — works with OpenAI, Ollama (local), Groq, Azure, or any OpenAI-compatible endpoint.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PIPELINE                                  │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐   │
│  │   Download   │──►│    Parse +   │──►│   Embed (local /      │   │
│  │  3GPP specs  │   │    Chunk     │   │   OpenAI-compatible)  │   │
│  └──────────────┘   └──────────────┘   └───────────┬───────────┘   │
│                                                    ▼               │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐   │
│  │   Web Chat   │◄──│  RAG Engine  │◄──│  Vector DB (LanceDB)  │   │
│  │   (Express)  │   │  (grounding) │   │  + keyword index      │   │
│  └──────────────┘   └──────────────┘   └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | **Node.js 18+** (ESM) |
| Web API | **Express** |
| PDF parsing | **pdfjs-dist** (Mozilla PDF.js) |
| Embeddings | **@huggingface/transformers** (local, default) or OpenAI-compatible API |
| Vector store | **LanceDB** (embedded, columnar) |
| LLM | Any **OpenAI-compatible** endpoint (OpenAI / Ollama / Groq / Azure) |
| Keyword index | Lightweight in-memory **BM25** implementation |

---

## 📂 Project layout

```
RAG-Chatbot/
├── scripts/
│   ├── download-specs.js      # Fetch 3GPP specs from the official archive
│   └── ingest.js              # Parse → chunk → embed → index
├── src/
│   ├── config.js              # Centralised env-based configuration
│   ├── specResolver.js        # Resolves latest 3GPP spec versions
│   ├── pdfParser.js           # PDF → clean text extraction
│   ├── chunker.js             # Section-aware chunking with metadata
│   ├── embeddings.js          # Embedding provider (local / api)
│   ├── vectorStore.js         # LanceDB wrapper (add / search)
│   ├── keywordIndex.js        # BM25 keyword scoring
│   ├── retriever.js           # Hybrid retrieval + fusion + thresholding
│   ├── llm.js                 # OpenAI-compatible chat client
│   └── rag.js                 # Grounded generation + verification
├── server.js                  # Express API + static chat UI
├── public/
│   └── index.html             # Chat UI (vanilla JS, streaming)
├── data/                      # (gitignored) downloaded specs + index
├── tests/
├── .env.example
└── package.json
```

---

## 🚀 Getting started

### 1. Prerequisites
- **Node.js 18+** and npm
- Internet connection on first run (downloads models + specs)
- An LLM endpoint (see [Providers](#-configuring-the-llm))

### 2. Install

```bash
git clone <your-repo-url>
cd RAG-Chatbot
npm install
```

### 3. Configure

```bash
cp .env.example .env
# then edit .env — see below
```

### 4. Download 3GPP specs

```bash
npm run specs        # download curated 3GPP specs
# or a subset for a quick test:
npm run specs -- --limit 2
```

### 5. Ingest into the knowledge base

```bash
npm run ingest       # parse, chunk, embed, and index the specs
```

### 6. Run the chatbot

```bash
npm start
# → http://localhost:3000
```

> **Quickstart (all in one):**
> ```bash
> npm run setup      # downloads specs, ingests, starts the server
> ```

---

## 🔌 Configuring the LLM

The chatbot needs an LLM to generate answers. Point it at any **OpenAI-compatible** endpoint:

```bash
# OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Local with Ollama (free, runs on your machine)
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
# (then: ollama pull llama3.1)

# Groq (free tier, fast)
LLM_PROVIDER=groq
OPENAI_API_KEY=<groq-key>
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

### Embedding providers

| `EMBEDDING_PROVIDER` | Description | Requires |
|---------------------|-------------|----------|
| `local` *(default)* | MiniLM via `transformers.js` — fully offline | nothing (model auto-downloads on first run) |
| `openai` | `text-embedding-3-small`-compatible API | `OPENAI_API_KEY`, `EMBED_BASE_URL` |

> If you change the embedding provider, **re-run `npm run ingest`** (the vector index stores embeddings from one model only).

---

## 🧪 Testing

```bash
npm test
```

Runs unit tests for chunking, retrieval scoring, and the grounding/fallback logic.

---

## 🛡️ How this project minimises hallucinations

The most important design goal. Guardrails are layered:

1. **Ground the input** — the model only ever sees the retrieved passages, never "free-floating" knowledge.
2. **Enforce citations** — the prompt requires `[TS 23.501 §5.2.3]`-style citations after each claim.
3. **Threshold retrieval** — passages below a configurable similarity threshold are rejected; answers are generated only from what survives.
4. **Honest unknown** — empty/low-confidence retrieval triggers a fixed, truthful fallback response rather than a confident guess.
5. **Verify output** — the generated answer is re-scored against the retrieved context (`answerNLI`-style check); if the model can't ground its own answer, it says so.
6. **Source transparency** — the UI always shows the passages used, so users can audit every claim.

---

## 📚 Knowledge source

- **Official 3GPP specification archive**: `https://www.3gpp.org/ftp/Specs/archive/`
- Curated default set (configurable in `scripts/specs.config.json`):
  - **TS 23.501** — System architecture for the 5G System (SA)
  - **TS 23.502** — Procedures for the 5G System
  - **TS 23.503** — Policy and charging control framework
  - **TS 38.300** — NR and NG-RAN overall description
  - **TS 33.501** — Security architecture and procedures
- The downloader automatically resolves the **latest release** for each spec from the archive listing.

---

## 📌 Roadmap / future ideas

- [ ] Multi-hop / query decomposition for complex questions
- [ ] Cross-encoder reranking (MiniLM cross-encoder) for precision boost
- [ ] Full-text search persistence (SQLite FTS5) alongside BM25
- [ ] Docker packaging (`Dockerfile` + `docker-compose.yml`)
- [ ] API auth + rate limiting
- [ ] Conversation memory (session-aware follow-up questions)

---

## 📄 License

MIT

---

<div align="center">
Built with ❤️ for a GET (Graduate Engineer Trainee) technical assessment — Telecom RAG, near-zero hallucinations.
</div>
