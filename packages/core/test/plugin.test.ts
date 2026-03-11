import { describe, it, expect, vi } from 'vitest';
import { NeoHexo } from '../src/neo-hexo.js';
import { sortPlugins, type NeoHexoPlugin } from '../src/plugin.js';

describe('Plugin System', () => {
  describe('sortPlugins', () => {
    it('should order: enforce:pre → normal → enforce:post', () => {
      const plugins: NeoHexoPlugin[] = [
        { name: 'normal-1' },
        { name: 'post-1', enforce: 'post' },
        { name: 'pre-1', enforce: 'pre' },
        { name: 'normal-2' },
      ];

      const sorted = sortPlugins(plugins);
      expect(sorted.map((p) => p.name)).toEqual([
        'pre-1',
        'normal-1',
        'normal-2',
        'post-1',
      ]);
    });
  });

  describe('NeoHexo plugin lifecycle', () => {
    it('should call apply() for each plugin during init', async () => {
      const applyCalls: string[] = [];

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'plugin-a',
            apply: () => { applyCalls.push('a'); },
          },
          {
            name: 'plugin-b',
            apply: () => { applyCalls.push('b'); },
          },
        ],
      });

      await hexo.init();
      expect(applyCalls).toEqual(['a', 'b']);
      await hexo.exit();
    });

    it('should tap declarative hooks during init', async () => {
      const calls: string[] = [];

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'test-plugin',
            hooks: {
              configResolved: () => { calls.push('configResolved'); },
            },
          },
        ],
      });

      await hexo.init();
      expect(calls).toContain('configResolved');
      await hexo.exit();
    });

    it('should run enforce:pre plugins before normal ones', async () => {
      const order: string[] = [];

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'normal',
            hooks: {
              configLoaded: () => { order.push('normal'); },
            },
          },
          {
            name: 'early',
            enforce: 'pre',
            hooks: {
              configLoaded: () => { order.push('early'); },
            },
          },
        ],
      });

      await hexo.init();
      expect(order).toEqual(['early', 'normal']);
      await hexo.exit();
    });

    it('should dispose plugin resources on exit', async () => {
      let disposed = false;

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'disposable-plugin',
            apply: () => {
              return { dispose: () => { disposed = true; } };
            },
          },
        ],
      });

      await hexo.init();
      expect(disposed).toBe(false);

      await hexo.exit();
      expect(disposed).toBe(true);
    });
  });

  describe('NeoHexo build lifecycle', () => {
    it('should run process and generate hooks during build', async () => {
      const calls: string[] = [];

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'lifecycle-tracker',
            hooks: {
              beforeProcess: () => { calls.push('beforeProcess'); },
              afterProcess: () => { calls.push('afterProcess'); },
              beforeGenerate: () => { calls.push('beforeGenerate'); },
              generateRoutes: async () => {
                calls.push('generateRoutes');
                return [];
              },
              afterGenerate: () => { calls.push('afterGenerate'); },
            },
          },
        ],
      });

      await hexo.build();
      expect(calls).toEqual([
        'beforeProcess',
        'afterProcess',
        'beforeGenerate',
        'generateRoutes',
        'afterGenerate',
      ]);
      await hexo.exit();
    });

    it('should run deploy hooks during deploy', async () => {
      const calls: string[] = [];

      const hexo = new NeoHexo('/test', {
        plugins: [
          {
            name: 'deploy-tracker',
            hooks: {
              beforeDeploy: () => { calls.push('before'); },
              deploy: () => { calls.push('deploy'); },
              afterDeploy: () => { calls.push('after'); },
            },
          },
        ],
      });

      await hexo.init();
      await hexo.deploy();
      expect(calls).toEqual(['before', 'deploy', 'after']);
      await hexo.exit();
    });
  });
});
