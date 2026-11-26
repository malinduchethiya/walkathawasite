import { Menu } from 'lucide-react';

export type AppView = 'stories' | 'read' | 'write' | 'saved' | 'profile';

interface HeaderProps {
  sidebarOpen: boolean;
  onNavigate: (view: AppView) => void;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onNavigate, onToggleSidebar }: HeaderProps) {
  return (
    <header className="border-b border-[#222638] bg-[#141621]">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('stories')}
          className="text-[16px] sm:text-[17px] font-bold tracking-tight text-white hover:text-[#c7b3ec] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8d64cc] rounded"
        >
          walkathawa
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open menu"
          aria-expanded={sidebarOpen}
          className="p-2 text-[#d5d9e6] hover:text-white bg-[#1d202e] hover:bg-[#262a3d] border border-[#2d3248] rounded-lg transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8d64cc]"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
