import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT_LIMITS,
  STORIES_PER_PAGE,
  estimateReadingMinutes,
  filterAndSortStories,
  formatChapterTabLabel,
  formatCompactViews,
  formatRelativeTime,
  generateSafeDocId,
  paginateStories,
  sanitizeHandle,
  validateProfileInput,
  validateStoryInput,
} from './storyUtils';
import type { Story } from '../types/story';
import { STARTER_STORY_BUNDLES } from '../data/starterStories';

test('formatCompactViews formats counts cleanly like the reference grid', () => {
  assert.equal(formatCompactViews(0), '0');
  assert.equal(formatCompactViews(842), '842');
  assert.equal(formatCompactViews(1800), '1.8K');
  assert.equal(formatCompactViews(2400), '2.4K');
  assert.equal(formatCompactViews(10000), '10.0K');
  assert.equal(formatCompactViews(51600), '51.6K');
  assert.equal(formatCompactViews(1250000), '1.3M');
  assert.equal(formatCompactViews(-5), '0');
});

test('formatRelativeTime formats hours, days, months, and years', () => {
  const now = 1_800_000_000_000;
  assert.equal(formatRelativeTime(now - 20_000, now), 'just now');
  assert.equal(formatRelativeTime(now - 11 * 3600_000, now), '11 hours ago');
  assert.equal(formatRelativeTime(now - 24 * 3600_000, now), '1 day ago');
  assert.equal(formatRelativeTime(now - 2 * 24 * 3600_000, now), '2 days ago');
  assert.equal(formatRelativeTime(now - 7 * 30 * 24 * 3600_000, now), '7 months ago');
  assert.equal(formatRelativeTime(now - 2 * 365 * 24 * 3600_000, now), '2 years ago');
});

test('filterAndSortStories filters by category and search query and sorts correctly', () => {
  const stories: Story[] = [
    {
      id: 's1',
      title: 'The Lighthouse Keeper',
      excerpt: 'A coastal mystery unfolds over winter.',
      category: 'Mystery',
      authorId: 'u1',
      authorName: 'Nimal Perera',
      authorPhotoURL: '',
      authorVerified: true,
      views: 4800,
      chapterCount: 3,
      status: 'published',
      createdAtMs: 1000,
      updatedAtMs: 1000,
      source: 'starter',
    },
    {
      id: 's2',
      title: 'Monsoon Letters',
      excerpt: 'Two siblings exchange postcards across Colombo.',
      category: 'Drama',
      authorId: 'u2',
      authorName: 'Kavindi Silva',
      authorPhotoURL: '',
      authorVerified: true,
      views: 11200,
      chapterCount: 2,
      status: 'published',
      createdAtMs: 3000,
      updatedAtMs: 3000,
      source: 'starter',
    },
    {
      id: 's3',
      title: 'Orbital Drift',
      excerpt: 'An engineer repairs a lonely relay station.',
      category: 'Sci-Fi',
      authorId: 'u1',
      authorName: 'Nimal Perera',
      authorPhotoURL: '',
      authorVerified: true,
      views: 94200,
      chapterCount: 4,
      status: 'published',
      createdAtMs: 2000,
      updatedAtMs: 2000,
      source: 'starter',
    },
  ];

  const byNewest = filterAndSortStories(stories, { category: 'All', query: '', sortBy: 'newest' });
  assert.deepEqual(
    byNewest.map((s) => s.id),
    ['s2', 's3', 's1']
  );

  const byPopular = filterAndSortStories(stories, { category: 'All', query: '', sortBy: 'popular' });
  assert.deepEqual(
    byPopular.map((s) => s.id),
    ['s3', 's2', 's1']
  );

  const mysteryOnly = filterAndSortStories(stories, { category: 'Mystery', query: '', sortBy: 'newest' });
  assert.deepEqual(
    mysteryOnly.map((s) => s.id),
    ['s1']
  );

  const searchResult = filterAndSortStories(stories, {
    category: 'All',
    query: 'colombo',
    sortBy: 'newest',
  });
  assert.deepEqual(
    searchResult.map((s) => s.id),
    ['s2']
  );
});

test('validateStoryInput enforces firebase-blueprint.json limits', () => {
  const invalidErrors = validateStoryInput({
    title: 'A',
    excerpt: 'Too short',
    category: 'Drama',
    status: 'published',
    chapters: [{ title: '', content: 'short' }],
  });
  assert.equal(invalidErrors.length, 4);

  const validErrors = validateStoryInput({
    title: 'The Quiet Harbour',
    excerpt: 'A thoughtful story about a town waking up after the storm.',
    category: 'Drama',
    status: 'published',
    chapters: [
      {
        title: 'Part 1: Early Tide',
        content: 'The fishing boats returned before dawn while lanterns still glowed along the stone jetty.',
      },
    ],
  });
  assert.deepEqual(validErrors, []);
});

test('validateProfileInput enforces handle regex and field limits', () => {
  const bad = validateProfileInput({
    displayName: '',
    handle: 'bad handle!',
    bio: 'x'.repeat(281),
  });
  assert.equal(bad.length, 3);

  const good = validateProfileInput({
    displayName: 'Katha Writer',
    handle: 'katha_writer-01',
    bio: 'Writing short fiction and folklore.',
  });
  assert.deepEqual(good, []);
});

test('sanitizeHandle and generateSafeDocId always satisfy Firestore ID regex', () => {
  const handle = sanitizeHandle('Jane Doe @ Story!');
  assert.match(handle, BLUEPRINT_LIMITS.HANDLE_PATTERN);

  const docId = generateSafeDocId('story');
  assert.match(docId, BLUEPRINT_LIMITS.ID_PATTERN);
  assert.ok(docId.length <= BLUEPRINT_LIMITS.ID_MAX);

  assert.equal(estimateReadingMinutes('word '.repeat(450)), 3);
});

