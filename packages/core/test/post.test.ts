import { describe, it, expect, beforeEach } from 'vitest';
import { PostProcessor, type FrontMatterParser } from '../src/post.js';

// Minimal YAML front-matter parser for tests
const testParser: FrontMatterParser = (source) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, content: source, excerpt: '' };
  const raw = match[1]!;
  const content = source.slice(match[0].length);
  const data: Record<string, unknown> = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      data[key] = val;
    }
  }
  const excerptIdx = content.indexOf('<!-- more -->');
  const excerpt = excerptIdx >= 0 ? content.slice(0, excerptIdx).trim() : '';
  return { data, content, excerpt };
};

describe('PostProcessor', () => {
  let post: PostProcessor;

  beforeEach(() => {
    post = new PostProcessor({ frontMatterParser: testParser });
  });

  // ── parse ──

  describe('parse', () => {
    it('should parse front-matter and content', () => {
      const source = `---
title: Hello World
date: 2024-01-15
---
This is the content.`;

      const result = post.parse(source, '_posts/hello-world.md');
      expect(result.frontMatter['title']).toBe('Hello World');
      expect(result.frontMatter['date']).toBe('2024-01-15');
      expect(result.content).toBe('This is the content.');
      expect(result.path).toBe('_posts/hello-world.md');
      expect(result.published).toBe(true);
    });

    it('should extract excerpt', () => {
      const source = `---
title: Post
---
Intro text

<!-- more -->

Rest of content.`;

      const result = post.parse(source, 'test.md');
      expect(result.excerpt).toBe('Intro text');
    });

    it('should generate slug from title', () => {
      const source = `---
title: My Awesome Post
---
Content`;

      const result = post.parse(source, 'test.md');
      expect(result.frontMatter['slug']).toBe('my-awesome-post');
    });

    it('should use slug from front-matter if present', () => {
      const source = `---
title: My Post
slug: custom-slug
---
Content`;

      const result = post.parse(source, 'test.md');
      expect(result.frontMatter['slug']).toBe('custom-slug');
    });

    it('should derive slug from filename when no title', () => {
      const source = `---
date: 2024-01-01
---
Content`;

      const result = post.parse(source, 'my-file-name.md');
      expect(result.frontMatter['slug']).toBe('my-file-name');
    });

    it('should mark as unpublished when published: false', () => {
      const source = `---
title: Draft
published: false
---
Draft content`;

      const result = post.parse(source, 'test.md');
      expect(result.published).toBe(false);
    });

    it('should handle source without front-matter', () => {
      const source = 'Just plain content.';
      const result = post.parse(source, 'test.md');
      expect(result.frontMatter['slug']).toBe('test');
      expect(result.content).toBe('Just plain content.');
    });
  });

  // ── render ──

  describe('render', () => {
    it('should render content using the content renderer', async () => {
      const renderer = new PostProcessor({
        frontMatterParser: testParser,
        contentRenderer: async (s) => `<p>${s}</p>`,
      });

      const parsed = renderer.parse(`---
title: Test
---
Hello`, 'test.md');

      const rendered = await renderer.render(parsed);
      expect(rendered.content).toBe('<p>Hello</p>');
    });

    it('should render excerpt if present', async () => {
      const renderer = new PostProcessor({
        frontMatterParser: testParser,
        contentRenderer: async (s) => `<p>${s.trim()}</p>`,
      });

      const parsed = renderer.parse(`---
title: Test
---
Intro

<!-- more -->

Body`, 'test.md');

      const rendered = await renderer.render(parsed);
      expect(rendered.excerpt).toBe('<p>Intro</p>');
    });

    it('should return as-is when no renderer is set', async () => {
      const parsed = post.parse(`---
title: Test
---
Raw content`, 'test.md');

      const result = await post.render(parsed);
      expect(result.content).toBe('Raw content');
    });

    it('should support setRenderer for lazy initialization', async () => {
      post.setRenderer(async (s) => `<b>${s}</b>`);

      const parsed = post.parse(`---
title: Test
---
Bold`, 'test.md');

      const result = await post.render(parsed);
      expect(result.content).toBe('<b>Bold</b>');
    });
  });

  // ── createContent ──

  describe('createContent', () => {
    it('should interpolate template variables', () => {
      const scaffold = `---
title: {{ title }}
date: {{ date }}
layout: {{ layout }}
---
`;
      const result = post.createContent(scaffold, { title: 'My Post' });
      expect(result).toContain('title: My Post');
      expect(result).toContain('layout: post');
      expect(result).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    });

    it('should use custom layout', () => {
      const scaffold = `---
layout: {{ layout }}
---
`;
      const result = post.createContent(scaffold, { title: 'P', layout: 'page' });
      expect(result).toContain('layout: page');
    });
  });

  // ── getPostPath ──

  describe('getPostPath', () => {
    it('should default to _posts for post layout', () => {
      const path = post.getPostPath('/src', { title: 'Hello World' });
      expect(path.replace(/\\/g, '/')).toBe('/src/_posts/hello-world.md');
    });

    it('should use _drafts for draft layout', () => {
      const path = post.getPostPath('/src', { title: 'Draft', layout: 'draft' });
      expect(path.replace(/\\/g, '/')).toBe('/src/_drafts/draft.md');
    });

    it('should use explicit path when provided', () => {
      const path = post.getPostPath('/src', { title: 'X', path: 'custom/path.md' });
      expect(path.replace(/\\/g, '/')).toBe('/src/custom/path.md');
    });
  });
});
