import {
  STORY_CATEGORIES,
  type CategoryRecord,
  type SiteSeoSettings,
  type SortOption,
  type Story,
  type StoryCategory,
  type StoryDraftInput,
} from '../types/story';

export const ADMIN_EMAIL = 'merlinfiverr0@gmail.com';

export const DEFAULT_SEO_SETTINGS: SiteSeoSettings = {
  siteTitle: 'walkathawa — Sinhala & English Stories',
  metaDescription:
    'walkathawa — Read and publish original Sinhala and English serial stories, drama, mystery, and folklore from Sri Lanka.',
  keywords:
    'walkathawa, sinhala katha, සිංහල කතා, sri lanka stories, sinhala short stories, serial fiction, drama, mystery, folklore',
};

// Verbatim constraints synchronized with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  ID_MAX: 128,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 60,
  HANDLE_MIN: 2,
  HANDLE_MAX: 32,
  HANDLE_PATTERN: /^[a-zA-Z0-9_-]+$/,
  BIO_MAX: 280,
  PHOTO_URL_MAX: 500,
  IMAGE_URL_MAX: 1000,
  CATEGORY_MIN: 1,
  CATEGORY_MAX: 40,
  CATEGORY_SLUG_MAX: 60,
  CATEGORY_SLUG_PATTERN: /^[a-z0-9_-]+$/,
  STORY_TITLE_MIN: 2,
  STORY_TITLE_MAX: 140,
  STORY_EXCERPT_MIN: 10,
  STORY_EXCERPT_MAX: 320,
  CHAPTER_TITLE_MIN: 1,
  CHAPTER_TITLE_MAX: 140,
  CHAPTER_CONTENT_MIN: 20,
  CHAPTER_CONTENT_MAX: 25000,
  CHAPTER_MAX_COUNT: 200,
  COMMENT_MIN: 1,
  COMMENT_MAX: 1000,
  SEO_TITLE_MIN: 1,
  SEO_TITLE_MAX: 140,
  SEO_DESCRIPTION_MIN: 1,
  SEO_DESCRIPTION_MAX: 320,
  SEO_KEYWORDS_MIN: 1,
  SEO_KEYWORDS_MAX: 2000,
} as const;

export function isAdminAccount(
  email?: string | null,
  emailVerified?: boolean | null
): boolean {
  if (!email || !emailVerified) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isSafeImageUrl(raw: string | undefined | null): boolean {
  const value = (raw ?? '').trim();
  if (!value) return true;
  if (value.length > BLUEPRINT_LIMITS.IMAGE_URL_MAX) return false;
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, BLUEPRINT_LIMITS.CATEGORY_MAX);
}

export function slugifyCategory(name: string): string {
  const normalized = normalizeCategoryName(name);
  const ascii = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLUEPRINT_LIMITS.CATEGORY_SLUG_MAX);

  if (ascii.length > 0 && BLUEPRINT_LIMITS.CATEGORY_SLUG_PATTERN.test(ascii)) {
    return ascii;
  }

  // Deterministic safe ASCII slug for non-Latin category names (e.g., Sinhala)
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `cat-${(hash >>> 0).toString(36)}`;
}

export function mergeCategories(
  customCategories: CategoryRecord[],
  stories: Story[]
): string[] {
  const seen = new Map<string, string>();
  const add = (name: string) => {
    const clean = normalizeCategoryName(name);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, clean);
    }
  };

  for (const base of STORY_CATEGORIES) {
    add(base);
  }
  for (const cat of customCategories) {
    add(cat.name);
  }
  for (const story of stories) {
    add(story.category);
  }

  return Array.from(seen.values());
}

export function parseSeoKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of raw.split(',')) {
    const cleaned = part.trim().replace(/\s+/g, ' ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      list.push(cleaned);
    }
  }
  return list;
}

export function normalizeSeoKeywords(raw: string): string {
  return parseSeoKeywords(raw).join(', ').slice(0, BLUEPRINT_LIMITS.SEO_KEYWORDS_MAX);
}

