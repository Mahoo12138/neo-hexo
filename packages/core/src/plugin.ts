/**
 * @neo-hexo/core — Plugin System
 *
 * Vite-style plugin interface with typed hooks and optional imperative setup.
 */

import type { Disposable } from './hooks.js';
import type { LifecycleHooks } from './lifecycle.js';
import type { Context } from './context.js';

// ─── Plugin Interface ────────────────────────────────────────────────────────

/**
 * A Neo-Hexo plugin. Can be defined via:
 *   - Declarative `hooks` object (Vite-style)
 *   - Imperative `apply(ctx)` function (Cordis-style)
 *   - Or both
 */
export interface NeoHexoPlugin {
  /** Unique plugin name for debugging and identification. */
  name: string;

  /**
   * Execution order group.
   * - 'pre'  — run before normal plugins (priority offset -100)
   * - 'post' — run after normal plugins (priority offset +100)
   */
  enforce?: 'pre' | 'post';

  /**
   * Imperative setup function. Receives a scoped Context.
   * Any Disposable returned will be auto-disposed when the plugin is unloaded.
   */
  apply?: (ctx: Context) => void | Disposable | Promise<void | Disposable>;

  /**
   * Declarative hook taps. Keys match lifecycle hook names.
   * Each function is automatically tapped onto the corresponding hook.
   */
  hooks?: Partial<LifecycleHooks>;
}

// ─── Plugin Factory ──────────────────────────────────────────────────────────

/**
 * A plugin factory is a function that accepts options and returns a plugin.
 * This is the recommended way to define plugins:
 *
 * ```ts
 * export default function myPlugin(options?: MyOptions): NeoHexoPlugin {
 *   return {
 *     name: 'my-plugin',
 *     hooks: { ... },
 *   };
 * }
 * ```
 */
export type PluginFactory<T = void> = T extends void
  ? () => NeoHexoPlugin
  : (options: T) => NeoHexoPlugin;

// ─── Plugin Ordering ─────────────────────────────────────────────────────────

/**
 * Sort plugins into execution order: enforce:'pre' → normal → enforce:'post'.
 * Preserves insertion order within each group.
 */
export function sortPlugins(plugins: NeoHexoPlugin[]): NeoHexoPlugin[] {
  const pre: NeoHexoPlugin[] = [];
  const normal: NeoHexoPlugin[] = [];
  const post: NeoHexoPlugin[] = [];

  for (const p of plugins) {
    if (p.enforce === 'pre') pre.push(p);
    else if (p.enforce === 'post') post.push(p);
    else normal.push(p);
  }

  return [...pre, ...normal, ...post];
}
