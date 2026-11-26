import {
  STORY_CATEGORIES,
  type SortOption,
  type Story,
  type StoryCategory,
  type StoryDraftInput,
} from '../types/story';

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
} as const;

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

  if (!STORY_CATEGORIES.includes(input.category)) {
    errors.push('Select a valid story category.');
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