export function validateSeoInput(input: {
  siteTitle: string;
  metaDescription: string;
  keywords: string;
}): string[] {
  const errors: string[] = [];
  const title = input.siteTitle.trim();
  const desc = input.metaDescription.trim();
  const normalizedKeywords = normalizeSeoKeywords(input.keywords);

  if (
    title.length < BLUEPRINT_LIMITS.SEO_TITLE_MIN ||
    title.length > BLUEPRINT_LIMITS.SEO_TITLE_MAX
  ) {
    errors.push(`Site title must be between 1 and ${BLUEPRINT_LIMITS.SEO_TITLE_MAX} characters.`);
  }
  if (
    desc.length < BLUEPRINT_LIMITS.SEO_DESCRIPTION_MIN ||
    desc.length > BLUEPRINT_LIMITS.SEO_DESCRIPTION_MAX
  ) {
    errors.push(
      `Meta description must be between 1 and ${BLUEPRINT_LIMITS.SEO_DESCRIPTION_MAX} characters.`
    );
  }
  if (
    normalizedKeywords.length < BLUEPRINT_LIMITS.SEO_KEYWORDS_MIN ||
    normalizedKeywords.length > BLUEPRINT_LIMITS.SEO_KEYWORDS_MAX
  ) {
    errors.push(
      `Enter at least one SEO keyword (up to ${BLUEPRINT_LIMITS.SEO_KEYWORDS_MAX} characters, separated by commas).`
    );
  }
  return errors;
}

export function applySeoSettingsToDocument(settings: SiteSeoSettings): void {
  if (typeof document === 'undefined') return;

  const title = settings.siteTitle.trim() || DEFAULT_SEO_SETTINGS.siteTitle;
  const description = settings.metaDescription.trim() || DEFAULT_SEO_SETTINGS.metaDescription;
  const keywords = normalizeSeoKeywords(settings.keywords) || DEFAULT_SEO_SETTINGS.keywords;

  document.title = title;

  const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'keywords', keywords);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
}

export function formatCompactViews(views: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(views) ? views : 0));
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (safe >= 1_000) {
    return `${(safe / 1_000).toFixed(1)}K`;
  }
  return String(safe);
}

export function formatRelativeTime(createdAtMs: number, nowMs: number = Date.now()): string {
  const diffSeconds = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));
  if (diffSeconds < 60) {
    return 'just now';
  }
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function filterAndSortStories(
  stories: Story[],
  options: {
    category: StoryCategory | 'All';
    query: string;
    sortBy: SortOption;
  }
): Story[] {
  const trimmedQuery = options.query.trim().toLowerCase();

  const filtered = stories.filter((story) => {
    if (options.category !== 'All' && story.category !== options.category) {
      return false;
    }
    if (!trimmedQuery) {
      return true;
    }
    const haystack = `${story.title} ${story.excerpt} ${story.authorName} ${story.category}`.toLowerCase();
    return haystack.includes(trimmedQuery);
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'popular') {
      if (b.views !== a.views) {
        return b.views - a.views;
      }
      return b.createdAtMs - a.createdAtMs;
    }
    if (b.createdAtMs !== a.createdAtMs) {
      return b.createdAtMs - a.createdAtMs;
    }
    return b.views - a.views;
  });
}

