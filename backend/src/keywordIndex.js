const STOPWORDS = new Set(
  `a an the of for and or to in on with is are as by at from that this these those
   it its be been being was were can could shall should may might will would must not
   no per such which whose when where than then also between within without using used
   use based according following defined figure table clause annex section subclause
   supporting supported provide provides provisioning via vs e.g i.e i.e.`
    .split(/\s+/)
    .filter(Boolean)
);

export const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w)
  );

/**
 * In-memory BM25 keyword index over chunk texts.
 * Used as the sparse half of the hybrid retrieval (dense + keyword).
 */
export class KeywordIndex {
  constructor() {
    this.reset();
  }

  reset() {
    this.docs = new Map();
    this.postings = new Map();
    this.docFreq = new Map();
    this.docCount = 0;
    this.avgDocLen = 0;
  }

  build(chunks) {
    this.reset();
    let totalLen = 0;
    for (const chunk of chunks) {
      const tokens = tokenize(chunk.text);
      this.docs.set(chunk.id, { len: tokens.length, text: chunk.text });
      totalLen += tokens.length;

      const seen = new Set();
      for (const term of tokens) {
        if (!this.postings.has(term)) this.postings.set(term, new Map());
        const postings = this.postings.get(term);
        postings.set(chunk.id, (postings.get(chunk.id) ?? 0) + 1);
        if (!seen.has(term)) {
          seen.add(term);
          this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
        }
      }
    }
    this.docCount = chunks.length;
    this.avgDocLen = this.docCount ? totalLen / this.docCount : 0;
  }

  score(tokens, id) {
    const doc = this.docs.get(id);
    if (!doc || doc.len === 0) return 0;
    const k1 = 1.2;
    const b = 0.75;
    let score = 0;
    const queryTf = new Map();
    for (const t of tokens) queryTf.set(t, (queryTf.get(t) ?? 0) + 1);

    for (const [term, tf] of queryTf) {
      const tfDoc = this.postings.get(term)?.get(id) ?? 0;
      if (!tfDoc) continue;
      const df = this.docFreq.get(term) ?? 1;
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));
      const denom = tfDoc + k1 * (1 - b + b * (doc.len / this.avgDocLen));
      score += idf * ((tfDoc * (k1 + 1)) / denom);
    }
    return score;
  }

  search(query, k) {
    const tokens = tokenize(query);
    const scored = [];
    for (const id of this.docs.keys()) {
      const s = this.score(tokens, id);
      if (s > 0) scored.push({ id, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}
