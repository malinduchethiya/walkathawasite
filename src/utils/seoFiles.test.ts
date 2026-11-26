import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PUBLIC_SITE_URL,
  buildCategoryPath,
  buildRobotsTxt,
  buildSitemapEntries,
  buildSitemapXml,
  buildStoryPath,
  escapeXml,
  formatSitemapLastMod,
  parseAppRoute,
  resolveSiteOrigin,
} from './seoFiles.ts';

test('resolveSiteOrigin prefers request headers, then env URL, then fallback', () => {
  assert.equal(
    resolveSiteOrigin({
      forwardedProto: 'https',
      forwardedHost: 'walkathawa.lk',
      envUrl: 'https://env.example.com',
    }),
    'https://walkathawa.lk'
  );

  assert.equal(
    resolveSiteOrigin({
      host: 'localhost:3000',
    }),
    'http://localhost:3000'
  );

  assert.equal(
    resolveSiteOrigin({
      envUrl: 'https://my-site.run.app/some/path',
    }),
    'https://my-site.run.app'
  );

  assert.equal(resolveSiteOrigin({}), DEFAULT_PUBLIC_SITE_URL);
});

test('escapeXml escapes all XML special characters', () => {
  assert.equal(
    escapeXml(`https://example.com/?a=1&b="2"&c='3'<4>`),
    'https://example.com/?a=1&amp;b=&quot;2&quot;&amp;c=&apos;3&apos;&lt;4&gt;'
  );
});

test('formatSitemapLastMod formats dates to YYYY-MM-DD and ignores invalid input', () => {
  assert.equal(formatSitemapLastMod('2026-11-26T02:00:49.000Z'), '2026-11-26');
  assert.equal(formatSitemapLastMod(Date.UTC(2026, 4, 9)), '2026-05-09');
  assert.equal(formatSitemapLastMod('not-a-date'), undefined);
});

test('buildRobotsTxt generates Google Search Console compliant robots.txt', () => {
  const txt = buildRobotsTxt('https://walkathawa.lk');
  assert.match(txt, /^User-agent: \*\n/);
  assert.match(txt, /Allow: \//);
  assert.match(txt, /Disallow: \/admin\n/);
  assert.match(txt, /Disallow: \/admin\/\n/);
  assert.match(txt, /Sitemap: https:\/\/walkathawa\.lk\/sitemap\.xml\n$/);
});

test('buildSitemapEntries and buildSitemapXml produce valid deduplicated Sitemap 0.9 XML', () => {
  const entries = buildSitemapEntries({
    origin: 'https://walkathawa.lk/',
    stories: [
      { id: 'story_1', updatedAt: '2026-11-20T10:00:00Z' },
      { id: 'story_1', updatedAt: '2026-11-21T10:00:00Z' }, // duplicate
      { id: 'story_2', updatedAt: '2026-11-25T12:00:00Z' },
    ],
    categories: ['Drama', 'Slice of Life', 'Drama'],
    now: new Date('2026-11-26T00:00:00Z'),
  });

  assert.equal(entries.length, 5); // home + 2 stories + 2 unique categories
  assert.equal(entries[0].loc, 'https://walkathawa.lk/');
  assert.equal(entries[1].loc, 'https://walkathawa.lk/story/story_1');
  assert.equal(entries[1].lastmod, '2026-11-20');
  assert.equal(entries[3].loc, 'https://walkathawa.lk/?category=Drama');
  assert.equal(entries[4].loc, 'https://walkathawa.lk/?category=Slice%20of%20Life');

  const xml = buildSitemapXml(entries);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(xml.includes('<loc>https://walkathawa.lk/story/story_2</loc>'));
  assert.ok(xml.includes('<loc>https://walkathawa.lk/?category=Slice%20of%20Life</loc>'));
  assert.ok(xml.trimEnd().endsWith('</urlset>'));
});

test('parseAppRoute and path builders handle admin, story, and category routes', () => {
  assert.deepEqual(parseAppRoute('/admin'), { isAdmin: true, storyId: null, category: null });
  assert.deepEqual(parseAppRoute('/story/story_abc123'), {
    isAdmin: false,
    storyId: 'story_abc123',
    category: null,
  });
  assert.deepEqual(parseAppRoute('/', '?category=Slice%20of%20Life'), {
    isAdmin: false,
    storyId: null,
    category: 'Slice of Life',
  });
  assert.deepEqual(parseAppRoute('/', '?category=All'), {
    isAdmin: false,
    storyId: null,
    category: null,
  });

  assert.equal(buildStoryPath('story_1'), '/story/story_1');
  assert.equal(buildCategoryPath('All'), '/');
  assert.equal(buildCategoryPath('Slice of Life'), '/?category=Slice%20of%20Life');
});
