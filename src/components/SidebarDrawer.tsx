import { useEffect } from 'react';
import { Search, X } from 'lucide-react';
import {
  STORY_CATEGORIES,
  type SortOption,
  type StoryCategory,
} from '../types/story';
import type { AppView } from './Header';

interface SidebarDrawerProps {
  open: boolean;
  activeView: AppView;
  savedCount: number;
  selectedCategory: StoryCategory | 'All';
  searchQuery: string;
  sortBy: SortOption;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onCategoryChange: (cat: StoryCategory | 'All') => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: SortOption) => void;
}

export function SidebarDrawer({
  open,
  activeView,
  savedCount,
  selectedCategory,
  searchQuery,
  sortBy,
  onClose,
  onNavigate,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: SidebarDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const navItems: { id: AppView; label: string }[] = [
    { id: 'stories', label: 'Stories' },
    { id: 'write', label: 'Write' },
    { id: 'saved', label: savedCount > 0 ? `Saved (${savedCount})` : 'Saved' },
    { id: 'profile', label: 'Profile' },
  ];

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const handleCategorySelect = (cat: StoryCategory | 'All') => {
    onCategoryChange(cat);
    if (activeView !== 'stories') {
      onNavigate('stories');
    }
  };

  const hasActiveFilters = selectedCategory !== 'All' || searchQuery.trim() !== '';

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close sidebar"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 cursor-default"
      />

      {/* Right Slide-Out Sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and filters"
        className={`absolute top-0 right-0 h-full w-80 max-w-[86vw] bg-[#181b28] border-l border-[#262a3d] flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-14 sm:h-16 px-5 border-b border-[#25293b] flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 text-[#9ea4b8] hover:text-white hover:bg-[#232738] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Navigation Links (Moved from header nav) */}
          <nav aria-label="Primary" className="space-y-1">
            <p className="text-xs font-medium text-[#8c92a6] mb-2">Navigation</p>
            {navItems.map((item) => {
              const isActive =
                activeView === item.id || (item.id === 'stories' && activeView === 'read');
              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#8d64cc] text-white'
                      : 'text-[#cfd3e1] hover:text-white hover:bg-[#222637]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Search & Sort (Moved from StoryGrid) */}
          <div className="space-y-3 pt-5 border-t border-[#25293b]">
            <p className="text-xs font-medium text-[#8c92a6]">Search &amp; Sort</p>
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#8c92a6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                tabIndex={open ? 0 : -1}
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'stories') {
                    onNavigate('stories');
                  }
                }}
                placeholder="Search stories or authors..."
                aria-label="Search stories or authors"
                className="w-full bg-[#141621] text-sm text-white placeholder-[#7f859b] pl-9 pr-3 py-2.5 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sidebar-story-sort" className="text-xs text-[#9ea4b8]">
                Sort by
              </label>
              <select
                id="sidebar-story-sort"
                tabIndex={open ? 0 : -1}
                value={sortBy}
                onChange={(e) => {
                  onSortChange(e.target.value as SortOption);
                  if (activeView !== 'stories') {
                    onNavigate('stories');
                  }
                }}
                className="flex-1 bg-[#141621] text-sm text-[#e6e9f2] px-3 py-2 rounded-lg border border-[#2a2e42] focus:border-[#8d64cc] focus:outline-none cursor-pointer"
              >
                <option value="newest">Latest</option>
                <option value="popular">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Categories (Moved from StoryGrid) */}
          <div className="space-y-3 pt-5 border-t border-[#25293b]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#8c92a6]">Categories</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => {
                    onCategoryChange('All');
                    onSearchChange('');
                  }}
                  className="text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => handleCategorySelect('All')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[#8d64cc] text-white'
                    : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white hover:bg-[#25293b]'
                }`}
              >
                All
              </button>
              {STORY_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[#8d64cc] text-white'
                      : 'bg-[#1d202e] text-[#b2b6c7] hover:text-white hover:bg-[#25293b]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
