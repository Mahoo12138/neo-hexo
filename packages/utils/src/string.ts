/**
 * @neo-hexo/utils — String Utilities
 *
 * HTML escaping, truncation, word wrap, titlecase, and slug generation.
 */

// ─── HTML ────────────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ESCAPE_RE = /[&<>"']/g;
const HTML_TAG_RE = /<[^>]*>/g;

/** Escape HTML special characters. */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]!);
}

/** Strip all HTML tags from a string. */
export function stripHtml(str: string): string {
  return str.replace(HTML_TAG_RE, '');
}

// ─── Text Manipulation ──────────────────────────────────────────────────────

/**
 * Truncate a string to a specified length.
 * Appends an omission suffix (default: '...') if truncated.
 */
export function truncate(str: string, length: number, omission = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - omission.length) + omission;
}

/**
 * Wrap text at a specified width, breaking at word boundaries.
 */
export function wordWrap(str: string, width = 80): string {
  if (str.length <= width) return str;

  const lines: string[] = [];
  const paragraphs = str.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > width && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }

    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Convert a string to title case.
 * Handles common English stop words (a, an, the, etc.)
 */
export function titleCase(str: string): string {
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if',
    'in', 'nor', 'of', 'on', 'or', 'per', 'so', 'the', 'to', 'up',
    'via', 'vs', 'yet',
  ]);

  return str
    .split(' ')
    .map((word, i) => {
      if (i === 0 || !STOP_WORDS.has(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(' ');
}

// ─── Slug ────────────────────────────────────────────────────────────────────

export interface SlugizeOptions {
  /** Separator character (default: '-'). */
  separator?: string;
  /** Transform case: 'lower', 'upper', or false for no change. */
  transform?: 'lower' | 'upper' | false;
}

/**
 * Convert a string to a URL-friendly slug.
 *
 * - Normalizes Unicode (NFD) and strips combining diacriticals
 * - Replaces whitespace and special characters with a separator
 * - Collapses multiple separators
 * - Trims separators from edges
 */
export function slugize(str: string, options: SlugizeOptions = {}): string {
  const { separator = '-', transform = 'lower' } = options;
  const sepEscaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let slug = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacriticals
    .replace(/[^\w\s-]/g, '')        // remove non-word chars except whitespace and hyphen
    .replace(/[\s_]+/g, separator)   // whitespace/underscore → separator
    .replace(new RegExp(`${sepEscaped}{2,}`, 'g'), separator) // collapse multiples
    .replace(new RegExp(`^${sepEscaped}|${sepEscaped}$`, 'g'), ''); // trim edges

  if (transform === 'lower') slug = slug.toLowerCase();
  else if (transform === 'upper') slug = slug.toUpperCase();

  return slug;
}
