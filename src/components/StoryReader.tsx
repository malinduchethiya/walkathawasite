import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStarterChapters, getStarterComments } from '../data/starterStories';
import {
  addStoryComment,
  deleteStoryComment,
  fetchStoryChapters,
  incrementStoryViews,
  subscribeStoryComments,
} from '../firebase/repository';
import type { Story, StoryChapter, StoryComment } from '../types/story';
import {
  BLUEPRINT_LIMITS,
  estimateReadingMinutes,
  formatChapterTabLabel,
  formatCompactViews,
  formatRelativeTime,
} from '../utils/storyUtils';

interface StoryReaderProps {
  story: Story;
  isBookmarked: boolean;
  onBack: () => void;
  onToggleBookmark: (story: Story) => Promise<void>;
  onEditStory: (story: Story, chapters: StoryChapter[]) => void;
  onDeleteStory: (story: Story) => Promise<void>;
}

export function StoryReader({
  story,
  isBookmarked,
  onBack,
  onToggleBookmark,
  onEditStory,
  onDeleteStory,
}: StoryReaderProps) {
  const { user, profile, signInWithGoogle } = useAuth();
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = Boolean(user && story.source === 'firebase' && user.uid === story.authorId);

  useEffect(() => {
    let active = true;
    setLoadingChapters(true);
    setActiveIndex(0);

    if (story.source === 'starter') {
      setChapters(getStarterChapters(story.id));
      setComments(getStarterComments(story.id));
      setLoadingChapters(false);
      return;
    }

    const load = async () => {
      try {
        const list = await fetchStoryChapters(
          story.id,
          user && user.uid === story.authorId ? user.uid : undefined
        );
        if (active) {
          setChapters(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoadingChapters(false);
        }
      }
    };

    void load();

    if (user?.emailVerified && story.status === 'published') {
      void incrementStoryViews(story.id, story.views);
    }

    const unsubscribe = subscribeStoryComments(
      story.id,
      (items) => {
        if (active) {
          setComments(items);
        }
      },
      (err) => {
        console.error(err);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [story.id, story.source, story.authorId, story.status, user?.uid, user?.emailVerified]);

  const currentChapter = chapters[activeIndex] ?? null;

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    const trimmed = commentBody.trim();
    if (!trimmed) {
      setCommentError('Write a comment before posting.');
      return;
    }
    if (!user || !profile) {
      setCommentError('Sign in to post a comment.');
      return;
    }
    if (story.source !== 'firebase') {
      setComments((prev) => [
        {
          id: `local_${Date.now()}`,
          storyId: story.id,
          authorId: user.uid,
          authorName: profile.displayName,
          body: trimmed,
          status: 'visible',
          createdAtMs: Date.now(),
        },
        ...prev,
      ]);
      setCommentBody('');
      return;
    }

    setSubmittingComment(true);
    try {
      await addStoryComment(story.id, user, profile.displayName, trimmed);
      setCommentBody('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteStory(story);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#b2b6c7] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Stories</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onToggleBookmark(story)}
            aria-pressed={isBookmarked}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-[#8d64cc] border-[#8d64cc] text-white'
                : 'bg-[#1d202e] border-[#2d3248] text-[#d5d9e6] hover:bg-[#25293b]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>

          {isAuthor && (
            <>
              <button
                type="button"
                onClick={() => onEditStory(story, chapters)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1d202e] border border-[#2d3248] text-[#d5d9e6] hover:bg-[#25293b] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1d202e] border border-[#4a2632] text-[#f28b9c] hover:bg-[#2e1b24] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <header className="bg-[#1d202e] rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#b2b6c7]">
          <span className="text-[#b897ee] font-medium">{story.category}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {formatRelativeTime(story.createdAtMs)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            {formatCompactViews(story.views)}
          </span>
          {currentChapter && (
            <>
              <span aria-hidden="true">·</span>
              <span>{estimateReadingMinutes(currentChapter.content)} min read</span>
            </>
          )}
        </div>

        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white leading-tight [text-wrap:balance]">
          {story.title}
        </h1>
        <p className="mt-3 text-sm text-[#b2b6c7] leading-relaxed">{story.excerpt}</p>
        <p className="mt-4 text-xs text-[#9ea4b8]">By {story.authorName}</p>
      </header>

      {/* Chapter Components Switcher */}
      {chapters.length > 1 && (
        <nav aria-label="Story chapters" className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
          {chapters.map((chapter, idx) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                idx === activeIndex
                  ? 'bg-[#8d64cc] text-white'
                  : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white hover:bg-[#25293b]'
              }`}
            >
              {formatChapterTabLabel(chapter.chapterNumber, chapter.title)}
            </button>
          ))}
        </nav>
      )}

      {/* Chapter Prose Body */}
      <div className="mt-6 bg-[#1d202e] rounded-xl p-6 sm:p-8">
        {loadingChapters ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-48 bg-[#282c3f] rounded" />
            <div className="h-4 w-full bg-[#282c3f] rounded" />
            <div className="h-4 w-5/6 bg-[#282c3f] rounded" />
          </div>
        ) : currentChapter ? (
          <>
            <h2 className="text-lg font-semibold text-white">{currentChapter.title}</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-[1.8] text-[#dde1ee] whitespace-pre-line">
              {currentChapter.content}
            </div>

            {chapters.length > 1 && (
              <div className="mt-8 pt-6 border-t border-[#2a2e42] flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#141621] text-[#d5d9e6] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Previous Part</span>
                </button>
                <span className="text-xs text-[#9ea4b8] tabular-nums">
                  {activeIndex + 1} / {chapters.length}
                </span>
                <button
                  type="button"
                  disabled={activeIndex >= chapters.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(chapters.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#141621] text-[#d5d9e6] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next Part</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#9ea4b8]">No chapters available for this story yet.</p>
        )}
      </div>

      {/* Reader Comments Component */}
      <section className="mt-8 bg-[#1d202e] rounded-xl p-6 sm:p-8">
        <h2 className="text-base font-semibold text-white">
          Comments ({comments.length})
        </h2>

        {user ? (
          <form onSubmit={(e) => void handleCommentSubmit(e)} className="mt-4">
            <label htmlFor="comment-input" className="sr-only">
              Add a comment
            </label>
            <textarea
              id="comment-input"
              rows={3}
              maxLength={BLUEPRINT_LIMITS.COMMENT_MAX}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a note about this story..."
              className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] p-3.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none resize-y"
            />
            {commentError && (
              <p className="mt-2 text-xs text-[#f28b9c]" role="alert">
                {commentError}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#8c92a6] tabular-nums">
                {commentBody.length}/{BLUEPRINT_LIMITS.COMMENT_MAX}
              </span>
              <button
                type="submit"
                disabled={submittingComment}
                className="px-4 py-2 text-xs font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#141621] rounded-lg px-4 py-3 border border-[#262a3d]">
            <p className="text-xs text-[#a7acbe]">Sign in with Google to leave a comment.</p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-3.5 py-1.5 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-[#8c92a6]">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="pt-4 border-t border-[#282c3f] flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-white">{comment.authorName}</span>
                    <span className="text-[#8c92a6]">
                      {formatRelativeTime(comment.createdAtMs)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-[#cfd3e1] leading-relaxed break-words">
                    {comment.body}
                  </p>
                </div>
                {user &&
                  story.source === 'firebase' &&
                  (user.uid === comment.authorId || user.uid === story.authorId) && (
                    <button
                      type="button"
                      onClick={() => void deleteStoryComment(story.id, comment.id)}
                      aria-label={`Delete comment by ${comment.authorName}`}
                      className="text-xs text-[#8c92a6] hover:text-[#f28b9c] shrink-0 cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
}
