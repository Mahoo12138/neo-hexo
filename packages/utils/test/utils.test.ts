import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  stripHtml,
  truncate,
  wordWrap,
  titleCase,
  slugize,
  urlFor,
  fullUrlFor,
  relativeUrl,
  encodeUrl,
  decodeUrl,
  toDate,
  formatDate,
  Permalink,
  matchPattern,
  matchAny,
  numberFormat,
  formatBytes,
  formatHrtime,
} from '../src/index.js';

// ─── String ──────────────────────────────────────────────────────────────────

describe('string utilities', () => {
  describe('escapeHtml', () => {
    it('escapes special HTML characters', () => {
      expect(escapeHtml('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;',
      );
    });
  });

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });
  });

  describe('truncate', () => {
    it('truncates long strings with ellipsis', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('returns short strings unchanged', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('supports custom omission', () => {
      expect(truncate('Hello World', 9, '…')).toBe('Hello Wo…');
    });
  });

  describe('wordWrap', () => {
    it('wraps text at word boundaries', () => {
      const result = wordWrap('The quick brown fox jumps over the lazy dog', 20);
      const lines = result.split('\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('titleCase', () => {
    it('capitalizes first letter of each word', () => {
      expect(titleCase('hello world')).toBe('Hello World');
    });

    it('handles stop words (not first word)', () => {
      expect(titleCase('the lord of the rings')).toBe('The Lord of the Rings');
    });
  });

  describe('slugize', () => {
    it('converts to lowercase slug', () => {
      expect(slugize('Hello World')).toBe('hello-world');
    });

    it('handles diacriticals', () => {
      expect(slugize('Crème Brûlée')).toBe('creme-brulee');
    });

    it('supports custom separator', () => {
      expect(slugize('Hello World', { separator: '_' })).toBe('hello_world');
    });

    it('supports uppercase transform', () => {
      expect(slugize('hello world', { transform: 'upper' })).toBe('HELLO-WORLD');
    });
  });
});

// ─── URL ─────────────────────────────────────────────────────────────────────

describe('URL utilities', () => {
  describe('urlFor', () => {
    it('prepends root path', () => {
      expect(urlFor('/', 'css/style.css')).toBe('/css/style.css');
    });

    it('handles non-root paths', () => {
      expect(urlFor('/blog/', 'posts/hello')).toBe('/blog/posts/hello');
    });

    it('passes through absolute URLs', () => {
      expect(urlFor('/', 'https://example.com/img.png')).toBe('https://example.com/img.png');
    });

    it('handles protocol-relative URLs', () => {
      expect(urlFor('/', '//cdn.example.com/file.js')).toBe('//cdn.example.com/file.js');
    });
  });

  describe('fullUrlFor', () => {
    it('generates full URL', () => {
      expect(fullUrlFor('https://example.com', '/', 'posts/hello')).toBe(
        'https://example.com/posts/hello',
      );
    });

    it('passes through absolute URLs', () => {
      expect(fullUrlFor('https://example.com', '/', 'https://other.com/page')).toBe(
        'https://other.com/page',
      );
    });
  });

  describe('relativeUrl', () => {
    it('computes relative path from one URL to another', () => {
      expect(relativeUrl('posts/hello/', 'css/style.css')).toBe('../../css/style.css');
    });

    it('handles same directory', () => {
      expect(relativeUrl('posts/', 'posts/hello')).toBe('hello');
    });
  });

  describe('encodeUrl / decodeUrl', () => {
    it('round-trips URLs', () => {
      const url = '/path/to/文件.html';
      expect(decodeUrl(encodeUrl(url))).toBe(url);
    });
  });
});

// ─── Date ────────────────────────────────────────────────────────────────────

describe('date utilities', () => {
  describe('toDate', () => {
    it('parses ISO string', () => {
      const d = toDate('2024-01-15T10:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2024);
    });

    it('handles Date objects', () => {
      const d = new Date();
      expect(toDate(d)).toBe(d);
    });

    it('handles timestamps', () => {
      const d = toDate(0);
      expect(d!.getTime()).toBe(0);
    });

    it('returns undefined for invalid', () => {
      expect(toDate('not-a-date')).toBeUndefined();
    });
  });

  describe('formatDate', () => {
    it('formats with YYYY-MM-DD pattern', () => {
      const d = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(d, 'YYYY-MM-DD', { timezone: 'UTC' });
      expect(result).toBe('2024-03-15');
    });

    it('formats time components', () => {
      const d = new Date('2024-03-15T08:05:03Z');
      const result = formatDate(d, 'HH:mm:ss', { timezone: 'UTC' });
      expect(result).toBe('08:05:03');
    });
  });
});

// ─── Permalink ───────────────────────────────────────────────────────────────

describe('Permalink', () => {
  it('stringifies data with a pattern', () => {
    const p = new Permalink(':year/:month/:day/:title/');
    const result = p.stringify({ year: '2024', month: '01', day: '15', title: 'hello-world' });
    expect(result).toBe('2024/01/15/hello-world/');
  });

  it('parses a URL into data', () => {
    const p = new Permalink(':year/:month/:day/:title/');
    const data = p.parse('2024/01/15/hello-world/');
    expect(data).toEqual({
      year: '2024',
      month: '01',
      day: '15',
      title: 'hello-world',
    });
  });

  it('returns null for non-matching input', () => {
    const p = new Permalink(':year/:title/');
    expect(p.parse('no-match')).toBeNull();
  });

  it('returns token names', () => {
    const p = new Permalink(':year/:month/:day/:title/');
    expect(p.getTokens()).toEqual(['year', 'month', 'day', 'title']);
  });
});

// ─── Pattern ─────────────────────────────────────────────────────────────────

describe('pattern matching', () => {
  describe('matchPattern', () => {
    it('matches wildcards', () => {
      expect(matchPattern('src/file.ts', 'src/*.ts')).toBe(true);
      expect(matchPattern('src/file.js', 'src/*.ts')).toBe(false);
    });

    it('matches double wildcards', () => {
      expect(matchPattern('src/deep/nested/file.ts', '**/*.ts')).toBe(true);
    });

    it('matches braces', () => {
      expect(matchPattern('file.ts', '*.{ts,js}')).toBe(true);
      expect(matchPattern('file.js', '*.{ts,js}')).toBe(true);
      expect(matchPattern('file.css', '*.{ts,js}')).toBe(false);
    });
  });

  describe('matchAny', () => {
    it('matches against multiple patterns', () => {
      expect(matchAny('test.ts', ['*.js', '*.ts'])).toBe(true);
      expect(matchAny('test.css', ['*.js', '*.ts'])).toBe(false);
    });
  });
});

// ─── Format ──────────────────────────────────────────────────────────────────

describe('format utilities', () => {
  describe('numberFormat', () => {
    it('formats with thousands separator', () => {
      expect(numberFormat(1234567)).toBe('1,234,567');
    });

    it('formats with decimal places', () => {
      expect(numberFormat(1234.5, 2)).toBe('1,234.50');
    });

    it('supports custom separators', () => {
      expect(numberFormat(1234567, 0, '.', ',')).toBe('1.234.567');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatHrtime', () => {
    it('formats microseconds', () => {
      expect(formatHrtime([0, 500_000])).toBe('500 µs');
    });

    it('formats milliseconds', () => {
      expect(formatHrtime([0, 50_000_000])).toBe('50.0 ms');
    });

    it('formats seconds', () => {
      expect(formatHrtime([2, 500_000_000])).toBe('2.50 s');
    });
  });
});
