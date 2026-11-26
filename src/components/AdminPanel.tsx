import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileJson,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  adminBulkImportStoriesToFirestore,
  adminDeleteStoryWithChapters,
  adminQuickUpdateStoryCategory,
  adminSaveStoryWithChapters,
  createCategoryRecord,
  deleteCategoryRecord,
  fetchStoryChaptersForAdmin,
  saveSiteSeoSettings,
  subscribeAllStoriesForAdmin,
  updateCategoryRecord,
  type BulkImportProgress,
  type BulkImportSummary,
} from '../firebase/repository';
import {
  STORY_CATEGORIES,
  type CategoryRecord,
  type ChapterDraftInput,
  type SiteSeoSettings,
  type Story,
  type StoryStatus,
} from '../types/story';
import {
  ADMIN_EMAIL,
  BLUEPRINT_LIMITS,
  SAMPLE_BULK_IMPORT_JSON,
  formatCompactViews,
  formatRelativeTime,
  isSafeImageUrl,
  mergeCategories,
  normalizeCategoryName,
  parseJsonStoriesPayload,
  parseSeoKeywords,
  validateSeoInput,
  validateStoryInput,
} from '../utils/storyUtils';

interface AdminPanelProps {
  customCategories: CategoryRecord[];
  seoSettings: SiteSeoSettings;
  onExitAdmin: () => void;
}

type AdminTab = 'stories' | 'import' | 'categories' | 'seo';

const ADMIN_STORIES_PER_PAGE = 50;

