export {
  JsonStore,
  type JsonStoreOptions,
} from './json-store.js';

export {
  Schema,
  defineModel,
  CacheSchema,
  type ModelDefinition,
  type CacheDocument,
} from './schema.js';

export {
  matchesQuery,
  createQueryResult,
} from './query.js';

export type {
  DocumentId,
  Document,
  QueryOperators,
  QueryFilter,
  SortSpec,
  FieldType,
  FieldDefinition,
  SchemaDefinition,
  DatabaseAdapter,
  Collection,
  QueryResult,
} from './types.js';
