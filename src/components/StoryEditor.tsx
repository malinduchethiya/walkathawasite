import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveStoryWithChapters } from '../firebase/repository';
import type {
  ChapterDraftInput,
  Story,
  StoryCategory,
  StoryChapter,
  StoryStatus,
} from '../types/story';
import { BLUEPRINT_LIMITS, validateStoryInput } from '../utils/storyUtils';

interface StoryEditorProps {
  categories: string[];
  editingStory: Story | null;
  editingChapters: StoryChapter[];
  onSaved: (storyId: string) => void;
  onCancel: () => void;
}

export function StoryEditor({
  categories,
  editingStory,
  editingChapters,
  onSaved,
  onCancel,
}: StoryEditorProps) {
  const { user, profile, signInWithGoogle } = useAuth();

  const [title, setTitle] = useState(editingStory?.title ?? '');
  const [category, setCategory] = useState<StoryCategory>(
    editingStory?.category ?? categories[0] ?? 'Drama'
  );
  const [coverImageURL, setCoverImageURL] = useState(editingStory?.coverImageURL ?? '');
  const [status, setStatus] = useState<StoryStatus>(editingStory?.status ?? 'published');
  const [excerpt, setExcerpt] = useState(editingStory?.excerpt ?? '');
  const [chapters, setChapters] = useState<ChapterDraftInput[]>(() =>
    editingChapters.length > 0
      ? editingChapters.map((c) => ({
          id: c.id,
          title: c.title,
          content: c.content,
          imageURL: c.imageURL ?? '',
        }))
      : [{ title: 'Part 1', content: '', imageURL: '' }]
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddChapter = () => {
    setChapters((prev) => [
      ...prev,
      { title: `Part ${prev.length + 1}`, content: '', imageURL: '' },
    ]);
  };

  const handleRemoveChapter = (index: number) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((_, idx) => idx !== index));
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateStoryInput({
      title,
      excerpt,
      category,
      coverImageURL,
      status,
      chapters,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user || !profile) {
      setErrors(['Sign in with Google to save and publish your story to Firebase.']);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const savedId = await saveStoryWithChapters(
        user,
        profile,
        { title, excerpt, category, coverImageURL, status, chapters },
        editingStory?.id
      );
      onSaved(savedId);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Unable to save story.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-white">
          {editingStory ? 'Edit Story' : 'Write a Story'}
        </h1>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#9ea4b8] hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {!user && (
        <div className="mb-6 bg-[#1d202e] border border-[#2d3248] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#c2c6d4]">
            Sign in with Google to publish stories and chapters directly to Firebase.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-4 py-2 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-6">
        {errors.length > 0 && (
          <div
            role="alert"
            className="bg-[#2a1922] border border-[#5a293a] rounded-xl p-4 text-sm text-[#f7a8b6]"
          >
            <p className="font-medium text-white mb-1">Please fix the following:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-[#1d202e] rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="story-title" className="text-xs font-medium text-[#c2c6d4]">
                Story Title
              </label>
              <span className="text-xs text-[#8c92a6] tabular-nums">
                {title.length}/{BLUEPRINT_LIMITS.STORY_TITLE_MAX}
              </span>
            </div>
            <input
              id="story-title"
              type="text"
              maxLength={BLUEPRINT_LIMITS.STORY_TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter story title"
              className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="story-category" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                Category
              </label>
              <select
                id="story-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as StoryCategory)}
                className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="story-status" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                Visibility
              </label>
              <select
                id="story-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StoryStatus)}
                className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
              >
                <option value="published">Published (Visible in Grid)</option>
                <option value="draft">Draft (Only You)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="story-cover-image" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
              Cover Image URL (Optional)
            </label>
            <input
              id="story-cover-image"
              type="url"
              maxLength={BLUEPRINT_LIMITS.IMAGE_URL_MAX}
              value={coverImageURL}
              onChange={(e) => setCoverImageURL(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="story-excerpt" className="text-xs font-medium text-[#c2c6d4]">
                Card Excerpt
              </label>
              <span className="text-xs text-[#8c92a6] tabular-nums">
                {excerpt.length}/{BLUEPRINT_LIMITS.STORY_EXCERPT_MAX}
              </span>
            </div>
            <textarea
              id="story-excerpt"
              rows={2}
              maxLength={BLUEPRINT_LIMITS.STORY_EXCERPT_MAX}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary shown on the grid card (10–320 characters)"
              className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Chapters / Story Components */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Chapters ({chapters.length})
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
            <div key={idx} className="bg-[#1d202e] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#b897ee]">
                  Part {idx + 1}
                </span>
                {chapters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChapter(idx)}
                    aria-label={`Remove Part ${idx + 1}`}
                    className="inline-flex items-center gap-1 text-xs text-[#9ea4b8] hover:text-[#f28b9c] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor={`chapter-title-${idx}`}
                  className="block text-xs font-medium text-[#c2c6d4] mb-1.5"
                >
                  Part Heading
                </label>
                <input
                  id={`chapter-title-${idx}`}
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.CHAPTER_TITLE_MAX}
                  value={chapter.title}
                  onChange={(e) => handleChapterChange(idx, 'title', e.target.value)}
                  placeholder={`Part ${idx + 1} title`}
                  className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={`chapter-content-${idx}`}
                    className="text-xs font-medium text-[#c2c6d4]"
                  >
                    Story Text
                  </label>
                  <span className="text-xs text-[#8c92a6] tabular-nums">
                    {chapter.content.length}/{BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX}
                  </span>
                </div>
                <textarea
                  id={`chapter-content-${idx}`}
                  rows={7}
                  maxLength={BLUEPRINT_LIMITS.CHAPTER_CONTENT_MAX}
                  value={chapter.content}
                  onChange={(e) => handleChapterChange(idx, 'content', e.target.value)}
                  placeholder="Write chapter text here (minimum 20 characters)..."
                  className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-3 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none leading-relaxed resize-y"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-[#b2b6c7] hover:text-white bg-[#1d202e] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : editingStory
                ? 'Update Story'
                : status === 'published'
                  ? 'Publish Story'
                  : 'Save Draft'}
          </button>
        </div>
      </form>
    </section>
  );
}
