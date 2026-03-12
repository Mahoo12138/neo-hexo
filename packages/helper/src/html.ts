/**
 * @neo-hexo/helper — HTML Tag Helpers
 *
 * Generate HTML tags for CSS, JS, images, links, and other media.
 */

/**
 * Generate CSS <link> tags.
 * Accepts a single path or array of paths.
 */
export function cssHelper(paths: string | string[], root = '/'): string {
  const arr = Array.isArray(paths) ? paths : [paths];
  return arr
    .map((p) => {
      const href = resolvePath(p, root, '.css');
      return `<link rel="stylesheet" href="${href}">`;
    })
    .join('\n');
}

/**
 * Generate JS <script> tags.
 */
export function jsHelper(paths: string | string[], root = '/'): string {
  const arr = Array.isArray(paths) ? paths : [paths];
  return arr
    .map((p) => {
      const src = resolvePath(p, root, '.js');
      return `<script src="${src}"></script>`;
    })
    .join('\n');
}

/**
 * Generate an <img> tag.
 */
export function imageTag(src: string, options: {
  alt?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  class?: string;
} = {}): string {
  const attrs: string[] = [`src="${src}"`];
  if (options.alt) attrs.push(`alt="${options.alt}"`);
  if (options.title) attrs.push(`title="${options.title}"`);
  if (options.width) attrs.push(`width="${options.width}"`);
  if (options.height) attrs.push(`height="${options.height}"`);
  if (options.class) attrs.push(`class="${options.class}"`);
  return `<img ${attrs.join(' ')}>`;
}

/**
 * Generate an <a> tag.
 */
export function linkTo(path: string, text?: string, options: {
  external?: boolean;
  class?: string;
  id?: string;
} = {}): string {
  const display = text ?? path;
  const attrs: string[] = [`href="${path}"`];
  if (options.external) {
    attrs.push('target="_blank"', 'rel="noopener"');
  }
  if (options.class) attrs.push(`class="${options.class}"`);
  if (options.id) attrs.push(`id="${options.id}"`);
  return `<a ${attrs.join(' ')}>${display}</a>`;
}

/**
 * Generate a mailto link.
 */
export function mailTo(email: string, text?: string, options: {
  subject?: string;
  class?: string;
} = {}): string {
  const display = text ?? email;
  let href = `mailto:${email}`;
  if (options.subject) href += `?subject=${encodeURIComponent(options.subject)}`;
  const cls = options.class ? ` class="${options.class}"` : '';
  return `<a href="${href}"${cls}>${display}</a>`;
}

/**
 * Generate a <link rel="icon"> tag.
 */
export function faviconTag(path: string, root = '/'): string {
  const href = resolvePath(path, root);
  return `<link rel="icon" href="${href}">`;
}

/**
 * Generate <link rel="alternate"> feed tags.
 */
export function feedTag(
  path: string,
  options: { title?: string; type?: string; root?: string } = {},
): string {
  const { title = '', type = 'atom', root = '/' } = options;
  const href = resolvePath(path, root);
  const mimeType = type === 'rss' ? 'application/rss+xml' : 'application/atom+xml';
  return `<link rel="alternate" href="${href}" title="${title}" type="${mimeType}">`;
}

/**
 * Generate a search form.
 */
export function searchForm(options: {
  class?: string;
  text?: string;
  action?: string;
} = {}): string {
  const { class: cls = 'search-form', text = 'Search', action = '' } = options;
  return `<form action="${action}" class="${cls}" method="get">` +
    `<input type="search" name="q" class="${cls}-input" placeholder="${text}">` +
    `<button type="submit" class="${cls}-submit">${text}</button>` +
    `</form>`;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function resolvePath(path: string, root: string, defaultExt?: string): string {
  if (/^https?:\/\//.test(path)) return path;
  let p = path;
  if (defaultExt && !p.includes('.')) p += defaultExt;
  if (!p.startsWith('/')) p = root.replace(/\/$/, '') + '/' + p;
  return p;
}
