/**
 * @neo-hexo/core — Router
 *
 * Manages the route table mapping URL paths to output data.
 * Routes are populated during the generate phase and consumed
 * when writing output files.
 *
 * Replaces lib/hexo/router.ts with a Map-based approach.
 */

import { Readable } from 'node:stream';
import { createServiceKey, type ServiceKey } from './context.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The data type a route can hold. */
export type RouteDataInput =
  | string
  | Buffer
  | Readable
  | (() => string | Buffer | Promise<string | Buffer>);

/** A stored route entry. */
export interface RouteData {
  /** The data source. */
  data: RouteDataInput;
  /** Whether the route has been modified since last generation. */
  modified: boolean;
}

// ─── Service Key ─────────────────────────────────────────────────────────────

export const RouterServiceKey: ServiceKey<Router> = createServiceKey<Router>('router');

// ─── Router ──────────────────────────────────────────────────────────────────

export class Router {
  private routes = new Map<string, RouteData>();

  /**
   * Set a route. Overwrites any existing route at the same path.
   *
   * @param path - URL path (e.g., 'posts/hello/index.html')
   * @param data - Content data (string, Buffer, stream, or lazy function)
   */
  set(path: string, data: RouteDataInput): void {
    const normalized = Router.format(path);
    this.routes.set(normalized, { data, modified: true });
  }

  /**
   * Get a route's data entry.
   */
  get(path: string): RouteData | undefined {
    return this.routes.get(Router.format(path));
  }

  /**
   * Remove a route.
   *
   * @returns true if the route existed and was removed.
   */
  remove(path: string): boolean {
    return this.routes.delete(Router.format(path));
  }

  /**
   * Check if a route exists.
   */
  has(path: string): boolean {
    return this.routes.has(Router.format(path));
  }

  /**
   * Get all route paths.
   */
  list(): string[] {
    return [...this.routes.keys()];
  }

  /**
   * Get the number of routes.
   */
  get size(): number {
    return this.routes.size;
  }

  /**
   * Iterate over all routes.
   */
  forEach(fn: (path: string, data: RouteData) => void): void {
    for (const [path, data] of this.routes) {
      fn(path, data);
    }
  }

  /**
   * Resolve a route's data to a string.
   * Handles all data types: strings, Buffers, streams, and lazy functions.
   */
  async resolve(path: string): Promise<string | null> {
    const route = this.get(path);
    if (!route) return null;
    return Router.resolveData(route.data);
  }

  /**
   * Mark all routes as unmodified.
   * Typically called after a full generation cycle.
   */
  resetModified(): void {
    for (const data of this.routes.values()) {
      data.modified = false;
    }
  }

  /**
   * Remove all routes.
   */
  clear(): void {
    this.routes.clear();
  }

  // ── Static Helpers ──

  /**
   * Normalize a route path:
   * - Remove leading slashes
   * - Convert backslashes to forward slashes
   * - Append 'index.html' to directory-like paths (ending with /)
   */
  static format(path: string): string {
    // Convert backslashes
    let normalized = path.replace(/\\/g, '/');
    // Remove leading slashes
    normalized = normalized.replace(/^\/+/, '');
    // Append index.html for directory-like paths
    if (normalized === '' || normalized.endsWith('/')) {
      normalized += 'index.html';
    }
    return normalized;
  }

  /**
   * Resolve route data to a string, handling all input types.
   */
  static async resolveData(data: RouteDataInput): Promise<string> {
    if (typeof data === 'string') {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString('utf-8');
    }

    if (typeof data === 'function') {
      const result = await data();
      return typeof result === 'string' ? result : result.toString('utf-8');
    }

    // Readable stream
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      data.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      data.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      data.on('error', reject);
    });
  }
}
