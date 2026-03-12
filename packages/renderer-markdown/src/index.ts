/**
 * @neo-hexo/renderer-markdown
 *
 * Markdown rendering plugin for Neo-Hexo, powered by markdown-it.
 * Replaces the old hexo-renderer-marked package.
 *
 * Usage:
 * ```ts
 * import markdown from '@neo-hexo/renderer-markdown';
 *
 * export default defineConfig({
 *   plugins: [
 *     markdown({ html: true, linkify: true }),
 *   ],
 * });
 * ```
 */

import type { NeoHexoPlugin, Renderer } from '@neo-hexo/core';
import { RenderServiceKey } from '@neo-hexo/core';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface MarkdownOptions {
  /** Enable HTML tags in source (default: true). */
  html?: boolean;
  /** Convert '\n' in paragraphs into <br> (default: false). */
  breaks?: boolean;
  /** Auto-detect URL-like text and convert to links (default: true). */
  linkify?: boolean;
  /** Enable typographic replacements — smart quotes, em-dash, etc. (default: true). */
  typographer?: boolean;
  /** CSS language prefix for fenced code blocks (default: 'language-'). */
  langPrefix?: string;
  /** Custom markdown-it plugins. */
  plugins?: Array<MarkdownItPlugin>;
}

type MarkdownItPlugin =
  | ((md: unknown) => void)
  | [(md: unknown, options: unknown) => void, unknown];

// ─── Default Options ─────────────────────────────────────────────────────────

const defaults: Required<Omit<MarkdownOptions, 'plugins'>> = {
  html: true,
  breaks: false,
  linkify: true,
  typographer: true,
  langPrefix: 'language-',
};

// ─── Plugin Factory ──────────────────────────────────────────────────────────

export default function markdownRenderer(
  options: MarkdownOptions = {},
): NeoHexoPlugin {
  const opts = { ...defaults, ...options };

  return {
    name: 'neo-hexo:renderer-markdown',
    enforce: 'pre',

    async apply(ctx) {
      // Lazy-load markdown-it so tree-shaking is possible
      const { default: MarkdownItCtor } = await import('markdown-it');

      const md = new MarkdownItCtor({
        html: opts.html,
        breaks: opts.breaks,
        linkify: opts.linkify,
        typographer: opts.typographer,
        langPrefix: opts.langPrefix,
      });

      // Apply user-provided markdown-it plugins
      if (options.plugins) {
        for (const plugin of options.plugins) {
          if (Array.isArray(plugin)) {
            md.use(plugin[0], plugin[1]);
          } else {
            md.use(plugin);
          }
        }
      }

      // Create the renderer
      const renderer: Renderer = {
        extensions: ['md', 'markdown', 'mkd', 'mkdn', 'mdwn', 'mdtxt'],
        output: 'html',
        render(source: string) {
          return md.render(source);
        },
      };

      // Register with the render pipeline
      const pipeline = ctx.tryInject(RenderServiceKey);
      if (pipeline) {
        const unregister = pipeline.register(renderer);
        return { dispose: unregister };
      }

      // If pipeline isn't ready yet, store for later registration
      ctx.provide(MarkdownRendererKey, renderer);
    },
  };
}

/** Service key for the raw markdown renderer (for direct access). */
export const MarkdownRendererKey = Symbol('renderer:markdown') as unknown as import('@neo-hexo/core').ServiceKey<Renderer>;

// Re-export for convenience
export type { MarkdownOptions as Options };