test('formatChapterTabLabel avoids duplicating Part/Chapter/Verse prefixes', () => {
  assert.equal(formatChapterTabLabel(1, 'Part 1: The Stopped Pendulum'), 'Part 1: The Stopped Pendulum');
  assert.equal(formatChapterTabLabel(2, 'Verse II: Rain'), 'Verse II: Rain');
  assert.equal(formatChapterTabLabel(3, 'Harbour Dawn'), 'Part 3: Harbour Dawn');
  assert.equal(formatChapterTabLabel(4, '   '), 'Part 4');
});

test('paginateStories shows 40 stories per gallery page (10 rows x 4 columns)', () => {
  assert.equal(STORIES_PER_PAGE, 40);
  const items = Array.from({ length: 45 }, (_, i) => i + 1);
  const page1 = paginateStories(items, 1, STORIES_PER_PAGE);
  assert.equal(page1.items.length, 40);
  assert.equal(page1.currentPage, 1);
  assert.equal(page1.totalPages, 2);

  const page2 = paginateStories(items, 2, STORIES_PER_PAGE);
  assert.equal(page2.items.length, 5);
  assert.equal(page2.items[0], 41);

  const clamped = paginateStories(items, 99, STORIES_PER_PAGE);
  assert.equal(clamped.currentPage, 2);
});

test('all 40 starter story bundles strictly satisfy Firestore blueprint and ID rules', () => {
  assert.equal(STARTER_STORY_BUNDLES.length, 40);
  const ids = new Set<string>();

  for (const bundle of STARTER_STORY_BUNDLES) {
    assert.match(bundle.story.id, BLUEPRINT_LIMITS.ID_PATTERN);
    assert.ok(!ids.has(bundle.story.id), `Duplicate starter story id: ${bundle.story.id}`);
    ids.add(bundle.story.id);

    const errors = validateStoryInput({
      title: bundle.story.title,
      excerpt: bundle.story.excerpt,
      category: bundle.story.category,
      status: bundle.story.status,
      chapters: bundle.chapters.map((c) => ({ title: c.title, content: c.content })),
    });
    assert.deepEqual(errors, [], `Validation failed for ${bundle.story.id}: ${errors.join('; ')}`);

    for (const ch of bundle.chapters) {
      assert.match(ch.id, BLUEPRINT_LIMITS.ID_PATTERN);
    }
  }
});

test('isAdminAccount strictly requires matching email and verified status', async () => {
  const { isAdminAccount } = await import('./storyUtils');
  assert.equal(isAdminAccount('merlinfiverr0@gmail.com', true), true);
  assert.equal(isAdminAccount('MERLINFIVERR0@GMAIL.COM', true), true);
  assert.equal(isAdminAccount('merlinfiverr0@gmail.com', false), false);
  assert.equal(isAdminAccount('other@gmail.com', true), false);
  assert.equal(isAdminAccount(null, true), false);
});

test('isSafeImageUrl blocks unsafe schemes and allows https and root-relative paths', async () => {
  const { isSafeImageUrl } = await import('./storyUtils');
  assert.equal(isSafeImageUrl(''), true);
  assert.equal(isSafeImageUrl('https://example.com/photo.jpg'), true);
  assert.equal(isSafeImageUrl('/assets/cover.png'), true);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg/>'), false);
  assert.equal(isSafeImageUrl('http://insecure.example.com/a.jpg'), false);
  assert.equal(isSafeImageUrl('//evil.example.com/a.jpg'), false);
});

test('slugifyCategory and mergeCategories support custom and non-Latin categories', async () => {
  const { slugifyCategory, mergeCategories } = await import('./storyUtils');
  assert.equal(slugifyCategory('Historical Fiction'), 'historical-fiction');
  const sinhalaSlug = slugifyCategory('සිංහල කතා');
  assert.match(sinhalaSlug, BLUEPRINT_LIMITS.CATEGORY_SLUG_PATTERN);

  const merged = mergeCategories(
    [
      {
        id: 'cat_1',
        name: 'Historical Fiction',
        slug: 'historical-fiction',
        createdBy: 'u1',
        createdAtMs: 1,
        updatedAtMs: 1,
      },
      {
        id: 'cat_2',
        name: 'drama',
        slug: 'drama',
        createdBy: 'u1',
        createdAtMs: 2,
        updatedAtMs: 2,
      },
    ],
    []
  );
  assert.ok(merged.includes('Historical Fiction'));
  assert.equal(merged.filter((c) => c.toLowerCase() === 'drama').length, 1);
});

test('validateStoryInput accepts custom categories and rejects unsafe image URLs', () => {
  const ok = validateStoryInput({
    title: 'Harbour Tales',
    excerpt: 'Stories collected along the southern coast over five seasons.',
    category: 'Coastal Legends',
    coverImageURL: 'https://example.com/harbour.jpg',
    status: 'published',
    chapters: [
      {
        title: 'Part 1',
        content: 'Lanterns flickered above the breakwater as the night boat returned.',
        imageURL: 'https://example.com/lantern.jpg',
      },
    ],
  });
  assert.deepEqual(ok, []);

  const bad = validateStoryInput({
    title: 'Harbour Tales',
    excerpt: 'Stories collected along the southern coast over five seasons.',
    category: 'Coastal Legends',
    coverImageURL: 'javascript:alert(1)',
    status: 'published',
    chapters: [
      {
        title: 'Part 1',
        content: 'Lanterns flickered above the breakwater as the night boat returned.',
        imageURL: 'data:text/html,boom',
      },
    ],
  });
  assert.equal(bad.length, 2);
});

