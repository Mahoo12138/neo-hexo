/**
 * @neo-hexo/core — Helper Registry
 *
 * A simple typed registry for template helper functions.
 * Plugins register helpers here; the template engine reads them as globals/functions.
 */

import { createServiceKey, type ServiceKey } from './context.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A template helper function (bound to TemplateLocals at call time). */
export type HelperFn = (...args: unknown[]) => unknown;

// ─── Service Key ─────────────────────────────────────────────────────────────

export const HelperRegistryKey: ServiceKey<HelperRegistry> = createServiceKey<HelperRegistry>('helperRegistry');

// ─── Helper Registry ────────────────────────────────────────────────────────

export class HelperRegistry {
  private helpers = new Map<string, HelperFn>();

  /** Register a helper by name. */
  register(name: string, fn: HelperFn): void {
    this.helpers.set(name, fn);
  }

  /** Get a helper by name. */
  get(name: string): HelperFn | undefined {
    return this.helpers.get(name);
  }

  /** Check if a helper exists. */
  has(name: string): boolean {
    return this.helpers.has(name);
  }

  /** Remove a helper. */
  remove(name: string): boolean {
    return this.helpers.delete(name);
  }

  /** Get all registered helper names. */
  list(): string[] {
    return [...this.helpers.keys()];
  }

  /** Get all helpers as a plain object (for template engine injection). */
  toObject(): Record<string, HelperFn> {
    return Object.fromEntries(this.helpers);
  }

  /** Number of registered helpers. */
  get size(): number {
    return this.helpers.size;
  }
}
