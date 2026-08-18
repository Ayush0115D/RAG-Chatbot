import express from 'express';
import cors from 'cors';
import { ragQuery } from './src/rag.js';
import { getEmbedder } from './src/embeddings.js';
import { getStore } from './src/vectorStore.js';

export const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/chat', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await ragQuery(query, { stream: false });
    res.json(result);
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: 'failed to process query' });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const { stream, citations, discarded } = await ragQuery(query, { stream: true });
    res.write(`data: ${JSON.stringify({ type: 'meta', citations, discarded })}\n\n`);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('stream error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'failed to process query' })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;

if (process.argv[1]?.endsWith('server.js')) {
  app.listen(PORT, async () => {
    console.log(`backend listening on http://localhost:${PORT}`);
    try {
      await getStore();
      console.log('[startup] vector store loaded');
      await getEmbedder();
      console.log('[startup] embedding model loaded');
    } catch (err) {
      console.error('[startup] preload failed:', err.message);
    }
  });
}
