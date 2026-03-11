/**
 * @neo-hexo/core — NeoHexo Main Class
 *
 * The central orchestrator. Manages config, plugins, lifecycle hooks,
 * and the service container. Replaces the old Hexo class.
 */

import { Context } from './context.js';
import { type UserConfig, resolveConfig } from './config.js';
import { createLifecycleHooks, type LifecycleHookInstances, type ResolvedConfig } from './lifecycle.js';
import { type NeoHexoPlugin, sortPlugins } from './plugin.js';
import type { Disposable } from './hooks.js';

// ─── NeoHexo ─────────────────────────────────────────────────────────────────

export class NeoHexo {
  /** Root service container. */
  readonly ctx: Context;
  /** All lifecycle hooks. */
  readonly hooks: LifecycleHookInstances;
  /** Resolved configuration (available after init). */
  config!: ResolvedConfig;

  private userConfig: UserConfig;
  private baseDir: string;
  private plugins: NeoHexoPlugin[] = [];
  private pluginDisposables: Disposable[] = [];
  private initialized = false;

  constructor(baseDir: string, userConfig: UserConfig = {}) {
    this.baseDir = baseDir;
    this.userConfig = userConfig;
    this.ctx = new Context();
    this.hooks = createLifecycleHooks();
  }

  /**
   * Initialize: resolve config, load plugins, run configLoaded/configResolved hooks.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 1. Resolve config
    this.config = resolveConfig(this.userConfig, this.baseDir);

    // 2. Collect and sort plugins
    this.plugins = sortPlugins(this.userConfig.plugins ?? []);

    // 3. Apply each plugin
    for (const plugin of this.plugins) {
      await this.applyPlugin(plugin);
    }

    // 4. Run config hooks
    await this.hooks.configLoaded.call(this.config);
    await this.hooks.configResolved.call(this.config);

    this.initialized = true;
  }

  /**
   * Apply a single plugin: tap its declarative hooks, then call apply().
   */
  private async applyPlugin(plugin: NeoHexoPlugin): Promise<void> {
    const childCtx = this.ctx.scope();

    // Tap declarative hooks
    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        const hook = (this.hooks as Record<string, unknown>)[hookName];
        if (hook && typeof (hook as { tap: unknown }).tap === 'function') {
          const tapOptions = {
            name: plugin.name,
            enforce: plugin.enforce,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const disposable = (hook as any).tap(
            tapOptions,
            handler,
          );
          childCtx.track(disposable);
        }
      }
    }

    // Call imperative apply
    if (plugin.apply) {
      const disposable = await plugin.apply(childCtx);
      if (disposable) {
        childCtx.track(disposable);
      }
    }

    this.pluginDisposables.push({ dispose: () => childCtx.dispose() });
  }

  /**
   * Full build: process sources, run generators, write output.
   * (Subsystems will be implemented in Phase 3.)
   */
  async build(): Promise<void> {
    if (!this.initialized) await this.init();

    await this.hooks.beforeProcess.call();
    // TODO: Phase 3 — Box file processing
    await this.hooks.afterProcess.call();

    const locals = this.getSiteLocals();

    await this.hooks.beforeGenerate.call(locals);
    await this.hooks.generateRoutes.call(locals);
    await this.hooks.afterGenerate.call();
  }

  /**
   * Deploy the generated site.
   */
  async deploy(): Promise<void> {
    await this.hooks.beforeDeploy.call();
    await this.hooks.deploy.call();
    await this.hooks.afterDeploy.call();
  }

  /**
   * Graceful shutdown.
   */
  async exit(error?: Error): Promise<void> {
    await this.hooks.beforeExit.call(error);

    // Dispose all plugin contexts
    for (const d of this.pluginDisposables) {
      d.dispose();
    }
    this.pluginDisposables.length = 0;

    this.ctx.dispose();
  }

  /**
   * Get site-level locals for generators and templates.
   * (Stub — will be backed by @neo-hexo/database in Phase 2.)
   */
  private getSiteLocals() {
    return {
      posts: [],
      pages: [],
      categories: [],
      tags: [],
      data: {},
    };
  }
}
