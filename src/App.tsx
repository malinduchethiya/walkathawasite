import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header, type AppView } from './components/Header';
import { ProfileView } from './components/ProfileView';
import { SidebarDrawer } from './components/SidebarDrawer';
import { StoryEditor } from './components/StoryEditor';
import { StoryGrid } from './components/StoryGrid';
import { StoryReader } from './components/StoryReader';
import { STARTER_STORIES } from './data/starterStories';
import {
  deleteStoryWithChapters,
  subscribePublishedStories,
  subscribeUserBookmarks,
  subscribeUserStories,
  toggleUserBookmark,
} from './firebase/repository';
import type { SortOption, Story, StoryCategory, StoryChapter, UserBookmark } from './types/story';
import { filterAndSortStories } from './utils/storyUtils';

const GUEST_BOOKMARKS_KEY = 'kathagrid_guest_bookmarks';

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

function KathaGridApp() {
  const { user, authReady } = useAuth();

  const [activeView, setActiveView] = useState<AppView>('stories');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firebaseStories, setFirebaseStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingChapters, setEditingChapters] = useState<StoryChapter[]>([]);

  const [firebaseBookmarks, setFirebaseBookmarks] = useState<UserBookmark[]>([]);
  const [guestBookmarkIds, setGuestBookmarkIds] = useState<string[]>(() => readGuestBookmarkIds());

  useEffect(() => {
    const unsubscribe = subscribePublishedStories(
      (items) => {
        setFirebaseStories(items);
        setStoriesLoading(false);
      },
      () => {
        setStoriesLoading(false);
      }
    );
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
      () => setUserStories([])
    );

    const unsubBookmarks = subscribeUserBookmarks(
      user.uid,
      (items) => setFirebaseBookmarks(items),
      () => setFirebaseBookmarks([])
    );

    return () => {
      unsubStories();
      unsubBookmarks();
    };
  }, [authReady, user]);

  // Combine live Firebase stories (prioritized first) with starter stories when Firestore has fewer than 12 items
  const allCatalogStories = useMemo(() => {
    if (firebaseStories.length >= 12) {
      return firebaseStories;
    }
    const firebaseTitles = new Set(firebaseStories.map((s) => s.title.toLowerCase()));
    const remainingStarters = STARTER_STORIES.filter(
      (s) => !firebaseTitles.has(s.title.toLowerCase())
    );
    return [...firebaseStories, ...remainingStarters];
  }, [firebaseStories]);

  const visibleStories = useMemo(
    () =>
      filterAndSortStories(allCatalogStories, {
        category: selectedCategory,
        query: searchQuery,
        sortBy,
      }),
    [allCatalogStories, selectedCategory, searchQuery, sortBy]
  );

  const bookmarkedIds = useMemo(() => {
    if (user) {
      return new Set(firebaseBookmarks.map((b) => b.storyId));
    }
    return new Set(guestBookmarkIds);
  }, [user, firebaseBookmarks, guestBookmarkIds]);

  const savedStories = useMemo(
    () => allCatalogStories.filter((story) => bookmarkedIds.has(story.id)),
    [allCatalogStories, bookmarkedIds]
  );

  const selectedStory = useMemo(() => {
    if (!selectedStoryId) return null;
    return (
      allCatalogStories.find((s) => s.id === selectedStoryId) ??
      userStories.find((s) => s.id === selectedStoryId) ??
      null
    );
  }, [selectedStoryId, allCatalogStories, userStories]);

  const handleNavigate = useCallback((view: AppView) => {
    if (view !== 'write') {
      setEditingStory(null);
      setEditingChapters([]);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleOpenStory = useCallback((story: Story) => {
    setSelectedStoryId(story.id);
    setActiveView('read');
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
      await deleteStoryWithChapters(story.id, user.uid);
      setSelectedStoryId(null);
      setActiveView('stories');
    },
    [user]
  );

  const handleStorySaved = useCallback((storyId: string) => {
    setEditingStory(null);
    setEditingChapters([]);
    setSelectedStoryId(storyId);
    setActiveView('read');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
      />

      <main>
        {activeView === 'stories' && (
          <StoryGrid
            stories={visibleStories}
            loading={storiesLoading && firebaseStories.length === 0 && allCatalogStories.length === 0}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            onClearFilters={() => {
              setSelectedCategory('All');
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

        {activeView === 'read' && !selectedStory && (
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
            hasFirebaseStories={firebaseStories.length > 0}
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
        <KathaGridApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
