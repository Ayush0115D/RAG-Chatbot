import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';

let server;
let BASE;

const setup = () =>
  new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      BASE = `http://localhost:${port}`;
      resolve();
    });
  });

const teardown = () => new Promise((resolve) => server?.close(resolve));

describe('API routes', () => {
  it('GET /api/health', async () => {
    await setup();
    try {
      const res = await fetch(`${BASE}/api/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ok');
    } finally {
      await teardown();
    }
  });

  it('POST /api/chat rejects empty query', async () => {
    await setup();
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });
      assert.equal(res.status, 400);
    } finally {
      await teardown();
    }
  });

  it('POST /api/chat/stream rejects empty query', async () => {
    await setup();
    try {
      const res = await fetch(`${BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });
      assert.equal(res.status, 400);
    } finally {
      await teardown();
    }
  });
});
