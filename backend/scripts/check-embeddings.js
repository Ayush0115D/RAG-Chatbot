import { embed } from '../src/embeddings.js';

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const sentences = [
  'The AMF supports the UE registration procedure.',
  'Network Slice Selection Assistance Information identifies a network slice.',
  'The weather in Paris is sunny today.',
];

console.log('Embedding smoke test (provider from .env)\n');
const vectors = await embed(sentences);
console.log('dimensions:', vectors[0].length);
console.log('samples embedded:', vectors.length);

const [a, b, c] = vectors;
console.log('sim("AMF registration", "network slice") =', cosine(a, b).toFixed(3));
console.log('sim("AMF registration", "weather in Paris") =', cosine(a, c).toFixed(3));
