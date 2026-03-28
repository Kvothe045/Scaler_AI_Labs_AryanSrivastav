'use client';

import { Inbox, ChevronDown, Chrome } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-[260px] bg-[#1d2125] border-r border-white/10 h-full flex flex-col shrink-0">
      <div className="p-4 flex items-center justify-between text-white hover:bg-white/5 cursor-pointer transition-colors">
        <div className="flex items-center gap-3 font-semibold text-sm tracking-wide">
          <Inbox size={18} className="text-[#9fadbc]" />
          Inbox
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-white/10 rounded"><ChevronDown size={16} className="text-[#9fadbc]" /></button>
          <button className="p-1 hover:bg-white/10 rounded"><span className="text-[#9fadbc] text-lg leading-none tracking-widest -mt-2 block">...</span></button>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="bg-[#22272b] border border-[#a6c5e229] rounded-lg p-3 hover:border-white/30 cursor-pointer transition-colors shadow-sm">
          <div className="text-[#8c9bab] text-sm font-medium mb-8">Add a card</div>
        </div>
      </div>

      <div className="px-4 py-2 mt-2">
        <div className="text-[#8c9bab] text-sm leading-relaxed">
          See it, send it, save it for later<br/>
          ✉️ = 📋
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom Chrome Extension Ad (Matching your screenshot) */}
      <div className="p-4">
        <button className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-2 rounded-lg text-xs font-medium text-[#b6c2cf] transition-colors border border-white/5">
          <div className="flex items-center gap-2">
            <Chrome size={14} className="text-yellow-500" />
            <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1 rounded font-bold">NEW</span>
            Consolidate your to-dos
          </div>
          <ChevronDown size={14} />
        </button>
      </div>
    </aside>
  );
}