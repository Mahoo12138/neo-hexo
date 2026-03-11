/**
 * @neo-hexo/core — Post Processing
 *
 * Handles the lifecycle of a post/page: reading the source file,
 * parsing front-matter, rendering content, and assembling PostData.
 *
 * Simplified from the old 500+ line lib/hexo/post.ts —
 * tag plugins and code-escape state machines are moved to
 * dedicated filter plugins rather than baked into the core.
 */

import * as nodePath from 'node:path';
import * as fs from 'node:fs/promises';
import { createServiceKey, type Context, type ServiceKey } from './context.js';
import type { PostData } from './lifecycle.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Options for creating a new post file. */
export interface CreatePostOptions {
  /** Post title. */
  title: string;
  /** Layout (default: 'post'). */
  layout?: string;
  /** Target directory path (relative to source dir). */
  path?: string;
  /** Slug (derived from title if omitted). */
  slug?: string;
  /** Additional front-matter fields. */
  data?: Record<string, unknown>;
  /** Whether to replace an existing file. */
  replace?: boolean;
}

/** Options for rendering a single post. */
export interface RenderPostOptions {
  /** Override engine (e.g., 'md'). If omitted, inferred from file extension. */
  engine?: string;
  /** Extra data passed to the renderer. */
  data?: Record<string, unknown>;
}

/** Front-matter parser function (injected from @neo-hexo/front-matter). */
export type FrontMatterParser = (
  source: string,
) => { data: Record<string, unknown>; content: string; excerpt: string };

/** Renderer function (injected from the RenderPipeline). */
export type ContentRenderer = (
  source: string,
  options?: Record<string, unknown>,
) => Promise<string>;

/** Slug generator. */
export type SlugFn = (title: string) => string;

// ─── Service Key ─────────────────────────────────────────────────────────────

export const PostServiceKey: ServiceKey<PostProcessor> = createServiceKey<PostProcessor>('post');

// ─── Default slug helper ─────────────────────────────────────────────────────

function defaultSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, '')        // strip non-word chars
    .replace(/[\s_]+/g, '-')         // spaces/underscores → hyphens
    .replace(/-+/g, '-')             // collapse runs of hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens
}

// ─── Post Processor ──────────────────────────────────────────────────────────

export class PostProcessor {
  private parseFrontMatter: FrontMatterParser;
  private renderContent: ContentRenderer | null = null;
  private slugFn: SlugFn;

  constructor(options: {
    frontMatterParser: FrontMatterParser;
    contentRenderer?: ContentRenderer;
    slugFn?: SlugFn;
  }) {
    this.parseFrontMatter = options.frontMatterParser;
    this.renderContent = options.contentRenderer ?? null;
    this.slugFn = options.slugFn ?? defaultSlug;
  }

  /** Set or replace the content renderer (for lazy initialization). */
  setRenderer(renderer: ContentRenderer): void {
    this.renderContent = renderer;
  }

  // ── Read ──

  /**
   * Parse a raw post source string into PostData.
   *
   * Does NOT render — produces raw markdown data.
   */
  parse(source: string, filePath: string): PostData {
    const { data: frontMatter, content, excerpt } = this.parseFrontMatter(source);

    const slug = typeof frontMatter['slug'] === 'string'
      ? frontMatter['slug']
      : this.slugFn(
          typeof frontMatter['title'] === 'string'
            ? frontMatter['title']
            : nodePath.basename(filePath, nodePath.extname(filePath)),
        );

    return {
      path: filePath,
      raw: source,
      content,             // raw markdown (not yet rendered)
      frontMatter: { ...frontMatter, slug },
      excerpt,
      published: frontMatter['published'] !== false && frontMatter['published'] !== 'false',
    };
  }

  // ── Render ──

  /**
   * Render a PostData's content through the render pipeline.
   * Returns a new PostData with rendered HTML in `content` and `excerpt`.
   */
  async render(post: PostData, options: RenderPostOptions = {}): Promise<PostData> {
    if (!this.renderContent) {
      // No renderer — return as-is
      return post;
    }

    const engine = options.engine ?? nodePath.extname(post.path).slice(1);
    const renderOpts = { path: post.path, engine, ...options.data };

    const renderedContent = await this.renderContent(post.content, renderOpts);

    let renderedExcerpt = '';
    if (post.excerpt) {
      renderedExcerpt = await this.renderContent(post.excerpt, renderOpts);
    }

    return {
      ...post,
      content: renderedContent,
      excerpt: renderedExcerpt,
    };
  }

  // ── Create ──

  /**
   * Generate the file content for a new post (front-matter + body).
   *
   * @param scaffold - Scaffold template content (raw string with `{{ var }}` placeholders).
   * @param options - Post metadata.
   * @returns The generated file content string.
   */
  createContent(scaffold: string, options: CreatePostOptions): string {
    const slug = options.slug ?? this.slugFn(options.title);
    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const vars: Record<string, string> = {
      title: options.title,
      date: dateStr,
      layout: options.layout ?? 'post',
      slug,
      ...Object.fromEntries(
        Object.entries(options.data ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    };

    // Simple template interpolation: {{ key }}
    let output = scaffold;
    for (const [key, value] of Object.entries(vars)) {
      output = output.replaceAll(`{{ ${key} }}`, value);
    }

    return output;
  }

  /**
   * Compute the target path for a new post file.
   */
  getPostPath(
    sourceDir: string,
    options: CreatePostOptions & { permalinkPattern?: string },
  ): string {
    const layout = options.layout ?? 'post';
    const slug = options.slug ?? this.slugFn(options.title);

    // If an explicit path is given, use it directly
    if (options.path) {
      return nodePath.join(sourceDir, options.path);
    }

    // Default: _posts/slug.md (or _drafts/slug.md)
    const subfolder = layout === 'draft' ? '_drafts' : '_posts';
    return nodePath.join(sourceDir, subfolder, `${slug}.md`);
  }

  // ── Publish ──

  /**
   * Publish a draft by moving it from _drafts to _posts.
   *
   * @returns The new file path.
   */
  async publish(
    sourceDir: string,
    draftPath: string,
  ): Promise<{ from: string; to: string; content: string }> {
    const absFrom = nodePath.isAbsolute(draftPath)
      ? draftPath
      : nodePath.join(sourceDir, '_drafts', draftPath);

    const fileName = nodePath.basename(absFrom);
    const absTo = nodePath.join(sourceDir, '_posts', fileName);

    const raw = await fs.readFile(absFrom, 'utf-8');

    // Ensure _posts exists
    await fs.mkdir(nodePath.dirname(absTo), { recursive: true });
    await fs.rename(absFrom, absTo);

    return { from: absFrom, to: absTo, content: raw };
  }
}

/**
 * Create a PostProcessor and register it in the context.
 */
export function createPostProcessor(
  ctx: Context,
  options: ConstructorParameters<typeof PostProcessor>[0],
): PostProcessor {
  const processor = new PostProcessor(options);
  ctx.provide(PostServiceKey, processor);
  return processor;
}
