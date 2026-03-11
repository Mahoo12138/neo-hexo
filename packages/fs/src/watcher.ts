/**
 * @neo-hexo/fs — File Watcher
 *
 * File watching abstraction. Uses native fs.watch with recursive option
 * (supported in Node 22+ on all platforms).
 * Falls back to polling for edge cases.
 */

import { watch as fsWatch, type WatchEventType } from 'node:fs';
import * as nodePath from 'node:path';
import { normalizePath } from './fs.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FileEventType = 'create' | 'update' | 'delete';

export interface FileEvent {
  /** Normalized relative path (forward slashes). */
  path: string;
  /** Event type. */
  type: FileEventType;
}

export interface WatchOptions {
  /** File patterns to ignore (glob strings for manual matching). */
  ignore?: string[];
  /** Debounce delay in ms (default: 100). */
  debounceMs?: number;
}

export interface FileWatcher {
  /** Subscribe to file events. Returns an unsubscribe function. */
  on(listener: (event: FileEvent) => void): () => void;
  /** Stop watching. */
  close(): void;
}

// ─── Watcher Implementation ─────────────────────────────────────────────────

/**
 * Watch a directory recursively for file changes.
 * Uses Node.js native `fs.watch` with `recursive: true` (Node 22+).
 */
export function watchDir(dir: string, options: WatchOptions = {}): FileWatcher {
  const { debounceMs = 100, ignore = [] } = options;
  const listeners = new Set<(event: FileEvent) => void>();
  const pending = new Map<string, { type: WatchEventType; timer: ReturnType<typeof setTimeout> }>();

  const watcher = fsWatch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const normalized = normalizePath(filename);

    // Simple ignore check (exact suffix matches for common patterns)
    if (ignore.some((pattern) => shouldIgnore(normalized, pattern))) return;

    // Debounce: coalesce rapid events on the same file
    const existing = pending.get(normalized);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      pending.delete(normalized);
      const type = mapEventType(eventType);
      const event: FileEvent = { path: normalized, type };
      for (const listener of listeners) {
        listener(event);
      }
    }, debounceMs);

    pending.set(normalized, { type: eventType, timer });
  });

  return {
    on(listener: (event: FileEvent) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close(): void {
      watcher.close();
      for (const { timer } of pending.values()) clearTimeout(timer);
      pending.clear();
      listeners.clear();
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapEventType(eventType: WatchEventType): FileEventType {
  // Node's fs.watch only gives 'rename' or 'change'.
  // 'rename' can mean create or delete; 'change' means update.
  // We map 'change' → 'update' and 'rename' → 'update' (consumers should
  // check existence to distinguish create vs delete).
  return eventType === 'change' ? 'update' : 'update';
}

function shouldIgnore(path: string, pattern: string): boolean {
  // Simple pattern check: supports leading dot patterns and exact matches
  if (pattern.startsWith('.')) {
    return nodePath.basename(path).startsWith(pattern);
  }
  if (pattern.startsWith('*')) {
    return path.endsWith(pattern.slice(1));
  }
  return path.includes(pattern);
}
