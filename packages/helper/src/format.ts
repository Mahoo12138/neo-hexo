/**
 * @neo-hexo/helper — Format Helpers
 *
 * Text formatting, escaping, and transformation helpers.
 */

/**
 * Escape HTML entities.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Truncate a string to the specified length, adding a suffix.
 */
export function truncate(str: string, length = 200, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Word wrap: insert line breaks at word boundaries.
 */
export function wordWrap(str: string, width = 80): string {
  const lines: string[] = [];
  let current = '';

  for (const word of str.split(/\s+/)) {
    if (current.length + word.length + 1 > width && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);

  return lines.join('\n');
}

/**
 * Number formatting with grouping and decimals.
 */
export function numberFormat(
  num: number,
  decimals = 0,
  decimalPoint = '.',
  thousandsSep = ',',
): string {
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

  return decPart ? grouped + decimalPoint + decPart : grouped;
}
