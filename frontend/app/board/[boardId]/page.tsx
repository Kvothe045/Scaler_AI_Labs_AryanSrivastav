// frontend/app/board/[boardId]/page.tsx
'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import type { Card, List } from '@/types';

import Sidebar       from '@/components/board/Sidebar';
import Header        from '@/components/board/Header';
import BoardView     from '@/components/board/BoardView';
import NavbarBottom  from '@/components/board/NavbarBottom';
import BoardSwitcher from '@/components/board/BoardSwitcher';
import BoardMenu     from '@/components/board/BoardMenu';
import CardModal     from '@/components/card/CardModal';

export default function BoardPage() {
  const params  = useParams();
  const router  = useRouter();
  const rawId   = params?.boardId;
  const boardId = rawId ? Number(rawId) : null;

  const {
    boardState,
    fetchBoardState,
    setBoardId,
    fetchUsers,
    fetchBoards,
    fetchLabels,
  } = useStore();

  const [isLoading,      setIsLoading]      = useState(true);
  const [isMenuOpen,     setIsMenuOpen]     = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
  const [selectedCard,   setSelectedCard]   = useState<{ card: Card; list: List } | null>(null);

  // Prevent the access-denied handler from firing more than once per mount
  // (fetchBoardState could theoretically be called twice in StrictMode)
  const redirectedRef = useRef(false);

  /**
   * Called by the store when the current user has no access to this board.
   * ownedBoardId is the id of a board the user CAN access (created if needed),
   * or null if something went wrong — in which case fall back to "/".
   *
   * We set isLoading=false here so the spinner stops BEFORE Next.js processes
   * the navigation — avoids a flash of the stuck loading screen.
   */
  const handleAccessDenied = useCallback((ownedBoardId: number | null) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    setIsLoading(false);

    if (ownedBoardId) {
      router.replace(`/board/${ownedBoardId}`);
    } else {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!boardId) return;

    redirectedRef.current = false; // reset on boardId change
    let mounted = true;

    const loadBoardData = async () => {
      setIsLoading(true);
      setBoardId(boardId);

      try {
        // fetchBoardState is first and NOT inside Promise.all because on access
        // denial it must fully resolve (including ensureUserHasBoard + the
        // handleAccessDenied call) before we hit finally and set isLoading=false.
        // If we wrapped it in Promise.all the other calls would race and the
        // finally would run before the redirect callback fires.
        await fetchBoardState(boardId, handleAccessDenied);

        // Only fetch the rest if we're still on this board (not being redirected)
        if (mounted && !redirectedRef.current) {
          await Promise.all([fetchUsers(), fetchBoards(), fetchLabels()]);
        }
      } catch (err) {
        console.error('Failed to load board data:', err);
      } finally {
        // Only drop the spinner if we're not mid-redirect (handleAccessDenied
        // already called setIsLoading(false) in that case)
        if (mounted && !redirectedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadBoardData();

    return () => { mounted = false; };
  }, [boardId, fetchBoardState, fetchUsers, fetchBoards, fetchLabels, setBoardId, handleAccessDenied]);

  if (isLoading || !boardState) {
    return (
      <div style={{
        display: 'flex', height: '100svh', width: '100vw',
        alignItems: 'center', justifyContent: 'center', background: '#1d2125',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '4px solid rgba(166,197,226,0.16)',
          borderTopColor: '#579dff',
          animation: 'spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: boardState.background_color !== 'transparent'
      ? (boardState.background_color || '#89609e')
      : '#1d2125',
    backgroundImage: boardState.background_image
      ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url('${boardState.background_image}')`
      : 'linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.12))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <>
      <style>{`
        .board-sidebar {
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s ease;
          width: 260px;
        }
        .sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          z-index: 299;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        @media (max-width: 768px) {
          .board-sidebar {
            position: fixed !important;
            left: 0; top: 0; bottom: 0;
            z-index: 300;
            transform: translateX(-100%);
            width: 85vw !important;
            max-width: 320px;
          }
          .board-sidebar.open { transform: translateX(0); }
          .sidebar-backdrop.open { display: block; opacity: 1; }
          .board-columns-area { padding-bottom: 60px; }
        }
      `}</style>

      <div style={{
        display: 'flex', height: '100svh', width: '100vw',
        overflow: 'hidden', background: '#1d2125',
      }}>
        {/* Mobile sidebar backdrop */}
        <div
          className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />

        {/* Left sidebar */}
        <aside className={`board-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </aside>

        {/* Main board area */}
        <main style={{
          display: 'flex', flexDirection: 'column', flex: 1,
          overflow: 'hidden', position: 'relative', ...bgStyle,
        }}>
          <Header
            onMenuClick={() => setIsMenuOpen(true)}
            onSwitcherClick={() => setIsSwitcherOpen(true)}
            onSidebarToggle={() => setIsSidebarOpen((prev) => !prev)}
          />

          <div className="board-columns-area" style={{
            display: 'flex', flexDirection: 'column',
            flex: 1, overflow: 'hidden', position: 'relative',
          }}>
            <BoardView onCardClick={(card, list) => setSelectedCard({ card, list })} />
            <NavbarBottom onSwitchBoardsClick={() => setIsSwitcherOpen(true)} />
          </div>
        </main>

        <div className="block md:hidden">
          <NavbarBottom onSwitchBoardsClick={() => setIsSwitcherOpen(true)} />
        </div>

        {/* Overlays & Modals */}
        {isMenuOpen     && <BoardMenu     onClose={() => setIsMenuOpen(false)}     />}
        {isSwitcherOpen && <BoardSwitcher onClose={() => setIsSwitcherOpen(false)} />}
        {selectedCard   && (
          <CardModal
            card={selectedCard.card}
            list={selectedCard.list}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </div>
    </>
  );
}