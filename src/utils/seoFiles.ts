export const DEFAULT_PUBLIC_SITE_URL = 'https://www.walkathawa.site';

export const DEFAULT_SITEMAP_CATEGORIES = [
  'Drama',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Folklore',
  'Adventure',
  'Poetry',
  'Slice of Life',
] as const;

export const MAX_SITEMAP_URLS = 50_000;

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

export interface SitemapStoryInput {
  id: string;
  updatedAt?: string | number | Date;
}

export interface ParsedAppRoute {
  isAdmin: boolean;
  storyId: string | null;
  category: string | null;
}

export function normalizeOrigin(raw: string | undefined | null): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(options: {
  envUrl?: string | null;
  forwardedProto?: string | string[] | null;
  forwardedHost?: string | string[] | null;
  host?: string | string[] | null;
  protocol?: string | null;
  fallbackUrl?: string;
}): string {
  const firstHeader = (val: string | string[] | null | undefined): string => {
    if (Array.isArray(val)) return (val[0] ?? '').split(',')[0].trim();
    return (val ?? '').split(',')[0].trim();
  };

  const hostHeader = firstHeader(options.forwardedHost) || firstHeader(options.host);
  const protoHeader =
    firstHeader(options.forwardedProto) ||
    (options.protocol ? options.protocol.replace(/:$/, '').trim() : '');

  if (hostHeader) {
    const isLocalHost =
      /^localhost(?::\d+)?$/i.test(hostHeader) || /^127\.0\.0\.1(?::\d+)?$/.test(hostHeader);
    const scheme = protoHeader === 'http' || protoHeader === 'https'
      ? protoHeader
      : isLocalHost
        ? 'http'
        : 'https';
    const fromHeaders = normalizeOrigin(`${scheme}://${hostHeader}`);
    if (fromHeaders) {
      return fromHeaders;
    }
  }

  const fromEnv = normalizeOrigin(options.envUrl);
  if (fromEnv) {
    return fromEnv;
  }

  return normalizeOrigin(options.fallbackUrl) ?? DEFAULT_PUBLIC_SITE_URL;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatSitemapLastMod(value: string | number | Date | undefined): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function buildRobotsTxt(origin: string): string {
  const safeOrigin = normalizeOrigin(origin) ?? DEFAULT_PUBLIC_SITE_URL;
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    '',
    `Sitemap: ${safeOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function buildSitemapEntries(options: {
  origin: string;
  stories: SitemapStoryInput[];
  categories?: readonly string[];
  now?: Date;
}): SitemapUrlEntry[] {
  const safeOrigin = normalizeOrigin(options.origin) ?? DEFAULT_PUBLIC_SITE_URL;
  const today = formatSitemapLastMod(options.now ?? new Date());
  const seen = new Set<string>();
  const entries: SitemapUrlEntry[] = [];

  const pushEntry = (entry: SitemapUrlEntry) => {
    if (entries.length >= MAX_SITEMAP_URLS) return;
    if (seen.has(entry.loc)) return;
    seen.add(entry.loc);
    entries.push(entry);
  };

  // Homepage
  pushEntry({
    loc: `${safeOrigin}/`,
    lastmod: today,
    changefreq: 'daily',
    priority: '1.0',
  });

  // Published stories
  for (const story of options.stories) {
    const cleanId = story.id.trim();
    if (!cleanId) continue;
    pushEntry({
      loc: `${safeOrigin}/story/${encodeURIComponent(cleanId)}`,
      lastmod: formatSitemapLastMod(story.updatedAt) ?? today,
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

  // Category filter pages
  const categories = options.categories ?? DEFAULT_SITEMAP_CATEGORIES;
  for (const rawCategory of categories) {
    const cleanCategory = rawCategory.trim();
    if (!cleanCategory) continue;
    pushEntry({
      loc: `${safeOrigin}/?category=${encodeURIComponent(cleanCategory)}`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.8',
    });
  }

  return entries;
}

export function buildSitemapXml(entries: readonly SitemapUrlEntry[]): string {
  const limited = entries.slice(0, MAX_SITEMAP_URLS);
  const urlNodes = limited.map((entry) => {
    const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    }
    if (entry.priority) {
      lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    }
    lines.push(`  </url>`);
    return lines.join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

export function parseAppRoute(pathname: string, search: string = ''): ParsedAppRoute {
  if (/^\/admin(\/|$)/i.test(pathname)) {
    return { isAdmin: true, storyId: null, category: null };
  }

  const storyMatch = pathname.match(/^\/story\/([^/]+)\/?$/i);
  if (storyMatch && storyMatch[1]) {
    try {
      const decoded = decodeURIComponent(storyMatch[1]).trim();
      if (decoded) {
        return { isAdmin: false, storyId: decoded, category: null };
      }
    } catch {
      // Fall through if malformed URI component
    }
  }

  const params = new URLSearchParams(search);
  const rawCategory = params.get('category')?.trim() || null;

  return {
    isAdmin: false,
    storyId: null,
    category: rawCategory && rawCategory.toLowerCase() !== 'all' ? rawCategory : null,
  };
}

export function buildStoryPath(storyId: string): string {
  return `/story/${encodeURIComponent(storyId.trim())}`;
}

export function buildCategoryPath(category: string): string {
  const clean = category.trim();
  if (!clean || clean.toLowerCase() === 'all') {
    return '/';
  }
  return `/?category=${encodeURIComponent(clean)}`;
}
