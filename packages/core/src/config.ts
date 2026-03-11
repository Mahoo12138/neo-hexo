/**
 * @neo-hexo/core — Configuration System
 *
 * Type-safe config loading with `defineConfig()` helper.
 * Users write `neo-hexo.config.ts` and get full IDE autocomplete.
 */

import type { NeoHexoPlugin } from './plugin.js';
import type { ResolvedConfig } from './lifecycle.js';

// ─── User Config ─────────────────────────────────────────────────────────────

export interface UserConfig {
  /** Site title. */
  title?: string;
  /** Site subtitle. */
  subtitle?: string;
  /** Site description. */
  description?: string;
  /** Site author. */
  author?: string;
  /** Site language. */
  language?: string | string[];
  /** Timezone (IANA). */
  timezone?: string;
  /** Site URL. */
  url?: string;
  /** Root path (default: '/'). */
  root?: string;

  // ── Directories ──
  /** Source files directory (default: 'source'). */
  sourceDir?: string;
  /** Public output directory (default: 'public'). */
  publicDir?: string;
  /** Theme directory or name. */
  themeDir?: string;

  // ── Build ──
  /** Post permalink pattern (default: ':year/:month/:day/:title/'). */
  permalink?: string;
  /** Default layout for new posts. */
  defaultLayout?: string;
  /** Whether to title-case post titles. */
  titlecase?: boolean;

  // ── Database ──
  database?: {
    adapter?: 'json' | 'sqlite';
    path?: string;
  };

  // ── Plugins ──
  plugins?: NeoHexoPlugin[];

  // ── Theme config ──
  theme?: Record<string, unknown>;

  /** Catch-all for user extensions. */
  [key: string]: unknown;
}

// ─── Default Config ──────────────────────────────────────────────────────────

export const defaultConfig: Required<
  Pick<UserConfig, 'title' | 'subtitle' | 'description' | 'author' | 'language' | 'timezone' | 'url' | 'root' | 'sourceDir' | 'publicDir' | 'permalink' | 'defaultLayout' | 'titlecase'>
> & { database: { adapter: 'json' | 'sqlite'; path: string } } = {
  title: 'Neo-Hexo Site',
  subtitle: '',
  description: '',
  author: '',
  language: 'en',
  timezone: '',
  url: 'http://localhost',
  root: '/',
  sourceDir: 'source',
  publicDir: 'public',
  permalink: ':year/:month/:day/:title/',
  defaultLayout: 'post',
  titlecase: false,
  database: {
    adapter: 'json',
    path: 'db.json',
  },
};

// ─── Config Resolution ──────────────────────────────────────────────────────

/**
 * `defineConfig()` — identity helper that provides type checking for config files.
 *
 * ```ts
 * // neo-hexo.config.ts
 * import { defineConfig } from '@neo-hexo/core';
 * export default defineConfig({ title: 'My Blog' });
 * ```
 */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

/**
 * Merge user config with defaults to produce a fully resolved config.
 */
export function resolveConfig(userConfig: UserConfig, baseDir: string): ResolvedConfig {
  const merged = {
    ...defaultConfig,
    ...userConfig,
    database: {
      ...defaultConfig.database,
      ...userConfig.database,
    },
  };

  // Resolve directories to absolute paths relative to baseDir
  // (actual path resolution deferred to @neo-hexo/fs phase)
  return {
    ...merged,
    _baseDir: baseDir,
  } as ResolvedConfig;
}
