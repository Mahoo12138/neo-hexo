/**
 * @neo-hexo/helper — Listing Helpers
 *
 * Generate HTML lists for archives, categories, tags, and posts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArchiveItem {
  year: number;
  month?: number;
  count: number;
}

export interface CategoryItem {
  name: string;
  slug: string;
  count: number;
  children?: CategoryItem[];
}

export interface TagItem {
  name: string;
  slug: string;
  count: number;
}

export interface PostItem {
  title: string;
  path: string;
  date: string;
  excerpt?: string;
}

export interface ListOptions {
  /** CSS class for the outer element. */
  class?: string;
  /** How to order items (default: 'count', 'name', 'date'). */
  orderBy?: string;
  /** Sort direction (default: 'desc'). */
  order?: 'asc' | 'desc';
  /** Show item count (default: true). */
  showCount?: boolean;
  /** Custom transform for each item's HTML. */
  transform?: (name: string) => string;
}

// ─── Archive List ────────────────────────────────────────────────────────────

export function listArchives(
  archives: ArchiveItem[],
  options: ListOptions & { type?: 'monthly' | 'yearly' } = {},
): string {
  const {
    class: cls = 'archive-list',
    orderBy = 'date',
    order = 'desc',
    showCount = true,
    type = 'monthly',
    transform,
  } = options;

  let items = [...archives];
  if (type === 'yearly') {
    // Merge months into years
    const yearMap = new Map<number, number>();
    for (const a of items) {
      yearMap.set(a.year, (yearMap.get(a.year) ?? 0) + a.count);
    }
    items = [...yearMap.entries()].map(([year, count]) => ({ year, count }));
  }

  items.sort((a, b) => {
    const cmp = orderBy === 'count'
      ? a.count - b.count
      : (a.year * 100 + (a.month ?? 0)) - (b.year * 100 + (b.month ?? 0));
    return order === 'desc' ? -cmp : cmp;
  });

  const lis = items.map((item) => {
    let label = String(item.year);
    if (type === 'monthly' && item.month != null) {
      label += '-' + String(item.month).padStart(2, '0');
    }
    if (transform) label = transform(label);
    const count = showCount ? ` <span class="${cls}-count">${item.count}</span>` : '';
    return `<li class="${cls}-item">${label}${count}</li>`;
  });

  return `<ul class="${cls}">${lis.join('')}</ul>`;
}

// ─── Category List ───────────────────────────────────────────────────────────

export function listCategories(
  categories: CategoryItem[],
  options: ListOptions = {},
): string {
  const {
    class: cls = 'category-list',
    showCount = true,
    transform,
  } = options;

  function renderItems(items: CategoryItem[]): string {
    return items.map((cat) => {
      let label = transform ? transform(cat.name) : cat.name;
      const count = showCount ? ` <span class="${cls}-count">${cat.count}</span>` : '';
      let children = '';
      if (cat.children?.length) {
        children = `<ul class="${cls}-child">${renderItems(cat.children)}</ul>`;
      }
      return `<li class="${cls}-item">${label}${count}${children}</li>`;
    }).join('');
  }

  return `<ul class="${cls}">${renderItems(categories)}</ul>`;
}

// ─── Tag List ────────────────────────────────────────────────────────────────

export function listTags(
  tags: TagItem[],
  options: ListOptions = {},
): string {
  const {
    class: cls = 'tag-list',
    orderBy = 'name',
    order = 'asc',
    showCount = true,
    transform,
  } = options;

  const sorted = [...tags].sort((a, b) => {
    const cmp = orderBy === 'count'
      ? a.count - b.count
      : a.name.localeCompare(b.name);
    return order === 'desc' ? -cmp : cmp;
  });

  const lis = sorted.map((tag) => {
    const label = transform ? transform(tag.name) : tag.name;
    const count = showCount ? ` <span class="${cls}-count">${tag.count}</span>` : '';
    return `<li class="${cls}-item">${label}${count}</li>`;
  });

  return `<ul class="${cls}">${lis.join('')}</ul>`;
}

// ─── Post List ───────────────────────────────────────────────────────────────

export function listPosts(
  posts: PostItem[],
  options: ListOptions & { limit?: number } = {},
): string {
  const {
    class: cls = 'post-list',
    orderBy = 'date',
    order = 'desc',
    limit,
    transform,
  } = options;

  let sorted = [...posts].sort((a, b) => {
    const cmp = orderBy === 'date' ? a.date.localeCompare(b.date) : a.title.localeCompare(b.title);
    return order === 'desc' ? -cmp : cmp;
  });

  if (limit) sorted = sorted.slice(0, limit);

  const lis = sorted.map((p) => {
    const title = transform ? transform(p.title) : p.title;
    return `<li class="${cls}-item"><a href="${p.path}">${title}</a></li>`;
  });

  return `<ul class="${cls}">${lis.join('')}</ul>`;
}
