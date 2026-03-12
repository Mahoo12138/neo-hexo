/**
 * @neo-hexo/helper — URL Helpers
 *
 * Template helpers for URL resolution and generation.
 */

/**
 * Generate a URL relative to the site root.
 */
export function urlFor(path: string, root = '/'): string {
  if (/^https?:\/\//.test(path)) return path;
  // Ensure root ends with /
  const base = root.endsWith('/') ? root : root + '/';
  // Remove leading / from path
  const cleaned = path.replace(/^\/+/, '');
  return base + cleaned;
}

/**
 * Generate a full URL with protocol and domain.
 */
export function fullUrlFor(path: string, siteUrl: string, root = '/'): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  return base + urlFor(path, root);
}

/**
 * Calculate a relative URL between two paths.
 */
export function relativeUrl(from: string, to: string): string {
  const fromParts = from.replace(/^\/+/, '').split('/');
  const toParts = to.replace(/^\/+/, '').split('/');

  // Remove filename from 'from' path
  fromParts.pop();

  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  const ups = fromParts.length - common;
  const remaining = toParts.slice(common);

  if (ups === 0 && remaining.length === 0) return './';
  return '../'.repeat(ups) + remaining.join('/');
}

/**
 * Encode URL components (preserving /, :, #, ?).
 */
export function encodeUrl(url: string): string {
  return url.replace(/[^\w\-./:#?&=@~!$'()*+,;%]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'),
  );
}

/**
 * Gravatar URL helper.
 */
export function gravatar(email: string, size = 80): string {
  // Simple hash for gravatar — uses hex encoding
  const hash = simpleHash(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mm`;
}

/** Simple hash for demonstration — in production use crypto. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}
