import {
  STORY_CATEGORIES,
  type BulkImportStoryItem,
  type CategoryRecord,
  type ChapterDraftInput,
  type ParsedJsonStoriesResult,
  type SiteSeoSettings,
  type SortOption,
  type Story,
  type StoryCategory,
  type StoryDraftInput,
  type StoryStatus,
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

export function applySeoSettingsToDocument(
  settings: SiteSeoSettings,
  overrides?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    robots?: string;
  }
): void {
  if (typeof document === 'undefined') return;

  const title =
    overrides?.title?.trim() || settings.siteTitle.trim() || DEFAULT_SEO_SETTINGS.siteTitle;
  const description =
    overrides?.description?.trim() ||
    settings.metaDescription.trim() ||
    DEFAULT_SEO_SETTINGS.metaDescription;
  const keywords = normalizeSeoKeywords(settings.keywords) || DEFAULT_SEO_SETTINGS.keywords;
  const robots = overrides?.robots?.trim() || 'index, follow';

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
  upsertMeta('name', 'robots', robots);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  const canonicalUrl =
    overrides?.canonicalUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : '');
  if (canonicalUrl) {
    upsertMeta('property', 'og:url', canonicalUrl);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
  }
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

export function sanitizeImportedImageUrl(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const upgraded = trimmed.startsWith('http://')
      ? `https://${trimmed.slice('http://'.length)}`
      : trimmed;
    const candidate = upgraded.slice(0, BLUEPRINT_LIMITS.IMAGE_URL_MAX);
    return isSafeImageUrl(candidate) ? candidate : '';
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return sanitizeImportedImageUrl(raw[0]);
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return sanitizeImportedImageUrl(obj.url ?? obj.src ?? obj.image ?? obj.imageURL ?? obj.imageUrl);
  }
  return '';
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      return String(val);
    }
  }
  return '';
}

function splitLongChapterContent(content: string): string[] {
  const trimmed = content.trim();
  const maxChunk = BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX - 500;
  if (trimmed.length <= BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX) {
    return [trimmed];
  }
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < trimmed.length && chunks.length < BLUEPRINT_LIMITS.CHAPTER_MAX_COUNT) {
    let end = Math.min(trimmed.length, cursor + maxChunk);
    if (end < trimmed.length) {
      const breakIdx = Math.max(
        trimmed.lastIndexOf('\n', end),
        trimmed.lastIndexOf('. ', end),
        trimmed.lastIndexOf(' ', end)
      );
      if (breakIdx > cursor + Math.floor(maxChunk * 0.5)) {
        end = breakIdx + 1;
      }
    }
    const piece = trimmed.slice(cursor, end).trim();
    if (piece.length > 0) {
      chunks.push(piece);
    }
    cursor = end;
  }
  return chunks;
}

interface RawExtractedBranch {
  title: string;
  content: string;
  imageURL: string;
}

function extractBranchesRecursive(node: unknown, acc: RawExtractedBranch[]): void {
  if (node == null) return;

  if (typeof node === 'string') {
    const text = node.trim();
    if (text) {
      acc.push({ title: '', content: text, imageURL: '' });
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      extractBranchesRecursive(item, acc);
    }
    return;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const branchTitle = pickFirstString(obj, [
      'title',
      'name',
      'heading',
      'label',
      'branchTitle',
      'branch_title',
      'chapterTitle',
      'chapter_title',
      'partTitle',
      'part',
      'choice',
      'option',
      'prompt',
    ]);
    const branchContent = pickFirstString(obj, [
      'content',
      'text',
      'body',
      'story',
      'narrative',
      'passage',
      'description',
      'value',
      'html',
      'paragraph',
    ]);
    const branchImage = sanitizeImportedImageUrl(
      obj.image ??
        obj.imageURL ??
        obj.imageUrl ??
        obj.image_url ??
        obj.img ??
        obj.coverImageURL ??
        obj.coverImage ??
        obj.cover ??
        obj.photo ??
        obj.thumbnail ??
        obj.images
    );

    if (branchContent || branchImage) {
      acc.push({
        title: branchTitle,
        content: branchContent,
        imageURL: branchImage,
      });
    } else if (Array.isArray(obj.paragraphs) || Array.isArray(obj.lines)) {
      const joined = ((obj.paragraphs ?? obj.lines) as unknown[])
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean)
        .join('\n\n');
      if (joined) {
        acc.push({
          title: branchTitle,
          content: joined,
          imageURL: branchImage,
        });
      }
    }

    // Traverse nested sub-branches / child nodes if present
    const childKeys = [
      'branches',
      'storyBranches',
      'story_branches',
      'subBranches',
      'sub_branches',
      'children',
      'choices',
      'options',
      'chapters',
      'parts',
      'episodes',
      'sections',
      'nodes',
      'next',
    ];
    for (const key of childKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        extractBranchesRecursive(obj[key], acc);
      }
    }
  }
}

