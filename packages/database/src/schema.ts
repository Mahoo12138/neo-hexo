/**
 * @neo-hexo/database — Schema & Model helpers
 *
 * Schema definitions and model registration utilities.
 * Provides a typed way to define document shapes for collections.
 */

import type { FieldType, SchemaDefinition, FieldDefinition, Document, DocumentId } from './types.js';

// ─── Schema ──────────────────────────────────────────────────────────────────

/**
 * Schema definition for a collection.
 * Provides default values and field validation metadata.
 */
export class Schema<T extends Document = Document> {
  readonly fields: Map<string, FieldDefinition>;
  private virtuals = new Map<string, (doc: T) => unknown>();

  constructor(definition: SchemaDefinition) {
    this.fields = new Map();
    for (const [name, fieldDef] of Object.entries(definition)) {
      if (typeof fieldDef === 'string') {
        this.fields.set(name, { type: fieldDef as FieldType });
      } else {
        this.fields.set(name, fieldDef);
      }
    }
  }

  /**
   * Define a virtual (computed) property.
   *
   * ```ts
   * schema.virtual('fullName', (doc) => `${doc.first} ${doc.last}`);
   * ```
   */
  virtual(name: string, getter: (doc: T) => unknown): this {
    this.virtuals.set(name, getter);
    return this;
  }

  /**
   * Apply defaults to a partial document.
   */
  applyDefaults(doc: Partial<T>): Partial<T> {
    const result = { ...doc };
    for (const [name, field] of this.fields) {
      if (result[name as keyof T] === undefined && field.default !== undefined) {
        (result as Record<string, unknown>)[name] =
          typeof field.default === 'function'
            ? (field.default as () => unknown)()
            : field.default;
      }
    }
    return result;
  }

  /**
   * Apply virtual properties to a document.
   * Returns a new object with computed properties added.
   */
  applyVirtuals(doc: T): T & Record<string, unknown> {
    const result = { ...doc } as T & Record<string, unknown>;
    for (const [name, getter] of this.virtuals) {
      Object.defineProperty(result, name, {
        get: () => getter(doc),
        enumerable: true,
        configurable: true,
      });
    }
    return result;
  }

  /**
   * Validate a document against the schema.
   * Returns an array of error messages (empty = valid).
   */
  validate(doc: Partial<T>): string[] {
    const errors: string[] = [];

    for (const [name, field] of this.fields) {
      const value = (doc as Record<string, unknown>)[name];

      if (field.required && (value === undefined || value === null)) {
        errors.push(`Field '${name}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (!isValidType(value, field.type)) {
          errors.push(`Field '${name}' expected type '${field.type}', got '${typeof value}'`);
        }
      }
    }

    return errors;
  }
}

// ─── Model Registry ─────────────────────────────────────────────────────────

/**
 * A model definition links a schema to a collection name.
 */
export interface ModelDefinition<T extends Document = Document> {
  name: string;
  schema: Schema<T>;
}

/**
 * Define a model — associates a collection name with a schema.
 */
export function defineModel<T extends Document>(
  name: string,
  definition: SchemaDefinition,
): ModelDefinition<T> {
  return {
    name,
    schema: new Schema<T>(definition),
  };
}

// ─── Built-in Schemas (for Neo-Hexo models) ─────────────────────────────────

/** Cache model — tracks file hashes for incremental builds. */
export interface CacheDocument extends Document {
  _id: DocumentId;
  hash: string;
  modified: number;
}

export const CacheSchema = new Schema<CacheDocument>({
  hash: { type: 'string', required: true },
  modified: { type: 'number', required: true, default: 0 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidType(value: unknown, type: FieldType): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'date': return value instanceof Date;
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value);
    default: return true;
  }
}
