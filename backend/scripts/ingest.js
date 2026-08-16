import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { chunkDocument } from '../src/chunker.js';
import { embed } from '../src/embeddings.js';
import { getStore } from '../src/vectorStore.js';
import { Retriever } from '../src/retriever.js';

const log = (...args) => console.log(...args);

const BATCH = 64;

const args = process.argv.slice(2);
const LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.slice(8) || 0);
const TEST_QUERY =
  args.find((a) => a.startsWith('--test='))?.slice(7) ??
  'How does the AMF support UE registration?';

const chunkBatch = async (batch, meta) => {
  const vectors = await embed(batch.map((c) => c.text));
  return batch.map((c, i) => ({ ...c, vector: vectors[i] }));
};

const main = async () => {
  const textRoot = config.store.textDir;
  if (!fs.existsSync(textRoot)) {
    console.error(`No extracted text found at ${textRoot}. Run "npm run extract" first.`);
    process.exit(1);
  }

  const specs = fs.readdirSync(textRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  if (specs.length === 0) {
    console.error(`No text files under ${textRoot}. Run "npm run extract" first.`);
    process.exit(1);
  }
  const selected = LIMIT > 0 ? specs.slice(0, LIMIT) : specs;

  log(`Ingesting ${selected.length}/${specs.length} spec(s) into ${config.store.indexDir}`);
  log(`Embedding provider: ${config.embeddings.provider} (${config.embeddings.model})`);

  const allChunks = [];
  for (const specDir of selected) {
    const spec = specDir.name;
    const files = fs
      .readdirSync(path.join(textRoot, spec))
      .filter((f) => f.endsWith('.txt'));

    for (const file of files) {
      const text = fs.readFileSync(path.join(textRoot, spec, file), 'utf8');
      const version = file.replace('.txt', '').slice(-3);
      const chunks = chunkDocument({
        text,
        meta: { spec, version, source: file },
      });
      allChunks.push(...chunks);
      log(`  ${spec} v${version}: ${chunks.length} chunks`);
    }
  }

  log(`\nEmbedding ${allChunks.length} chunks…`);
  const rows = [];
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const embedded = await chunkBatch(batch);
    embedded.forEach((c, j) => {
      c.id = `${c.spec}-${i + j}`;
      c.heading = c.heading ?? '';
      c.paragraph = c.paragraph ?? '';
      c.section = c.section ?? '';
    });
    rows.push(...embedded);
    const done = Math.min(i + BATCH, allChunks.length);
    if (done % (BATCH * 8) === 0 || done === allChunks.length) {
      log(`  embedded ${done}/${allChunks.length}`);
    }
  }

  const store = await getStore();
  await store.create(rows);
  const count = await store.count();
  log(`✓ stored ${count} chunks in table "${config.store.indexName}"`);

  log(`\nSelf-check retrieval for: "${TEST_QUERY}"`);
  const retriever = await Retriever.create();
  const { results, discarded, threshold } = await retriever.search(TEST_QUERY, {
    topK: 5,
  });

  if (results.length === 0) {
    log('  no confident evidence found above threshold — the bot would answer "I don\'t know"');
  }
  for (const r of results) {
    const cite = r.section ? `TS ${r.spec} §${r.section}` : `TS ${r.spec}`;
    log(`  [${(r.denseSim * 100).toFixed(0)}%] ${cite} ${r.text.slice(0, 110)}…`);
  }
  log(`  (${discarded} candidate(s) discarded below sim threshold ${threshold})`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
