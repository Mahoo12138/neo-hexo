import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { JsonStore } from '../src/json-store.js';
import { matchesQuery, createQueryResult } from '../src/query.js';
import { Schema } from '../src/schema.js';
import type { Document } from '../src/types.js';

// ─── Query Engine ────────────────────────────────────────────────────────────

describe('query engine', () => {
  describe('matchesQuery', () => {
    const doc = { _id: '1', name: 'Alice', age: 30, active: true };

    it('matches exact values', () => {
      expect(matchesQuery(doc, { name: 'Alice' })).toBe(true);
      expect(matchesQuery(doc, { name: 'Bob' })).toBe(false);
    });

    it('matches $eq operator', () => {
      expect(matchesQuery(doc, { age: { $eq: 30 } })).toBe(true);
    });

    it('matches $ne operator', () => {
      expect(matchesQuery(doc, { age: { $ne: 25 } })).toBe(true);
      expect(matchesQuery(doc, { age: { $ne: 30 } })).toBe(false);
    });

    it('matches $gt / $gte', () => {
      expect(matchesQuery(doc, { age: { $gt: 25 } })).toBe(true);
      expect(matchesQuery(doc, { age: { $gt: 30 } })).toBe(false);
      expect(matchesQuery(doc, { age: { $gte: 30 } })).toBe(true);
    });

    it('matches $lt / $lte', () => {
      expect(matchesQuery(doc, { age: { $lt: 35 } })).toBe(true);
      expect(matchesQuery(doc, { age: { $lt: 30 } })).toBe(false);
      expect(matchesQuery(doc, { age: { $lte: 30 } })).toBe(true);
    });

    it('matches $in / $nin', () => {
      expect(matchesQuery(doc, { name: { $in: ['Alice', 'Bob'] } })).toBe(true);
      expect(matchesQuery(doc, { name: { $nin: ['Alice', 'Bob'] } })).toBe(false);
    });

    it('matches $exists', () => {
      expect(matchesQuery(doc, { name: { $exists: true } })).toBe(true);
      expect(matchesQuery(doc, { missing: { $exists: false } } as any)).toBe(true);
    });

    it('matches $regex', () => {
      expect(matchesQuery(doc, { name: { $regex: /^Ali/ } })).toBe(true);
      expect(matchesQuery(doc, { name: { $regex: '^Ali' } })).toBe(true);
      expect(matchesQuery(doc, { name: { $regex: /^Bob/ } })).toBe(false);
    });

    it('matches multiple conditions', () => {
      expect(matchesQuery(doc, { name: 'Alice', age: { $gte: 25 } })).toBe(true);
      expect(matchesQuery(doc, { name: 'Alice', age: { $gt: 35 } })).toBe(false);
    });
  });

  describe('QueryResult', () => {
    const docs = [
      { _id: '1', name: 'Charlie', age: 25 },
      { _id: '2', name: 'Alice', age: 30 },
      { _id: '3', name: 'Bob', age: 35 },
    ];

    it('sorts by field ascending', () => {
      const result = createQueryResult([...docs]).sort({ name: 1 }).toArray();
      expect(result.map((d) => d.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts by field descending', () => {
      const result = createQueryResult([...docs]).sort({ age: -1 }).toArray();
      expect(result.map((d) => d.age)).toEqual([35, 30, 25]);
    });

    it('limits results', () => {
      const result = createQueryResult([...docs]).limit(2).toArray();
      expect(result).toHaveLength(2);
    });

    it('skips results', () => {
      const result = createQueryResult([...docs]).skip(1).toArray();
      expect(result).toHaveLength(2);
    });

    it('first() returns the first element', () => {
      expect(createQueryResult([...docs]).first()?._id).toBe('1');
    });

    it('count() returns the length', () => {
      expect(createQueryResult([...docs]).count()).toBe(3);
    });

    it('map() transforms results', () => {
      const names = createQueryResult([...docs]).map((d) => d.name);
      expect(names).toEqual(['Charlie', 'Alice', 'Bob']);
    });
  });
});

// ─── Schema ──────────────────────────────────────────────────────────────────

describe('Schema', () => {
  interface TestDoc extends Document {
    name: string;
    age: number;
    active: boolean;
  }

  const schema = new Schema<TestDoc>({
    name: { type: 'string', required: true },
    age: { type: 'number', default: 0 },
    active: { type: 'boolean', default: true },
  });

  it('applies defaults', () => {
    const doc = schema.applyDefaults({ name: 'Test' } as Partial<TestDoc>);
    expect(doc).toEqual({ name: 'Test', age: 0, active: true });
  });

  it('validates required fields', () => {
    const errors = schema.validate({} as Partial<TestDoc>);
    expect(errors).toContain("Field 'name' is required");
  });

  it('validates field types', () => {
    const errors = schema.validate({ name: 'Test', age: 'not-a-number' as any });
    expect(errors).toContain("Field 'age' expected type 'number', got 'string'");
  });

  it('passes valid documents', () => {
    const errors = schema.validate({ name: 'Test', age: 25, active: true } as TestDoc);
    expect(errors).toEqual([]);
  });
});

// ─── JSON Store ──────────────────────────────────────────────────────────────

describe('JsonStore', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `neo-hexo-db-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    dbPath = path.join(tmpDir, 'db.json');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a new database file on save', async () => {
    const db = new JsonStore({ path: dbPath });
    await db.load();
    const col = db.collection('test');
    col.insert({ name: 'Alice' } as any);
    await db.save();

    const raw = await fs.readFile(dbPath, 'utf-8');
    const data = JSON.parse(raw);
    expect(data.test).toHaveLength(1);
    expect(data.test[0].name).toBe('Alice');
  });

  it('loads existing data', async () => {
    await fs.writeFile(dbPath, JSON.stringify({
      users: [{ _id: 'u1', name: 'Bob' }],
    }));

    const db = new JsonStore({ path: dbPath });
    await db.load();
    const col = db.collection('users');
    expect(col.findById('u1')?.name).toBe('Bob');
  });

  it('CRUD operations work end-to-end', async () => {
    const db = new JsonStore({ path: dbPath });
    await db.load();
    const col = db.collection<Document & { name: string; age: number }>('people');

    // Insert
    const alice = col.insert({ name: 'Alice', age: 30 });
    expect(alice._id).toBeDefined();
    expect(col.count()).toBe(1);

    // Find
    expect(col.findOne({ name: 'Alice' })?.age).toBe(30);
    expect(col.find({ name: 'Alice' }).count()).toBe(1);

    // Update
    col.updateById(alice._id, { age: 31 });
    expect(col.findById(alice._id)?.age).toBe(31);

    // Insert more
    col.insert({ name: 'Bob', age: 25 });
    col.insert({ name: 'Charlie', age: 35 });
    expect(col.count()).toBe(3);

    // Query with operators
    const older = col.find({ age: { $gt: 28 } } as any).toArray();
    expect(older).toHaveLength(2);

    // Remove
    col.removeById(alice._id);
    expect(col.count()).toBe(2);

    // Clear
    col.clear();
    expect(col.count()).toBe(0);

    await db.close();
  });

  it('insertMany inserts multiple documents', async () => {
    const db = new JsonStore({ path: dbPath });
    await db.load();
    const col = db.collection('items');
    const items = col.insertMany([
      { name: 'a' } as any,
      { name: 'b' } as any,
      { name: 'c' } as any,
    ]);
    expect(items).toHaveLength(3);
    expect(col.count()).toBe(3);
    await db.close();
  });

  it('persists and reloads data', async () => {
    const db1 = new JsonStore({ path: dbPath });
    await db1.load();
    db1.collection('tags').insert({ name: 'typescript' } as any);
    await db1.save();
    await db1.close();

    const db2 = new JsonStore({ path: dbPath });
    await db2.load();
    expect(db2.collection('tags').count()).toBe(1);
    await db2.close();
  });
});
