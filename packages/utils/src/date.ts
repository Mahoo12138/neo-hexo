/**
 * @neo-hexo/utils — Date Utilities
 *
 * Lightweight date formatting without moment.js.
 * Uses native Intl.DateTimeFormat for locale-aware formatting.
 */

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse a value into a Date object or undefined.
 * Handles: Date objects, ISO strings, Unix timestamps, common date strings.
 */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Adjust a Date for a specific IANA timezone.
 * Returns a new Date shifted to represent the "wall clock" time in that timezone.
 */
export function adjustDateForTimezone(date: Date, timezone: string): Date {
  if (!timezone) return date;

  // Use Intl to get the UTC offset for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });

  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart) return date;

  // Parse offset like "GMT+8" or "GMT-5:30"
  const offsetMatch = tzPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
  if (!offsetMatch) return date;

  const sign = offsetMatch[1] === '-' ? -1 : 1;
  const hours = parseInt(offsetMatch[2]!, 10);
  const minutes = parseInt(offsetMatch[3] ?? '0', 10);
  const offsetMs = sign * (hours * 60 + minutes) * 60_000;

  // Shift from UTC to target timezone
  return new Date(date.getTime() + offsetMs + date.getTimezoneOffset() * 60_000);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export interface DateFormatOptions {
  /** Language tag (e.g., 'en', 'zh-CN'). Default: 'en'. */
  lang?: string;
  /** IANA timezone (e.g., 'Asia/Shanghai'). */
  timezone?: string;
}

/**
 * Format a date using a simple pattern string.
 *
 * Supported tokens:
 * - `YYYY` — 4-digit year
 * - `YY`   — 2-digit year
 * - `MM`   — 2-digit month (01–12)
 * - `M`    — month (1–12)
 * - `DD`   — 2-digit day (01–31)
 * - `D`    — day (1–31)
 * - `HH`   — 2-digit hour, 24h (00–23)
 * - `mm`   — 2-digit minute (00–59)
 * - `ss`   — 2-digit second (00–59)
 */
export function formatDate(date: Date, pattern: string, options: DateFormatOptions = {}): string {
  const { timezone } = options;

  // Resolve date parts in the desired timezone
  const parts = getDateParts(date, timezone);

  return pattern
    .replace('YYYY', String(parts.year))
    .replace('YY', String(parts.year).slice(-2))
    .replace('MM', pad2(parts.month))
    .replace('M', String(parts.month))
    .replace('DD', pad2(parts.day))
    .replace('D', String(parts.day))
    .replace('HH', pad2(parts.hour))
    .replace('mm', pad2(parts.minute))
    .replace('ss', pad2(parts.second));
}

/**
 * Format a date as an ISO 8601 string (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Format a date relative to now (e.g., "3 days ago", "in 2 hours").
 * Uses native Intl.RelativeTimeFormat.
 */
export function timeAgo(date: Date, lang = 'en'): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiff = Math.abs(diffMs);

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (absDiff < 60_000) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absDiff < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (absDiff < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  if (absDiff < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day');
  if (absDiff < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month');
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getDateParts(date: Date, timezone?: string): DateParts {
  if (!timezone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }

  // Use Intl to resolve parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
