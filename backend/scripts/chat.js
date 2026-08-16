import readline from 'node:readline/promises';
import { ragQuery } from '../src/rag.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const log = (...args) => console.log(...args);

log('3GPP RAG Chatbot (CLI)');
log('Type your question or "quit" to exit.\n');

const loop = async () => {
  while (true) {
    const query = await rl.question('You: ');
    if (!query.trim() || query.trim() === 'quit') break;

    process.stdout.write('\nThinking…\n');
    try {
      const result = await ragQuery(query, { stream: false });

      log(`\nBot${result.confident ? '' : ' (low confidence)'}:\n${result.answer}`);
      if (result.citations.length) {
        log('\nSources:');
        result.citations.forEach((c, i) =>
          log(`  [${i + 1}] TS ${c.spec} §${c.section} — sim ${(c.denseSim * 100).toFixed(0)}%`)
        );
      }
      log(`  (${result.discarded} candidate(s) discarded by threshold)\n`);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
  rl.close();
};

loop();
