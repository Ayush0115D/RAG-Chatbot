import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { config } from '../src/config.js';
import {
  ARCHIVE_ROOT,
  specFolderUrl,
  specFileUrl,
  parseListing,
  pickBest,
} from '../src/specResolver.js';

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'specs.config.json');

const log = (...args) => console.log(...args);

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};
const LIMIT = Number(argValue('--limit') || 0);
const RELEASE = argValue('--release');

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'RAG-Chatbot/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.text();
};

const downloadZip = async (url, dest) => {
  log(`  downloading ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'RAG-Chatbot/1.0' } });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf;
};

const extractDocument = (zipBuffer, specNumber, destDir) => {
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntries().find((e) => {
    if (e.isDirectory) return false;
    return /\.pdf$/i.test(e.entryName) || /\.docx$/i.test(e.entryName);
  });
  if (!entry) {
    throw new Error(
      `no parseable document (PDF/DOCX) found inside archive for ${specNumber}`
    );
  }
  const docName = path.basename(entry.entryName);
  fs.mkdirSync(destDir, { recursive: true });
  const docPath = path.join(destDir, docName);
  fs.writeFileSync(docPath, entry.getData());
  return { docPath, docName, kind: /\.pdf$/i.test(docName) ? 'pdf' : 'docx' };
};

const processSpec = async (spec) => {
  const { number, title } = spec;
  log(`\n── ${number} — ${title}`);
  const listing = await fetchText(specFolderUrl(number));
  const files = parseListing(listing, number);
  if (files.length === 0) throw new Error(`no zips found for ${number}`);

  const best = pickBest(files, RELEASE);
  if (!best) {
    log(`  ✗ no version found${RELEASE ? ` for release ${RELEASE}` : ''}, skipping`);
    return null;
  }

  const destDir = path.join(config.store.specsDir, number);
  const zipPath = path.join(destDir, best.filename);

  if (fs.existsSync(zipPath)) {
    log(`  ✓ ${best.filename} already downloaded`);
    return { number, filename: best.filename, cached: true };
  }

  const zipBuffer = await downloadZip(specFileUrl(number, best.filename), zipPath);
  const { docPath, docName, kind } = extractDocument(zipBuffer, number, destDir);
  fs.rmSync(zipPath, { force: true });
  log(`  ✓ ${best.filename} (${best.suffix}) → ${docName} [${kind}]`);
  return { number, filename: best.filename, cached: false };
};

const main = async () => {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const specs = LIMIT > 0 ? cfg.specs.slice(0, LIMIT) : cfg.specs;
  const resolvedRelease = RELEASE ?? cfg.release ?? null;

  log(`3GPP spec downloader`);
  log(`source: ${ARCHIVE_ROOT}`);
  if (resolvedRelease != null) log(`target release: ${resolvedRelease}`);
  log(`specs: ${specs.length} (${specs.map((s) => s.number).join(', ')})`);

  const results = [];
  for (const spec of specs) {
    try {
      results.push(await processSpec(spec));
    } catch (err) {
      console.error(`  ✗ ${spec.number} failed: ${err.message}`);
    }
  }

  const ok = results.filter(Boolean);
  log(`\nDone. ${ok.length}/${specs.length} specs ready in ${config.store.specsDir}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
