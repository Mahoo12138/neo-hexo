/**
 * @neo-hexo/core — Public API
 */

// Hook system
export { Hook, type HookStrategy, type Disposable, type TapOptions } from './hooks.js';

// Plugin system
export { type NeoHexoPlugin, type PluginFactory, sortPlugins } from './plugin.js';

// Service container
export { Context, createServiceKey, type ServiceKey } from './context.js';

// Lifecycle
export {
  createLifecycleHooks,
  type LifecycleHooks,
  type LifecycleHookInstances,
  type ResolvedConfig,
  type SourceFile,
  type PostData,
  type RenderData,
  type Route,
  type SiteLocals,
  type TemplateLocals,
} from './lifecycle.js';

// Config
export { defineConfig, resolveConfig, defaultConfig, type UserConfig } from './config.js';

// Main class
export { NeoHexo } from './neo-hexo.js';
