/**
 * @neo-hexo/helper
 *
 * Built-in template helpers for Neo-Hexo.
 * Registers all helpers into the HelperRegistry on the context.
 *
 * Usage:
 * ```ts
 * import helpers from '@neo-hexo/helper';
 *
 * export default defineConfig({
 *   plugins: [helpers()],
 * });
 * ```
 */

import type { NeoHexoPlugin, Context, ResolvedConfig } from '@neo-hexo/core';
import { HelperRegistryKey } from '@neo-hexo/core';

// ── Date helpers
export {
  dateHelper, timeHelper, fullDateHelper,
  relativeDate, timeTagHelper, dateXmlHelper, formatDate,
} from './date.js';

// ── URL helpers
export { urlFor, fullUrlFor, relativeUrl, encodeUrl, gravatar } from './url.js';

// ── Format helpers
export { escapeHtml, stripHtml, truncate, wordWrap, numberFormat } from './format.js';

// ── HTML helpers
export {
  cssHelper, jsHelper, imageTag, linkTo, mailTo,
  faviconTag, feedTag, searchForm,
} from './html.js';

// ── Navigation helpers
export {
  isCurrent, isHome, isHomeFirstPage, isPost, isPage,
  isArchive, isYear, isMonth, isCategory, isTag,
  type PageContext,
} from './navigation.js';

// ── Listing helpers
export {
  listArchives, listCategories, listTags, listPosts,
  type ArchiveItem, type CategoryItem, type TagItem, type PostItem, type ListOptions,
} from './listing.js';

// ── Content helpers
export {
  toc, tagCloud, openGraph, paginator, metaGenerator,
  type TocOptions, type TagCloudOptions, type OpenGraphOptions, type PaginatorOptions,
} from './content.js';

// ─── Imports for registration ────────────────────────────────────────────────

import { dateHelper, timeHelper, fullDateHelper, relativeDate, timeTagHelper, dateXmlHelper } from './date.js';
import { urlFor, fullUrlFor, relativeUrl, encodeUrl, gravatar } from './url.js';
import { escapeHtml, stripHtml, truncate, wordWrap, numberFormat } from './format.js';
import { cssHelper, jsHelper, imageTag, linkTo, mailTo, faviconTag, feedTag, searchForm } from './html.js';
import { isCurrent, isHome, isHomeFirstPage, isPost, isPage, isArchive, isYear, isMonth, isCategory, isTag, type PageContext } from './navigation.js';
import { listArchives, listCategories, listTags, listPosts } from './listing.js';
import { toc, tagCloud, openGraph, paginator, metaGenerator } from './content.js';

// ─── Plugin Factory ──────────────────────────────────────────────────────────