export function parseJsonStoriesPayload(
  rawJsonText: string,
  options?: {
    defaultCategory?: string;
    defaultStatus?: StoryStatus;
    defaultAuthorName?: string;
  }
): ParsedJsonStoriesResult {
  const trimmed = rawJsonText.trim();
  if (!trimmed) {
    return {
      stories: [],
      totalChapters: 0,
      detectedCategories: [],
      skippedCount: 0,
      skippedReasons: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      stories: [],
      totalChapters: 0,
      detectedCategories: [],
      skippedCount: 1,
      skippedReasons: [
        `Invalid JSON format: ${err instanceof Error ? err.message : 'Unable to parse JSON.'}`,
      ],
    };
  }

  let rawRecords: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawRecords = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const rootObj = parsed as Record<string, unknown>;
    const arrayKey = [
      'stories',
      'items',
      'data',
      'posts',
      'records',
      'results',
      'list',
      'entries',
      'books',
    ].find((k) => Array.isArray(rootObj[k]));

    if (arrayKey) {
      rawRecords = rootObj[arrayKey] as unknown[];
    } else if (
      typeof rootObj.title === 'string' ||
      typeof rootObj.name === 'string' ||
      typeof rootObj.story === 'string' ||
      typeof rootObj.content === 'string' ||
      Array.isArray(rootObj.branches) ||
      Array.isArray(rootObj.storyBranches) ||
      Array.isArray(rootObj.chapters)
    ) {
      rawRecords = [rootObj];
    } else {
      const objectValues = Object.values(rootObj).filter(
        (v) => v && typeof v === 'object' && !Array.isArray(v)
      );
      if (objectValues.length > 0) {
        rawRecords = objectValues;
      }
    }
  }

  if (rawRecords.length === 0) {
    return {
      stories: [],
      totalChapters: 0,
      detectedCategories: [],
      skippedCount: 1,
      skippedReasons: ['No story objects found in the JSON payload.'],
    };
  }

  const defaultCategory =
    normalizeCategoryName(options?.defaultCategory || 'Drama') || 'Drama';
  const defaultStatus: StoryStatus =
    options?.defaultStatus === 'draft' ? 'draft' : 'published';
  const defaultAuthorName =
    (options?.defaultAuthorName || 'walkathawa')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'walkathawa';

  const stories: BulkImportStoryItem[] = [];
  const skippedReasons: string[] = [];
  const categorySet = new Map<string, string>();
  const usedIds = new Set<string>();
  let totalChapters = 0;

  rawRecords.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      if (typeof entry === 'string' && entry.trim().length >= 20) {
        entry = {
          title: `Story ${index + 1}`,
          content: entry.trim(),
        };
      } else {
        skippedReasons.push(`Item #${index + 1}: Not a valid story object.`);
        return;
      }
    }

    const record = entry as Record<string, unknown>;

    // 1. Extract story branches / chapters
    const rawBranches: RawExtractedBranch[] = [];

    // Direct root text if any
    const rootText = pickFirstString(record, [
      'story',
      'content',
      'text',
      'body',
      'fullText',
      'full_text',
      'narrative',
      'html',
    ]);
    if (rootText) {
      rawBranches.push({
        title: 'Part 1',
        content: rootText,
        imageURL: '',
      });
    } else if (Array.isArray(record.story)) {
      extractBranchesRecursive(record.story, rawBranches);
    } else if (Array.isArray(record.content)) {
      extractBranchesRecursive(record.content, rawBranches);
    } else if (Array.isArray(record.text)) {
      extractBranchesRecursive(record.text, rawBranches);
    }

    // Explicit branch / chapter collections
    const branchCollectionKeys = [
      'branches',
      'storyBranches',
      'story_branches',
      'chapters',
      'parts',
      'episodes',
      'sections',
      'pages',
      'nodes',
      'scenes',
    ];
    for (const key of branchCollectionKeys) {
      if (record[key] !== undefined && record[key] !== null) {
        const extracted: RawExtractedBranch[] = [];
        extractBranchesRecursive(record[key], extracted);
        for (const item of extracted) {
          // Avoid duplicating rootText if the first branch has identical content
          if (
            rawBranches.length === 1 &&
            rawBranches[0].content === item.content &&
            item.content.length > 0
          ) {
            if (item.title && rawBranches[0].title === 'Part 1') {
              rawBranches[0].title = item.title;
            }
            if (item.imageURL && !rawBranches[0].imageURL) {
              rawBranches[0].imageURL = item.imageURL;
            }
            continue;
          }
          rawBranches.push(item);
        }
      }
    }

    // Fallback to description/excerpt/summary if no body/branches were supplied
    if (rawBranches.length === 0) {
      const fallbackText = pickFirstString(record, [
        'description',
        'summary',
        'excerpt',
        'subtitle',
        'shortDescription',
      ]);
      if (fallbackText) {
        rawBranches.push({
          title: 'Part 1',
          content: fallbackText,
          imageURL: '',
        });
      }
    }

    // 2. Title
    let rawTitle = pickFirstString(record, [
      'title',
      'name',
      'heading',
      'storyTitle',
      'story_title',
      'post_title',
      'subject',
    ]).replace(/\s+/g, ' ');

    if (rawTitle.length < BLUEPRINT_LIMITS.STORY_TITLE_MIN && rawBranches.length > 0) {
      const firstLine = (rawBranches[0].title || rawBranches[0].content)
        .split('\n')[0]
        .trim()
        .slice(0, 60);
      rawTitle = firstLine.length >= 2 ? firstLine : `Story ${index + 1}`;
    }
    if (rawTitle.length < BLUEPRINT_LIMITS.STORY_TITLE_MIN) {
      skippedReasons.push(`Item #${index + 1}: Missing story title and content.`);
      return;
    }
    const title = rawTitle.slice(0, BLUEPRINT_LIMITS.STORY_TITLE_MAX);

    if (rawBranches.length === 0) {
      skippedReasons.push(`Item #${index + 1} ("${title}"): No story text or branches found.`);
      return;
    }

    // 3. Cover Image
    let coverImageURL = sanitizeImportedImageUrl(
      record.image ??
        record.coverImageURL ??
        record.coverImage ??
        record.cover_image ??
        record.imageUrl ??
        record.image_url ??
        record.img ??
        record.thumbnail ??
        record.thumb ??
        record.cover ??
        record.photo ??
        record.picture ??
        record.featured_image ??
        record.images
    );
    if (!coverImageURL) {
      const firstBranchWithImg = rawBranches.find((b) => Boolean(b.imageURL));
      if (firstBranchWithImg) {
        coverImageURL = firstBranchWithImg.imageURL;
      }
    }

    // 4. Normalize and split chapters so every chapter respects Firestore rules (20..25000 chars, <= 200 chapters)
    const chapters: ChapterDraftInput[] = [];
    rawBranches.forEach((branch, branchIdx) => {
      const baseHeading =
        branch.title.replace(/\s+/g, ' ').trim() || `Part ${branchIdx + 1}`;
      let rawBody = branch.content.trim();
      if (rawBody.length < BLUEPRINT_LIMITS.CHAPTER_CONTENT_MIN) {
        rawBody = `${title} — ${baseHeading}. ${rawBody}`.trim();
        if (rawBody.length < BLUEPRINT_LIMITS.CHAPTER_CONTENT_MIN) {
          rawBody = `${rawBody} (Story part ${branchIdx + 1})`.padEnd(
            BLUEPRINT_LIMITS.CHAPTER_CONTENT_MIN,
            '.'
          );
        }
      }

      const chunks = splitLongChapterContent(rawBody);
      chunks.forEach((chunk, chunkIdx) => {
        if (chapters.length >= BLUEPRINT_LIMITS.CHAPTER_MAX_COUNT) return;
        const chTitle =
          chunks.length > 1
            ? `${baseHeading.slice(0, 120)} (${chunkIdx + 1}/${chunks.length})`
            : baseHeading.slice(0, BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX);
        chapters.push({
          title: chTitle || `Part ${chapters.length + 1}`,
          content: chunk.slice(0, BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX),
          imageURL: chunkIdx === 0 ? branch.imageURL : '',
        });
      });
    });

    if (chapters.length === 0) {
      skippedReasons.push(`Item #${index + 1} ("${title}"): No valid story chapters generated.`);
      return;
    }

    // 5. Excerpt (10..320 chars)
    let rawExcerpt = pickFirstString(record, [
      'excerpt',
      'summary',
      'description',
      'subtitle',
      'shortDescription',
      'short_description',
    ]).replace(/\s+/g, ' ');

    if (rawExcerpt.length < BLUEPRINT_LIMITS.STORY_EXCERPT_MIN) {
      const fromFirstChapter = chapters[0].content.replace(/\s+/g, ' ').trim();
      rawExcerpt =
        fromFirstChapter.length >= BLUEPRINT_LIMITS.STORY_EXCERPT_MIN
          ? fromFirstChapter.slice(0, 200)
          : `${title} — ${fromFirstChapter}`;
    }
    if (rawExcerpt.length < BLUEPRINT_LIMITS.STORY_EXCERPT_MIN) {
      rawExcerpt = `${title} — Read full story on walkathawa.`;
    }
    const excerpt = rawExcerpt.slice(0, BLUEPRINT_LIMITS.STORY_EXCERPT_MAX);

    // 6. Category
    let rawCat = pickFirstString(record, ['category', 'genre', 'tag', 'section', 'type']);
    if (!rawCat && Array.isArray(record.categories) && typeof record.categories[0] === 'string') {
      rawCat = record.categories[0];
    }
    if (!rawCat && Array.isArray(record.tags) && typeof record.tags[0] === 'string') {
      rawCat = record.tags[0];
    }
    const category = normalizeCategoryName(rawCat || defaultCategory) || defaultCategory;
    const catKey = category.toLowerCase();
    if (!categorySet.has(catKey)) {
      categorySet.set(catKey, category);
    }

    // 7. Author, views, status, optional customId
    const authorName =
      pickFirstString(record, ['authorName', 'author_name', 'author', 'writer', 'by'])
        .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || defaultAuthorName;

    const rawViews = Number(record.views ?? record.viewCount ?? record.reads ?? 0);
    const views = Number.isFinite(rawViews)
      ? Math.min(100_000_000, Math.max(0, Math.floor(rawViews)))
      : 0;

    const status: StoryStatus =
      record.status === 'draft'
        ? 'draft'
        : record.status === 'published'
          ? 'published'
          : defaultStatus;

    let customId: string | undefined;
    const candidateId = pickFirstString(record, ['id', 'storyId', 'slug', '_id']);
    if (
      candidateId &&
      candidateId.length <= BLUEPRINT_LIMITS.ID_MAX &&
      BLUEPRINT_LIMITS.ID_PATTERN.test(candidateId) &&
      !usedIds.has(candidateId)
    ) {
      customId = candidateId;
      usedIds.add(candidateId);
    }

    const item: BulkImportStoryItem = {
      customId,
      title,
      excerpt,
      category,
      coverImageURL,
      status,
      chapters,
      authorName,
      authorVerified: true,
      views,
    };

    const errors = validateStoryInput(item);
    if (errors.length > 0) {
      skippedReasons.push(`Item #${index + 1} ("${title}"): ${errors[0]}`);
      return;
    }

    stories.push(item);
    totalChapters += chapters.length;
  });

  return {
    stories,
    totalChapters,
    detectedCategories: Array.from(categorySet.values()),
    skippedCount: skippedReasons.length,
    skippedReasons,
  };
}

export const SAMPLE_BULK_IMPORT_JSON = JSON.stringify(
  [
    {
      title: 'Monsoon Express to Kandy',
      category: 'Drama',
      image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=900&q=80',
      excerpt: 'Two strangers share a quiet compartment as the hill-country train climbs through mist and rain.',
      branches: [
        {
          title: 'Part 1: Platform Three',
          image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=900&q=80',
          content:
            'Rain drummed against the iron roof of Fort Station as the early morning express prepared to depart toward the central hills.',
        },
        {
          title: 'Part 2: Kadugannawa Pass',
          content:
            'By the time the train curved past the rock tunnel, the valley below had vanished beneath a silver sea of clouds and tea estates.',
        },
      ],
    },
    {
      title: 'Lanterns by the Lagoon',
      category: 'Mystery',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
      branches: [
        {
          title: 'Branch 1: The Old Jetty',
          content:
            'Every evening at low tide, a single brass lantern appeared on the far end of the abandoned wooden jetty beyond the mangroves.',
        },
      ],
    },
  ],
  null,
  2
);

