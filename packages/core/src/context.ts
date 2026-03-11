/**
 * @neo-hexo/core — Service Container (Context)
 *
 * Cordis-inspired scoped service container with hierarchical disposal.
 * Each plugin gets a child context; when the plugin is unloaded,
 * all its registrations (services, hook taps, routes) are auto-disposed.
 */

import type { Disposable } from './hooks.js';

// ─── Service Key Symbol Registry ─────────────────────────────────────────────

/**
 * Strongly-typed service key. Use `createServiceKey<T>(name)` to create one.
 *
 * ```ts
 * const Renderer = createServiceKey<RendererService>('renderer');
 * ctx.provide(Renderer, myRenderer);
 * const renderer = ctx.inject(Renderer);
 * ```
 */
export interface ServiceKey<T> {
  readonly id: symbol;
  readonly name: string;
  /** Phantom type brand — not used at runtime. */
  readonly __type?: T;
}

export function createServiceKey<T>(name: string): ServiceKey<T> {
  return { id: Symbol(name), name };
}

// ─── Context ─────────────────────────────────────────────────────────────────

export class Context {
  private services = new Map<symbol, unknown>();
  private disposables: Disposable[] = [];
  private children: Context[] = [];
  private parent: Context | null;
  private _disposed = false;

  constructor(parent: Context | null = null) {
    this.parent = parent;
  }

  /** Whether this context has been disposed. */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Register a service in this context.
   * Returns a Disposable to unregister it.
   */
  provide<T>(key: ServiceKey<T>, value: T): Disposable {
    this.assertNotDisposed();
    this.services.set(key.id, value);

    const disposable: Disposable = {
      dispose: () => {
        this.services.delete(key.id);
      },
    };
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Retrieve a service by key.
   * Walks up the parent chain if not found in the current context.
   *
   * @throws Error if the service is not found.
   */
  inject<T>(key: ServiceKey<T>): T {
    this.assertNotDisposed();

    if (this.services.has(key.id)) {
      return this.services.get(key.id) as T;
    }

    if (this.parent) {
      return this.parent.inject(key);
    }

    throw new Error(`Service "${key.name}" is not provided in this context.`);
  }

  /**
   * Try to retrieve a service. Returns undefined if not found.
   */
  tryInject<T>(key: ServiceKey<T>): T | undefined {
    if (this.services.has(key.id)) {
      return this.services.get(key.id) as T;
    }

    if (this.parent) {
      return this.parent.tryInject(key);
    }

    return undefined;
  }

  /**
   * Track an arbitrary disposable in this context.
   * It will be disposed when this context is disposed.
   */
  track(disposable: Disposable): void {
    this.assertNotDisposed();
    this.disposables.push(disposable);
  }

  /**
   * Create a child context (scoped to a plugin).
   * The child is automatically tracked and disposed with the parent.
   */
  scope(): Context {
    this.assertNotDisposed();
    const child = new Context(this);
    this.children.push(child);

    // Track child removal on dispose
    this.disposables.push({
      dispose: () => {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
      },
    });

    return child;
  }

  /**
   * Dispose this context and all its children.
   * Disposes in reverse registration order (LIFO).
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    // Dispose children first (depth-first)
    for (const child of [...this.children]) {
      child.dispose();
    }
    this.children.length = 0;

    // Dispose own registrations in reverse order
    for (let i = this.disposables.length - 1; i >= 0; i--) {
      this.disposables[i]!.dispose();
    }
    this.disposables.length = 0;
    this.services.clear();
  }

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('Cannot use a disposed context.');
    }
  }
}
