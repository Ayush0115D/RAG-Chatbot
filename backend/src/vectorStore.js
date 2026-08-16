import * as lancedb from '@lancedb/lancedb';
import { config } from './config.js';

let cached = null;

/**
 * Lightweight wrapper around an embedded LanceDB table.
 * Rows are chunk documents with a `vector` column (cosine distance).
 */
export async function getStore() {
  if (cached) return cached;

  const db = await lancedb.connect(config.store.indexDir);
  const name = config.store.indexName;
  const exists = (await db.tableNames()).includes(name);
  const table = exists ? await db.openTable(name) : null;

  const store = {
    exists,
    table,

    async count() {
      return this.table ? this.table.countRows() : 0;
    },

    async create(rows) {
      if (this.table) {
        try {
          await db.dropTable(name);
        } catch {
          /* ignore */
        }
      }
      this.table = await db.createTable(name, rows);
      this.exists = true;
      return this.table;
    },

    async search(queryVector, k) {
      if (!this.table) return [];
      return this.table
        .search(queryVector)
        .distanceType('cosine')
        .limit(k)
        .toArray();
    },

    async all() {
      if (!this.table) return [];
      const arrow = await this.table.toArrow();
      return arrow.toArray();
    },
  };

  cached = store;
  return store;
}
