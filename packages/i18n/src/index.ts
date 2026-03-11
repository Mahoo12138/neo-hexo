/**
 * @neo-hexo/i18n — Internationalization
 *
 * Lightweight i18n system with variable interpolation, plural support,
 * and scoped translation functions. Zero dependencies.
 *
 * Language data is a plain nested object. Translation keys use dot notation.
 *
 * @example
 * ```ts
 * const i18n = new I18n();
 * i18n.set('en', {
 *   greeting: 'Hello, %s!',
 *   posts: { one: '%d post', other: '%d posts' },
 *   nav: { home: 'Home', about: 'About' },
 * });
 * i18n.set('zh-CN', {
 *   greeting: '你好，%s！',
 *   posts: '%d 篇文章',
 *   nav: { home: '首页', about: '关于' },
 * });
 *
 * const t = i18n.translator('en');
 * t('greeting', 'World');     // 'Hello, World!'
 * t('posts', 5);              // '5 posts'
 * t('nav.home');              // 'Home'
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** A nested object of translation strings. */
export type LanguageData = {
  [key: string]: string | PluralEntry | LanguageData;
};

/**
 * Plural entries. Keys follow CLDR plural rules:
 * `zero`, `one`, `two`, `few`, `many`, `other`.
 */
export interface PluralEntry {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** A translation function. */
export type TranslatorFn = (key: string, ...args: unknown[]) => string;

// ─── I18n Class ──────────────────────────────────────────────────────────────

export class I18n {
  private languages = new Map<string, LanguageData>();
  private fallbackLang = 'en';

  /**
   * Set the fallback language (default: 'en').
   */
  setFallback(lang: string): void {
    this.fallbackLang = normalizeLang(lang);
  }

  /**
   * Register language data.
   * Merges with existing data if the language is already registered.
   */
  set(lang: string, data: LanguageData): void {
    const key = normalizeLang(lang);
    const existing = this.languages.get(key);
    if (existing) {
      this.languages.set(key, deepMerge(existing, data));
    } else {
      this.languages.set(key, data);
    }
  }

  /**
   * Get the raw language data for a locale.
   */
  get(lang: string): LanguageData | undefined {
    return this.languages.get(normalizeLang(lang));
  }

  /**
   * Remove language data.
   */
  remove(lang: string): boolean {
    return this.languages.delete(normalizeLang(lang));
  }

  /**
   * Get all registered language keys.
   */
  list(): string[] {
    return [...this.languages.keys()];
  }

  /**
   * Create a translation function bound to a specific language.
   * Falls back to the fallback language if a key is missing.
   */
  translator(lang: string): TranslatorFn {
    const normalizedLang = normalizeLang(lang);

    return (key: string, ...args: unknown[]): string => {
      // Try requested language first, then fallback
      const value =
        this.resolve(normalizedLang, key) ??
        this.resolve(this.fallbackLang, key);

      if (value === undefined) return key; // Return key as-is if not found

      // Handle plural entries
      if (typeof value === 'object' && 'other' in value) {
        const count = typeof args[0] === 'number' ? args[0] : 0;
        const pluralKey = getPluralCategory(count, normalizedLang);
        const template = (value as PluralEntry)[pluralKey] ?? (value as PluralEntry).other;
        return interpolate(template, args);
      }

      if (typeof value === 'string') {
        return interpolate(value, args);
      }

      // Nested object — return key
      return key;
    };
  }

  /**
   * Resolve a dotted key path in a language's data.
   */
  private resolve(lang: string, key: string): string | PluralEntry | LanguageData | undefined {
    const data = this.languages.get(lang);
    if (!data) return undefined;

    const parts = key.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as string | PluralEntry | LanguageData | undefined;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a language tag to lowercase with hyphens.
 * e.g., 'zh_CN' → 'zh-cn', 'EN-US' → 'en-us'
 */
export function normalizeLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase();
}

/**
 * Simple printf-style interpolation.
 * - `%s` — string
 * - `%d` — number (integer)
 * - `%f` — number (float)
 * - `%%` — literal `%`
 */
function interpolate(template: string, args: unknown[]): string {
  let argIndex = 0;

  return template.replace(/%([sdf%])/g, (match, specifier: string) => {
    if (specifier === '%') return '%';

    const arg = args[argIndex++];
    if (arg === undefined) return match;

    switch (specifier) {
      case 's': return String(arg);
      case 'd': return String(Math.floor(Number(arg)));
      case 'f': return String(Number(arg));
      default: return match;
    }
  });
}

/**
 * Get the CLDR plural category for a number.
 * Simplified — covers most languages. Full CLDR requires a larger rule set.
 */
function getPluralCategory(count: number, _lang: string): keyof PluralEntry {
  // English-like rules (sufficient for most Western languages)
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  return 'other';
}

/**
 * Deep merge two objects. Values from `b` override `a`.
 */
function deepMerge(a: LanguageData, b: LanguageData): LanguageData {
  const result = { ...a };
  for (const key of Object.keys(b)) {
    const aVal = a[key];
    const bVal = b[key];
    if (
      typeof aVal === 'object' && aVal !== null && !Array.isArray(aVal) &&
      typeof bVal === 'object' && bVal !== null && !Array.isArray(bVal) &&
      !('other' in bVal) // Don't deep-merge plural entries
    ) {
      result[key] = deepMerge(aVal as LanguageData, bVal as LanguageData);
    } else {
      result[key] = bVal;
    }
  }
  return result;
}
