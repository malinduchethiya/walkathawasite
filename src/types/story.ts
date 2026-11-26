export const STORY_CATEGORIES = [
  'Drama',
  'Mystery',
  'Sci-Fi',
  'Folklore',
  'Slice of Life',
  'Poetry',
  'Adventure',
  'Romance',
] as const;

export type StoryCategory = string;

export type StoryStatus = 'draft' | 'published';

export type SortOption = 'newest' | 'popular';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SiteSeoSettings {
  siteTitle: string;
  metaDescription: string;
  keywords: string;
  updatedBy?: string;
  updatedAtMs?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
  photoURL: string;
  isVerified: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface UserPrivate {
  uid: string;
  email: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface Story {
  id: string;
  title: string;
  excerpt: string;
  category: StoryCategory;
  coverImageURL?: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  authorVerified: boolean;
  views: number;
  chapterCount: number;
  status: StoryStatus;
  createdAtMs: number;
  updatedAtMs: number;
  source: 'firebase' | 'starter';
}

export interface StoryChapter {
  id: string;
  storyId: string;
  authorId: string;
  status: StoryStatus;
  chapterNumber: number;
  title: string;
  content: string;
  imageURL?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface StoryComment {
  id: string;
  storyId: string;
  authorId: string;
  authorName: string;
  body: string;
  status: 'visible';
  createdAtMs: number;
}

export interface UserBookmark {
  uid: string;
  storyId: string;
  storyTitle: string;
  storyCategory: string;
  createdAtMs: number;
}

export interface ChapterDraftInput {
  id?: string;
  title: string;
  content: string;
  imageURL?: string;
}

export interface StoryDraftInput {
  title: string;
  excerpt: string;
  category: StoryCategory;
  coverImageURL?: string;
  status: StoryStatus;
  chapters: ChapterDraftInput[];
  authorName?: string;
  authorVerified?: boolean;
  views?: number;
}
