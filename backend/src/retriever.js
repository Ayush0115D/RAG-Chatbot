import { config } from './config.js';
import { embed } from './embeddings.js';
import { getStore } from './vectorStore.js';
import { KeywordIndex } from './keywordIndex.js';

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

/**
 * Hybrid retriever (dense + BM25) with hallucination guardrails:
 *
 *  1. Dense candidates from the vector store (semantic).
 *  2. Sparse candidates from the BM25 index (keyword).
 *  3. Fused ranking via min-max normalised score combination.
 *  4. Re-embedding of the fused candidates to measure the TRUE cosine
 *     similarity to the query (grounding signal).
 *  5. Threshold on that similarity — anything below it is discarded, which
 *     drives the "I don't know" fallback instead of confident guessing.
 */
export class Retriever {
  constructor({ store, keywordIndex, cfg }) {
    this.store = store;
    this.keywordIndex = keywordIndex;
    this.cfg = cfg;
  }

  static async create() {
    const store = await getStore();
    if (!store.exists || (await store.count()) === 0) {
      throw new Error(
        'vector index is empty — run "npm run ingest" in backend/ first'
      );
    }
    const rows = await store.all();
    const keywordIndex = new KeywordIndex();
    keywordIndex.build(rows.map((r) => ({ id: r.id, text: r.text })));
    return new Retriever({ store, keywordIndex, cfg: config.retrieval });
  }

  async search(query, options = {}) {
    const topK = options.topK ?? this.cfg.topK;
    const candidates = options.candidates ?? this.cfg.fusionCandidates;
    const keywordWeight = options.keywordWeight ?? this.cfg.keywordWeight;
    const threshold = options.threshold ?? this.cfg.threshold;

    const [queryVec] = await embed([query]);

    const denseRows = await this.store.search(queryVec, candidates);
    const dense = denseRows.map((r) => ({ id: r.id, denseSim: 1 - r._distance, row: r }));

    const keywordHits = this.keywordIndex.search(query, candidates);

    const union = new Map();
    for (const d of dense) union.set(d.id, { id: d.id, denseSim: d.denseSim, row: d.row });
    for (const k of keywordHits) {
      const entry = union.get(k.id) ?? { id: k.id, denseSim: null, row: null };
      entry.bm25 = k.score;
      union.set(k.id, entry);
    }

    const denseScores = dense.map((d) => d.denseSim);
    const minD = Math.min(...denseScores);
    const maxD = Math.max(...denseScores);
    const bm25Scores = keywordHits.map((k) => k.score);
    const minB = Math.min(...bm25Scores);
    const maxB = Math.max(...bm25Scores);
    const norm = (v, lo, hi) => (hi > lo ? (v - lo) / (hi - lo) : 1);

    const fused = [...union.values()].map((e) => ({
      ...e,
      hybridScore:
        (1 - keywordWeight) * norm(e.denseSim ?? minD, minD, maxD) +
        keywordWeight * (e.bm25 !== undefined ? norm(e.bm25, minB, maxB) : 0),
    }));
    fused.sort((a, b) => b.hybridScore - a.hybridScore);

    const top = fused.slice(0, candidates);

    const verified = top.length
      ? await this.#verifyAgainstQuery(queryVec, top, query)
      : [];

    const confident = verified
      .filter((r) => r.denseSim >= threshold)
      .slice(0, topK);

    return {
      query,
      results: confident,
      discarded: verified.length - confident.length,
      candidates: candidates,
      topK,
      threshold,
    };
  }

  async #verifyAgainstQuery(queryVec, items, query) {
    const texts = items.map((i) => i.row?.text ?? i.text ?? '');
    const vectors = await embed(texts);
    return items.map((item, idx) => {
      const row = item.row ?? {};
      return {
        id: item.id,
        text: row.text ?? '',
        spec: row.spec ?? null,
        version: row.version ?? null,
        source: row.source ?? null,
        section: row.section ?? null,
        paragraph: row.paragraph ?? null,
        heading: row.heading ?? null,
        page: row.page ?? null,
        score: item.hybridScore,
        denseSim: cosine(queryVec, vectors[idx]),
        bm25: item.bm25 ?? 0,
      };
    });
  }
}
