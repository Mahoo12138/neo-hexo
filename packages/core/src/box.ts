/**
 * @neo-hexo/core — Box (File Processor)
 *
 * Watches a directory for file changes, compares hashes against a cache,
 * and dispatches files to registered processors via lifecycle hooks.
 *
 * Replaces the old Box class from lib/box/index.ts with a modern,
 * hook-based approach and SHA-256 hashing.
 */

import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { SourceFile } from './lifecycle.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProcessorFn = (file: SourceFile) => void | Promise<void>;

export interface ProcessorEntry {
  /** Glob-like pattern (simple prefix/extension match). */
  pattern: string | RegExp | ((path: string) => boolean);
  /** Processor function. */
  fn: ProcessorFn;
}

/** Cache entry for a single file — used for incremental builds. */
export interface FileCacheEntry {
  hash: string;
  modified: number;
}

// ─── Box ─────────────────────────────────────────────────────────────────────

export class Box {
  /** Root directory this box watches. */
  readonly base: string;
  /** Registered processors. */
  private processors: ProcessorEntry[] = [];
  /** File hash cache for change detection. */
  private cache = new Map<string, FileCacheEntry>();

  constructor(base: string) {
    this.base = nodePath.resolve(base);
  }

  // ── Processor Registration ──

  /**
   * Register a file processor.
   *
   * @param pattern - A string prefix, RegExp, or predicate function.
   * @param fn - Processor function that handles matched files.
   */
  addProcessor(pattern: string | RegExp | ((path: string) => boolean), fn: ProcessorFn): void {
    this.processors.push({ pattern, fn });
  }

  // ── Processing ──

  /**
   * Scan all files under the base directory and process them.
   * Compares against the cache to determine file event types.
   *
   * @returns Array of all SourceFile objects processed.
   */
  async process(): Promise<SourceFile[]> {
    const files = await this.walkDir(this.base);
    const currentPaths = new Set<string>();
    const sourceFiles: SourceFile[] = [];

    // Process found files
    for (const absPath of files) {
      const relPath = this.toRelativePath(absPath);
      currentPaths.add(relPath);

      const hash = await this.hashFile(absPath);
      const cached = this.cache.get(relPath);
      let type: SourceFile['type'];

      if (!cached) {
        type = 'create';
      } else if (cached.hash !== hash) {
        type = 'update';
      } else {
        type = 'skip';
      }

      // Update cache
      this.cache.set(relPath, { hash, modified: Date.now() });

      const sourceFile: SourceFile = {
        path: relPath,
        source: absPath,
        type,
      };

      if (type !== 'skip') {
        await this.dispatch(sourceFile);
      }

      sourceFiles.push(sourceFile);
    }

    // Detect deleted files
    for (const cachedPath of this.cache.keys()) {
      if (!currentPaths.has(cachedPath)) {
        const sourceFile: SourceFile = {
          path: cachedPath,
          source: nodePath.join(this.base, cachedPath),
          type: 'delete',
        };
        await this.dispatch(sourceFile);
        sourceFiles.push(sourceFile);
        this.cache.delete(cachedPath);
      }
    }

    return sourceFiles;
  }

  /**
   * Process a single file event (used by the file watcher).
   */
  async processFile(filePath: string, eventType: 'create' | 'update' | 'delete'): Promise<SourceFile> {
    const absPath = nodePath.isAbsolute(filePath)
      ? filePath
      : nodePath.join(this.base, filePath);
    const relPath = this.toRelativePath(absPath);

    if (eventType === 'delete') {
      this.cache.delete(relPath);
    } else {
      const hash = await this.hashFile(absPath);
      this.cache.set(relPath, { hash, modified: Date.now() });
    }

    const sourceFile: SourceFile = {
      path: relPath,
      source: absPath,
      type: eventType,
    };

    await this.dispatch(sourceFile);
    return sourceFile;
  }

  // ── Cache Management ──

  /** Load cache from a serialized map. */
  loadCache(data: Record<string, FileCacheEntry>): void {
    this.cache.clear();
    for (const [key, value] of Object.entries(data)) {
      this.cache.set(key, value);
    }
  }

  /** Export cache as a plain object for persistence. */
  exportCache(): Record<string, FileCacheEntry> {
    const result: Record<string, FileCacheEntry> = {};
    for (const [key, value] of this.cache) {
      result[key] = value;
    }
    return result;
  }

  /** Clear the cache (forces full reprocessing on next run). */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Private Helpers ──

  /**
   * Dispatch a file to all matching processors.
   */
  private async dispatch(file: SourceFile): Promise<void> {
    for (const proc of this.processors) {
      if (this.matchesPattern(file.path, proc.pattern)) {
        await proc.fn(file);
      }
    }
  }

  /**
   * Check if a path matches a processor pattern.
   */
  private matchesPattern(path: string, pattern: string | RegExp | ((path: string) => boolean)): boolean {
    if (typeof pattern === 'function') return pattern(path);
    if (pattern instanceof RegExp) return pattern.test(path);
    // String: treat as prefix match or extension match
    if (pattern.startsWith('.')) return path.endsWith(pattern);
    return path.startsWith(pattern);
  }

  /**
   * Convert an absolute path to a relative path with forward slashes.
   */
  private toRelativePath(absPath: string): string {
    return nodePath.relative(this.base, absPath).split(nodePath.sep).join('/');
  }

  /**
   * Recursively walk a directory and return all file paths.
   * Skips hidden files/directories (prefixed with _ or .).
   */
  private async walkDir(dir: string): Promise<string[]> {
    const results: string[] = [];

    let entries: import('node:fs').Dirent<string>[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      return results;
    }

    for (const entry of entries) {
      // Skip hidden files and temp files
      if (entry.name.startsWith('.') || entry.name.endsWith('~') || entry.name.endsWith('%')) {
        continue;
      }

      const fullPath = nodePath.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.walkDir(fullPath);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Compute SHA-256 hash of a file via streaming.
   */
  private hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hasher = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hasher.update(chunk));
      stream.on('end', () => resolve(hasher.digest('hex')));
      stream.on('error', reject);
    });
  }
}
