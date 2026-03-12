/**
 * @neo-hexo/highlight
 *
 * Syntax highlighting plugin for Neo-Hexo, powered by Shiki.
 * Transforms fenced code blocks in rendered HTML into highlighted HTML.
 *
 * Usage:
 * ```ts
 * import highlight from '@neo-hexo/highlight';
 *
 * export default defineConfig({
 *   plugins: [highlight({ theme: 'github-dark' })],
 * });
 * ```
 */

import type { NeoHexoPlugin, PostData, Context } from '@neo-hexo/core';
import { createServiceKey } from '@neo-hexo/core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HighlightOptions {
  /** Shiki theme name (default: 'github-dark'). */
  theme?: string;
  /** Additional languages to load beyond the defaults. */
  langs?: string[];
  /** Whether to add line numbers (default: false). */
  lineNumbers?: boolean;
  /** CSS class prefix for the wrapper (default: 'shiki'). */
  classPrefix?: string;
}

export interface Highlighter {
  highlight(code: string, lang: string): Promise<string>;
  dispose(): void;
}

// ─── Service Key ─────────────────────────────────────────────────────────────

export const HighlighterKey = createServiceKey<Highlighter>('highlighter');

// ─── Highlight Implementation ────────────────────────────────────────────────

/**
 * Wrap code with line numbers.
 */
function addLineNumbers(html: string): string {
  const lines = html.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const numbered = lines
    .map((line, i) => `<span class="line" data-line="${i + 1}">${line}</span>`)
    .join('\n');
  return numbered;
}

/**
 * Replace fenced code blocks in HTML with highlighted versions.
 * Matches `<pre><code class="language-xxx">...</code></pre>` patterns.
 */
async function highlightCodeBlocks(
  html: string,
  highlighter: Highlighter,
  lineNumbers: boolean,
): Promise<string> {
  // Match <pre><code class="language-xxx">...</code></pre>
  const codeBlockRe = /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;
  const matches: Array<{ full: string; lang: string; code: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(html)) !== null) {
    matches.push({
      full: m[0],
      lang: m[1]!,
      code: decodeHtmlEntities(m[2]!),
    });
  }

  if (matches.length === 0) return html;

  let result = html;
  for (const { full, lang, code } of matches) {
    let highlighted = await highlighter.highlight(code, lang);
    if (lineNumbers) {
      highlighted = addLineNumbers(highlighted);
    }
    result = result.replace(full, highlighted);
  }

  return result;
}

/**
 * Decode basic HTML entities in code blocks.
 */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── Plugin Factory ──────────────────────────────────────────────────────────

export default function highlightPlugin(
  options: HighlightOptions = {},
): NeoHexoPlugin {
  const {
    theme = 'github-dark',
    langs = [],
    lineNumbers = false,
  } = options;

  let highlighter: Highlighter | null = null;

  return {
    name: 'neo-hexo:highlight',
    enforce: 'pre',

    async apply(ctx: Context) {
      // Lazy-load shiki
      const shiki = await import('shiki');
      const instance = await shiki.createHighlighter({
        themes: [theme],
        langs: langs.length > 0 ? langs : [],
      });

      highlighter = {
        highlight(code: string, lang: string): Promise<string> {
          try {
            const html = instance.codeToHtml(code, { lang, theme });
            return Promise.resolve(html);
          } catch {
            // Unknown language — return unmodified
            return Promise.resolve(`<pre><code>${code}</code></pre>`);
          }
        },
        dispose() {
          instance.dispose();
        },
      };

      ctx.provide(HighlighterKey, highlighter);

      return {
        dispose() {
          highlighter?.dispose();
          highlighter = null;
        },
      };
    },

    hooks: {
      async afterPostRender(data: PostData): Promise<PostData> {
        if (!highlighter) return data;

        const content = await highlightCodeBlocks(data.content, highlighter, lineNumbers);
        const excerpt = data.excerpt
          ? await highlightCodeBlocks(data.excerpt, highlighter, lineNumbers)
          : data.excerpt;

        return { ...data, content, excerpt };
      },
    },
  };
}

// Re-export
export type { HighlightOptions as Options };
