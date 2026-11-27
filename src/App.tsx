import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminPanel } from './components/AdminPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header, type AppView } from './components/Header';
import { ProfileView } from './components/ProfileView';
import { SidebarDrawer } from './components/SidebarDrawer';
import { StoryEditor } from './components/StoryEditor';
import { StoryGrid } from './components/StoryGrid';
import { StoryReader } from './components/StoryReader';
import {
  adminDeleteStoryWithChapters,
  deleteStoryWithChapters,
  subscribeCategories,
  subscribePublishedStories,
  subscribeSiteSeoSettings,
  subscribeUserBookmarks,
  subscribeUserStories,
  toggleUserBookmark,
} from './firebase/repository';
import type {
  CategoryRecord,
  SiteSeoSettings,
  SortOption,
  Story,
  StoryCategory,
  StoryChapter,
  UserBookmark,
} from './types/story';
import {
  DEFAULT_SEO_SETTINGS,
  applySeoSettingsToDocument,
  filterAndSortStories,
  mergeCategories,
} from './utils/storyUtils';
import {
  DEFAULT_PUBLIC_SITE_URL,
  buildCategoryPath,
  buildStoryPath,
  parseAppRoute,
} from './utils/seoFiles';

const GUEST_BOOKMARKS_KEY = 'walkathawa_guest_bookmarks';

