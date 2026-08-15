import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { parseDocxFile } from '../src/docxParser.js';
import { parsePdfFile } from '../src/pdfParser.js';
import { extractBody } from '../src/extractBody.js';
import { chunkDocument } from '../src/chunker.js';

const log = (...args) => console.log(...args);

const specsRoot = config.store.specsDir;
const textRoot = config.store.textDir;

const specTitle = (specNumber) => {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(
        path.join(config.rootDir, 'scripts', 'specs.config.json'),
        'utf8'
      )
    );
    return cfg.specs.find((s) => s.number === specNumber)?.title ?? null;
  } catch {
    return null;
  }
};

const parseDocument = async (filePath) => {
  if (/\.docx$/i.test(filePath)) return parseDocxFile(filePath);
  if (/\.pdf$/i.test(filePath)) return parsePdfFile(filePath);
  throw new Error(`unsupported document type: ${filePath}`);
};

const main = async () => {
  if (!fs.existsSync(specsRoot)) {
    console.error(`No specs found at ${specsRoot}. Run "npm run specs" first.`);
    process.exit(1);
  }

  const specs = fs
    .readdirSync(specsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  log(`Parsing ${specs.length} spec folder(s) from ${specsRoot}\n`);

  let totalChunks = 0;
  for (const specNumber of specs) {
    const dir = path.join(specsRoot, specNumber);
    const docs = fs
      .readdirSync(dir)
      .filter((f) => /\.(docx|pdf)$/i.test(f));

    for (const doc of docs) {
      const srcPath = path.join(dir, doc);
      const version = doc.replace(/\.(docx|pdf)$/i, '').slice(-3);
      try {
        const text = await parseDocument(srcPath);
        const body = extractBody(text);
        const textDir = path.join(textRoot, specNumber);
        fs.mkdirSync(textDir, { recursive: true });
        const outPath = path.join(textDir, doc.replace(/\.(docx|pdf)$/i, '.txt'));
        fs.writeFileSync(outPath, body, 'utf8');

        const chunks = chunkDocument({
          text: body,
          meta: {
            spec: specNumber,
            version,
            source: doc,
          },
        });
        totalChunks += chunks.length;

        log(`✓ ${specNumber} (v${version})`);
        log(`  body: ${(body.length / 1000).toFixed(0)}k chars → saved ${outPath}`);
        log(`  chunks: ${chunks.length} (sample first chunk below)`);
        log(`  ─────────────────────────`);
        log(`  [${chunks[0]?.section ?? '§?'}] ${chunks[0]?.heading ?? '(no heading)'}`);
        log(`  ${(chunks[0]?.text ?? '').slice(0, 220)}…`);
        log('');
      } catch (err) {
        console.error(`✗ ${specNumber}/${doc}: ${err.message}`);
      }
    }
  }

  log(`Done. ${totalChunks} chunks generated across ${specs.length} specs.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
