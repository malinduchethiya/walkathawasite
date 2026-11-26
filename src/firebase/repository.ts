import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './config';
import type {
  Story,
  StoryChapter,
  StoryComment,
  StoryDraftInput,
  UserBookmark,
  UserPrivate,
  UserProfile,
} from '../types/story';
import {
  BLUEPRINT_LIMITS,
  generateSafeDocId,
  sanitizeHandle,
  validateProfileInput,
  validateStoryInput,
} from '../utils/storyUtils';
import { STARTER_STORY_BUNDLES } from '../data/starterStories';

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return Date.now();
}

export async function ensureUserDocuments(
  user: User
): Promise<{ profile: UserProfile; privateInfo: UserPrivate | null }> {
  const userPath = `users/${user.uid}`;
  const privatePath = `userPrivate/${user.uid}`;

  let profile: UserProfile;
  try {
    const profileRef = doc(db, 'users', user.uid);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      profile = {
        uid: String(data.uid ?? user.uid),
        displayName: String(data.displayName ?? user.displayName ?? 'Reader'),
        handle: String(data.handle ?? sanitizeHandle(user.displayName ?? user.uid)),
        bio: String(data.bio ?? ''),
        photoURL: String(data.photoURL ?? ''),
        isVerified: Boolean(data.isVerified),
        createdAtMs: toMillis(data.createdAt),
        updatedAtMs: toMillis(data.updatedAt),
      };
    } else {
      const displayName = (user.displayName || user.email?.split('@')[0] || 'Writer')
        .trim()
        .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
      const handle = sanitizeHandle(user.email?.split('@')[0] || displayName);
      const photoURL = (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);

      await setDoc(profileRef, {
        uid: user.uid,
        displayName,
        handle,
        bio: '',
        photoURL,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const now = Date.now();
      profile = {
        uid: user.uid,
        displayName,
        handle,
        bio: '',
        photoURL,
        isVerified: false,
        createdAtMs: now,
        updatedAtMs: now,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  let privateInfo: UserPrivate | null = null;
  if (user.email) {
    try {
      const privateRef = doc(db, 'userPrivate', user.uid);
      const snap = await getDoc(privateRef);
      if (snap.exists()) {
        const data = snap.data();
        privateInfo = {
          uid: String(data.uid ?? user.uid),
          email: String(data.email ?? user.email),
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        };
      } else {
        await setDoc(privateRef, {
          uid: user.uid,
          email: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const now = Date.now();
        privateInfo = {
          uid: user.uid,
          email: user.email,
          createdAtMs: now,
          updatedAtMs: now,
        };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }

  return { profile, privateInfo };
}

export async function updateUserProfileRecord(
  uid: string,
  updates: { displayName: string; handle: string; bio: string; photoURL: string }
): Promise<void> {
  const validationErrors = validateProfileInput(updates);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: updates.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
      handle: updates.handle.trim().slice(0, BLUEPRINT_LIMITS.HANDLE_MAX),
      bio: updates.bio.trim().slice(0, BLUEPRINT_LIMITS.BIO_MAX),
      photoURL: updates.photoURL.trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribePublishedStories(
  onData: (stories: Story[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'stories';
  const q = query(collection(db, 'stories'), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Story[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: String(data.title ?? ''),
          excerpt: String(data.excerpt ?? ''),
          category: data.category,
          authorId: String(data.authorId ?? ''),
          authorName: String(data.authorName ?? 'Anonymous'),
          authorPhotoURL: String(data.authorPhotoURL ?? ''),
          authorVerified: Boolean(data.authorVerified),
          views: Number(data.views ?? 0),
          chapterCount: Number(data.chapterCount ?? 1),
          status: data.status === 'draft' ? 'draft' : 'published',
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
          source: 'firebase',
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserStories(
  uid: string,
  onData: (stories: Story[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'stories';
  const q = query(collection(db, 'stories'), where('authorId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Story[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: String(data.title ?? ''),
          excerpt: String(data.excerpt ?? ''),
          category: data.category,
          authorId: String(data.authorId ?? ''),
          authorName: String(data.authorName ?? 'Anonymous'),
          authorPhotoURL: String(data.authorPhotoURL ?? ''),
          authorVerified: Boolean(data.authorVerified),
          views: Number(data.views ?? 0),
          chapterCount: Number(data.chapterCount ?? 1),
          status: data.status === 'draft' ? 'draft' : 'published',
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
          source: 'firebase',
        };
      });
      onData(items.sort((a, b) => b.updatedAtMs - a.updatedAtMs));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchStoryChapters(
  storyId: string,
  ownerUid?: string
): Promise<StoryChapter[]> {
  const path = `stories/${storyId}/chapters`;
  try {
    const chaptersRef = collection(db, 'stories', storyId, 'chapters');
    const q = ownerUid
      ? query(chaptersRef, where('authorId', '==', ownerUid))
      : query(chaptersRef, where('status', '==', 'published'));
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          storyId: String(data.storyId ?? storyId),
          authorId: String(data.authorId ?? ''),
          status: data.status === 'draft' ? 'draft' : 'published',
          chapterNumber: Number(data.chapterNumber ?? 1),
          title: String(data.title ?? ''),
          content: String(data.content ?? ''),
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        } satisfies StoryChapter;
      })
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStoryWithChapters(
  user: User,
  profile: UserProfile,
  input: StoryDraftInput,
  existingStoryId?: string
): Promise<string> {
  const validationErrors = validateStoryInput(input);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const storyId = existingStoryId || generateSafeDocId('story');
  const storyPath = `stories/${storyId}`;

  try {
    const batch = writeBatch(db);
    const storyRef = doc(db, 'stories', storyId);

    if (!existingStoryId) {
      batch.set(storyRef, {
        title: input.title.trim().slice(0, BLUEPRINT_LIMITS.STORY_TITLE_MAX),
        excerpt: input.excerpt.trim().slice(0, BLUEPRINT_LIMITS.STORY_EXCERPT_MAX),
        category: input.category,
        authorId: user.uid,
        authorName: profile.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
        authorPhotoURL: profile.photoURL.trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
        authorVerified: false,
        views: 0,
        chapterCount: input.chapters.length,
        status: input.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      input.chapters.forEach((chapter, idx) => {
        const chapterId = generateSafeDocId(`ch${idx + 1}`);
        const chapterRef = doc(db, 'stories', storyId, 'chapters', chapterId);
        batch.set(chapterRef, {
          storyId,
          authorId: user.uid,
          status: input.status,
          chapterNumber: idx + 1,
          title: chapter.title.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX),
          content: chapter.content.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } else {
      const existingChapters = await fetchStoryChapters(storyId, user.uid);
      const existingMap = new Map(existingChapters.map((c) => [c.id, c]));
      const keptIds = new Set<string>();

      batch.update(storyRef, {
        title: input.title.trim().slice(0, BLUEPRINT_LIMITS.STORY_TITLE_MAX),
        excerpt: input.excerpt.trim().slice(0, BLUEPRINT_LIMITS.STORY_EXCERPT_MAX),
        category: input.category,
        authorName: profile.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
        authorPhotoURL: profile.photoURL.trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
        chapterCount: input.chapters.length,
        status: input.status,
        updatedAt: serverTimestamp(),
      });

      input.chapters.forEach((chapter, idx) => {
        if (chapter.id && existingMap.has(chapter.id)) {
          keptIds.add(chapter.id);
          const chapterRef = doc(db, 'stories', storyId, 'chapters', chapter.id);
          batch.update(chapterRef, {
            chapterNumber: idx + 1,
            title: chapter.title.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX),
            content: chapter.content.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX),
            status: input.status,
            updatedAt: serverTimestamp(),
          });
        } else {
          const newChapterId = generateSafeDocId(`ch${idx + 1}`);
          const chapterRef = doc(db, 'stories', storyId, 'chapters', newChapterId);
          batch.set(chapterRef, {
            storyId,
            authorId: user.uid,
            status: input.status,
            chapterNumber: idx + 1,
            title: chapter.title.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX),
            content: chapter.content.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      existingChapters.forEach((oldCh) => {
        if (!keptIds.has(oldCh.id)) {
          batch.delete(doc(db, 'stories', storyId, 'chapters', oldCh.id));
        }
      });
    }

    await batch.commit();
    return storyId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingStoryId ? OperationType.UPDATE : OperationType.CREATE,
      storyPath
    );
  }
}

export async function deleteStoryWithChapters(storyId: string, authorId: string): Promise<void> {
  const path = `stories/${storyId}`;
  try {
    const chapters = await fetchStoryChapters(storyId, authorId);
    const batch = writeBatch(db);
    chapters.forEach((chapter) => {
      batch.delete(doc(db, 'stories', storyId, 'chapters', chapter.id));
    });
    batch.delete(doc(db, 'stories', storyId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function incrementStoryViews(storyId: string, currentViews: number): Promise<void> {
  const path = `stories/${storyId}`;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      views: Math.max(0, Math.floor(currentViews)) + 1,
    });
  } catch {
    // Non-blocking view increment (e.g., race with another concurrent reader)
  }
}

export function subscribeStoryComments(
  storyId: string,
  onData: (comments: StoryComment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `stories/${storyId}/comments`;
  const q = query(collection(db, 'stories', storyId, 'comments'), where('status', '==', 'visible'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoryComment[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            storyId: String(data.storyId ?? storyId),
            authorId: String(data.authorId ?? ''),
            authorName: String(data.authorName ?? 'Reader'),
            body: String(data.body ?? ''),
            status: 'visible' as const,
            createdAtMs: toMillis(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function addStoryComment(
  storyId: string,
  user: User,
  authorName: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (trimmed.length < BLUEPRINT_LIMITS.COMMENT_MIN || trimmed.length > BLUEPRINT_LIMITS.COMMENT_MAX) {
    throw new Error(`Comment must be between 1 and ${BLUEPRINT_LIMITS.COMMENT_MAX} characters.`);
  }
  const commentId = generateSafeDocId('cmt');
  const path = `stories/${storyId}/comments/${commentId}`;
  try {
    await setDoc(doc(db, 'stories', storyId, 'comments', commentId), {
      storyId,
      authorId: user.uid,
      authorName: authorName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
      body: trimmed.slice(0, BLUEPRINT_LIMITS.COMMENT_MAX),
      status: 'visible',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteStoryComment(storyId: string, commentId: string): Promise<void> {
  const path = `stories/${storyId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'stories', storyId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserBookmarks(
  uid: string,
  onData: (bookmarks: UserBookmark[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/bookmarks`;
  const q = query(collection(db, 'users', uid, 'bookmarks'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: UserBookmark[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            uid: String(data.uid ?? uid),
            storyId: String(data.storyId ?? docSnap.id),
            storyTitle: String(data.storyTitle ?? ''),
            storyCategory: String(data.storyCategory ?? ''),
            createdAtMs: toMillis(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function toggleUserBookmark(
  uid: string,
  story: Story,
  currentlyBookmarked: boolean
): Promise<void> {
  const path = `users/${uid}/bookmarks/${story.id}`;
  const bookmarkRef = doc(db, 'users', uid, 'bookmarks', story.id);
  try {
    if (currentlyBookmarked) {
      await deleteDoc(bookmarkRef);
    } else {
      await setDoc(bookmarkRef, {
        uid,
        storyId: story.id,
        storyTitle: story.title.slice(0, BLUEPRINT_LIMITS.STORY_TITLE_MAX),
        storyCategory: story.category.slice(0, 40),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentlyBookmarked ? OperationType.DELETE : OperationType.CREATE,
      path
    );
  }
}

export async function seedStarterStoriesToFirestore(
  user: User,
  profile: UserProfile,
  existingIds: Set<string> = new Set(),
  onProgress?: (uploaded: number, total: number) => void
): Promise<number> {
  const pending = STARTER_STORY_BUNDLES.filter((bundle) => !existingIds.has(bundle.story.id));
  if (pending.length === 0) {
    return 0;
  }

  // Keep each batch <= 3 stories so security rules stay well below Firestore's 20 get()/exists() per-batch limit
  const CHUNK_SIZE = 3;
  let uploaded = 0;

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const bundle of chunk) {
      const storyId = bundle.story.id;
      const storyRef = doc(db, 'stories', storyId);

      batch.set(storyRef, {
        title: bundle.story.title.trim().slice(0, BLUEPRINT_LIMITS.STORY_TITLE_MAX),
        excerpt: bundle.story.excerpt.trim().slice(0, BLUEPRINT_LIMITS.STORY_EXCERPT_MAX),
        category: bundle.story.category,
        authorId: user.uid,
        authorName: profile.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
        authorPhotoURL: profile.photoURL.trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
        authorVerified: false,
        views: 0,
        chapterCount: bundle.chapters.length,
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      bundle.chapters.forEach((chapter, chIdx) => {
        const chapterId = chapter.id || `ch_${chIdx + 1}`;
        const chapterRef = doc(db, 'stories', storyId, 'chapters', chapterId);
        batch.set(chapterRef, {
          storyId,
          authorId: user.uid,
          status: 'published',
          chapterNumber: chIdx + 1,
          title: chapter.title.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX),
          content: chapter.content.trim().slice(0, BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    }

    try {
      await batch.commit();
      uploaded += chunk.length;
      onProgress?.(uploaded, pending.length);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'stories');
    }
  }

  return uploaded;
}