function readGuestBookmarkIds(): string[] {
  try {
    const raw = window.localStorage.getItem(GUEST_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function WalkathawaApp() {
  const { user, isAdmin, authReady } = useAuth();

  const initialRoute = useMemo(
    () => parseAppRoute(window.location.pathname, window.location.search),
    []
  );

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(initialRoute.isAdmin);
  const [activeView, setActiveView] = useState<AppView>(
    initialRoute.storyId ? 'read' : 'stories'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firebaseStories, setFirebaseStories] = useState<Story[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryRecord[]>([]);
  const [seoSettings, setSeoSettings] = useState<SiteSeoSettings>(DEFAULT_SEO_SETTINGS);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | 'All'>(
    initialRoute.category ?? 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(initialRoute.storyId);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingChapters, setEditingChapters] = useState<StoryChapter[]>([]);

  const [firebaseBookmarks, setFirebaseBookmarks] = useState<UserBookmark[]>([]);
  const [guestBookmarkIds, setGuestBookmarkIds] = useState<string[]>(() => readGuestBookmarkIds());

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppRoute(window.location.pathname, window.location.search);
      setIsAdminRoute(parsed.isAdmin);
      if (parsed.isAdmin) return;
      if (parsed.storyId) {
        setSelectedStoryId(parsed.storyId);
        setActiveView('read');
      } else {
        setSelectedStoryId(null);
        setSelectedCategory(parsed.category ?? 'All');
        setActiveView('stories');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const exitAdminRoute = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    setSelectedStoryId(null);
    setSelectedCategory('All');
    setActiveView('stories');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Live subscription to Firestore root /stories collection
  useEffect(() => {
    const unsubscribe = subscribePublishedStories(
      (items) => {
        setFirebaseStories(items);
        setStoriesLoading(false);
        setSyncError(null);
      },
      (err) => {
        setStoriesLoading(false);
        setSyncError(err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // Live subscription to Firestore /categories collection
  useEffect(() => {
    const unsubscribe = subscribeCategories(
      (items) => setCustomCategories(items),
      () => {
        // Non-blocking fallback to default categories if /categories is unavailable
      }
    );
    return () => unsubscribe();
  }, []);

  // Live subscription to Firestore /siteSettings/seo document
  useEffect(() => {
    const unsubscribe = subscribeSiteSeoSettings((settings) => {
      setSeoSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setUserStories([]);
      setFirebaseBookmarks([]);
      return;
    }

    const unsubStories = subscribeUserStories(
      user.uid,
      (items) => setUserStories(items),
      (err) => setSyncError(err.message)
    );

    const unsubBookmarks = subscribeUserBookmarks(
      user.uid,
      (items) => setFirebaseBookmarks(items),
      (err) => setSyncError(err.message)
    );

    return () => {
      unsubStories();
      unsubBookmarks();
    };
  }, [authReady, user]);

  const allCategories = useMemo(
    () => mergeCategories(customCategories, firebaseStories),
    [customCategories, firebaseStories]
  );

  const existingStoryIds = useMemo(
    () => new Set(firebaseStories.map((s) => s.id)),
    [firebaseStories]
  );

  const visibleStories = useMemo(
    () =>
      filterAndSortStories(firebaseStories, {
        category: selectedCategory,
        query: searchQuery,
        sortBy,
      }),
    [firebaseStories, selectedCategory, searchQuery, sortBy]
  );

  const bookmarkedIds = useMemo(() => {
    if (user) {
      return new Set(firebaseBookmarks.map((b) => b.storyId));
    }
    return new Set(guestBookmarkIds);
  }, [user, firebaseBookmarks, guestBookmarkIds]);

  const savedStories = useMemo(
    () => firebaseStories.filter((story) => bookmarkedIds.has(story.id)),
    [firebaseStories, bookmarkedIds]
  );

  const selectedStory = useMemo(() => {
    if (!selectedStoryId) return null;
    return (
      firebaseStories.find((s) => s.id === selectedStoryId) ??
      userStories.find((s) => s.id === selectedStoryId) ??
      null
    );
  }, [selectedStoryId, firebaseStories, userStories]);

  useEffect(() => {
    const origin = DEFAULT_PUBLIC_SITE_URL;
    if (isAdminRoute) {
      applySeoSettingsToDocument(seoSettings, {
        title: 'Admin — walkathawa',
        canonicalUrl: `${origin}/admin`,
        robots: 'noindex, nofollow',
      });
      return;
    }

    if (activeView === 'read' && selectedStory) {
      applySeoSettingsToDocument(seoSettings, {
        title: `${selectedStory.title} — walkathawa`,
        description: selectedStory.excerpt,
        canonicalUrl: `${origin}${buildStoryPath(selectedStory.id)}`,
        robots: 'index, follow',
      });
      return;
    }

    if (activeView === 'read' && selectedStoryId) {
      applySeoSettingsToDocument(seoSettings, {
        canonicalUrl: `${origin}${buildStoryPath(selectedStoryId)}`,
        robots: 'index, follow',
      });
      return;
    }

    if (activeView === 'stories' && selectedCategory !== 'All') {
      applySeoSettingsToDocument(seoSettings, {
        title: `${selectedCategory} Stories — walkathawa`,
        canonicalUrl: `${origin}${buildCategoryPath(selectedCategory)}`,
        robots: 'index, follow',
      });
      return;
    }

    applySeoSettingsToDocument(seoSettings, {
      canonicalUrl: `${origin}/`,
      robots: 'index, follow',
    });
  }, [seoSettings, isAdminRoute, activeView, selectedStory, selectedStoryId, selectedCategory]);

  const handleCategoryChange = useCallback((cat: StoryCategory | 'All') => {
    setSelectedCategory(cat);
    const nextPath = buildCategoryPath(cat);
    if (`${window.location.pathname}${window.location.search}` !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, []);

  const handleNavigate = useCallback(
    (view: AppView) => {
      if (view !== 'write') {
        setEditingStory(null);
        setEditingChapters([]);
      }
      if (view === 'stories') {
        setSelectedStoryId(null);
        const nextPath = buildCategoryPath(selectedCategory);
        if (`${window.location.pathname}${window.location.search}` !== nextPath) {
          window.history.pushState({}, '', nextPath);
        }
      }
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [selectedCategory]
  );

  const handleOpenStory = useCallback((story: Story) => {
    setSelectedStoryId(story.id);
    setActiveView('read');
    const nextPath = buildStoryPath(story.id);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleToggleBookmark = useCallback(
    async (story: Story) => {
      const currentlySaved = bookmarkedIds.has(story.id);
      if (user) {
        await toggleUserBookmark(user.uid, story, currentlySaved);
      } else {
        setGuestBookmarkIds((prev) => {
          const next = currentlySaved
            ? prev.filter((id) => id !== story.id)
            : [story.id, ...prev];
          try {
            window.localStorage.setItem(GUEST_BOOKMARKS_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      }
    },
    [bookmarkedIds, user]
  );

  const handleEditStory = useCallback((story: Story, chapters: StoryChapter[]) => {
    setEditingStory(story);
    setEditingChapters(chapters);
    setActiveView('write');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleDeleteStory = useCallback(
    async (story: Story) => {
      if (!user) return;
      if (isAdmin && story.authorId !== user.uid) {
        await adminDeleteStoryWithChapters(story.id);
      } else {
        await deleteStoryWithChapters(story.id, user.uid);
      }
      setSelectedStoryId(null);
      setActiveView('stories');
    },
    [user, isAdmin]
  );

  const handleStorySaved = useCallback((storyId: string) => {
    setEditingStory(null);
    setEditingChapters([]);
    setSelectedStoryId(storyId);
    setActiveView('read');
    const nextPath = buildStoryPath(storyId);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (isAdminRoute) {
    return (
      <AdminPanel
        customCategories={customCategories}
        seoSettings={seoSettings}
        onExitAdmin={exitAdminRoute}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#141621] text-[#eef0f6]">
      <Header
        sidebarOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <SidebarDrawer
        open={sidebarOpen}
        activeView={activeView}
        savedCount={bookmarkedIds.size}
        categories={allCategories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onCategoryChange={handleCategoryChange}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
      />

      {syncError && (
        <div role="alert" className="max-w-[1380px] mx-auto px-4 sm:px-6 pt-5">
          <div className="bg-[#2a1922] border border-[#5a293a] rounded-xl px-4 py-3 text-xs text-[#f7a8b6] flex items-center justify-between gap-3">
            <span className="break-all">Firestore sync error: {syncError}</span>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="text-white hover:underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main>
        {activeView === 'stories' && (
          <StoryGrid
            stories={visibleStories}
            loading={storiesLoading}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            emptyTitle={firebaseStories.length === 0 ? 'No stories yet' : 'No matching stories'}
            emptyDescription={
              firebaseStories.length === 0
                ? 'Published stories will appear here as soon as they are available.'
                : 'Try adjusting your search query or selecting another category.'
            }
            onClearFilters={() => {
              handleCategoryChange('All');
              setSearchQuery('');
            }}
            onOpenStory={handleOpenStory}
          />
        )}

        {activeView === 'read' && selectedStory && (
          <StoryReader
            story={selectedStory}
            isBookmarked={bookmarkedIds.has(selectedStory.id)}
            onBack={() => handleNavigate('stories')}
            onToggleBookmark={handleToggleBookmark}
            onEditStory={handleEditStory}
            onDeleteStory={handleDeleteStory}
          />
        )}

        {activeView === 'read' && !selectedStory && storiesLoading && (
          <div className="max-w-md mx-auto px-6 py-20 text-center">
            <p className="text-sm text-[#9ea4b8]">Loading story...</p>
          </div>
        )}

        {activeView === 'read' && !selectedStory && !storiesLoading && (
          <div className="max-w-md mx-auto px-6 py-20 text-center">
            <p className="text-base font-medium text-white">Story not found</p>
            <button
              type="button"
              onClick={() => handleNavigate('stories')}
              className="mt-4 px-4 py-2 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg cursor-pointer"
            >
              Back to Stories
            </button>
          </div>
        )}

        {activeView === 'write' && (
          <StoryEditor
            key={editingStory?.id ?? 'new'}
            categories={allCategories}
            editingStory={editingStory}
            editingChapters={editingChapters}
            onSaved={handleStorySaved}
            onCancel={() => handleNavigate('stories')}
          />
        )}

        {activeView === 'saved' && (
          <StoryGrid
            stories={savedStories}
            loading={false}
            selectedCategory="All"
            searchQuery=""
            showClearAction={false}
            emptyTitle="No saved stories yet"
            emptyDescription="Open any story and click Save to keep it here for later reading."
            onOpenStory={handleOpenStory}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            userStories={userStories}
            existingStoryIds={existingStoryIds}
            onOpenStory={handleOpenStory}
            onEditStory={handleEditStory}
            onWriteNew={() => handleNavigate('write')}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WalkathawaApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
