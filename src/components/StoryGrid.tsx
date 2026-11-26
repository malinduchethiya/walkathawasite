import type { Story, StoryCategory } from '../types/story';
import { StoryCard } from './StoryCard';

interface StoryGridProps {
  stories: Story[];
  loading: boolean;
  selectedCategory: StoryCategory | 'All';
  searchQuery: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
  showClearAction = true,
  onClearFilters,
  onOpenStory,
}: StoryGridProps) {
  const isFiltered = selectedCategory !== 'All' || searchQuery.trim() !== '';

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
          {Array.from({ length: 8 }).map((_, idx) => (
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
          <p className="mt-1.5 text-sm text-[#9ea4b8]">{emptyDescription}</p>
          {showClearAction && isFiltered && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 px-4 py-2 text-xs font-medium bg-[#8d64cc] hover:bg-[#7d54be] text-white rounded-lg transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div
          data-testid="story-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 pt-2"
        >
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} onOpenStory={onOpenStory} />
          ))}
        </div>
      )}
    </section>
  );
}
