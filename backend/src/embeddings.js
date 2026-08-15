import { config } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isNetworkError = (err) =>
  /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|socket/i.test(
    `${err.cause?.code ?? ''} ${err.message}`
  );

const retry = async (fn, attempts = 3, baseDelay = 1000, label = '') => {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts || !isNetworkError(err)) throw err;
      console.warn(
        `[embeddings] ${label} attempt ${i}/${attempts} failed (${err.cause?.code ?? err.message}). retrying…`
      );
      await sleep(baseDelay * i);
    }
  }
};

class LocalEmbedder {
  constructor(model) {
    this.model = model;
    this.extractor = null;
  }

  async init() {
    const { pipeline } = await import('@huggingface/transformers');
    this.extractor = await retry(
      () => pipeline('feature-extraction', this.model, { dtype: 'q8' }),
      3,
      2000,
      `loading model ${this.model}`
    );
  }

  async embedMany(texts) {
    const output = await this.extractor(texts, {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist();
  }
}

class ApiEmbedder {
  constructor({ apiKey, baseUrl, model }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async init() {}

  async embedMany(texts) {
    if (!this.apiKey) {
      throw new Error(
        `EMBEDDING_PROVIDER=openai requires an API key (EMBED_API_KEY / OPENAI_API_KEY)`
      );
    }
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`embeddings API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    return [...data.data]
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

let singleton = null;

export async function getEmbedder() {
  if (singleton) return singleton;
  const { provider } = config.embeddings;
  if (provider === 'local') {
    singleton = new LocalEmbedder(config.embeddings.model);
  } else if (provider === 'openai') {
    singleton = new ApiEmbedder({
      apiKey: config.embeddings.apiKey,
      baseUrl: config.embeddings.baseUrl,
      model: config.embeddings.apiModel,
    });
  } else {
    throw new Error(`unknown embedding provider: ${provider}`);
  }
  await singleton.init();
  return singleton;
}

export async function embed(texts) {
  const embedder = await getEmbedder();
  const result = await embedder.embedMany(texts);
  const dims = result[0]?.length ?? 0;
  if (dims !== config.embeddings.dims) {
    throw new Error(
      `embedding dimension mismatch: expected ${config.embeddings.dims}, got ${dims}`
    );
  }
  return result;
}
