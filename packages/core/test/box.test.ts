import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import * as os from 'node:os';
import { Box } from '../src/box.js';

describe('Box', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'neo-hexo-box-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── Basic Processing ──

  describe('process', () => {
    it('should scan all files in the directory', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'a.md'), 'hello');
      await fs.writeFile(nodePath.join(tmpDir, 'b.md'), 'world');

      const box = new Box(tmpDir);
      const files = await box.process();

      expect(files).toHaveLength(2);
      const paths = files.map((f) => f.path).sort();
      expect(paths).toEqual(['a.md', 'b.md']);
    });

    it('should mark new files as "create"', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'new.md'), 'content');

      const box = new Box(tmpDir);
      const files = await box.process();

      expect(files[0]!.type).toBe('create');
    });

    it('should mark unchanged files as "skip" on second run', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'unchanged.md'), 'content');

      const box = new Box(tmpDir);
      await box.process();
      const secondRun = await box.process();

      expect(secondRun[0]!.type).toBe('skip');
    });

    it('should mark changed files as "update"', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'changed.md'), 'original');

      const box = new Box(tmpDir);
      await box.process();

      await fs.writeFile(nodePath.join(tmpDir, 'changed.md'), 'modified');
      const secondRun = await box.process();

      expect(secondRun[0]!.type).toBe('update');
    });

    it('should detect deleted files', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'delete-me.md'), 'content');

      const box = new Box(tmpDir);
      await box.process();

      await fs.unlink(nodePath.join(tmpDir, 'delete-me.md'));
      const secondRun = await box.process();

      const deleted = secondRun.find((f) => f.type === 'delete');
      expect(deleted).toBeDefined();
      expect(deleted!.path).toBe('delete-me.md');
    });

    it('should skip hidden files (dot-prefixed)', async () => {
      await fs.writeFile(nodePath.join(tmpDir, '.hidden'), 'secret');
      await fs.writeFile(nodePath.join(tmpDir, 'visible.md'), 'visible');

      const box = new Box(tmpDir);
      const files = await box.process();

      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe('visible.md');
    });

    it('should recurse into subdirectories', async () => {
      const subDir = nodePath.join(tmpDir, 'sub');
      await fs.mkdir(subDir);
      await fs.writeFile(nodePath.join(subDir, 'nested.md'), 'deep');

      const box = new Box(tmpDir);
      const files = await box.process();

      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe('sub/nested.md');
    });
  });

  // ── Processors ──

  describe('addProcessor', () => {
    it('should dispatch files to matching processors (string prefix)', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'post.md'), 'content');

      const box = new Box(tmpDir);
      const processed: string[] = [];

      box.addProcessor('.md', (file) => { processed.push(file.path); });
      await box.process();

      expect(processed).toEqual(['post.md']);
    });

    it('should dispatch to regex-matched processors', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'image.png'), '');
      await fs.writeFile(nodePath.join(tmpDir, 'photo.jpg'), '');
      await fs.writeFile(nodePath.join(tmpDir, 'doc.md'), '');

      const box = new Box(tmpDir);
      const images: string[] = [];

      box.addProcessor(/\.(png|jpg)$/, (file) => { images.push(file.path); });
      await box.process();

      expect(images.sort()).toEqual(['image.png', 'photo.jpg']);
    });

    it('should dispatch to function-matched processors', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'a.md'), '');
      await fs.writeFile(nodePath.join(tmpDir, 'b.txt'), '');

      const box = new Box(tmpDir);
      const matched: string[] = [];

      box.addProcessor(
        (path) => path.endsWith('.txt'),
        (file) => { matched.push(file.path); },
      );
      await box.process();

      expect(matched).toEqual(['b.txt']);
    });

    it('should not dispatch skip files to processors', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'stable.md'), 'content');

      const box = new Box(tmpDir);
      const calls: string[] = [];

      box.addProcessor('.md', (file) => { calls.push(file.type); });

      await box.process();  // first run: create
      await box.process();  // second run: skip (should NOT be dispatched)

      expect(calls).toEqual(['create']);
    });
  });

  // ── processFile ──

  describe('processFile', () => {
    it('should process a single file event', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'single.md'), 'content');

      const box = new Box(tmpDir);
      const events: string[] = [];

      box.addProcessor('.md', (file) => { events.push(`${file.type}:${file.path}`); });

      const result = await box.processFile('single.md', 'create');
      expect(result.type).toBe('create');
      expect(events).toEqual(['create:single.md']);
    });
  });

  // ── Cache ──

  describe('cache', () => {
    it('should export and load cache', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'cached.md'), 'content');

      const box1 = new Box(tmpDir);
      await box1.process();
      const cacheData = box1.exportCache();

      expect(cacheData['cached.md']).toBeDefined();
      expect(cacheData['cached.md']!.hash).toBeTruthy();

      // Load into a new box
      const box2 = new Box(tmpDir);
      box2.loadCache(cacheData);
      const files = await box2.process();

      // File unchanged → skip
      expect(files[0]!.type).toBe('skip');
    });

    it('should clear cache', async () => {
      await fs.writeFile(nodePath.join(tmpDir, 'data.md'), 'content');

      const box = new Box(tmpDir);
      await box.process();
      box.clearCache();
      const files = await box.process();

      // After clearing cache, file appears as "create" again
      expect(files[0]!.type).toBe('create');
    });
  });
});
