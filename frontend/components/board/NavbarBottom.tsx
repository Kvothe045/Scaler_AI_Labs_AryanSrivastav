'use client';

import { Inbox, CalendarDays, LayoutTemplate, MonitorUp } from 'lucide-react';

interface Props {
  onSwitchBoardsClick: () => void;
}

export default function NavbarBottom({ onSwitchBoardsClick }: Props) {
  return (
    <div className="fixed bottom-6 left-[calc(50%+130px)] -translate-x-1/2 z-40">
      <div className="bg-[#282e33] border border-white/10 shadow-2xl rounded-xl flex items-center p-1.5 gap-1 backdrop-blur-md">
        
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9fadbc] hover:bg-white/5 hover:text-white rounded-lg transition-colors">
          <Inbox size={16} />
          Inbox
        </button>
        
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9fadbc] hover:bg-white/5 hover:text-white rounded-lg transition-colors">
          <CalendarDays size={16} />
          Planner
        </button>
        
        {/* Active Tab */}
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-lg transition-colors">
          <LayoutTemplate size={16} />
          Board
        </button>
        
        <div className="w-[1px] h-5 bg-white/10 mx-1" />
        
        <button 
          onClick={onSwitchBoardsClick}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9fadbc] hover:bg-white/5 hover:text-white rounded-lg transition-colors"
        >
          <MonitorUp size={16} />
          Switch boards
        </button>

      </div>
    </div>
  );
}