/**
 * @neo-hexo/processor — Tests
 */

import { describe, it, expect } from 'vitest';
import { classifyFile } from '@neo-hexo/processor';

const opts = { postDir: '_posts', draftDir: '_drafts', dataDir: '_data' };

describe('@neo-hexo/processor', () => {
  describe('classifyFile', () => {
    it('should classify post files', () => {
      expect(classifyFile('_posts/hello.md', opts)).toBe('post');
      expect(classifyFile('_posts/sub/deep.md', opts)).toBe('post');
    });

    it('should classify draft files', () => {
      expect(classifyFile('_drafts/wip.md', opts)).toBe('draft');
    });

    it('should classify data files', () => {
      expect(classifyFile('_data/menu.yml', opts)).toBe('data');
      expect(classifyFile('_data/info.json', opts)).toBe('data');
    });

    it('should classify page files', () => {
      expect(classifyFile('about.md', opts)).toBe('page');
      expect(classifyFile('contact.html', opts)).toBe('page');
    });

    it('should classify asset files', () => {
      expect(classifyFile('images/photo.jpg', opts)).toBe('asset');
      expect(classifyFile('styles/main.css', opts)).toBe('asset');
    });

    it('should normalize backslashes', () => {
      expect(classifyFile('_posts\\hello.md', opts)).toBe('post');
    });
  });
});
