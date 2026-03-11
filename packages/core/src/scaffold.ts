/**
 * @neo-hexo/core — Scaffold System
 *
 * Manages template scaffolds for creating new posts, pages, and drafts.
 * Scaffolds are simple text files with `{{ variable }}` placeholders.
 *
 * Replaces lib/hexo/scaffold.ts.
 */

import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { createServiceKey, type Context, type ServiceKey } from './context.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScaffoldEntry {
  /** Scaffold name (e.g., 'post', 'page', 'draft'). */
  name: string;
  /** Template content. */
  content: string;
}

// ─── Service Key ─────────────────────────────────────────────────────────────

export const ScaffoldServiceKey: ServiceKey<ScaffoldManager> = createServiceKey<ScaffoldManager>('scaffold');

// ─── Default Scaffolds ───────────────────────────────────────────────────────

const DEFAULT_SCAFFOLDS: Record<string, string> = {
  post: `---
title: {{ title }}
date: {{ date }}
tags:
---
`,
  page: `---
title: {{ title }}
date: {{ date }}
---
`,
  draft: `---
title: {{ title }}
tags:
---
`,
};

// ─── Scaffold Manager ────────────────────────────────────────────────────────

export class ScaffoldManager {
  /** Directory where scaffold files are stored on disk. */
  private scaffoldDir: string;
  /** In-memory scaffold store (layered over defaults). */
  private store = new Map<string, string>();
  private loaded = false;

  constructor(scaffoldDir: string) {
    this.scaffoldDir = nodePath.resolve(scaffoldDir);

    // Pre-populate with defaults
    for (const [name, content] of Object.entries(DEFAULT_SCAFFOLDS)) {
      this.store.set(name, content);
    }
  }

  // ── Load / Persist ──

  /**
   * Load scaffolds from the scaffold directory.
   * User scaffolds override built-in defaults.
   */
  async load(): Promise<void> {
    let entries: import('node:fs').Dirent<string>[];

    try {
      entries = await fs.readdir(this.scaffoldDir, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      // Directory doesn't exist — use defaults only
      this.loaded = true;
      return;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const ext = nodePath.extname(entry.name);
      if (ext !== '.md' && ext !== '.txt' && ext !== '') continue;

      const name = nodePath.basename(entry.name, ext);
      const content = await fs.readFile(
        nodePath.join(this.scaffoldDir, entry.name),
        'utf-8',
      );
      this.store.set(name, content);
    }

    this.loaded = true;
  }

  /**
   * Save a scaffold to both memory and disk.
   */
  async save(name: string, content: string): Promise<void> {
    this.store.set(name, content);

    await fs.mkdir(this.scaffoldDir, { recursive: true });
    await fs.writeFile(
      nodePath.join(this.scaffoldDir, `${name}.md`),
      content,
      'utf-8',
    );
  }

  // ── CRUD ──

  /**
   * Get a scaffold by name. Falls back to 'post' if not found.
   */
  get(name: string): string {
    return this.store.get(name) ?? this.store.get('post') ?? '';
  }

  /**
   * Check if a scaffold exists.
   */
  has(name: string): boolean {
    return this.store.has(name);
  }

  /**
   * Set a scaffold in memory (does not persist to disk).
   */
  set(name: string, content: string): void {
    this.store.set(name, content);
  }

  /**
   * Remove a scaffold from memory.
   */
  remove(name: string): boolean {
    return this.store.delete(name);
  }

  /**
   * List all available scaffold names.
   */
  list(): ScaffoldEntry[] {
    return [...this.store.entries()].map(([name, content]) => ({ name, content }));
  }

  /**
   * Whether scaffolds have been loaded from disk.
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * Create a ScaffoldManager and register it in the context.
 */
export function createScaffoldManager(
  ctx: Context,
  scaffoldDir: string,
): ScaffoldManager {
  const manager = new ScaffoldManager(scaffoldDir);
  ctx.provide(ScaffoldServiceKey, manager);
  return manager;
}
