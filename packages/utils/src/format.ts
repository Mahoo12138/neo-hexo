/**
 * @neo-hexo/utils — Number & Format Utilities
 */

/**
 * Format a number with the given precision and separators.
 *
 * @param num - The number to format
 * @param precision - Decimal places (default: 0)
 * @param separator - Thousands separator (default: ',')
 * @param decimalPoint - Decimal point character (default: '.')
 */
export function numberFormat(
  num: number,
  precision = 0,
  separator = ',',
  decimalPoint = '.',
): string {
  const fixed = num.toFixed(precision);
  const [integer, decimal] = fixed.split('.');

  const withSep = integer!.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return decimal ? `${withSep}${decimalPoint}${decimal}` : withSep;
}

/**
 * Format a file size in bytes as a human-readable string.
 *
 * @param bytes - File size in bytes
 * @param decimals - Decimal places (default: 2)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a high-resolution time tuple into a human-readable string.
 * Replaces `pretty-hrtime`.
 */
export function formatHrtime(hrtime: [number, number]): string {
  const [seconds, nanoseconds] = hrtime;
  const totalMs = seconds * 1000 + nanoseconds / 1_000_000;

  if (totalMs < 1) return `${(nanoseconds / 1000).toFixed(0)} µs`;
  if (totalMs < 1000) return `${totalMs.toFixed(1)} ms`;
  return `${(totalMs / 1000).toFixed(2)} s`;
}