export function validateStoryInput(input: StoryDraftInput): string[] {
  const errors: string[] = [];
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  const category = normalizeCategoryName(input.category);

  if (title.length < BLUEPRINT_LIMITS.STORY_TITLE_MIN || title.length > BLUEPRINT_LIMITS.STORY_TITLE_MAX) {
    errors.push(
      `Title must be between ${BLUEPRINT_LIMITS.STORY_TITLE_MIN} and ${BLUEPRINT_LIMITS.STORY_TITLE_MAX} characters.`
    );
  }

  if (
    excerpt.length < BLUEPRINT_LIMITS.STORY_EXCERPT_MIN ||
    excerpt.length > BLUEPRINT_LIMITS.STORY_EXCERPT_MAX
  ) {
    errors.push(
      `Excerpt must be between ${BLUEPRINT_LIMITS.STORY_EXCERPT_MIN} and ${BLUEPRINT_LIMITS.STORY_EXCERPT_MAX} characters.`
    );
  }

  if (category.length < BLUEPRINT_LIMITS.CATEGORY_MIN || category.length > BLUEPRINT_LIMITS.CATEGORY_MAX) {
    errors.push(
      `Category must be between ${BLUEPRINT_LIMITS.CATEGORY_MIN} and ${BLUEPRINT_LIMITS.CATEGORY_MAX} characters.`
    );
  }

  if (!isSafeImageUrl(input.coverImageURL)) {
    errors.push('Cover image must be a valid https:// URL or site-relative / path.');
  }

  if (input.status !== 'draft' && input.status !== 'published') {
    errors.push('Story status must be draft or published.');
  }

  if (!Array.isArray(input.chapters) || input.chapters.length === 0) {
    errors.push('Add at least one chapter to your story.');
  } else if (input.chapters.length > BLUEPRINT_LIMITS.CHAPTER_MAX_COUNT) {
    errors.push(`A story cannot exceed ${BLUEPRINT_LIMITS.CHAPTER_MAX_COUNT} chapters.`);
  } else {
    input.chapters.forEach((chapter, index) => {
      const chTitle = chapter.title.trim();
      const chContent = chapter.content.trim();
      if (
        chTitle.length < BLUEPRINT_LIMITS.CHAPTER_TITLE_MIN ||
        chTitle.length > BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX
      ) {
        errors.push(
          `Chapter ${index + 1} title must be between ${BLUEPRINT_LIMITS.CHAPTER_TITLE_MIN} and ${BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX} characters.`
        );
      }
      if (
        chContent.length < BLUEPRINT_LIMITS.CHAPTER_CONTENT_MIN ||
        chContent.length > BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX
      ) {
        errors.push(
          `Chapter ${index + 1} content must be between ${BLUEPRINT_LIMITS.CHAPTER_CONTENT_MIN} and ${BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX} characters.`
        );
      }
      if (!isSafeImageUrl(chapter.imageURL)) {
        errors.push(`Chapter ${index + 1} image must be a valid https:// URL or site-relative / path.`);
      }
    });
  }

  return errors;
}

export function validateProfileInput(input: {
  displayName: string;
  handle: string;
  bio: string;
}): string[] {
  const errors: string[] = [];
  const displayName = input.displayName.trim();
  const handle = input.handle.trim();
  const bio = input.bio.trim();

  if (
    displayName.length < BLUEPRINT_LIMITS.DISPLAY_NAME_MIN ||
    displayName.length > BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
  ) {
    errors.push(
      `Display name must be between ${BLUEPRINT_LIMITS.DISPLAY_NAME_MIN} and ${BLUEPRINT_LIMITS.DISPLAY_NAME_MAX} characters.`
    );
  }

  if (
    handle.length < BLUEPRINT_LIMITS.HANDLE_MIN ||
    handle.length > BLUEPRINT_LIMITS.HANDLE_MAX ||
    !BLUEPRINT_LIMITS.HANDLE_PATTERN.test(handle)
  ) {
    errors.push(
      `Handle must be ${BLUEPRINT_LIMITS.HANDLE_MIN}-${BLUEPRINT_LIMITS.HANDLE_MAX} characters using only letters, numbers, underscores, or hyphens.`
    );
  }

  if (bio.length > BLUEPRINT_LIMITS.BIO_MAX) {
    errors.push(`Bio cannot exceed ${BLUEPRINT_LIMITS.BIO_MAX} characters.`);
  }

  return errors;
}

export function sanitizeHandle(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, BLUEPRINT_LIMITS.HANDLE_MAX);

  if (cleaned.length >= BLUEPRINT_LIMITS.HANDLE_MIN) {
    return cleaned;
  }
  return `writer_${Math.floor(1000 + Math.random() * 9000)}`;
}

export function generateSafeDocId(prefix: string = 'doc'): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'doc';
  const rand = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `${safePrefix}_${stamp}_${rand}`;
}

export function estimateReadingMinutes(content: string): number {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatChapterTabLabel(chapterNumber: number, title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return `Part ${chapterNumber}`;
  }
  if (/^(part|chapter|episode|verse)\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Part ${chapterNumber}: ${trimmed}`;
}

export const STORIES_PER_PAGE = 40; // 10 rows x 4 columns on desktop

export function paginateStories<T>(
  items: T[],
  page: number,
  pageSize: number = STORIES_PER_PAGE
): { items: T[]; currentPage: number; totalPages: number } {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (currentPage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    currentPage,
    totalPages,
  };
}
