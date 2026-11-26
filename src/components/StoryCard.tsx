import { useState } from 'react';
import { Clock, Eye, User as UserIcon } from 'lucide-react';
import type { Story } from '../types/story';
import { formatCompactViews, formatRelativeTime } from '../utils/storyUtils';

interface StoryCardProps {
  story: Story;
  onOpenStory: (story: Story) => void;
}

export function StoryCard({ story, onOpenStory }: StoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  return (
    <article className="relative bg-[#1d202e] hover:bg-[#222637] transition-colors duration-150 rounded-xl pt-8 pb-5 px-5 flex flex-col min-h-[218px]">
      {/* Top-center overlapping category badge matching the reference layout */}
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8d64cc] text-white text-[12px] font-medium px-4 py-1 rounded-full whitespace-nowrap leading-snug select-none max-w-[85%] truncate">
        {story.category}
      </span>

      {/* Optional cover image when added by admin/author */}
      {story.coverImageURL && !coverError && (
        <div className="mb-3.5 rounded-lg overflow-hidden bg-[#141621] aspect-[16/9]">
          <img
            src={story.coverImageURL}
            alt={story.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setCoverError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Centered timestamp and views row */}
      <div className="flex items-center justify-center gap-4 text-[12px] text-[#c2c6d4]">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-[#a4a9bc] shrink-0" aria-hidden="true" />
          <span>{formatRelativeTime(story.createdAtMs)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
          <Eye className="w-3.5 h-3.5 text-[#a4a9bc] shrink-0" aria-hidden="true" />
          <span>{formatCompactViews(story.views)}</span>
        </span>
      </div>

      {/* Centered story title */}
      <h2 className="mt-3.5 text-center">
        <button
          type="button"
          onClick={() => onOpenStory(story)}
          className="text-[17px] leading-[1.38] font-semibold text-white hover:text-[#d5c5f2] transition-colors line-clamp-2 text-center [text-wrap:balance] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8d64cc] rounded"
        >
          {story.title}
        </button>
      </h2>

      {/* Centered story excerpt */}
      <p className="mt-2 text-[13px] leading-[1.55] text-[#b2b6c7] text-center line-clamp-3">
        {story.excerpt}
      </p>

      {/* Bottom author & Read More row */}
      <div className="mt-auto pt-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#0b0d14] flex items-center justify-center shrink-0 overflow-hidden">
            {story.authorPhotoURL && !imgError ? (
              <img
                src={story.authorPhotoURL}
                alt={story.authorName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-[#0b0d14] fill-[#2e3244]" aria-hidden="true" />
            )}
          </div>
          <span className="text-[13px] font-medium text-[#e5e8f1] truncate">
            {story.authorName}
          </span>
          {story.authorVerified && (
            <svg
              className="w-3.5 h-3.5 shrink-0 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-label="Verified author"
            >
              <path
                fillRule="evenodd"
                d="M10 1.5l2.1 1.6 2.6-.3 1.2 2.4 2.3 1.2-.3 2.6 1.6 2.1-1.6 2.1.3 2.6-2.3 1.2-1.2 2.4-2.6-.3L10 18.5l-2.1-1.6-2.6.3-1.2-2.4-2.3-1.2.3-2.6L.5 10l1.6-2.1-.3-2.6 2.3-1.2 1.2-2.4 2.6.3L10 1.5zm3.3 6.8a.75.75 0 00-1.1-1.02L9.25 10.4l-1.45-1.45a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.08-.02l3.48-3.69z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenStory(story)}
          aria-label={`Read More: ${story.title}`}
          className="text-[13px] font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] rounded"
        >
          Read More
        </button>
      </div>
    </article>
  );
}
