/**
 * @neo-hexo/helper — Navigation Helpers (is_* checks)
 *
 * Helpers for checking the current page context in templates.
 */

export interface PageContext {
  path: string;
  layout?: string;
  __index?: boolean;
  __tag?: string;
  __category?: string;
  __archive?: boolean;
  __year?: number;
  __month?: number;
  __page?: number;
  [key: string]: unknown;
}

/**
 * Check if the given path matches the current page path.
 */
export function isCurrent(currentPath: string, testPath: string, strict = false): boolean {
  const current = normalize(currentPath);
  const test = normalize(testPath);

  if (strict) return current === test;
  return current.startsWith(test);
}

/** Is the current page the home/index page? */
export function isHome(page: PageContext): boolean {
  return page.__index === true && !page.__archive && !page.__tag && !page.__category;
}

/** Is the current page the first page of the home index? */
export function isHomeFirstPage(page: PageContext): boolean {
  return isHome(page) && (page.__page === 1 || page.__page === undefined);
}

/** Is the current page a post? */
export function isPost(page: PageContext): boolean {
  return page.layout === 'post';
}

/** Is the current page a standalone page? */
export function isPage(page: PageContext): boolean {
  return page.layout === 'page';
}

/** Is the current page an archive page? */
export function isArchive(page: PageContext): boolean {
  return page.__archive === true;
}

/** Is the current page a year archive? */
export function isYear(page: PageContext): boolean {
  return page.__archive === true && page.__year != null && page.__month == null;
}

/** Is the current page a month archive? */
export function isMonth(page: PageContext): boolean {
  return page.__archive === true && page.__month != null;
}

/** Is the current page a category page? */
export function isCategory(page: PageContext): boolean {
  return page.__category != null;
}

/** Is the current page a tag page? */
export function isTag(page: PageContext): boolean {
  return page.__tag != null;
}

function normalize(path: string): string {
  return '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
}
