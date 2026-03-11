import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { Router } from '../src/router.js';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  // ── format ──

  describe('format', () => {
    it('should strip leading slashes', () => {
      expect(Router.format('/foo/bar.html')).toBe('foo/bar.html');
    });

    it('should convert backslashes to forward slashes', () => {
      expect(Router.format('foo\\bar\\baz.html')).toBe('foo/bar/baz.html');
    });

    it('should append index.html to directory-like paths', () => {
      expect(Router.format('foo/bar/')).toBe('foo/bar/index.html');
    });

    it('should handle empty path', () => {
      expect(Router.format('')).toBe('index.html');
    });

    it('should handle mixed slashes and leading slashes', () => {
      expect(Router.format('\\foo\\bar/')).toBe('foo/bar/index.html');
    });
  });

  // ── set / get / has ──

  describe('set/get/has', () => {
    it('should store and retrieve a route', () => {
      router.set('test.html', 'hello');
      expect(router.has('test.html')).toBe(true);
      expect(router.get('test.html')?.data).toBe('hello');
      expect(router.get('test.html')?.modified).toBe(true);
    });

    it('should normalize paths on set/get', () => {
      router.set('/foo/bar.html', 'content');
      expect(router.has('foo/bar.html')).toBe(true);
      expect(router.get('/foo/bar.html')?.data).toBe('content');
    });

    it('should overwrite existing routes', () => {
      router.set('page.html', 'old');
      router.set('page.html', 'new');
      expect(router.get('page.html')?.data).toBe('new');
    });

    it('should return undefined for non-existent routes', () => {
      expect(router.get('nope.html')).toBeUndefined();
      expect(router.has('nope.html')).toBe(false);
    });
  });

  // ── remove ──

  describe('remove', () => {
    it('should remove an existing route', () => {
      router.set('rm.html', 'data');
      expect(router.remove('rm.html')).toBe(true);
      expect(router.has('rm.html')).toBe(false);
    });

    it('should return false for non-existent route', () => {
      expect(router.remove('nope.html')).toBe(false);
    });
  });

  // ── list / size ──

  describe('list/size', () => {
    it('should list all routes and report size', () => {
      router.set('a.html', '1');
      router.set('b.html', '2');
      router.set('c.html', '3');
      expect(router.list()).toEqual(['a.html', 'b.html', 'c.html']);
      expect(router.size).toBe(3);
    });
  });

  // ── forEach ──

  describe('forEach', () => {
    it('should iterate over routes', () => {
      router.set('x.html', 'X');
      router.set('y.html', 'Y');

      const visited: string[] = [];
      router.forEach((path) => visited.push(path));
      expect(visited).toEqual(['x.html', 'y.html']);
    });
  });

  // ── resolve ──

  describe('resolve', () => {
    it('should resolve string data', async () => {
      router.set('str.html', 'hello world');
      expect(await router.resolve('str.html')).toBe('hello world');
    });

    it('should resolve Buffer data', async () => {
      router.set('buf.html', Buffer.from('buffered'));
      expect(await router.resolve('buf.html')).toBe('buffered');
    });

    it('should resolve function data', async () => {
      router.set('fn.html', () => 'lazy');
      expect(await router.resolve('fn.html')).toBe('lazy');
    });

    it('should resolve async function data', async () => {
      router.set('async.html', async () => 'async-result');
      expect(await router.resolve('async.html')).toBe('async-result');
    });

    it('should resolve Readable stream data', async () => {
      const stream = Readable.from(['stream', '-', 'data']);
      router.set('stream.html', stream);
      expect(await router.resolve('stream.html')).toBe('stream-data');
    });

    it('should return null for non-existent route', async () => {
      expect(await router.resolve('missing.html')).toBeNull();
    });
  });

  // ── resetModified / clear ──

  describe('resetModified', () => {
    it('should mark all routes as unmodified', () => {
      router.set('a.html', '1');
      router.set('b.html', '2');
      router.resetModified();
      expect(router.get('a.html')?.modified).toBe(false);
      expect(router.get('b.html')?.modified).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all routes', () => {
      router.set('a.html', '1');
      router.set('b.html', '2');
      router.clear();
      expect(router.size).toBe(0);
      expect(router.list()).toEqual([]);
    });
  });
});
