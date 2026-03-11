/**
 * @neo-hexo/utils — URL Utilities
 *
 * URL construction and manipulation using the built-in URL API.
 * Replaces various hexo-util URL helpers.
 */

/**
 * Generate a relative URL from the site root.
 * Handles root path prefix and ensures proper slash usage.
 *
 * @param root - Site root path (e.g., '/' or '/blog/')
 * @param path - Target path
 */
export function urlFor(root: string, path: string): string {
  // Absolute URLs (http://, https://, //) pass through
  if (/^(?:https?:)?\/\//.test(path)) return path;

  // Normalize root to have trailing slash
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;

  // Remove leading slash from path to avoid double-slash
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return normalizedRoot + normalizedPath;
}

/**
 * Generate a full (absolute) URL combining the site URL and a path.
 *
 * @param siteUrl - Site base URL (e.g., 'https://example.com')
 * @param root - Site root path
 * @param path - Target path
 */
export function fullUrlFor(siteUrl: string, root: string, path: string): string {
  // Already absolute
  if (/^https?:\/\//.test(path)) return path;

  const relative = urlFor(root, path);
  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

  return base + relative;
}

/**
 * Compute a relative URL from one path to another.
 *
 * @param from - Source path (e.g., 'foo/bar/')
 * @param to - Destination path (e.g., 'css/style.css')
 */
export function relativeUrl(from: string, to: string): string {
  const fromParts = from.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const toParts = to.replace(/^\//, '').split('/').filter(Boolean);

  // Find common prefix length
  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++;
  }

  const ups = fromParts.length - common;
  const remaining = toParts.slice(common);

  const parts = [...Array(ups).fill('..'), ...remaining];
  return parts.length === 0 ? './' : parts.join('/');
}

/**
 * Encode a URL path, preserving valid URL characters.
 * Unlike encodeURI, this properly handles already-encoded sequences.
 */
export function encodeUrl(url: string): string {
  // Decode first to avoid double-encoding, then re-encode
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return encodeURI(url);
  }
}

/**
 * Decode a URL path. Safe — does not throw on invalid sequences.
 */
export function decodeUrl(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

/**
 * Extract the domain from a URL string.
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
