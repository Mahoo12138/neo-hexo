import { describe, it, expect } from 'vitest';
import { Context, createServiceKey } from '../src/context.js';

describe('Context', () => {
  describe('service registration', () => {
    it('should provide and inject a service', () => {
      const ctx = new Context();
      const key = createServiceKey<string>('greeting');

      ctx.provide(key, 'hello');
      expect(ctx.inject(key)).toBe('hello');
    });

    it('should throw when injecting an unregistered service', () => {
      const ctx = new Context();
      const key = createServiceKey<string>('missing');

      expect(() => ctx.inject(key)).toThrow('Service "missing" is not provided');
    });

    it('should return undefined for tryInject on missing service', () => {
      const ctx = new Context();
      const key = createServiceKey<string>('missing');

      expect(ctx.tryInject(key)).toBeUndefined();
    });

    it('should unregister service when dispose is called', () => {
      const ctx = new Context();
      const key = createServiceKey<number>('count');

      const disposable = ctx.provide(key, 42);
      expect(ctx.inject(key)).toBe(42);

      disposable.dispose();
      expect(ctx.tryInject(key)).toBeUndefined();
    });
  });

  describe('scoped contexts (parent-child)', () => {
    it('should inherit services from parent', () => {
      const parent = new Context();
      const key = createServiceKey<string>('inherited');

      parent.provide(key, 'from parent');
      const child = parent.scope();

      expect(child.inject(key)).toBe('from parent');
    });

    it('should allow child to override parent services', () => {
      const parent = new Context();
      const key = createServiceKey<string>('overridden');

      parent.provide(key, 'parent value');
      const child = parent.scope();
      child.provide(key, 'child value');

      expect(child.inject(key)).toBe('child value');
      expect(parent.inject(key)).toBe('parent value');
    });

    it('should dispose child services when child is disposed', () => {
      const parent = new Context();
      const child = parent.scope();
      const key = createServiceKey<string>('scoped');

      child.provide(key, 'temp');
      expect(child.inject(key)).toBe('temp');

      child.dispose();
      expect(child.disposed).toBe(true);
    });

    it('should dispose children when parent is disposed', () => {
      const parent = new Context();
      const child1 = parent.scope();
      const child2 = parent.scope();

      parent.dispose();

      expect(child1.disposed).toBe(true);
      expect(child2.disposed).toBe(true);
      expect(parent.disposed).toBe(true);
    });
  });

  describe('disposal', () => {
    it('should dispose tracked disposables in reverse order', () => {
      const ctx = new Context();
      const order: number[] = [];

      ctx.track({ dispose: () => order.push(1) });
      ctx.track({ dispose: () => order.push(2) });
      ctx.track({ dispose: () => order.push(3) });

      ctx.dispose();
      expect(order).toEqual([3, 2, 1]);
    });

    it('should not dispose twice', () => {
      const ctx = new Context();
      let count = 0;
      ctx.track({ dispose: () => count++ });

      ctx.dispose();
      ctx.dispose();
      expect(count).toBe(1);
    });

    it('should throw on use after dispose', () => {
      const ctx = new Context();
      ctx.dispose();

      const key = createServiceKey<string>('test');
      expect(() => ctx.provide(key, 'val')).toThrow('disposed');
      expect(() => ctx.scope()).toThrow('disposed');
      expect(() => ctx.track({ dispose: () => {} })).toThrow('disposed');
    });
  });
});
