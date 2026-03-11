import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import * as os from 'node:os';
import { ScaffoldManager } from '../src/scaffold.js';

describe('ScaffoldManager', () => {
  let tmpDir: string;
  let scaffold: ScaffoldManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'neo-hexo-scaffold-'));
    scaffold = new ScaffoldManager(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── Defaults ──

  describe('defaults', () => {
    it('should have built-in post scaffold', () => {
      expect(scaffold.has('post')).toBe(true);
      expect(scaffold.get('post')).toContain('{{ title }}');
    });

    it('should have built-in page scaffold', () => {
      expect(scaffold.has('page')).toBe(true);
    });

    it('should have built-in draft scaffold', () => {
      expect(scaffold.has('draft')).toBe(true);
    });
  });

  // ── get / set / remove ──

  describe('get/set/remove', () => {
    it('should set and get a custom scaffold', () => {
      scaffold.set('photo', '---\ntitle: {{ title }}\nalbum:\n---\n');
      expect(scaffold.has('photo')).toBe(true);
      expect(scaffold.get('photo')).toContain('album:');
    });

    it('should fall back to post when scaffold not found', () => {
      expect(scaffold.get('nonexistent')).toBe(scaffold.get('post'));
    });

    it('should remove a scaffold', () => {
      scaffold.set('temp', 'content');
      expect(scaffold.remove('temp')).toBe(true);
      expect(scaffold.has('temp')).toBe(false);
    });

    it('should return false when removing non-existent scaffold', () => {
      expect(scaffold.remove('nope')).toBe(false);
    });
  });

  // ── list ──

  describe('list', () => {
    it('should list all scaffolds', () => {
      const entries = scaffold.list();
      const names = entries.map((e) => e.name);
      expect(names).toContain('post');
      expect(names).toContain('page');
      expect(names).toContain('draft');
    });
  });

  // ── load from disk ──

  describe('load', () => {
    it('should load scaffolds from directory', async () => {
      await fs.writeFile(
        nodePath.join(tmpDir, 'custom.md'),
        '---\nlayout: custom\ntitle: {{ title }}\n---\n',
      );

      await scaffold.load();

      expect(scaffold.has('custom')).toBe(true);
      expect(scaffold.get('custom')).toContain('layout: custom');
    });

    it('should override defaults with user scaffolds', async () => {
      await fs.writeFile(
        nodePath.join(tmpDir, 'post.md'),
        '---\ntitle: {{ title }}\ncustom_field: true\n---\n',
      );

      await scaffold.load();

      expect(scaffold.get('post')).toContain('custom_field: true');
    });

    it('should handle non-existent scaffold directory', async () => {
      const mgr = new ScaffoldManager(nodePath.join(tmpDir, 'nonexistent'));
      await mgr.load();
      // Should still have defaults
      expect(mgr.has('post')).toBe(true);
      expect(mgr.isLoaded()).toBe(true);
    });
  });

  // ── save to disk ──

  describe('save', () => {
    it('should persist scaffold to disk', async () => {
      await scaffold.save('review', '---\ntitle: {{ title }}\nrating:\n---\n');

      // Verify memory
      expect(scaffold.get('review')).toContain('rating:');

      // Verify disk
      const content = await fs.readFile(
        nodePath.join(tmpDir, 'review.md'),
        'utf-8',
      );
      expect(content).toContain('rating:');
    });
  });
});
