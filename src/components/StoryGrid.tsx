import { useEffect, useState, type ReactNode } from 'react';
import type { Story, StoryCategory } from '../types/story';
import { STORIES_PER_PAGE, paginateStories } from '../utils/storyUtils';
import { StoryCard } from './StoryCard';

interface StoryGridProps {
  stories: Story[];
  loading: boolean;
  selectedCategory: StoryCategory | 'All';
  searchQuery: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  showClearAction?: boolean;
  onClearFilters?: () => void;
  onOpenStory: (story: Story) => void;
}

export function StoryGrid({
  stories,
  loading,
  selectedCategory,
  searchQuery,
  emptyTitle = 'No stories found',
  emptyDescription = 'Try adjusting your search query or selecting another category.',
  emptyAction,
  showClearAction = true,
  onClearFilters,
  onOpenStory,
}: StoryGridProps) {
  const [page, setPage] = useState(1);
  const isFiltered = selectedCategory !== 'All' || searchQuery.trim() !== '';

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery, stories.length]);

  const { items: pageStories, currentPage, totalPages } = paginateStories(
    stories,
    page,
    STORIES_PER_PAGE
  );

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="max-w-[1380px] mx-auto px-4 sm:px-6 pt-9 pb-16">
      {showClearAction && isFiltered && onClearFilters && (
        <div className="mb-7 flex items-center justify-between gap-3 text-xs text-[#a7acbe]">
          <span>
            {selectedCategory !== 'All' ? `Category: ${selectedCategory}` : 'All Categories'}
            {searchQuery.trim() ? ` · Search: “${searchQuery.trim()}”` : ''}
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[#3b82f6] hover:text-[#60a5fa] font-medium cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div
          data-testid="story-grid-loading"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 pt-2"
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[218px] rounded-xl bg-[#1d202e] animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div
          data-testid="story-grid-empty"
          className="bg-[#1d202e] rounded-xl px-6 py-14 text-center max-w-lg mx-auto"
        >
          <p className="text-base font-semibold text-white">{emptyTitle}</p>
          <p className="mt-1.5 text-sm text-[#9ea4b8] leading-relaxed">{emptyDescription}</p>
          {showClearAction && isFiltered && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-5 px-4 py-2 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          ) : (
            emptyAction && <div className="mt-5">{emptyAction}</div>
          )}
        </div>
      ) : (
        <>
          <div
            data-testid="story-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 pt-2"
          >
            {pageStories.map((story) => (
              <StoryCard key={story.id} story={story} onOpenStory={onOpenStory} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Gallery pages"
              className="mt-12 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1d202e] text-[#d5d9e6] hover:bg-[#25293b] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 text-xs text-[#9ea4b8] tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1d202e] text-[#d5d9e6] hover:bg-[#25293b] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
