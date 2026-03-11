/**
 * @neo-hexo/utils — Permalink Pattern
 *
 * Generates and parses permalink patterns like ':year/:month/:day/:title/'.
 * Replaces hexo-util's Permalink class.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PermalinkData {
  [key: string]: string | number | undefined;
}

// ─── Permalink ───────────────────────────────────────────────────────────────

/**
 * A Permalink pattern processor.
 *
 * Pattern tokens use `:name` syntax. For example:
 *   `:year/:month/:day/:title/`
 *
 * @example
 * ```ts
 * const permalink = new Permalink(':year/:month/:day/:title/');
 * permalink.stringify({ year: 2024, month: '01', day: '15', title: 'hello-world' });
 * // → '2024/01/15/hello-world/'
 *
 * permalink.parse('2024/01/15/hello-world/');
 * // → { year: '2024', month: '01', day: '15', title: 'hello-world' }
 * ```
 */
export class Permalink {
  readonly pattern: string;
  private tokens: string[];
  private regex: RegExp;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.tokens = [];

    // Extract token names and build a regex for parsing
    const regexParts = pattern.split(/(:[\w]+)/).map((part) => {
      if (part.startsWith(':')) {
        const name = part.slice(1);
        this.tokens.push(name);
        return '([^/]+)';
      }
      // Escape regex special chars in the literal parts
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });

    this.regex = new RegExp(`^${regexParts.join('')}$`);
  }

  /**
   * Generate a URL string from the pattern and data.
   * Missing tokens remain as `:name` in the output.
   */
  stringify(data: PermalinkData): string {
    let result = this.pattern;
    for (const token of this.tokens) {
      const value = data[token];
      if (value !== undefined) {
        result = result.replace(`:${token}`, String(value));
      }
    }
    return result;
  }

  /**
   * Parse a URL string into data using the pattern.
   * Returns null if the input doesn't match the pattern.
   */
  parse(input: string): PermalinkData | null {
    const match = this.regex.exec(input);
    if (!match) return null;

    const data: PermalinkData = {};
    for (let i = 0; i < this.tokens.length; i++) {
      data[this.tokens[i]!] = match[i + 1];
    }
    return data;
  }

  /** Get the list of token names in this pattern. */
  getTokens(): readonly string[] {
    return this.tokens;
  }
}
