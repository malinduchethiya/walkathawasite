import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT_LIMITS,
  estimateReadingMinutes,
  filterAndSortStories,
  formatChapterTabLabel,
  formatCompactViews,
  formatRelativeTime,
  generateSafeDocId,
  sanitizeHandle,
  validateProfileInput,
  validateStoryInput,
} from './storyUtils';
import type { Story } from '../types/story';

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
