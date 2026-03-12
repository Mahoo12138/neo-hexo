/**
 * @neo-hexo/helper — Date Helpers
 *
 * Template helpers for date formatting and display.
 */

// ─── Date Formatting ─────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

/**
 * Format a date using a pattern string.
 * Patterns: YYYY, MM, DD, HH, mm, ss, MMM, MMMM, d (day of week)
 */
export function formatDate(date: Date | string | number, pattern = 'YYYY-MM-DD'): string {
  const d = toDate(date);

  return pattern
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
    .replace('MMMM', MONTHS[d.getMonth()]!)
    .replace('MMM', SHORT_MONTHS[d.getMonth()]!)
    .replace('DD', String(d.getDate()).padStart(2, '0'))
    .replace('HH', String(d.getHours()).padStart(2, '0'))
    .replace('mm', String(d.getMinutes()).padStart(2, '0'))
    .replace('ss', String(d.getSeconds()).padStart(2, '0'));
}

/** Format as date only. */
export function dateHelper(date: Date | string | number, format?: string): string {
  return formatDate(date, format ?? 'YYYY-MM-DD');
}

/** Format as time only. */
export function timeHelper(date: Date | string | number, format?: string): string {
  return formatDate(date, format ?? 'HH:mm:ss');
}

/** Format as full date+time. */
export function fullDateHelper(date: Date | string | number, format?: string): string {
  return formatDate(date, format ?? 'YYYY-MM-DD HH:mm:ss');
}

/** Relative time (e.g., "3 days ago"). */
export function relativeDate(date: Date | string | number): string {
  const d = toDate(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} days ago`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)} months ago`;
  return `${Math.floor(diffSec / 31536000)} years ago`;
}

/** HTML5 <time> tag. */
export function timeTagHelper(date: Date | string | number, format?: string): string {
  const d = toDate(date);
  const display = formatDate(d, format ?? 'YYYY-MM-DD');
  return `<time datetime="${d.toISOString()}">${display}</time>`;
}

/** XML-compatible date string (ISO 8601). */
export function dateXmlHelper(date: Date | string | number): string {
  return toDate(date).toISOString();
}

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}
