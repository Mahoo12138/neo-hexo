import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  normalizePath,
  resolvePath,
  joinPath,
  readFile,
  writeFile,
  removeFile,
  ensureDir,
  removeDir,
  listDir,
  listDirRecursive,
  exists,
  isDirectory,
  hashContent,
} from '../src/index.js';

describe('@neo-hexo/fs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `neo-hexo-fs-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── Path Normalization ──

  describe('normalizePath', () => {
    it('converts backslashes to forward slashes', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz');
    });

    it('leaves forward slashes unchanged', () => {
      expect(normalizePath('foo/bar/baz')).toBe('foo/bar/baz');
    });
  });

  describe('joinPath', () => {
    it('joins and normalizes path segments', () => {
      const result = joinPath('foo', 'bar', 'baz.txt');
      expect(result).toBe('foo/bar/baz.txt');
    });
  });

  describe('resolvePath', () => {
    it('returns a normalized absolute path', () => {
      const result = resolvePath('foo', 'bar');
      expect(result).not.toContain('\\');
      expect(path.isAbsolute(result.replace(/\//g, path.sep))).toBe(true);
    });
  });

  // ── File Operations ──

  describe('readFile / writeFile', () => {
    it('writes and reads a file', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await writeFile(filePath, 'hello world');
      const content = await readFile(filePath);
      expect(content).toBe('hello world');
    });

    it('creates parent directories when writing', async () => {
      const filePath = path.join(tmpDir, 'deep', 'nested', 'file.txt');
      await writeFile(filePath, 'nested content');
      const content = await readFile(filePath);
      expect(content).toBe('nested content');
    });
  });

  describe('removeFile', () => {
    it('removes an existing file', async () => {
      const filePath = path.join(tmpDir, 'remove-me.txt');
      await writeFile(filePath, 'data');
      await removeFile(filePath);
      expect(await exists(filePath)).toBe(false);
    });

    it('does not throw for non-existent files', async () => {
      await expect(removeFile(path.join(tmpDir, 'nope.txt'))).resolves.not.toThrow();
    });
  });

  // ── Directory Operations ──

  describe('ensureDir', () => {
    it('creates a directory recursively', async () => {
      const dirPath = path.join(tmpDir, 'a', 'b', 'c');
      await ensureDir(dirPath);
      expect(await isDirectory(dirPath)).toBe(true);
    });
  });

  describe('removeDir', () => {
    it('removes a directory with contents', async () => {
      const dirPath = path.join(tmpDir, 'removable');
      await ensureDir(dirPath);
      await writeFile(path.join(dirPath, 'file.txt'), 'data');
      await removeDir(dirPath);
      expect(await exists(dirPath)).toBe(false);
    });

    it('does not throw for non-existent directories', async () => {
      await expect(removeDir(path.join(tmpDir, 'nope'))).resolves.not.toThrow();
    });
  });

  describe('listDir', () => {
    it('lists only files (not subdirectories)', async () => {
      await writeFile(path.join(tmpDir, 'a.txt'), 'a');
      await writeFile(path.join(tmpDir, 'b.txt'), 'b');
      await ensureDir(path.join(tmpDir, 'subdir'));
      const files = await listDir(tmpDir);
      expect(files.sort()).toEqual(['a.txt', 'b.txt']);
    });
  });

  describe('listDirRecursive', () => {
    it('lists all files recursively with relative paths', async () => {
      await writeFile(path.join(tmpDir, 'root.txt'), 'r');
      await writeFile(path.join(tmpDir, 'sub', 'nested.txt'), 'n');
      await writeFile(path.join(tmpDir, 'sub', 'deep', 'file.txt'), 'f');

      const files = await listDirRecursive(tmpDir);
      expect(files.sort()).toEqual([
        'root.txt',
        'sub/deep/file.txt',
        'sub/nested.txt',
      ]);
    });
  });

  // ── File Info ──

  describe('exists', () => {
    it('returns true for existing files', async () => {
      const filePath = path.join(tmpDir, 'exists.txt');
      await writeFile(filePath, 'yes');
      expect(await exists(filePath)).toBe(true);
    });

    it('returns false for non-existent paths', async () => {
      expect(await exists(path.join(tmpDir, 'nope'))).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('returns true for directories', async () => {
      expect(await isDirectory(tmpDir)).toBe(true);
    });

    it('returns false for files', async () => {
      const filePath = path.join(tmpDir, 'file.txt');
      await writeFile(filePath, 'data');
      expect(await isDirectory(filePath)).toBe(false);
    });
  });

  // ── Hashing ──

  describe('hashContent', () => {
    it('produces consistent SHA-256 hashes', () => {
      const hash1 = hashContent('hello');
      const hash2 = hashContent('hello');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('produces different hashes for different content', () => {
      expect(hashContent('hello')).not.toBe(hashContent('world'));
    });
  });
});
