import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteStoryWithChapters,
  fetchStoryChapters,
  seedStarterStoriesToFirestore,
} from '../firebase/repository';
import type { Story, StoryChapter } from '../types/story';
import {
  BLUEPRINT_LIMITS,
  formatCompactViews,
  formatRelativeTime,
  validateProfileInput,
} from '../utils/storyUtils';

interface ProfileViewProps {
  userStories: Story[];
  existingStoryIds: Set<string>;
  onOpenStory: (story: Story) => void;
  onEditStory: (story: Story, chapters: StoryChapter[]) => void;
  onWriteNew: () => void;
}

export function ProfileView({
  userStories,
  existingStoryIds,
  onOpenStory,
  onEditStory,
  onWriteNew,
}: ProfileViewProps) {
  const {
    user,
    profile,
    privateInfo,
    authLoading,
    authError,
    signInWithGoogle,
    signOutUser,
    saveProfile,
  } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [busyStoryId, setBusyStoryId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setHandle(profile.handle);
      setBio(profile.bio);
    }
  }, [profile]);

  if (!user || !profile) {
    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 pt-16 pb-20">
        <div className="bg-[#1d202e] rounded-xl p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Sign in to walkathawa</h1>
          <p className="mt-2.5 text-sm text-[#a7acbe] leading-relaxed">
            Connect your Google account to manage your author profile, publish stories with
            chapters, and sync saved bookmarks with Firebase.
          </p>
          {authError && (
            <p className="mt-4 text-xs text-[#f28b9c]" role="alert">
              {authError}
            </p>
          )}
          <button
            type="button"
            disabled={authLoading}
            onClick={() => void signInWithGoogle()}
            className="mt-6 w-full px-4 py-2.5 text-sm font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {authLoading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      </section>
    );
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    const errors = validateProfileInput({ displayName, handle, bio });
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setSaving(true);
    try {
      await saveProfile({
        displayName,
        handle,
        bio,
        photoURL: profile.photoURL,
      });
      setSaveMessage('Profile updated in Firebase.');
    } catch (err) {
      setFormErrors([err instanceof Error ? err.message : 'Unable to save profile.']);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedStarterStories = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const count = await seedStarterStoriesToFirestore(
        user,
        profile,
        existingStoryIds,
        (done, total) => setSeedMessage(`Syncing to Firestore (${done}/${total})...`)
      );
      setSeedMessage(
        count > 0
          ? `Uploaded ${count} stories and their chapters into Firestore /stories.`
          : 'All starter stories are already synced in Firestore.'
      );
    } catch (err) {
      setSeedMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSeeding(false);
    }
  };

  const handleEdit = async (story: Story) => {
    setBusyStoryId(story.id);
    try {
      const chapters = await fetchStoryChapters(story.id, user.uid);
      onEditStory(story, chapters);
    } finally {
      setBusyStoryId(null);
    }
  };

  const handleDelete = async (story: Story) => {
    setBusyStoryId(story.id);
    try {
      await deleteStoryWithChapters(story.id, user.uid);
    } finally {
      setBusyStoryId(null);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-8">
      <div className="bg-[#1d202e] rounded-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Author Profile</h1>
            <p className="mt-1 text-xs text-[#9ea4b8]">
              Private email ({privateInfo?.email ?? user.email}) is isolated from public story cards.
            </p>
          </div>
          <button
            type="button"
            disabled={authLoading}
            onClick={() => void signOutUser()}
            className="px-3.5 py-2 text-xs font-medium text-[#e6e9f2] bg-[#141621] hover:bg-[#262a3d] border border-[#2d3248] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            Sign Out
          </button>
        </div>

        <form onSubmit={(e) => void handleSaveProfile(e)} noValidate className="mt-6 space-y-4">
          {formErrors.length > 0 && (
            <div
              role="alert"
              className="bg-[#2a1922] border border-[#5a293a] rounded-lg p-3.5 text-xs text-[#f7a8b6] space-y-1"
            >
              {formErrors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          {saveMessage && (
            <p className="text-xs text-[#8de0b6]" role="status">
              {saveMessage}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="profile-handle" className="block text-xs font-medium text-[#c2c6d4] mb-1.5">
                Handle
              </label>
              <input
                id="profile-handle"
                type="text"
                maxLength={BLUEPRINT_LIMITS.HANDLE_MAX}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full bg-[#141621] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="profile-bio" className="text-xs font-medium text-[#c2c6d4]">
                Bio
              </label>
              <span className="text-xs text-[#8c92a6] tabular-nums">
                {bio.length}/{BLUEPRINT_LIMITS.BIO_MAX}
              </span>
            </div>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={BLUEPRINT_LIMITS.BIO_MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief bio..."
              className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] px-3.5 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none resize-y"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* User's Authored Stories */}
      <div className="bg-[#1d202e] rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">
            Your Stories ({userStories.length})
          </h2>
          <div className="flex items-center gap-2">
            {existingStoryIds.size < 40 && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedStarterStories()}
                className="px-3.5 py-2 text-xs font-medium bg-[#141621] hover:bg-[#25293b] border border-[#2d3248] text-[#d5d9e6] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {seeding ? 'Syncing...' : 'Sync 40 Stories to Firestore'}
              </button>
            )}
            <button
              type="button"
              onClick={onWriteNew}
              className="px-3.5 py-2 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer"
            >
              New Story
            </button>
          </div>
        </div>

        {seedMessage && (
          <p className="mt-3 text-xs text-[#8de0b6]" role="status">
            {seedMessage}
          </p>
        )}

        {userStories.length === 0 ? (
          <p className="mt-4 text-sm text-[#9ea4b8]">
            You have not published any stories to Firebase yet.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-[#282c3f]">
            {userStories.map((story) => (
              <div
                key={story.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenStory(story)}
                    className="text-sm font-medium text-white hover:text-[#c7b3ec] text-left truncate block max-w-full cursor-pointer"
                  >
                    {story.title}
                  </button>
                  <p className="mt-1 text-xs text-[#9ea4b8] tabular-nums">
                    {story.category} · {story.status === 'draft' ? 'Draft' : 'Published'} ·{' '}
                    {story.chapterCount} {story.chapterCount === 1 ? 'part' : 'parts'} ·{' '}
                    {formatCompactViews(story.views)} views · {formatRelativeTime(story.updatedAtMs)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyStoryId === story.id}
                    onClick={() => void handleEdit(story)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#25293b] text-[#e6e9f2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyStoryId === story.id}
                    onClick={() => void handleDelete(story)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#141621] hover:bg-[#2e1b24] text-[#f28b9c] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
