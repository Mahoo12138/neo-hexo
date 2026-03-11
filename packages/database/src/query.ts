/**
 * @neo-hexo/database — Query Engine
 *
 * In-memory query matching and result set implementation.
 * Used by the JSON store adapter (and potentially others).
 */

import type { Document, QueryFilter, QueryOperators, QueryResult, SortSpec } from './types.js';

// ─── Query Matching ──────────────────────────────────────────────────────────

/**
 * Check if a document matches a query filter.
 */
export function matchesQuery<T extends Document>(doc: T, query: QueryFilter<T>): boolean {
  for (const [key, condition] of Object.entries(query)) {
    const value = doc[key];

    if (condition === null || condition === undefined) {
      if (value !== condition) return false;
      continue;
    }

    // Operator-based query
    if (typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date) && !(condition instanceof RegExp)) {
      const ops = condition as QueryOperators;
      if (!matchOperators(value, ops)) return false;
    } else {
      // Direct equality
      if (value !== condition) return false;
    }
  }

  return true;
}

function matchOperators(value: unknown, ops: QueryOperators): boolean {
  if (ops.$eq !== undefined && value !== ops.$eq) return false;
  if (ops.$ne !== undefined && value === ops.$ne) return false;
  if (ops.$gt !== undefined && !(typeof value === typeof ops.$gt && (value as number) > (ops.$gt as number))) return false;
  if (ops.$gte !== undefined && !(typeof value === typeof ops.$gte && (value as number) >= (ops.$gte as number))) return false;
  if (ops.$lt !== undefined && !(typeof value === typeof ops.$lt && (value as number) < (ops.$lt as number))) return false;
  if (ops.$lte !== undefined && !(typeof value === typeof ops.$lte && (value as number) <= (ops.$lte as number))) return false;
  if (ops.$in !== undefined && !ops.$in.includes(value)) return false;
  if (ops.$nin !== undefined && ops.$nin.includes(value)) return false;
  if (ops.$exists !== undefined) {
    const exists = value !== undefined && value !== null;
    if (ops.$exists !== exists) return false;
  }
  if (ops.$regex !== undefined) {
    const regex = ops.$regex instanceof RegExp ? ops.$regex : new RegExp(ops.$regex);
    if (typeof value !== 'string' || !regex.test(value)) return false;
  }
  return true;
}

// ─── Query Result ────────────────────────────────────────────────────────────

/**
 * Create a QueryResult wrapper around an array of documents.
 */
export function createQueryResult<T extends Document>(docs: T[]): QueryResult<T> {
  return new ArrayQueryResult(docs);
}

class ArrayQueryResult<T extends Document> implements QueryResult<T> {
  private docs: T[];

  constructor(docs: T[]) {
    // Work with a copy to avoid mutation
    this.docs = [...docs];
  }

  sort(spec: SortSpec<T>): QueryResult<T> {
    const entries = Object.entries(spec) as [string, 1 | -1][];
    this.docs.sort((a, b) => {
      for (const [key, order] of entries) {
        const av = a[key] as string | number;
        const bv = b[key] as string | number;
        if (av < bv) return -order;
        if (av > bv) return order;
      }
      return 0;
    });
    return this;
  }

  limit(n: number): QueryResult<T> {
    this.docs = this.docs.slice(0, n);
    return this;
  }

  skip(n: number): QueryResult<T> {
    this.docs = this.docs.slice(n);
    return this;
  }

  toArray(): T[] {
    return this.docs;
  }

  forEach(fn: (doc: T) => void): void {
    this.docs.forEach(fn);
  }

  map<U>(fn: (doc: T) => U): U[] {
    return this.docs.map(fn);
  }

  first(): T | undefined {
    return this.docs[0];
  }

  count(): number {
    return this.docs.length;
  }
}
