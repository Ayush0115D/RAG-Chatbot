import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const str = (value, fallback) => (value && value.trim() ? value.trim() : fallback);

const stripTrailingSlash = (url) => (url || '').replace(/\/+$/, '');

const env = process.env;

export const config = {
  rootDir,
  env: env.NODE_ENV || 'development',

  server: {
    port: num(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
  },

  llm: {
    provider: str(env.LLM_PROVIDER, 'openai').toLowerCase(),
    apiKey: env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.LLM_API_KEY || '',
    baseUrl: stripTrailingSlash(str(env.LLM_BASE_URL, 'https://api.openai.com/v1')),
    model: str(env.LLM_MODEL, 'gpt-4o-mini'),
    temperature: Number.isFinite(Number(env.LLM_TEMPERATURE))
      ? Number(env.LLM_TEMPERATURE)
      : 0.2,
    maxTokens: num(env.LLM_MAX_TOKENS, 1024),
  },

  embeddings: {
    provider: str(env.EMBEDDING_PROVIDER, 'local').toLowerCase(),
    model: str(env.EMBEDDING_MODEL, 'Xenova/all-MiniLM-L6-v2'),
    apiModel: str(env.EMBED_MODEL, 'text-embedding-3-small'),
    apiKey: env.EMBED_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.LLM_API_KEY || '',
    baseUrl: stripTrailingSlash(
      str(env.EMBED_BASE_URL, env.LLM_BASE_URL, 'https://api.openai.com/v1')
    ),
    dims: num(env.EMBED_DIMS, 384),
  },

  retrieval: {
    topK: num(env.RETRIEVAL_TOP_K, 6),
    threshold: Number.isFinite(Number(env.RETRIEVAL_THRESHOLD))
      ? Number(env.RETRIEVAL_THRESHOLD)
      : 0.35,
    keywordWeight: Number.isFinite(Number(env.RETRIEVAL_KEYWORD_WEIGHT))
      ? Number(env.RETRIEVAL_KEYWORD_WEIGHT)
      : 0.3,
    fusionCandidates: num(env.RETRIEVAL_FUSION_CANDIDATES, 20),
  },

  store: {
    dir: str(env.DATA_DIR, path.join(rootDir, 'data')),
    get specsDir() {
      return path.join(this.dir, 'specs');
    },
    get textDir() {
      return path.join(this.dir, 'text');
    },
    get indexDir() {
      return path.join(this.dir, 'index');
    },
    indexName: '3gpp_index',
  },
};
