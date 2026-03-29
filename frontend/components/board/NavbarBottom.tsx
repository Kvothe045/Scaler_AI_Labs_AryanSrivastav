// frontend/components/board/NavbarBottom.tsx
'use client';

import { useState } from 'react';
import { Inbox, CalendarDays, LayoutTemplate, MonitorUp, Info } from 'lucide-react';

interface Props {
  /** Triggered when the user wants to open the board switcher modal */
  onSwitchBoardsClick: () => void;
}

/**
 * NavbarBottom Component
 * * A floating navigation bar anchored to the bottom of the screen.
 * * Fully responsive: Centers on mobile (showing only "Switch boards") 
 * and offsets on desktop to accommodate the left sidebar.
 */
export default function NavbarBottom({ onSwitchBoardsClick }: Props) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  /**
   * Triggers a temporary toast notification for features not yet implemented.
   */
  const handleComingSoon = (feature: string) => {
    setToastMsg(`${feature} is under development. Coming soon!`);
    // Clear toast after 3 seconds
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <>
      {/* ── "Coming Soon" Toast Popup ── */}
      <div 
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 md:left-[calc(50%+130px)] z-50 transition-all duration-300 ease-out ${
          toastMsg 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-[#1c2b41] border border-blue-500/30 text-blue-100 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-sm font-medium backdrop-blur-md">
          <Info size={16} className="text-blue-400" />
          {toastMsg}
        </div>
      </div>

      {/* ── Main Floating Navigation ── */}
      {/* Centers naturally on mobile. On medium screens (md:), it shifts right by 130px to align with the rest of the board given a ~260px sidebar. */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-[calc(50%+130px)] z-40">
        <div className="bg-[#282e33]/95 border border-white/10 shadow-2xl rounded-xl flex items-center p-1.5 gap-1 backdrop-blur-md">
          
          {/* Hidden on mobile, visible on desktop */}
          <button 
            onClick={() => handleComingSoon('Inbox')}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9fadbc] hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            <Inbox size={16} />
            Inbox
          </button>
          
          {/* Hidden on mobile, visible on desktop */}
          <button 
            onClick={() => handleComingSoon('Planner')}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9fadbc] hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            <CalendarDays size={16} />
            Planner
          </button>
          
          {/* Hidden on mobile, visible on desktop */}
          <button 
            // onClick={() => handleComingSoon('Board Customization')}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <LayoutTemplate size={16} />
            Board
          </button>
          
          {/* Separator: Hidden on mobile */}
          <div className="hidden md:block w-[1px] h-5 bg-white/10 mx-1" />
          
          {/* Always Visible: Switch Boards Button */}
          <button 
            onClick={onSwitchBoardsClick}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 md:text-[#9fadbc] md:bg-transparent md:hover:bg-white/5 md:hover:text-white rounded-lg transition-colors shadow-lg md:shadow-none"
          >
            <MonitorUp size={16} />
            Switch boards
          </button>

        </div>
      </div>
    </>
  );
}