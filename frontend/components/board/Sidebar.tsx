// frontend/components/board/Sidebar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Inbox, ChevronDown, ChevronRight, Plus, X, 
  Search, LayoutDashboard, Users, Settings, Trash2
} from 'lucide-react';
import { useStore } from '../../store'; 
import { useRouter, useParams } from 'next/navigation';
import * as api from '../../lib/api'; 

type SidebarProps = {
  onClose?: () => void;
};

export default function Sidebar({ onClose }: SidebarProps) {
  const store = useStore() as any;
  const { boards = [], activeBoardId, boardState, refreshBoard, fetchBoards, fetchBoardState } = store;
  
  const router = useRouter();
  const params = useParams();
  
  // 1. Fetch Board ID directly from the URL to guarantee accuracy
  const urlBoardId = params?.boardId ? Number(params.boardId) : null;
  const currentBoardId = urlBoardId || activeBoardId;

  // 2. Navigation State
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Inbox (Quick Add) State
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus inbox textarea
  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAdding]);

  // FORCE FETCH: If URL has a board ID but store doesn't have the state, fetch it so members appear
  useEffect(() => {
    if (urlBoardId && fetchBoardState && (!boardState || boardState.id !== urlBoardId)) {
      fetchBoardState(urlBoardId);
    }
  }, [urlBoardId, boardState?.id, fetchBoardState]);

  const targetList = boardState?.lists?.[0];

  const handleAddCard = async () => {
    if (!title.trim() || saving || !targetList) return;
    setSaving(true);
    
    try {
      const maxPos = targetList.cards?.length 
        ? Math.max(...targetList.cards.map((c: any) => c.position)) 
        : 0;
        
      await api.createCard({ 
        title: title.trim(), 
        list_id: targetList.id, 
        position: maxPos + 1000 
      });
      
      setTitle('');
      setIsAdding(false);
      if (refreshBoard) await refreshBoard();
    } catch (error) {
      console.error("Failed to add card from inbox:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: number, isActive: boolean) => {
    e.stopPropagation(); // Don't trigger the board switch click
    
    if (!confirm('Are you sure you want to delete this board? All lists and cards will be permanently lost.')) {
      return;
    }

    try {
      await api.deleteBoard(id);
      if (fetchBoards) await fetchBoards(); // Refresh the sidebar list
      
      // If we just deleted the board we are currently looking at, boot to home
      if (isActive) {
        router.push('/');
      }
    } catch (error) {
      console.error("Failed to delete board:", error);
      alert("Error deleting board. You may need Owner permissions.");
    }
  };

  const filteredBoards = boards.filter((b: any) => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Safely extract members depending on backend serialization (memberships vs members)
  const membersList = boardState?.memberships || boardState?.members || [];

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      <aside className="w-full h-full bg-[#1d2125] border-r border-white/10 flex flex-col shrink-0 text-[#9fadbc] overflow-hidden">
        
        {/* Workspace Header */}
        <div className="p-4 flex items-center gap-3 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
            W
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-white text-sm font-bold truncate">My Workspace</h2>
            <p className="text-xs text-[#8c9bab] truncate">Free Plan</p>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-3 flex flex-col gap-1">
          
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-blue-400 bg-blue-500/10 font-medium">
            <LayoutDashboard size={16} />
            <span className="text-sm">Boards</span>
          </button>

          {/* Members Accordion */}
          <div 
            className="flex items-center justify-between group cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors text-[#b6c2cf]" 
            onClick={() => setMembersExpanded(!membersExpanded)}
          >
            <div className="flex items-center gap-3">
              <Users size={16} />
              <span className="text-sm font-medium">Members</span>
            </div>
            {membersExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          </div>

          {/* Dynamic Members List */}
          {membersExpanded && (
            <div className="flex flex-col gap-1 pl-9 pr-2 mt-1 mb-2">
              {membersList.length > 0 ? (
                membersList.map((m: any) => {
                  const name = m.user?.name || m.name || m.user?.email || m.email || 'Unknown User';
                  const role = m.role || 'viewer';
                  return (
                    <div key={m.user_id || m.id || name} className="flex items-center justify-between py-1.5 text-xs group cursor-default">
                      <span className="text-[#b6c2cf] truncate pr-2 group-hover:text-white transition-colors" title={name}>
                        {name}
                      </span>
                      <span className="text-[#8c9bab] capitalize shrink-0 font-medium bg-white/5 px-1.5 py-0.5 rounded">
                        ({role})
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[#8c9bab] py-1 italic">
                  {currentBoardId ? "Loading members..." : "Select a board to see members."}
                </div>
              )}
            </div>
          )}

          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-[#b6c2cf]">
            <Settings size={16} />
            <span className="text-sm">Settings</span>
          </button>

          <div className="my-2 border-t border-white/10" />

          {/* Your Boards Accordion */}
          <div 
            className="flex items-center justify-between group cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors" 
            onClick={() => setBoardsExpanded(!boardsExpanded)}
          >
            <span className="text-xs font-semibold text-[#8c9bab] tracking-wider uppercase">Your Boards</span>
            <div className="flex items-center gap-1">
              {boardsExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </div>
          </div>

          {boardsExpanded && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="px-2 mb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8c9bab]" />
                  <input
                    type="text"
                    placeholder="Find boards..."
                    className="w-full bg-[#22272b] text-xs text-white rounded px-7 py-1.5 outline-none border border-transparent focus:border-[#388bff] transition-colors"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredBoards.length === 0 ? (
                <div className="text-xs text-center text-[#8c9bab] py-4">No boards found</div>
              ) : (
                filteredBoards.map((b: any) => {
                  const isActive = b.id === currentBoardId;
                  
                  return (
                    <div key={b.id} className="relative group flex items-center w-full">
                      <button
                        onClick={() => {
                          router.push(`/board/${b.id}`);
                          if (onClose) onClose();
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors w-full ${
                          isActive 
                            ? 'bg-blue-500/10 text-blue-400 font-medium' 
                            : 'text-[#b6c2cf] hover:bg-white/5'
                        }`}
                      >
                        <div 
                          className="w-6 h-5 rounded-[3px] flex-shrink-0 shadow-sm relative overflow-hidden" 
                          style={{ background: b.background_color || '#0079bf' }}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        {/* pr-8 creates space so text doesn't overlap the delete icon */}
                        <span className="truncate flex-1 pr-8">{b.title}</span>
                      </button>

                      {/* Delete Board Button (Visible on Hover) */}
                      <button
                        onClick={(e) => handleDeleteBoard(e, b.id, isActive)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-[#f87168] hover:bg-[#f87168]/20 rounded transition-all"
                        title="Delete Board"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sticky Quick Add (Inbox) Footer */}
        <div className="p-4 border-t border-white/10 bg-[#161a1d] shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8c9bab] tracking-wider uppercase mb-3">
            <Inbox size={14} className="text-[#8c9bab]" />
            Quick Drop Inbox
          </div>

          {isAdding ? (
            <div className="bg-[#22272b] border border-[#388bff] rounded-lg p-2 shadow-sm">
              <textarea
                ref={textareaRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCard();
                  }
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setTitle('');
                  }
                }}
                placeholder="What needs to be done?"
                className="w-full bg-transparent text-[#b6c2cf] text-sm resize-none outline-none placeholder:text-[#8c9bab]"
                rows={3}
              />
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={handleAddCard}
                  disabled={!title.trim() || saving || !targetList}
                  className="bg-[#0c66e4] hover:bg-[#0055cc] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
                <button 
                  onClick={() => { setIsAdding(false); setTitle(''); }}
                  className="p-1 hover:bg-white/10 rounded text-[#9fadbc] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {!targetList && (
                <div className="text-[11px] text-red-400 mt-2 font-medium leading-tight">
                  Open a board with at least one list first to use the Quick Drop.
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full text-left bg-[#22272b] border border-[#a6c5e229] rounded-lg p-3 hover:border-white/30 cursor-pointer transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus size={16} className="text-[#8c9bab]" />
              <span className="text-[#8c9bab] text-sm font-medium">Drop a thought here...</span>
            </button>
          )}
        </div>

      </aside>
    </>
  );
}