/**
 * @neo-hexo/helper — Content Helpers
 *
 * Table of contents, tag cloud, Open Graph, markdown, and paginator.
 */

// ─── TOC (Table of Contents) ────────────────────────────────────────────────

export interface TocOptions {
  /** Minimum heading level (default: 1). */
  minLevel?: number;
  /** Maximum heading level (default: 6). */
  maxLevel?: number;
  /** CSS class for the outer list (default: 'toc'). */
  class?: string;
  /** List style: 'ol' or 'ul' (default: 'ol'). */
  listType?: 'ol' | 'ul';
}

export interface TocItem {
  level: number;
  id: string;
  text: string;
}

/**
 * Generate a table of contents from HTML heading tags.
 */
export function toc(html: string, options: TocOptions = {}): string {
  const { minLevel = 1, maxLevel = 6, class: cls = 'toc', listType = 'ol' } = options;

  const headingRegex = /<h([1-6])\s*(?:id="([^"]*)")?\s*[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]!, 10);
    if (level < minLevel || level > maxLevel) continue;

    const id = match[2] || slugify(stripTags(match[3]!));
    const text = stripTags(match[3]!);
    items.push({ level, id, text });
  }

  if (items.length === 0) return '';

  let result = `<${listType} class="${cls}">`;
  let currentLevel = items[0]!.level;

  for (const item of items) {
    if (item.level > currentLevel) {
      result += `<${listType}>`.repeat(item.level - currentLevel);
    } else if (item.level < currentLevel) {
      result += `</${listType}>`.repeat(currentLevel - item.level);
    }
    currentLevel = item.level;
    result += `<li class="${cls}-item"><a href="#${item.id}">${item.text}</a></li>`;
  }

  result += `</${listType}>`.repeat(currentLevel - items[0]!.level + 1);
  return result;
}

// ─── Tag Cloud ───────────────────────────────────────────────────────────────

export interface TagCloudOptions {
  /** Minimum font size in px or em (default: 10). */
  minSize?: number;
  /** Maximum font size (default: 30). */
  maxSize?: number;
  /** Font size unit (default: 'px'). */
  unit?: string;
  /** CSS class (default: 'tag-cloud'). */
  class?: string;
  /** Start color (hex, default: '#ccc'). */
  startColor?: string;
  /** End color (hex, default: '#111'). */
  endColor?: string;
  /** Order by: 'random', 'name', 'count' (default: 'name'). */
  orderBy?: string;
}

export interface TagCloudItem {
  name: string;
  slug: string;
  count: number;
}

export function tagCloud(tags: TagCloudItem[], options: TagCloudOptions = {}): string {
  const {
    minSize = 10,
    maxSize = 30,
    unit = 'px',
    class: cls = 'tag-cloud',
    orderBy = 'name',
  } = options;

  if (tags.length === 0) return '';

  let sorted = [...tags];
  if (orderBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (orderBy === 'count') {
    sorted.sort((a, b) => b.count - a.count);
  } else if (orderBy === 'random') {
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
    }
  }

  const counts = sorted.map((t) => t.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;

  const spans = sorted.map((tag) => {
    const size = minSize + ((tag.count - min) / range) * (maxSize - minSize);
    return `<a href="/tags/${tag.slug}/" class="${cls}-tag" style="font-size: ${size.toFixed(1)}${unit}">${tag.name}</a>`;
  });

  return `<div class="${cls}">${spans.join(' ')}</div>`;
}

// ─── Open Graph ──────────────────────────────────────────────────────────────

export interface OpenGraphOptions {
  title?: string;
  type?: string;
  url?: string;
  image?: string | string[];
  siteName?: string;
  description?: string;
  locale?: string;
  twitterCard?: string;
  twitterSite?: string;
}

export function openGraph(options: OpenGraphOptions): string {
  const tags: string[] = [];

  const add = (property: string, content: string) => {
    tags.push(`<meta property="${property}" content="${escapeAttr(content)}">`);
  };

  if (options.title) add('og:title', options.title);
  if (options.type) add('og:type', options.type);
  if (options.url) add('og:url', options.url);
  if (options.siteName) add('og:site_name', options.siteName);
  if (options.description) add('og:description', options.description);
  if (options.locale) add('og:locale', options.locale);

  const images = Array.isArray(options.image) ? options.image : options.image ? [options.image] : [];
  for (const img of images) {
    add('og:image', img);
  }

  // Twitter cards
  if (options.twitterCard) {
    tags.push(`<meta name="twitter:card" content="${escapeAttr(options.twitterCard)}">`);
  }
  if (options.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${escapeAttr(options.twitterSite)}">`);
  }

  return tags.join('\n');
}

// ─── Paginator ───────────────────────────────────────────────────────────────

export interface PaginatorOptions {
  /** Current page number (1-based). */
  current: number;
  /** Total number of pages. */
  total: number;
  /** Base URL pattern (e.g., '/page/'). */
  base?: string;
  /** CSS class prefix (default: 'page'). */
  class?: string;
  /** Previous page text (default: 'Prev'). */
  prevText?: string;
  /** Next page text (default: 'Next'). */
  nextText?: string;
  /** How many page numbers to show on each side of current (default: 2). */
  space?: number;
}

export function paginator(options: PaginatorOptions): string {
  const {
    current,
    total,
    base = '/page/',
    class: cls = 'page',
    prevText = 'Prev',
    nextText = 'Next',
    space = 2,
  } = options;

  if (total <= 1) return '';

  const parts: string[] = [];

  // Prev
  if (current > 1) {
    const href = current === 2 ? '/' : `${base}${current - 1}/`;
    parts.push(`<a class="${cls}-prev" href="${href}">${prevText}</a>`);
  }

  // Page numbers
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - space && i <= current + space)) {
      if (i === current) {
        parts.push(`<span class="${cls}-number ${cls}-current">${i}</span>`);
      } else {
        const href = i === 1 ? '/' : `${base}${i}/`;
        parts.push(`<a class="${cls}-number" href="${href}">${i}</a>`);
      }
    } else if (
      i === current - space - 1 ||
      i === current + space + 1
    ) {
      parts.push(`<span class="${cls}-ellipsis">…</span>`);
    }
  }

  // Next
  if (current < total) {
    parts.push(`<a class="${cls}-next" href="${base}${current + 1}/">${nextText}</a>`);
  }

  return `<nav class="${cls}-nav">${parts.join('')}</nav>`;
}

// ─── Meta Generator ──────────────────────────────────────────────────────────

export function metaGenerator(): string {
  return '<meta name="generator" content="Neo-Hexo">';
}

// ─── Internal ────────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