export function AdminPanel({ customCategories, seoSettings, onExitAdmin }: AdminPanelProps) {
  const {
    user,
    isAdmin,
    authReady,
    authLoading,
    authError,
    signInWithGoogle,
    signInWithEmail,
    resendVerificationEmail,
    signOutUser,
  } = useAuth();

  // Auth gate state (zero hardcoded passwords)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  // Admin workspace state
  const [activeTab, setActiveTab] = useState<AdminTab>('stories');
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Story list filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | StoryStatus>('all');
  const [adminPage, setAdminPage] = useState(1);
  const [confirmDeleteStoryId, setConfirmDeleteStoryId] = useState<string | null>(null);
  const [busyStoryId, setBusyStoryId] = useState<string | null>(null);

  // Story editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryMode, setCategoryMode] = useState<'existing' | 'custom'>('existing');
  const [category, setCategory] = useState('Drama');
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [coverImageURL, setCoverImageURL] = useState('');
  const [authorName, setAuthorName] = useState('walkathawa');
  const [authorVerified, setAuthorVerified] = useState(true);
  const [views, setViews] = useState(0);
  const [status, setStatus] = useState<StoryStatus>('published');
  const [chapters, setChapters] = useState<ChapterDraftInput[]>([
    { title: 'Part 1', content: '', imageURL: '' },
  ]);
  const [editorErrors, setEditorErrors] = useState<string[]>([]);
  const [savingStory, setSavingStory] = useState(false);

  // Categories manager state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // SEO manager state
  const [seoTitle, setSeoTitle] = useState(seoSettings.siteTitle);
  const [seoDescription, setSeoDescription] = useState(seoSettings.metaDescription);
  const [seoKeywordsInput, setSeoKeywordsInput] = useState(seoSettings.keywords);
  const [savingSeo, setSavingSeo] = useState(false);

  // Bulk JSON Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cancelImportRef = useRef(false);
  const [jsonFileName, setJsonFileName] = useState<string>('');
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [importDefaultCategory, setImportDefaultCategory] = useState<string>('Drama');
  const [importDefaultStatus, setImportDefaultStatus] = useState<StoryStatus>('published');
  const [skipExistingByTitle, setSkipExistingByTitle] = useState<boolean>(true);
  const [importingJson, setImportingJson] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<BulkImportProgress | null>(null);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);

  useEffect(() => {
    setSeoTitle(seoSettings.siteTitle);
    setSeoDescription(seoSettings.metaDescription);
    setSeoKeywordsInput(seoSettings.keywords);
  }, [seoSettings.siteTitle, seoSettings.metaDescription, seoSettings.keywords]);

  const parsedSeoKeywordList = useMemo(
    () => parseSeoKeywords(seoKeywordsInput),
    [seoKeywordsInput]
  );

  const parsedJsonPreview = useMemo(
    () =>
      parseJsonStoriesPayload(rawJsonText, {
        defaultCategory: importDefaultCategory,
        defaultStatus: importDefaultStatus,
        defaultAuthorName: user?.displayName || 'walkathawa',
      }),
    [rawJsonText, importDefaultCategory, importDefaultStatus, user?.displayName]
  );

  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAllStories([]);
      setLoadingStories(false);
      return;
    }

    setLoadingStories(true);
    const unsub = subscribeAllStoriesForAdmin(
      (items) => {
        setAllStories(items);
        setLoadingStories(false);
        setAdminError(null);
      },
      (err) => {
        setLoadingStories(false);
        setAdminError(err.message);
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  const allCategories = useMemo(
    () => mergeCategories(customCategories, allStories),
    [customCategories, allStories]
  );

  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStories.filter((story) => {
      if (categoryFilter !== 'All' && story.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && story.status !== statusFilter) return false;
      if (!q) return true;
      return `${story.title} ${story.excerpt} ${story.authorName} ${story.category}`
        .toLowerCase()
        .includes(q);
    });
  }, [allStories, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    setAdminPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  const adminTotalPages = Math.max(1, Math.ceil(filteredStories.length / ADMIN_STORIES_PER_PAGE));
  const safeAdminPage = Math.min(adminPage, adminTotalPages);
  const visibleAdminStories = useMemo(() => {
    const start = (safeAdminPage - 1) * ADMIN_STORIES_PER_PAGE;
    return filteredStories.slice(start, start + ADMIN_STORIES_PER_PAGE);
  }, [filteredStories, safeAdminPage]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginStatus(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLoginStatus('Enter both email and password.');
      return;
    }
    try {
      await signInWithEmail(loginEmail, loginPassword);
      setLoginPassword('');
    } catch {
      // Error surfaced via authError
    }
  };

  const handleSendVerification = async () => {
    setLoginStatus(null);
    try {
      await resendVerificationEmail();
      setLoginStatus('Verification email sent. Check your inbox, verify, then reload this page.');
    } catch {
      // Error surfaced via authError
    }
  };

  const openNewStoryEditor = () => {
    setEditingStory(null);
    setTitle('');
    setExcerpt('');
    setCategoryMode('existing');
    setCategory(allCategories[0] ?? 'Drama');
    setCustomCategoryDraft('');
    setCoverImageURL('');
    setAuthorName(user?.displayName || 'walkathawa');
    setAuthorVerified(true);
    setViews(0);
    setStatus('published');
    setChapters([{ title: 'Part 1', content: '', imageURL: '' }]);
    setEditorErrors([]);
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openEditStoryEditor = async (story: Story) => {
    setBusyStoryId(story.id);
    setAdminError(null);
    try {
      const loadedChapters = await fetchStoryChaptersForAdmin(story.id);
      setEditingStory(story);
      setTitle(story.title);
      setExcerpt(story.excerpt);
      setCategoryMode('existing');
      setCategory(story.category);
      setCustomCategoryDraft('');
      setCoverImageURL(story.coverImageURL ?? '');
      setAuthorName(story.authorName);
      setAuthorVerified(story.authorVerified);
      setViews(story.views);
      setStatus(story.status);
      setChapters(
        loadedChapters.length > 0
          ? loadedChapters.map((c) => ({
              id: c.id,
              title: c.title,
              content: c.content,
              imageURL: c.imageURL ?? '',
            }))
          : [{ title: 'Part 1', content: '', imageURL: '' }]
      );
      setEditorErrors([]);
      setEditorOpen(true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to load story chapters.');
    } finally {
      setBusyStoryId(null);
    }
  };

  const handleAddChapter = () => {
    setChapters((prev) => [...prev, { title: `Part ${prev.length + 1}`, content: '', imageURL: '' }]);
  };

  const handleRemoveChapter = (index: number) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveChapter = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    setChapters((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleChapterChange = (
    index: number,
    field: 'title' | 'content' | 'imageURL',
    value: string
  ) => {
    setChapters((prev) =>
      prev.map((ch, idx) => (idx === index ? { ...ch, [field]: value } : ch))
    );
  };

  const handleSaveStory = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const chosenCategory =
      categoryMode === 'custom'
        ? normalizeCategoryName(customCategoryDraft)
        : normalizeCategoryName(category);

    const draft = {
      title,
      excerpt,
      category: chosenCategory,
      coverImageURL,
      status,
      chapters,
      authorName,
      authorVerified,
      views,
    };

    const validationErrors = validateStoryInput(draft);
    if (validationErrors.length > 0) {
      setEditorErrors(validationErrors);
      return;
    }

    setEditorErrors([]);
    setSavingStory(true);
    setAdminNotice(null);
    setAdminError(null);
    try {
      // Save brand-new custom category to Firestore /categories automatically if not already present
      const existsAlready = allCategories.some(
        (c) => c.toLowerCase() === chosenCategory.toLowerCase()
      );
      if (categoryMode === 'custom' && chosenCategory && !existsAlready) {
        await createCategoryRecord(user, chosenCategory);
      }

      await adminSaveStoryWithChapters(user, draft, editingStory);
      setEditorOpen(false);
      setEditingStory(null);
      setAdminNotice(editingStory ? 'Story updated in Firestore.' : 'Story published to Firestore.');
    } catch (err) {
      setEditorErrors([err instanceof Error ? err.message : 'Unable to save story.']);
    } finally {
      setSavingStory(false);
    }
  };

  const handleQuickCategoryChange = async (storyId: string, nextCategory: string) => {
    setBusyStoryId(storyId);
    setAdminError(null);
    setAdminNotice(null);
    try {
      await adminQuickUpdateStoryCategory(storyId, nextCategory);
      setAdminNotice(`Category updated to "${nextCategory}".`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to update category.');
    } finally {
      setBusyStoryId(null);
    }
  };

  const handleConfirmDeleteStory = async (storyId: string) => {
    setBusyStoryId(storyId);
    setAdminError(null);
    setAdminNotice(null);
    try {
      await adminDeleteStoryWithChapters(storyId);
      setConfirmDeleteStoryId(null);
      setAdminNotice('Story deleted from Firestore.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to delete story.');
    } finally {
      setBusyStoryId(null);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const clean = normalizeCategoryName(newCategoryName);
    if (!clean) {
      setAdminError('Enter a category name.');
      return;
    }
    if (allCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setAdminError('That category already exists.');
      return;
    }

    setCreatingCategory(true);
    setAdminError(null);
    setAdminNotice(null);
    try {
      await createCategoryRecord(user, clean);
      setNewCategoryName('');
      setAdminNotice(`Category "${clean}" added to Firestore.`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSaveCategoryRename = async (categoryId: string) => {
    const clean = normalizeCategoryName(editingCategoryName);
    if (!clean) {
      setAdminError('Category name cannot be empty.');
      return;
    }
    setAdminError(null);
    setAdminNotice(null);
    try {
      await updateCategoryRecord(categoryId, clean);
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setAdminNotice(`Category renamed to "${clean}".`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to rename category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setAdminError(null);
    setAdminNotice(null);
    try {
      await deleteCategoryRecord(categoryId);
      setConfirmDeleteCatId(null);
      setAdminNotice('Custom category deleted from Firestore.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to delete category.');
    }
  };

  const handleSaveSeo = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAdminError(null);
    setAdminNotice(null);

    const validationErrors = validateSeoInput({
      siteTitle: seoTitle,
      metaDescription: seoDescription,
      keywords: seoKeywordsInput,
    });
    if (validationErrors.length > 0) {
      setAdminError(validationErrors[0]);
      return;
    }

    setSavingSeo(true);
    try {
      const saved = await saveSiteSeoSettings(user, {
        siteTitle: seoTitle,
        metaDescription: seoDescription,
        keywords: seoKeywordsInput,
      });
      setSeoKeywordsInput(saved.keywords);
      setAdminNotice(
        `SEO settings saved to Firestore (${parseSeoKeywords(saved.keywords).length} keywords active across the site).`
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to save SEO settings.');
    } finally {
      setSavingSeo(false);
    }
  };

  const handleJsonFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdminError(null);
    setAdminNotice(null);
    setImportSummary(null);
    setImportProgress(null);

    try {
      const text = await file.text();
      setJsonFileName(file.name);
      setRawJsonText(text);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Unable to read the selected JSON file.'
      );
    }
  };

  const handleLoadSampleJson = () => {
    setAdminError(null);
    setAdminNotice(null);
    setImportSummary(null);
    setImportProgress(null);
    setJsonFileName('sample-stories.json');
    setRawJsonText(SAMPLE_BULK_IMPORT_JSON);
  };

  const handleClearJsonImport = () => {
    setJsonFileName('');
    setRawJsonText('');
    setImportSummary(null);
    setImportProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartBulkImport = async () => {
    if (!user || parsedJsonPreview.stories.length === 0) return;

    cancelImportRef.current = false;
    setImportingJson(true);
    setAdminError(null);
    setAdminNotice(null);
    setImportSummary(null);
    setImportProgress({
      processed: 0,
      uploaded: 0,
      skippedDuplicates: 0,
      failed: 0,
      total: parsedJsonPreview.stories.length,
    });

    try {
      const summary = await adminBulkImportStoriesToFirestore(user, parsedJsonPreview.stories, {
        existingStories: allStories,
        existingCategories: allCategories,
        skipExistingByTitle,
        shouldCancel: () => cancelImportRef.current,
        onProgress: (prog) => {
          setImportProgress({ ...prog });
        },
      });
      setImportSummary(summary);
      if (summary.cancelled) {
        setAdminNotice(
          `Import stopped: ${summary.uploaded} stories uploaded to Firestore (${summary.skippedDuplicates} duplicates skipped).`
        );
      } else {
        setAdminNotice(
          `Bulk import complete: ${summary.uploaded} individual stories uploaded to Firestore (${summary.skippedDuplicates} duplicates skipped, ${summary.failed} failed).`
        );
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Bulk JSON import failed.');
    } finally {
      setImportingJson(false);
    }
  };

  const handleStopBulkImport = () => {
    cancelImportRef.current = true;
  };

  // Auth loading state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#141621] text-[#eef0f6] flex items-center justify-center p-6">
        <p className="text-sm text-[#9ea4b8]">Checking admin session...</p>
      </div>
    );
  }

  // Admin Login Gate
  if (!isAdmin) {
    const isSignedInWrongEmail = Boolean(
      user && user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    );
    const isAdminUnverified = Boolean(
      user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && !user.emailVerified
    );

    return (
      <div className="min-h-screen bg-[#141621] text-[#eef0f6] flex flex-col">
        <header className="border-b border-[#222638] bg-[#141621]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-[16px] sm:text-[17px] font-bold tracking-tight text-white hover:text-[#c7b3ec] transition-colors cursor-pointer"
            >
              walkathawa
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b2b6c7] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Site</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-[#1d202e] rounded-xl p-7 sm:p-8 border border-[#262a3d]">
            <h1 className="text-xl font-semibold text-white">walkathawa Admin</h1>
            <p className="mt-1.5 text-xs text-[#9ea4b8] leading-relaxed">
              Sign in with the administrator account ({ADMIN_EMAIL}) to manage stories, images,
              and categories in Firestore.
            </p>

            {(authError || loginStatus) && (
              <div
                role="alert"
                className="mt-4 bg-[#2a1922] border border-[#5a293a] rounded-lg px-3.5 py-2.5 text-xs text-[#f7a8b6]"
              >
                {authError || loginStatus}
              </div>
            )}

            {isSignedInWrongEmail && (
              <div className="mt-5 space-y-4">
                <p className="text-xs text-[#d5d9e6] bg-[#141621] border border-[#2a2e42] rounded-lg p-3.5">
                  Currently signed in as <span className="font-medium text-white">{user?.email}</span>.
                  Sign out and sign in with <span className="font-medium text-white">{ADMIN_EMAIL}</span>.
                </p>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void signOutUser()}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Sign Out
                </button>
              </div>
            )}

            {isAdminUnverified && (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-[#d5d9e6] bg-[#141621] border border-[#2a2e42] rounded-lg p-3.5">
                  Your email address must be verified before Firestore allows administrator writes.
                </p>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void handleSendVerification()}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Send Verification Email
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void signOutUser()}
                  className="w-full px-4 py-2 text-xs font-medium bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-[#d5d9e6] rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}

            {!user && (
              <div className="mt-6 space-y-5">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void signInWithGoogle()}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 text-[11px] text-[#7f859b]">
                  <div className="h-px flex-1 bg-[#2a2e42]" />
                  <span>or email &amp; password</span>
                  <div className="h-px flex-1 bg-[#2a2e42]" />
                </div>

                <form onSubmit={(e) => void handleEmailLogin(e)} noValidate className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="admin-email"
                      className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                    >
                      Admin Email
                    </label>
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="username"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={ADMIN_EMAIL}
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#6f758b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password"
                      className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                    >
                      Password
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#6f758b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141621] text-[#eef0f6]">
      {/* Minimal Admin Header */}
      <header className="border-b border-[#222638] bg-[#141621]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-[16px] sm:text-[17px] font-bold tracking-tight text-white hover:text-[#c7b3ec] transition-colors cursor-pointer"
            >
              walkathawa
            </button>
            <span className="text-xs font-medium text-[#b897ee]">Admin</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-xs text-[#9ea4b8]">{user?.email}</span>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3 py-1.5 text-xs font-medium bg-[#1d202e] hover:bg-[#25293b] border border-[#2d3248] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer"
            >
              View Site
            </button>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="px-3 py-1.5 text-xs font-medium bg-[#1d202e] hover:bg-[#25293b] border border-[#2d3248] text-[#d5d9e6] rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-8">
        {adminError && (
          <div
            role="alert"
            className="mb-6 bg-[#2a1922] border border-[#5a293a] rounded-xl px-4 py-3 text-xs text-[#f7a8b6] flex items-center justify-between gap-3"
          >
            <span className="break-all">{adminError}</span>
            <button
              type="button"
              onClick={() => setAdminError(null)}
              className="text-white hover:underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {adminNotice && (
          <div
            role="status"
            className="mb-6 bg-[#172824] border border-[#275447] rounded-xl px-4 py-3 text-xs text-[#8de0b6] flex items-center justify-between gap-3"
          >
            <span>{adminNotice}</span>
            <button
              type="button"
              onClick={() => setAdminNotice(null)}
              className="text-white hover:underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {editorOpen ? (
          <section className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-xl font-semibold text-white">
                {editingStory ? 'Edit Story' : 'Add New Story'}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  setEditingStory(null);
                }}
                className="text-xs font-medium text-[#b2b6c7] hover:text-white cursor-pointer"
              >
                Back to List
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveStory(e)} noValidate className="space-y-6">
              {editorErrors.length > 0 && (
                <div
                  role="alert"
                  className="bg-[#2a1922] border border-[#5a293a] rounded-xl p-4 text-xs text-[#f7a8b6] space-y-1"
                >
                  {editorErrors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}

              <div className="bg-[#1d202e] rounded-xl p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="admin-story-title" className="text-xs font-medium text-[#c2c6d4]">
                      Story Title
                    </label>
                    <span className="text-xs text-[#8c92a6] tabular-nums">
                      {title.length}/{BLUEPRINT_LIMITS.STORY_TITLE_MAX}
                    </span>
                  </div>
                  <input
                    id="admin-story-title"
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.STORY_TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter story title"
                    className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="admin-story-excerpt" className="text-xs font-medium text-[#c2c6d4]">
                      Excerpt
                    </label>
                    <span className="text-xs text-[#8c92a6] tabular-nums">
                      {excerpt.length}/{BLUEPRINT_LIMITS.STORY_EXCERPT_MAX}
                    </span>
                  </div>
                  <textarea
                    id="admin-story-excerpt"
                    rows={2}
                    maxLength={BLUEPRINT_LIMITS.STORY_EXCERPT_MAX}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Short description shown on the story card (10–320 characters)"
                    className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none resize-y"
                  />
                </div>

                {/* Category: Existing or Custom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="admin-story-category" className="text-xs font-medium text-[#c2c6d4]">
                        Category
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryMode((m) => (m === 'existing' ? 'custom' : 'existing'))
                        }
                        className="text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer"
                      >
                        {categoryMode === 'existing' ? '+ Custom category' : 'Pick existing'}
                      </button>
                    </div>
                    {categoryMode === 'existing' ? (
                      <select
                        id="admin-story-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="admin-story-category"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.CATEGORY_MAX}
                        value={customCategoryDraft}
                        onChange={(e) => setCustomCategoryDraft(e.target.value)}
                        placeholder="Type new custom category name"
                        className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label htmlFor="admin-story-status" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                      Visibility
                    </label>
                    <select
                      id="admin-story-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StoryStatus)}
                      className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft (Hidden from Public)</option>
                    </select>
                  </div>
                </div>

                {/* Author Name, Views, Verified */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label htmlFor="admin-author-name" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                      Author Display Name
                    </label>
                    <input
                      id="admin-author-name"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-story-views" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                      Views
                    </label>
                    <input
                      id="admin-story-views"
                      type="number"
                      min={0}
                      max={100000000}
                      value={views}
                      onChange={(e) => setViews(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none tabular-nums"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 h-[42px] px-3.5 bg-[#141621] rounded-lg border border-[#2a2e42] text-xs text-[#d5d9e6] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authorVerified}
                      onChange={(e) => setAuthorVerified(e.target.checked)}
                      className="accent-[#8d64cc]"
                    />
                    <span>Verified author badge</span>
                  </label>
                </div>

                {/* Cover Image URL */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="admin-cover-image" className="text-xs font-medium text-[#c2c6d4]">
                      Story Cover Image URL (Optional)
                    </label>
                    {coverImageURL && (
                      <button
                        type="button"
                        onClick={() => setCoverImageURL('')}
                        className="text-xs text-[#f28b9c] hover:underline cursor-pointer"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  <input
                    id="admin-cover-image"
                    type="url"
                    maxLength={BLUEPRINT_LIMITS.IMAGE_URL_MAX}
                    value={coverImageURL}
                    onChange={(e) => setCoverImageURL(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                  />
                  {coverImageURL.trim() && isSafeImageUrl(coverImageURL) && (
                    <div className="mt-3 rounded-lg overflow-hidden bg-[#141621] border border-[#2a2e42] max-w-sm">
                      <img
                        src={coverImageURL.trim()}
                        alt="Cover preview"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-44 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Chapters / Story Text & Per-Chapter Images */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    Chapters &amp; Text ({chapters.length})
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1d202e] hover:bg-[#25293b] border border-[#2d3248] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Part</span>
                  </button>
                </div>

                {chapters.map((chapter, idx) => (
                  <div key={chapter.id ?? idx} className="bg-[#1d202e] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-[#b897ee]">Part {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveChapter(idx, -1)}
                          aria-label={`Move Part ${idx + 1} up`}
                          className="p-1.5 text-[#9ea4b8] hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === chapters.length - 1}
                          onClick={() => handleMoveChapter(idx, 1)}
                          aria-label={`Move Part ${idx + 1} down`}
                          className="p-1.5 text-[#9ea4b8] hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        {chapters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(idx)}
                            className="inline-flex items-center gap-1 text-xs text-[#9ea4b8] hover:text-[#f28b9c] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`admin-ch-title-${idx}`}
                        className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                      >
                        Part Heading
                      </label>
                      <input
                        id={`admin-ch-title-${idx}`}
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX}
                        value={chapter.title}
                        onChange={(e) => handleChapterChange(idx, 'title', e.target.value)}
                        className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor={`admin-ch-image-${idx}`}
                          className="text-xs font-medium text-[#c2c6d4]"
                        >
                          Chapter Image URL (Optional)
                        </label>
                        {chapter.imageURL && (
                          <button
                            type="button"
                            onClick={() => handleChapterChange(idx, 'imageURL', '')}
                            className="text-xs text-[#f28b9c] hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        id={`admin-ch-image-${idx}`}
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.IMAGE_URL_MAX}
                        value={chapter.imageURL ?? ''}
                        onChange={(e) => handleChapterChange(idx, 'imageURL', e.target.value)}
                        placeholder="https://example.com/chapter-image.jpg"
                        className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                      />
                      {chapter.imageURL?.trim() && isSafeImageUrl(chapter.imageURL) && (
                        <div className="mt-3 rounded-lg overflow-hidden bg-[#141621] border border-[#2a2e42] max-w-sm">
                          <img
                            src={chapter.imageURL.trim()}
                            alt={`Part ${idx + 1} preview`}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-44 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor={`admin-ch-content-${idx}`}
                          className="text-xs font-medium text-[#c2c6d4]"
                        >
                          Story Text
                        </label>
                        <span className="text-xs text-[#8c92a6] tabular-nums">
                          {chapter.content.length}/{BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX}
                        </span>
                      </div>
                      <textarea
                        id={`admin-ch-content-${idx}`}
                        rows={7}
                        maxLength={BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX}
                        value={chapter.content}
                        onChange={(e) => handleChapterChange(idx, 'content', e.target.value)}
                        placeholder="Write or edit story text (minimum 20 characters)..."
                        className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-3 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setEditingStory(null);
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-[#b2b6c7] hover:text-white bg-[#1d202e] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStory}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingStory ? 'Saving...' : editingStory ? 'Save Changes' : 'Publish Story'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            {/* Top Tabs & Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Admin sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'stories'}
                  onClick={() => setActiveTab('stories')}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'stories'
                      ? 'bg-[#8d64cc] text-white'
                      : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white'
                  }`}
                >
                  Stories ({allStories.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'import'}
                  onClick={() => setActiveTab('import')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'import'
                      ? 'bg-[#8d64cc] text-white'
                      : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bulk JSON Import</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'categories'}
                  onClick={() => setActiveTab('categories')}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'categories'
                      ? 'bg-[#8d64cc] text-white'
                      : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white'
                  }`}
                >
                  Categories ({allCategories.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'seo'}
                  onClick={() => setActiveTab('seo')}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'seo'
                      ? 'bg-[#8d64cc] text-white'
                      : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white'
                  }`}
                >
                  SEO Keywords ({parsedSeoKeywordList.length})
                </button>
              </div>

              {activeTab === 'stories' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#1d202e] hover:bg-[#25293b] border border-[#2d3248] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Import JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={openNewStoryEditor}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>New Story</span>
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'stories' ? (
              <section className="space-y-5">
                {/* Filter Bar */}
                <div className="bg-[#1d202e] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-[#8c92a6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search stories, authors, or categories..."
                      aria-label="Search stories"
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] pl-9 pr-3 py-2 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                    />
                  </div>

                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#141621] text-xs text-[#e6e9f2] px-3 py-2 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | StoryStatus)}
                    className="bg-[#141621] text-xs text-[#e6e9f2] px-3 py-2 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Story Management List */}
                <div className="bg-[#1d202e] rounded-xl divide-y divide-[#282c3f]">
                  {loadingStories ? (
                    <div className="p-8 text-center text-sm text-[#9ea4b8]">
                      Loading stories from Firestore...
                    </div>
                  ) : filteredStories.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#9ea4b8]">
                      No stories match the current filters.
                    </div>
                  ) : (
                    visibleAdminStories.map((story) => (
                      <div
                        key={story.id}
                        className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {story.coverImageURL ? (
                            <img
                              src={story.coverImageURL}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-14 h-11 rounded-md object-cover bg-[#141621] shrink-0"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="w-14 h-11 rounded-md bg-[#141621] border border-[#282c3f] flex items-center justify-center shrink-0"
                            >
                              <ImageIcon className="w-4 h-4 text-[#5f657c]" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {story.title}
                            </p>
                            <p className="mt-0.5 text-xs text-[#9ea4b8] line-clamp-1">
                              {story.excerpt}
                            </p>
                            <p className="mt-1 text-[11px] text-[#8c92a6] tabular-nums">
                              {story.status === 'draft' ? 'Draft' : 'Published'} · {story.authorName} ·{' '}
                              {story.chapterCount} {story.chapterCount === 1 ? 'part' : 'parts'} ·{' '}
                              {formatCompactViews(story.views)} views ·{' '}
                              {formatRelativeTime(story.updatedAtMs)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            aria-label={`Change category for ${story.title}`}
                            disabled={busyStoryId === story.id}
                            value={story.category}
                            onChange={(e) =>
                              void handleQuickCategoryChange(story.id, e.target.value)
                            }
                            className="bg-[#141621] text-xs text-[#e6e9f2] px-2.5 py-1.5 rounded-lg border border-[#2d3248] focus:border-[#8d64cc] focus:outline-none cursor-pointer disabled:opacity-50"
                          >
                            {allCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={busyStoryId === story.id}
                            onClick={() => void openEditStoryEditor(story)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteStoryId === story.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busyStoryId === story.id}
                                onClick={() => void handleConfirmDeleteStory(story.id)}
                                className="px-2.5 py-1.5 text-xs font-medium bg-[#7f1d1d] hover:bg-[#991b1b] text-white rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStoryId(null)}
                                className="px-2.5 py-1.5 text-xs font-medium bg-[#141621] text-[#b2b6c7] rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={busyStoryId === story.id}
                              onClick={() => setConfirmDeleteStoryId(story.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#2e1b24] border border-[#4a2632] text-[#f28b9c] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {adminTotalPages > 1 && (
                  <div className="flex items-center justify-between bg-[#1d202e] rounded-xl px-4 py-3 text-xs text-[#b2b6c7]">
                    <span className="tabular-nums">
                      Page {safeAdminPage} of {adminTotalPages} ({filteredStories.length} stories)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={safeAdminPage <= 1}
                        onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-white rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={safeAdminPage >= adminTotalPages}
                        onClick={() => setAdminPage((p) => Math.min(adminTotalPages, p + 1))}
                        className="px-3 py-1.5 bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-white rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : activeTab === 'import' ? (
              /* Bulk JSON Story Importer (Supports 600+ Stories & Branches) */
              <section className="max-w-4xl space-y-6">
                <div className="bg-[#1d202e] rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        Bulk JSON Story Importer
                      </h2>
                      <p className="mt-1 text-xs text-[#9ea4b8] leading-relaxed">
                        Upload a <code className="text-[#d5d9e6]">.json</code> file containing an
                        array of stories (supports 600+ stories per file) with{' '}
                        <code className="text-[#d5d9e6]">title</code>,{' '}
                        <code className="text-[#d5d9e6]">image</code>,{' '}
                        <code className="text-[#d5d9e6]">category</code>, and{' '}
                        <code className="text-[#d5d9e6]">branches</code> (or{' '}
                        <code className="text-[#d5d9e6]">chapters</code> /{' '}
                        <code className="text-[#d5d9e6]">parts</code> /{' '}
                        <code className="text-[#d5d9e6]">story</code>). Each entry is validated and
                        uploaded to Firestore as an individual story with all of its branches.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={importingJson}
                        onClick={handleLoadSampleJson}
                        className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Load Sample JSON
                      </button>
                      {rawJsonText.trim() && (
                        <button
                          type="button"
                          disabled={importingJson}
                          onClick={handleClearJsonImport}
                          className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#2e1b24] border border-[#4a2632] text-[#f28b9c] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File Upload Picker */}
                  <div>
                    <label
                      htmlFor="admin-json-file-input"
                      className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                    >
                      Select JSON File (.json)
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#141621] border border-[#2a2e42] rounded-lg p-3.5">
                      <input
                        ref={fileInputRef}
                        id="admin-json-file-input"
                        type="file"
                        accept=".json,application/json"
                        disabled={importingJson}
                        onChange={(e) => void handleJsonFileChange(e)}
                        className="text-xs text-[#d5d9e6] file:mr-3 file:px-3.5 file:py-1.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#8d64cc] file:text-white hover:file:bg-[#7d54be] file:cursor-pointer cursor-pointer"
                      />
                      {jsonFileName && (
                        <span className="text-xs text-[#9ea4b8] truncate">
                          Loaded: <strong className="text-white">{jsonFileName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Import Default Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label
                        htmlFor="import-default-category"
                        className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                      >
                        Fallback Category (if omitted in JSON)
                      </label>
                      <select
                        id="import-default-category"
                        disabled={importingJson}
                        value={importDefaultCategory}
                        onChange={(e) => setImportDefaultCategory(e.target.value)}
                        className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="import-default-status"
                        className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                      >
                        Default Visibility
                      </label>
                      <select
                        id="import-default-status"
                        disabled={importingJson}
                        value={importDefaultStatus}
                        onChange={(e) => setImportDefaultStatus(e.target.value as StoryStatus)}
                        className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
                      >
                        <option value="published">Published (Public)</option>
                        <option value="draft">Draft (Hidden)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2.5 h-[42px] px-3.5 bg-[#141621] rounded-lg border border-[#2a2e42] text-xs text-[#d5d9e6] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={importingJson}
                        checked={skipExistingByTitle}
                        onChange={(e) => setSkipExistingByTitle(e.target.checked)}
                        className="accent-[#8d64cc]"
                      />
                      <span>Skip duplicate story titles</span>
                    </label>
                  </div>

                  {/* Direct JSON Editor / Paste Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="admin-json-textarea"
                        className="text-xs font-medium text-[#c2c6d4]"
                      >
                        JSON Payload (Upload file above or paste JSON directly)
                      </label>
                      <span className="text-xs text-[#8c92a6] tabular-nums">
                        {parsedJsonPreview.stories.length} valid{' '}
                        {parsedJsonPreview.stories.length === 1 ? 'story' : 'stories'} ·{' '}
                        {parsedJsonPreview.totalChapters}{' '}
                        {parsedJsonPreview.totalChapters === 1 ? 'branch' : 'branches'}
                      </span>
                    </div>
                    <textarea
                      id="admin-json-textarea"
                      rows={6}
                      disabled={importingJson}
                      value={rawJsonText}
                      onChange={(e) => {
                        setRawJsonText(e.target.value);
                        setImportSummary(null);
                      }}
                      placeholder='[{"title": "Story Title", "image": "https://...", "category": "Drama", "branches": [{"title": "Part 1", "content": "..."}]}]'
                      className="w-full bg-[#141621] font-mono text-xs text-white placeholder-[#6f758b] px-3.5 py-3 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none leading-relaxed resize-y"
                    />
                  </div>

                  {/* Live Progress Bar During 600+ Upload */}
                  {importProgress && (
                    <div className="bg-[#141621] border border-[#2a2e42] rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">
                          {importingJson
                            ? `Uploading stories to Firestore (${importProgress.processed} / ${importProgress.total})...`
                            : `Finished processing ${importProgress.processed} / ${importProgress.total} stories`}
                        </span>
                        <span className="text-[#b897ee] font-semibold tabular-nums">
                          {importProgress.total > 0
                            ? Math.round((importProgress.processed / importProgress.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#1d202e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3b82f6] transition-all duration-150"
                          style={{
                            width: `${
                              importProgress.total > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (importProgress.processed / importProgress.total) * 100
                                    )
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#9ea4b8] tabular-nums">
                        <span>
                          Uploaded: <strong className="text-[#8de0b6]">{importProgress.uploaded}</strong>
                        </span>
                        <span>
                          Skipped Duplicates:{' '}
                          <strong className="text-white">{importProgress.skippedDuplicates}</strong>
                        </span>
                        <span>
                          Failed: <strong className="text-[#f28b9c]">{importProgress.failed}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Parse Warnings / Skipped Items */}
                  {parsedJsonPreview.skippedReasons.length > 0 && (
                    <div
                      role="alert"
                      className="bg-[#2a1922] border border-[#5a293a] rounded-xl p-4 text-xs text-[#f7a8b6] space-y-1 max-h-36 overflow-y-auto"
                    >
                      <p className="font-semibold text-white">
                        {parsedJsonPreview.skippedCount} item(s) could not be parsed:
                      </p>
                      {parsedJsonPreview.skippedReasons.slice(0, 10).map((reason, idx) => (
                        <p key={idx}>{reason}</p>
                      ))}
                    </div>
                  )}

                  {/* Failure Details from Upload */}
                  {importSummary && importSummary.failureMessages.length > 0 && (
                    <div
                      role="alert"
                      className="bg-[#2a1922] border border-[#5a293a] rounded-xl p-4 text-xs text-[#f7a8b6] space-y-1 max-h-36 overflow-y-auto"
                    >
                      <p className="font-semibold text-white">
                        {importSummary.failureMessages.length} story upload error(s):
                      </p>
                      {importSummary.failureMessages.slice(0, 10).map((msg, idx) => (
                        <p key={idx}>{msg}</p>
                      ))}
                    </div>
                  )}

                  {/* Parsed Preview Table & Action Buttons */}
                  {parsedJsonPreview.stories.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141621] border border-[#262a3d] rounded-lg px-4 py-3">
                        <div className="text-xs text-[#d5d9e6] space-y-0.5">
                          <p>
                            Ready to upload{' '}
                            <strong className="text-white">
                              {parsedJsonPreview.stories.length}
                            </strong>{' '}
                            individual{' '}
                            {parsedJsonPreview.stories.length === 1 ? 'story' : 'stories'} (
                            {parsedJsonPreview.totalChapters} total branches/parts) across{' '}
                            <strong className="text-white">
                              {parsedJsonPreview.detectedCategories.length}
                            </strong>{' '}
                            {parsedJsonPreview.detectedCategories.length === 1
                              ? 'category'
                              : 'categories'}
                            .
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {importingJson ? (
                            <button
                              type="button"
                              onClick={handleStopBulkImport}
                              className="px-4 py-2 text-xs font-medium bg-[#7f1d1d] hover:bg-[#991b1b] text-white rounded-lg transition-colors cursor-pointer"
                            >
                              Stop Upload
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleStartBulkImport()}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                Upload {parsedJsonPreview.stories.length}{' '}
                                {parsedJsonPreview.stories.length === 1 ? 'Story' : 'Stories'} to
                                Firestore
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preview first 10 parsed stories */}
                      <div className="bg-[#141621] border border-[#262a3d] rounded-xl divide-y divide-[#222638] max-h-80 overflow-y-auto">
                        {parsedJsonPreview.stories.slice(0, 10).map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            className="p-3.5 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              {item.coverImageURL ? (
                                <img
                                  src={item.coverImageURL}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-9 rounded object-cover bg-[#1d202e] shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-9 rounded bg-[#1d202e] border border-[#282c3f] flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-3.5 h-3.5 text-[#5f657c]" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">
                                  {idx + 1}. {item.title}
                                </p>
                                <p className="text-[11px] text-[#9ea4b8] line-clamp-1">
                                  {item.excerpt}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 text-[11px] bg-[#1d202e] text-[#c7b3ec] rounded">
                                {item.category}
                              </span>
                              <p className="mt-0.5 text-[11px] text-[#8c92a6] tabular-nums">
                                {item.chapters.length}{' '}
                                {item.chapters.length === 1 ? 'branch' : 'branches'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {parsedJsonPreview.stories.length > 10 && (
                          <div className="p-3 text-center text-xs text-[#8c92a6]">
                            + {parsedJsonPreview.stories.length - 10} more stories ready in this
                            file
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : activeTab === 'categories' ? (
              /* Categories Manager Tab */
              <section className="max-w-3xl space-y-6">
                <form
                  onSubmit={(e) => void handleCreateCategory(e)}
                  className="bg-[#1d202e] rounded-xl p-5 flex flex-col sm:flex-row gap-3"
                >
                  <label htmlFor="new-category-name" className="sr-only">
                    New custom category name
                  </label>
                  <input
                    id="new-category-name"
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.CATEGORY_MAX}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Add a custom category (e.g., Historical, Horror, Sinhala)..."
                    className="flex-1 bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingCategory}
                    className="px-4 py-2.5 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {creatingCategory ? 'Adding...' : 'Add Category'}
                  </button>
                </form>

                {/* Custom Categories Stored in Firestore */}
                <div className="bg-[#1d202e] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white">
                    Custom Categories in Firestore ({customCategories.length})
                  </h2>
                  {customCategories.length === 0 ? (
                    <p className="mt-3 text-xs text-[#9ea4b8]">
                      No custom categories added yet. Create one above to make it selectable across
                      all stories and the sidebar filter.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-[#282c3f]">
                      {customCategories.map((cat) => {
                        const storyCount = allStories.filter((s) => s.category === cat.name).length;
                        const isEditing = editingCategoryId === cat.id;
                        return (
                          <div
                            key={cat.id}
                            className="py-3 flex flex-wrap items-center justify-between gap-3"
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.CATEGORY_MAX}
                                  value={editingCategoryName}
                                  onChange={(e) => setEditingCategoryName(e.target.value)}
                                  className="flex-1 bg-[#141621] text-xs text-white px-3 py-1.5 rounded-lg border border-[#8d64cc] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleSaveCategoryRename(cat.id)}
                                  className="px-3 py-1.5 text-xs font-medium bg-[#3b82f6] text-white rounded-lg cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(null);
                                    setEditingCategoryName('');
                                  }}
                                  className="px-3 py-1.5 text-xs text-[#b2b6c7] bg-[#141621] rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-white">{cat.name}</p>
                                <p className="text-[11px] text-[#8c92a6] tabular-nums">
                                  {storyCount} {storyCount === 1 ? 'story' : 'stories'}
                                </p>
                              </div>
                            )}

                            {!isEditing && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditingCategoryName(cat.name);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#25293b] text-[#e6e9f2] rounded-lg cursor-pointer"
                                >
                                  Rename
                                </button>
                                {confirmDeleteCatId === cat.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteCategory(cat.id)}
                                      className="px-2.5 py-1.5 text-xs font-medium bg-[#7f1d1d] text-white rounded-lg cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteCatId(null)}
                                      className="px-2.5 py-1.5 text-xs text-[#b2b6c7] bg-[#141621] rounded-lg cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCatId(cat.id)}
                                    className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#2e1b24] text-[#f28b9c] rounded-lg cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Built-in Categories */}
                <div className="bg-[#1d202e] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white">Default Categories</h2>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {STORY_CATEGORIES.map((cat) => {
                      const count = allStories.filter((s) => s.category === cat).length;
                      return (
                        <div
                          key={cat}
                          className="bg-[#141621] border border-[#262a3d] rounded-lg px-3 py-2.5"
                        >
                          <p className="text-xs font-medium text-white truncate">{cat}</p>
                          <p className="mt-0.5 text-[11px] text-[#8c92a6] tabular-nums">
                            {count} {count === 1 ? 'story' : 'stories'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : (
              /* SEO Keywords & Metadata Slot */
              <section className="max-w-3xl">
                <form
                  onSubmit={(e) => void handleSaveSeo(e)}
                  noValidate
                  className="bg-[#1d202e] rounded-xl p-6 space-y-5"
                >
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Site SEO Keywords &amp; Meta Tags
                    </h2>
                    <p className="mt-1 text-xs text-[#9ea4b8]">
                      Enter your SEO keywords separated by commas. Saving updates Firestore and
                      applies the keywords live to the site&apos;s{' '}
                      <code className="text-[#d5d9e6]">&lt;meta name=&quot;keywords&quot;&gt;</code>,{' '}
                      <code className="text-[#d5d9e6]">&lt;title&gt;</code>, and description tags.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="admin-seo-keywords" className="text-xs font-medium text-[#c2c6d4]">
                        SEO Keywords (Comma-Separated)
                      </label>
                      <span className="text-xs text-[#8c92a6] tabular-nums">
                        {parsedSeoKeywordList.length}{' '}
                        {parsedSeoKeywordList.length === 1 ? 'keyword' : 'keywords'} ·{' '}
                        {seoKeywordsInput.length}/{BLUEPRINT_LIMITS.SEO_KEYWORDS_MAX}
                      </span>
                    </div>
                    <textarea
                      id="admin-seo-keywords"
                      rows={5}
                      maxLength={BLUEPRINT_LIMITS.SEO_KEYWORDS_MAX}
                      value={seoKeywordsInput}
                      onChange={(e) => setSeoKeywordsInput(e.target.value)}
                      placeholder="walkathawa, sinhala katha, සිංහල කතා, new stories, ..."
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-3 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none leading-relaxed resize-y"
                    />
                  </div>

                  {parsedSeoKeywordList.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#9ea4b8] mb-2">
                        Parsed Keywords Preview ({parsedSeoKeywordList.length})
                      </p>
                      <div className="bg-[#141621] border border-[#262a3d] rounded-lg p-3 flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                        {parsedSeoKeywordList.map((kw) => (
                          <span
                            key={kw}
                            className="px-2.5 py-1 text-xs bg-[#1d202e] text-[#d5d9e6] border border-[#2d3248] rounded-md"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="admin-seo-title" className="text-xs font-medium text-[#c2c6d4]">
                        Site Title (&lt;title&gt; &amp; og:title)
                      </label>
                      <span className="text-xs text-[#8c92a6] tabular-nums">
                        {seoTitle.length}/{BLUEPRINT_LIMITS.SEO_TITLE_MAX}
                      </span>
                    </div>
                    <input
                      id="admin-seo-title"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.SEO_TITLE_MAX}
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="walkathawa — Sinhala & English Stories"
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="admin-seo-description" className="text-xs font-medium text-[#c2c6d4]">
                        Meta Description (&lt;meta name=&quot;description&quot;&gt;)
                      </label>
                      <span className="text-xs text-[#8c92a6] tabular-nums">
                        {seoDescription.length}/{BLUEPRINT_LIMITS.SEO_DESCRIPTION_MAX}
                      </span>
                    </div>
                    <textarea
                      id="admin-seo-description"
                      rows={3}
                      maxLength={BLUEPRINT_LIMITS.SEO_DESCRIPTION_MAX}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Enter site meta description..."
                      className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingSeo}
                      className="px-5 py-2.5 text-xs font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {savingSeo ? 'Saving SEO...' : 'Save & Apply SEO Keywords'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 bg-[#1d202e] rounded-xl p-6 space-y-3">
                  <h2 className="text-sm font-semibold text-white">
                    Google Search Console Indexing Files
                  </h2>
                  <p className="text-xs text-[#9ea4b8]">
                    Submit the sitemap URL below in Google Search Console under Indexing &gt;
                    Sitemaps. It updates automatically as stories are published.
                  </p>
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center justify-between gap-3 bg-[#141621] border border-[#262a3d] rounded-lg px-3.5 py-2.5">
                      <span className="text-[#9ea4b8]">Sitemap</span>
                      <a
                        href="/sitemap.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#60a5fa] hover:underline break-all"
                      >
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/sitemap.xml`
                          : '/sitemap.xml'}
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-[#141621] border border-[#262a3d] rounded-lg px-3.5 py-2.5">
                      <span className="text-[#9ea4b8]">Robots.txt</span>
                      <a
                        href="/robots.txt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#60a5fa] hover:underline break-all"
                      >
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/robots.txt`
                          : '/robots.txt'}
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
