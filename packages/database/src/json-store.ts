/**
 * @neo-hexo/database — JSON Store Adapter
 *
 * Default database adapter: in-memory collections with JSON file persistence.
 * Zero external dependencies. Suitable for small to medium sites.
 */

import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  DatabaseAdapter,
  Collection,
  Document,
  DocumentId,
  QueryFilter,
  QueryResult,
} from './types.js';
import { matchesQuery, createQueryResult } from './query.js';

// ─── JSON Store ──────────────────────────────────────────────────────────────

export interface JsonStoreOptions {
  /** Path to the JSON file. */
  path: string;
}

/**
 * In-memory database backed by a single JSON file.
 * Each collection is stored as a top-level key in the JSON.
 */
export class JsonStore implements DatabaseAdapter {
  private filePath: string;
  private data: Record<string, Document[]> = {};
  private collections = new Map<string, JsonCollection<Document>>();

  constructor(options: JsonStoreOptions) {
    this.filePath = options.path;
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw) as Record<string, Document[]>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.data = {};
      } else {
        throw err;
      }
    }

    // Hydrate existing collections
    for (const col of this.collections.values()) {
      col.hydrate(this.data[col.name] ?? []);
    }
  }

  async save(): Promise<void> {
    // Sync collection data back
    for (const col of this.collections.values()) {
      this.data[col.name] = col.dump();
    }

    await fs.mkdir(nodePath.dirname(this.filePath), { recursive: true });

    // Write atomically: write to temp file then rename
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    let col = this.collections.get(name);
    if (!col) {
      col = new JsonCollection<Document>(name, this.data[name] ?? []);
      this.collections.set(name, col);
    }
    return col as unknown as Collection<T>;
  }

  async close(): Promise<void> {
    await this.save();
    this.collections.clear();
  }
}

// ─── JSON Collection ─────────────────────────────────────────────────────────

class JsonCollection<T extends Document> implements Collection<T> {
  readonly name: string;
  private docs: Map<DocumentId, T>;

  constructor(name: string, initial: T[]) {
    this.name = name;
    this.docs = new Map(initial.map((d) => [d._id, d]));
  }

  /** Re-hydrate from loaded data. */
  hydrate(data: T[]): void {
    this.docs.clear();
    for (const doc of data) {
      this.docs.set(doc._id, doc);
    }
  }

  /** Dump all documents as an array (for serialization). */
  dump(): T[] {
    return [...this.docs.values()];
  }

  insert(doc: Omit<T, '_id'> & { _id?: DocumentId }): T {
    const full = { ...doc, _id: doc._id ?? randomUUID() } as T;
    this.docs.set(full._id, full);
    return full;
  }

  insertMany(docs: Array<Omit<T, '_id'> & { _id?: DocumentId }>): T[] {
    return docs.map((d) => this.insert(d));
  }

  find(query?: QueryFilter<T>): QueryResult<T> {
    const all = [...this.docs.values()];
    if (!query || Object.keys(query).length === 0) {
      return createQueryResult(all) as QueryResult<T>;
    }
    const matched = all.filter((doc) => matchesQuery(doc, query));
    return createQueryResult(matched) as QueryResult<T>;
  }

  findOne(query: QueryFilter<T>): T | undefined {
    for (const doc of this.docs.values()) {
      if (matchesQuery(doc, query)) return doc;
    }
    return undefined;
  }

  findById(id: DocumentId): T | undefined {
    return this.docs.get(id);
  }

  update(query: QueryFilter<T>, update: Partial<T>): number {
    let count = 0;
    for (const doc of this.docs.values()) {
      if (matchesQuery(doc, query)) {
        Object.assign(doc, update);
        count++;
      }
    }
    return count;
  }

  updateById(id: DocumentId, update: Partial<T>): T | undefined {
    const doc = this.docs.get(id);
    if (!doc) return undefined;
    Object.assign(doc, update);
    return doc;
  }

  remove(query: QueryFilter<T>): number {
    let count = 0;
    for (const [id, doc] of this.docs) {
      if (matchesQuery(doc, query)) {
        this.docs.delete(id);
        count++;
      }
    }
    return count;
  }

  removeById(id: DocumentId): boolean {
    return this.docs.delete(id);
  }

  count(query?: QueryFilter<T>): number {
    if (!query || Object.keys(query).length === 0) return this.docs.size;
    let count = 0;
    for (const doc of this.docs.values()) {
      if (matchesQuery(doc, query)) count++;
    }
    return count;
  }

  clear(): void {
    this.docs.clear();
  }
}
