import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';

const indexDir = config.store.indexDir;
const indexName = config.store.indexName;

const indexExists = fs.existsSync(path.join(indexDir, indexName + '.lance'));

if (indexExists) {
  console.log(`Index already exists at ${indexDir}/${indexName}. Skipping build.`);
  process.exit(0);
}

console.log('No index found — running full build...');

const { execSync } = await import('node:child_process');

console.log('\n→ Downloading specs...');
execSync('node scripts/download-specs.js', { stdio: 'inherit' });

console.log('\n→ Extracting text...');
execSync('node scripts/extract-text.js', { stdio: 'inherit' });

console.log('\n→ Ingesting...');
execSync('node scripts/ingest.js', { stdio: 'inherit' });

console.log('\n✓ Build complete.');
