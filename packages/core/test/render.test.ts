import { describe, it, expect, beforeEach } from 'vitest';
import { RenderPipeline, type Renderer } from '../src/render.js';

describe('RenderPipeline', () => {
  let pipeline: RenderPipeline;

  beforeEach(() => {
    pipeline = new RenderPipeline();
  });

  // ── register ──

  describe('register', () => {
    it('should register a renderer for its extensions', () => {
      const md: Renderer = {
        extensions: ['md', 'markdown'],
        output: 'html',
        render: (s) => `<p>${s}</p>`,
      };
      pipeline.register(md);

      expect(pipeline.isRenderable('test.md')).toBe(true);
      expect(pipeline.isRenderable('test.markdown')).toBe(true);
      expect(pipeline.isRenderable('test.txt')).toBe(false);
    });

    it('should return an unregister function', () => {
      const md: Renderer = {
        extensions: ['md'],
        output: 'html',
        render: (s) => s,
      };
      const unregister = pipeline.register(md);

      expect(pipeline.isRenderable('a.md')).toBe(true);
      unregister();
      expect(pipeline.isRenderable('a.md')).toBe(false);
    });

    it('should handle case-insensitive extensions', () => {
      pipeline.register({
        extensions: ['MD'],
        output: 'html',
        render: (s) => s,
      });
      expect(pipeline.isRenderable('test.md')).toBe(true);
    });
  });

  // ── render ──

  describe('render', () => {
    it('should render using the matched renderer', async () => {
      pipeline.register({
        extensions: ['md'],
        output: 'html',
        render: (s) => `<p>${s}</p>`,
      });

      const result = await pipeline.render('hello', { path: 'test.md' });
      expect(result.content).toBe('<p>hello</p>');
      expect(result.outputExt).toBe('html');
      expect(result.renderer).toBe('md');
    });

    it('should passthrough when no renderer matches', async () => {
      const result = await pipeline.render('raw text', { path: 'file.xyz' });
      expect(result.content).toBe('raw text');
      expect(result.renderer).toBe('passthrough');
    });

    it('should use engine option over file extension', async () => {
      pipeline.register({
        extensions: ['md'],
        output: 'html',
        render: (s) => `<md>${s}</md>`,
      });
      pipeline.register({
        extensions: ['txt'],
        output: 'txt',
        render: (s) => s.toUpperCase(),
      });

      const result = await pipeline.render('hello', { path: 'file.txt', engine: 'md' });
      expect(result.content).toBe('<md>hello</md>');
    });

    it('should handle async renderers', async () => {
      pipeline.register({
        extensions: ['md'],
        output: 'html',
        render: async (s) => {
          await new Promise((r) => setTimeout(r, 10));
          return `<p>${s}</p>`;
        },
      });

      const result = await pipeline.render('async', { path: 'test.md' });
      expect(result.content).toBe('<p>async</p>');
    });
  });

  // ── getOutputExt ──

  describe('getOutputExt', () => {
    it('should return the output extension for a renderable file', () => {
      pipeline.register({
        extensions: ['md'],
        output: 'html',
        render: (s) => s,
      });
      expect(pipeline.getOutputExt('post.md')).toBe('html');
    });

    it('should return original extension for non-renderable file', () => {
      expect(pipeline.getOutputExt('image.png')).toBe('png');
    });
  });

  // ── getRegisteredExtensions ──

  describe('getRegisteredExtensions', () => {
    it('should list all registered extensions', () => {
      pipeline.register({
        extensions: ['md', 'markdown'],
        output: 'html',
        render: (s) => s,
      });
      pipeline.register({
        extensions: ['njk'],
        output: 'html',
        render: (s) => s,
      });

      const exts = pipeline.getRegisteredExtensions();
      expect(exts).toContain('md');
      expect(exts).toContain('markdown');
      expect(exts).toContain('njk');
    });
  });
});
