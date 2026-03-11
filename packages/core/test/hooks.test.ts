import { describe, it, expect, vi } from 'vitest';
import { Hook } from '../src/hooks.js';

describe('Hook', () => {
  describe('sequential strategy', () => {
    it('should execute taps in registration order', async () => {
      const order: number[] = [];
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      hook.tap('a', async () => { order.push(1); });
      hook.tap('b', async () => { order.push(2); });
      hook.tap('c', async () => { order.push(3); });

      await hook.call();
      expect(order).toEqual([1, 2, 3]);
    });

    it('should respect priority ordering (lower = earlier)', async () => {
      const order: string[] = [];
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      hook.tap({ name: 'low', priority: 10 }, async () => { order.push('low'); });
      hook.tap({ name: 'high', priority: -10 }, async () => { order.push('high'); });
      hook.tap({ name: 'mid', priority: 0 }, async () => { order.push('mid'); });

      await hook.call();
      expect(order).toEqual(['high', 'mid', 'low']);
    });

    it('should support enforce: pre/post priority shortcuts', async () => {
      const order: string[] = [];
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      hook.tap({ name: 'post', enforce: 'post' }, async () => { order.push('post'); });
      hook.tap({ name: 'normal' }, async () => { order.push('normal'); });
      hook.tap({ name: 'pre', enforce: 'pre' }, async () => { order.push('pre'); });

      await hook.call();
      expect(order).toEqual(['pre', 'normal', 'post']);
    });

    it('should await each tap before running the next', async () => {
      const order: number[] = [];
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      hook.tap('slow', async () => {
        await new Promise((r) => setTimeout(r, 50));
        order.push(1);
      });
      hook.tap('fast', async () => {
        order.push(2);
      });

      await hook.call();
      expect(order).toEqual([1, 2]);
    });

    it('should pass arguments to taps', async () => {
      const hook = new Hook<[string, number], void>({ name: 'test', strategy: 'sequential' });
      const received: [string, number][] = [];

      hook.tap('capture', async (a, b) => { received.push([a, b]); });

      await hook.call('hello', 42);
      expect(received).toEqual([['hello', 42]]);
    });
  });

  describe('parallel strategy', () => {
    it('should execute all taps concurrently', async () => {
      const hook = new Hook<[], void>({ name: 'test', strategy: 'parallel' });
      const startTimes: number[] = [];

      hook.tap('a', async () => {
        startTimes.push(Date.now());
        await new Promise((r) => setTimeout(r, 50));
      });
      hook.tap('b', async () => {
        startTimes.push(Date.now());
        await new Promise((r) => setTimeout(r, 50));
      });

      await hook.call();

      expect(startTimes).toHaveLength(2);
      // Both should start within a tight window (< 20ms apart)
      expect(Math.abs(startTimes[0]! - startTimes[1]!)).toBeLessThan(20);
    });
  });

  describe('waterfall strategy', () => {
    it('should thread the first argument through each tap', async () => {
      const hook = new Hook<[number], number>({ name: 'test', strategy: 'waterfall' });

      hook.tap('add10', async (val) => val + 10);
      hook.tap('double', async (val) => val * 2);

      const result = await hook.call(5);
      expect(result).toBe(30); // (5 + 10) * 2
    });

    it('should pass extra args unchanged', async () => {
      const hook = new Hook<[string, string], string>({ name: 'test', strategy: 'waterfall' });
      const seenSep: string[] = [];

      hook.tap('upper', async (val, sep) => {
        seenSep.push(sep);
        return val.toUpperCase();
      });
      hook.tap('append', async (val, sep) => {
        seenSep.push(sep);
        return val + sep + 'world';
      });

      const result = await hook.call('hello', '-');
      expect(result).toBe('HELLO-world');
      expect(seenSep).toEqual(['-', '-']);
    });

    it('should return original value when no taps registered', async () => {
      const hook = new Hook<[number], number>({ name: 'test', strategy: 'waterfall' });
      const result = await hook.call(42);
      expect(result).toBe(42);
    });
  });

  describe('tap management', () => {
    it('should return a disposable that removes the tap', async () => {
      const order: string[] = [];
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      hook.tap('keep', async () => { order.push('keep'); });
      const disposable = hook.tap('remove', async () => { order.push('remove'); });

      disposable.dispose();

      await hook.call();
      expect(order).toEqual(['keep']);
    });

    it('should report isEmpty and size correctly', () => {
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });

      expect(hook.isEmpty).toBe(true);
      expect(hook.size).toBe(0);

      const d = hook.tap('a', async () => {});
      expect(hook.isEmpty).toBe(false);
      expect(hook.size).toBe(1);

      d.dispose();
      expect(hook.isEmpty).toBe(true);
      expect(hook.size).toBe(0);
    });

    it('should clear all taps', async () => {
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });
      hook.tap('a', async () => {});
      hook.tap('b', async () => {});

      hook.clear();
      expect(hook.size).toBe(0);
    });

    it('should propagate errors thrown by taps', async () => {
      const hook = new Hook<[], void>({ name: 'test', strategy: 'sequential' });
      hook.tap('boom', async () => { throw new Error('tap error'); });

      await expect(hook.call()).rejects.toThrow('tap error');
    });
  });
});