export default function helperPlugin(): NeoHexoPlugin {
  let siteConfig: ResolvedConfig;

  return {
    name: 'neo-hexo:helper',
    enforce: 'pre',

    hooks: {
      configResolved(config: ResolvedConfig) {
        siteConfig = config;
      },
    },

    apply(ctx: Context) {
      const registry = ctx.tryInject(HelperRegistryKey);
      if (!registry) return;

      // ── Date ──
      registry.register('date', (...args: unknown[]) => dateHelper(args[0] as Date, args[1] as string));
      registry.register('time', (...args: unknown[]) => timeHelper(args[0] as Date, args[1] as string));
      registry.register('full_date', (...args: unknown[]) => fullDateHelper(args[0] as Date, args[1] as string));
      registry.register('relative_date', (...args: unknown[]) => relativeDate(args[0] as Date));
      registry.register('time_tag', (...args: unknown[]) => timeTagHelper(args[0] as Date, args[1] as string));
      registry.register('date_xml', (...args: unknown[]) => dateXmlHelper(args[0] as Date));

      // ── URL ──
      registry.register('url_for', (...args: unknown[]) => urlFor(args[0] as string, siteConfig?.root as string | undefined));
      registry.register('full_url_for', (...args: unknown[]) => fullUrlFor(args[0] as string, siteConfig?.url as string ?? '', siteConfig?.root as string | undefined));
      registry.register('relative_url', (...args: unknown[]) => relativeUrl(args[0] as string, args[1] as string));
      registry.register('gravatar', (...args: unknown[]) => gravatar(args[0] as string, args[1] as number));
      registry.register('encode_url', (...args: unknown[]) => encodeUrl(args[0] as string));

      // ── Format ──
      registry.register('escape_html', (...args: unknown[]) => escapeHtml(String(args[0])));
      registry.register('strip_html', (...args: unknown[]) => stripHtml(String(args[0])));
      registry.register('truncate', (...args: unknown[]) => truncate(String(args[0]), args[1] as number, args[2] as string));
      registry.register('word_wrap', (...args: unknown[]) => wordWrap(String(args[0]), args[1] as number));
      registry.register('number_format', (...args: unknown[]) => numberFormat(args[0] as number, args[1] as number, args[2] as string, args[3] as string));

      // ── HTML Tags ──
      registry.register('css', (...args: unknown[]) => cssHelper(args[0] as string | string[], siteConfig?.root as string | undefined));
      registry.register('js', (...args: unknown[]) => jsHelper(args[0] as string | string[], siteConfig?.root as string | undefined));
      registry.register('image_tag', (...args: unknown[]) => imageTag(args[0] as string, args[1] as Record<string, unknown>));
      registry.register('link_to', (...args: unknown[]) => linkTo(args[0] as string, args[1] as string, args[2] as Record<string, unknown>));
      registry.register('mail_to', (...args: unknown[]) => mailTo(args[0] as string, args[1] as string, args[2] as Record<string, unknown>));
      registry.register('favicon_tag', (...args: unknown[]) => faviconTag(args[0] as string, siteConfig?.root as string | undefined));
      registry.register('feed_tag', (...args: unknown[]) => feedTag(args[0] as string, args[1] as Record<string, unknown>));
      registry.register('search_form', (...args: unknown[]) => searchForm(args[0] as Record<string, unknown>));

      // ── Navigation ──
      registry.register('is_current', (...args: unknown[]) => isCurrent(args[0] as string, args[1] as string, args[2] as boolean));
      registry.register('is_home', (...args: unknown[]) => isHome(args[0] as PageContext));
      registry.register('is_home_first_page', (...args: unknown[]) => isHomeFirstPage(args[0] as PageContext));
      registry.register('is_post', (...args: unknown[]) => isPost(args[0] as PageContext));
      registry.register('is_page', (...args: unknown[]) => isPage(args[0] as PageContext));
      registry.register('is_archive', (...args: unknown[]) => isArchive(args[0] as PageContext));
      registry.register('is_year', (...args: unknown[]) => isYear(args[0] as PageContext));
      registry.register('is_month', (...args: unknown[]) => isMonth(args[0] as PageContext));
      registry.register('is_category', (...args: unknown[]) => isCategory(args[0] as PageContext));
      registry.register('is_tag', (...args: unknown[]) => isTag(args[0] as PageContext));

      // ── Listing ──
      registry.register('list_archives', (...args: unknown[]) => listArchives(args[0] as never[], args[1] as Record<string, unknown>));
      registry.register('list_categories', (...args: unknown[]) => listCategories(args[0] as never[], args[1] as Record<string, unknown>));
      registry.register('list_tags', (...args: unknown[]) => listTags(args[0] as never[], args[1] as Record<string, unknown>));
      registry.register('list_posts', (...args: unknown[]) => listPosts(args[0] as never[], args[1] as Record<string, unknown>));

      // ── Content ──
      registry.register('toc', (...args: unknown[]) => toc(args[0] as string, args[1] as Record<string, unknown>));
      registry.register('tagcloud', (...args: unknown[]) => tagCloud(args[0] as never[], args[1] as Record<string, unknown>));
      registry.register('open_graph', (...args: unknown[]) => openGraph(args[0] as Record<string, unknown>));
      registry.register('paginator', (...args: unknown[]) => paginator(args[0] as { current: number; total: number }));
      registry.register('meta_generator', () => metaGenerator());
    },
  };
}
