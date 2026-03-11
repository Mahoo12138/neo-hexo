/**
 * @neo-hexo/utils — Pattern Matching
 *
 * A simple file-pattern matching utility.
 * Supports basic glob-like patterns without external dependencies.
 * For advanced glob matching, use `micromatch` or `picomatch` via plugins.
 */

/**
 * Test whether a path matches a pattern.
 *
 * Supports:
 * - `*` — match any characters except `/`
 * - `**` — match any characters including `/`
 * - `?` — match a single character
 * - `{a,b}` — match either `a` or `b`
 */
export function matchPattern(path: string, pattern: string): boolean {
  const regex = patternToRegex(pattern);
  return regex.test(path);
}

/**
 * Test whether a path matches any of the given patterns.
 */
export function matchAny(path: string, patterns: string[]): boolean {
  return patterns.some((p) => matchPattern(path, p));
}

/**
 * Convert a glob-like pattern to a RegExp.
 */
export function patternToRegex(pattern: string): RegExp {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i]!;

    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // ** matches anything including /
        result += '.*';
        i += 2;
        // skip trailing /
        if (pattern[i] === '/') i++;
      } else {
        // * matches anything except /
        result += '[^/]*';
        i++;
      }
    } else if (ch === '?') {
      result += '[^/]';
      i++;
    } else if (ch === '{') {
      const end = pattern.indexOf('}', i);
      if (end !== -1) {
        const alternatives = pattern.slice(i + 1, end).split(',');
        result += `(?:${alternatives.map(escapeRegex).join('|')})`;
        i = end + 1;
      } else {
        result += '\\{';
        i++;
      }
    } else if (ch === '.') {
      result += '\\.';
      i++;
    } else {
      result += ch;
      i++;
    }
  }

  return new RegExp(`^${result}$`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
