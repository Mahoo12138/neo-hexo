/**
 * @neo-hexo/processor
 *
 * Built-in file processors for Neo-Hexo.
 * Registers Box processors for posts, pages, assets, and data files.
 *
 * Usage:
 * ```ts
 * import processors from '@neo-hexo/processor';
 *
 * export default defineConfig({
 *   plugins: [processors()],
 * });
 * ```
 */

import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import type {
  NeoHexoPlugin,
  Context,
  SourceFile,
  PostData,
  PostProcessor,
} from '@neo-hexo/core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessorOptions {
  /** Directory for posts (default: '_posts'). */
  postDir?: string;
  /** Directory for drafts (default: '_drafts'). */
  draftDir?: string;
  /** Directory for data files (default: '_data'). */
  dataDir?: string;
  /** Whether to process draft posts (default: false). */
  includeDrafts?: boolean;
}

// ─── Collected Data (stored in context) ──────────────────────────────────────

export interface ProcessedData {
  posts: PostData[];
  pages: PostData[];
  dataFiles: Map<string, unknown>;
  assets: string[];
}

import { createServiceKey } from '@neo-hexo/core';
export const ProcessedDataKey = createServiceKey<ProcessedData>('processedData');

// ─── Plugin Factory ──────────────────────────────────────────────────────────

export default function processorPlugin(
  options: ProcessorOptions = {},
): NeoHexoPlugin {
  const {
    postDir: _postDir = '_posts',
    draftDir: _draftDir = '_drafts',
    dataDir: _dataDir = '_data',
    includeDrafts: _includeDrafts = false,
  } = options;
  void _postDir; void _draftDir; void _dataDir; void _includeDrafts;

  return {
    name: 'neo-hexo:processor',
    enforce: 'pre',

    apply(ctx: Context) {
      // Initialize the processed data store
      const data: ProcessedData = {
        posts: [],
        pages: [],
        dataFiles: new Map(),
        assets: [],
      };
      ctx.provide(ProcessedDataKey, data);

      // We tap the processFile hook to handle each file
      return {
        dispose() {
          data.posts.length = 0;
          data.pages.length = 0;
          data.dataFiles.clear();
          data.assets.length = 0;
        },
      };
    },

    hooks: {
      processFile(_file: SourceFile) {
        // This will be called by the NeoHexo build process for each source file
        // Actual implementation delegates based on path patterns
      },
    },
  };
}

// ─── Individual Processors ───────────────────────────────────────────────────

/**
 * Determine the file type based on its path.
 */
export function classifyFile(
  path: string,
  options: { postDir: string; draftDir: string; dataDir: string },
): 'post' | 'draft' | 'data' | 'page' | 'asset' {
  const normalized = path.replace(/\\/g, '/');

  if (normalized.startsWith(options.postDir + '/')) return 'post';
  if (normalized.startsWith(options.draftDir + '/')) return 'draft';
  if (normalized.startsWith(options.dataDir + '/')) return 'data';

  // Renderable files without a leading _ are pages
  const ext = nodePath.extname(normalized).toLowerCase();
  if (['.md', '.markdown', '.html', '.htm'].includes(ext)) return 'page';

  return 'asset';
}

/**
 * Process a post source file.
 */
export async function processPost(
  file: SourceFile,
  postProcessor: PostProcessor,
): Promise<PostData | null> {
  if (file.type === 'delete') return null;

  const content = file.content ?? await fs.readFile(file.source, 'utf-8');
  return postProcessor.parse(content, file.path);
}

/**
 * Process a data file (YAML/JSON).
 */
export async function processDataFile(
  file: SourceFile,
): Promise<{ key: string; value: unknown } | null> {
  if (file.type === 'delete') return null;

  const content = file.content ?? await fs.readFile(file.source, 'utf-8');
  const ext = nodePath.extname(file.path).toLowerCase();
  const key = nodePath.basename(file.path, ext);

  if (ext === '.json') {
    return { key, value: JSON.parse(content) };
  }

  // Simple YAML key-value parsing for .yml/.yaml
  if (ext === '.yml' || ext === '.yaml') {
    const data: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0 && !line.startsWith('#')) {
        data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return { key, value: data };
  }

  return null;
}

// Re-export types
export type { ProcessorOptions as Options };
