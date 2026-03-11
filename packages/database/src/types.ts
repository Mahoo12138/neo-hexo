/**
 * @neo-hexo/database — Types
 *
 * Shared type definitions for the database adapter interface.
 */

// ─── Document ────────────────────────────────────────────────────────────────

/** A document ID (string-based, auto-generated). */
export type DocumentId = string;

/** Base document with an ID field. */
export interface Document {
  _id: DocumentId;
  [key: string]: unknown;
}

// ─── Query ───────────────────────────────────────────────────────────────────

/** Query operators for filtering. */
export interface QueryOperators<T = unknown> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $exists?: boolean;
  $regex?: RegExp | string;
}

/** A query filter — either a direct value match or operator-based. */
export type QueryFilter<T extends Document = Document> = {
  [K in keyof T]?: T[K] | QueryOperators<T[K]>;
};

/** Sort specification. 1 = ascending, -1 = descending. */
export type SortSpec<T extends Document = Document> = Partial<Record<keyof T & string, 1 | -1>>;

// ─── Schema ──────────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  default?: unknown;
  ref?: string;
}

export interface SchemaDefinition {
  [field: string]: FieldDefinition | FieldType;
}

// ─── Adapter Interface ──────────────────────────────────────────────────────

/**
 * Database adapter interface.
 * Both JSON store and SQLite adapter implement this interface.
 */
export interface DatabaseAdapter {
  /** Load database from storage. */
  load(): Promise<void>;
  /** Save database to storage. */
  save(): Promise<void>;

  /** Get a collection (model) by name. */
  collection<T extends Document = Document>(name: string): Collection<T>;

  /** Close the database connection / clean up. */
  close(): Promise<void>;
}

/**
 * A typed collection of documents (like a table or model).
 */
export interface Collection<T extends Document = Document> {
  readonly name: string;

  /** Insert a document (auto-generates _id if not provided). */
  insert(doc: Omit<T, '_id'> & { _id?: DocumentId }): T;

  /** Insert multiple documents. */
  insertMany(docs: Array<Omit<T, '_id'> & { _id?: DocumentId }>): T[];

  /** Find documents matching a query. */
  find(query?: QueryFilter<T>): QueryResult<T>;

  /** Find a single document. */
  findOne(query: QueryFilter<T>): T | undefined;

  /** Find a document by ID. */
  findById(id: DocumentId): T | undefined;

  /** Update documents matching a query. Returns the number of updated documents. */
  update(query: QueryFilter<T>, update: Partial<T>): number;

  /** Update a document by ID. */
  updateById(id: DocumentId, update: Partial<T>): T | undefined;

  /** Remove documents matching a query. Returns the number of removed documents. */
  remove(query: QueryFilter<T>): number;

  /** Remove a document by ID. */
  removeById(id: DocumentId): boolean;

  /** Count documents matching a query. */
  count(query?: QueryFilter<T>): number;

  /** Remove all documents from the collection. */
  clear(): void;
}

/**
 * Result set from a find() query, supporting chained operations.
 */
export interface QueryResult<T extends Document = Document> {
  /** Sort the results. */
  sort(spec: SortSpec<T>): QueryResult<T>;

  /** Limit the number of results. */
  limit(n: number): QueryResult<T>;

  /** Skip the first n results. */
  skip(n: number): QueryResult<T>;

  /** Convert to an array. */
  toArray(): T[];

  /** Iterate over results. */
  forEach(fn: (doc: T) => void): void;

  /** Map results. */
  map<U>(fn: (doc: T) => U): U[];

  /** Get the first result. */
  first(): T | undefined;

  /** Get the count of results. */
  count(): number;
}
