/**
 * @neo-hexo/helper — Tests
 */

import { describe, it, expect } from 'vitest';

// ── Date helpers
import { formatDate, relativeDate, dateXmlHelper } from '@neo-hexo/helper';

// ── URL helpers
import { urlFor, fullUrlFor, relativeUrl, encodeUrl, gravatar } from '@neo-hexo/helper';

// ── Format helpers
import { escapeHtml, stripHtml, truncate, wordWrap, numberFormat } from '@neo-hexo/helper';

// ── HTML helpers
import { cssHelper, jsHelper, imageTag, linkTo, mailTo, faviconTag } from '@neo-hexo/helper';

// ── Navigation helpers
import { isCurrent, isHome, isPost, isPage, isArchive } from '@neo-hexo/helper';
import type { PageContext } from '@neo-hexo/helper';

// ── Content helpers
import { toc, metaGenerator } from '@neo-hexo/helper';

// ─── Date Tests ──────────────────────────────────────────────────────────────

describe('date helpers', () => {
  it('formatDate should format a date', () => {
    const d = new Date('2024-06-15T12:30:00Z');
    const result = formatDate(d);
    expect(result).toContain('2024');
  });

  it('relativeDate should return relative string', () => {
    const now = new Date();
    const result = relativeDate(now);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('dateXmlHelper should return ISO string', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const result = dateXmlHelper(d);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });
});

// ─── URL Tests ───────────────────────────────────────────────────────────────

describe('url helpers', () => {
  it('urlFor should resolve paths', () => {
    expect(urlFor('/about')).toBe('/about');
    expect(urlFor('about', '/blog/')).toBe('/blog/about');
  });

  it('fullUrlFor should produce absolute URL', () => {
    expect(fullUrlFor('/about', 'https://example.com')).toBe('https://example.com/about');
  });

  it('relativeUrl should compute relative path', () => {
    expect(relativeUrl('/foo/bar/', '/foo/baz/')).toBe('../baz/');
  });

  it('encodeUrl should encode special chars', () => {
    expect(encodeUrl('https://example.com/hello world')).toContain('hello%20world');
  });

  it('gravatar should return gravatar URL', () => {
    const url = gravatar('test@example.com');
    expect(url).toContain('gravatar.com');
    expect(url).toContain('s=80');
  });
});

// ─── Format Tests ────────────────────────────────────────────────────────────

describe('format helpers', () => {
  it('escapeHtml should escape special chars', () => {
    expect(escapeHtml('<p>Hello & "world"</p>')).toBe('&lt;p&gt;Hello &amp; &quot;world&quot;&lt;/p&gt;');
  });

  it('stripHtml should remove HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('truncate should trim text', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('wordWrap should wrap at width', () => {
    const result = wordWrap('Hello World', 5);
    expect(result).toContain('\n');
  });

  it('numberFormat should format numbers', () => {
    expect(numberFormat(1234567.89, 2)).toContain('1');
  });
});

// ─── HTML Tag Tests ──────────────────────────────────────────────────────────

describe('html helpers', () => {
  it('cssHelper should create link tags', () => {
    const result = cssHelper('style.css');
    expect(result).toContain('<link');
    expect(result).toContain('style.css');
  });

  it('jsHelper should create script tags', () => {
    const result = jsHelper('app.js');
    expect(result).toContain('<script');
    expect(result).toContain('app.js');
  });

  it('imageTag should create img tag', () => {
    const result = imageTag('photo.jpg', { alt: 'Photo' });
    expect(result).toContain('<img');
    expect(result).toContain('photo.jpg');
    expect(result).toContain('Photo');
  });

  it('linkTo should create anchor tag', () => {
    const result = linkTo('/about', 'About');
    expect(result).toContain('<a');
    expect(result).toContain('/about');
    expect(result).toContain('About');
  });

  it('mailTo should create mailto link', () => {
    const result = mailTo('test@example.com', 'Email');
    expect(result).toContain('mailto:');
    expect(result).toContain('test@example.com');
  });

  it('faviconTag should create link tag', () => {
    const result = faviconTag('favicon.ico');
    expect(result).toContain('<link');
    expect(result).toContain('favicon.ico');
  });
});

// ─── Navigation Tests ────────────────────────────────────────────────────────

describe('navigation helpers', () => {
  it('isCurrent should match paths', () => {
    expect(isCurrent('/about', '/about')).toBe(true);
    expect(isCurrent('/about', '/contact')).toBe(false);
  });

  const homePage: PageContext = { path: '', __index: true };
  const postPage: PageContext = { path: 'post/hello', layout: 'post' };
  const regularPage: PageContext = { path: 'about', layout: 'page' };
  const archivePage: PageContext = { path: 'archives', __archive: true };

  it('isHome should detect index pages', () => {
    expect(isHome(homePage)).toBe(true);
    expect(isHome(postPage)).toBe(false);
  });

  it('isPost should detect post pages', () => {
    expect(isPost(postPage)).toBe(true);
    expect(isPost(regularPage)).toBe(false);
  });

  it('isPage should detect standalone pages', () => {
    expect(isPage(regularPage)).toBe(true);
    expect(isPage(postPage)).toBe(false);
  });

  it('isArchive should detect archive pages', () => {
    expect(isArchive(archivePage)).toBe(true);
    expect(isArchive(homePage)).toBe(false);
  });
});

// ─── Content Tests ───────────────────────────────────────────────────────────

describe('content helpers', () => {
  it('toc should generate table of contents', () => {
    const html = '<h2 id="intro">Introduction</h2><h3 id="sub">Sub</h3>';
    const result = toc(html);
    expect(result).toContain('intro');
    expect(result).toContain('Introduction');
  });

  it('metaGenerator should return meta tag', () => {
    const result = metaGenerator();
    expect(result).toContain('<meta');
    expect(result).toContain('Neo-Hexo');
  });
});
