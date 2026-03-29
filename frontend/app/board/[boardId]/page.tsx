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

  // Tracks whether we already triggered a redirect for this mount so we
  // never double-navigate (React StrictMode double-invokes effects).
  const didRedirect = useRef(false);

  const handleAccessDenied = useCallback((ownedBoardId: number | null) => {
    if (didRedirect.current) return;
    didRedirect.current = true;

    // Drop the spinner NOW — before the navigation resolves — so the user
    // never sees the stuck loading screen.
    setIsLoading(false);

    if (ownedBoardId) {
      router.replace(`/board/${ownedBoardId}`);
    } else {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!boardId) return;

    didRedirect.current = false;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setBoardId(boardId);

      // ─── Step 1: fetch the board ───────────────────────────────────────────
      // Run alone (NOT in Promise.all) so that if access is denied the store
      // can fully resolve ensureUserHasBoard() and call handleAccessDenied()
      // before we ever reach the secondary fetches or the finally block.
      // fetchBoardState never throws on access errors — it handles them internally
      // and calls onAccessDenied, then returns normally.
      await fetchBoardState(boardId, handleAccessDenied);

      // ─── Step 2: if we were redirected, stop here ──────────────────────────
      // didRedirect.current is set synchronously inside handleAccessDenied so
      // this check is reliable even though fetchBoardState is async.
      if (!mounted || didRedirect.current) return;

      // ─── Step 3: load supporting data ─────────────────────────────────────
      await Promise.all([fetchUsers(), fetchBoards(), fetchLabels()]);

      if (mounted) setIsLoading(false);
    };

    load().catch((err) => {
      // Only truly unexpected errors reach here (fetchBoardState swallows
      // access errors and returns cleanly).
      console.error('Unexpected load error:', err);
      if (mounted && !didRedirect.current) setIsLoading(false);
    });

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
          .board-sidebar.open  { transform: translateX(0); }
          .sidebar-backdrop.open { display: block; opacity: 1; }
          .board-columns-area  { padding-bottom: 60px; }
        }
      `}</style>

      <div style={{
        display: 'flex', height: '100svh', width: '100vw',
        overflow: 'hidden', background: '#1d2125',
      }}>
        <div
          className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside className={`board-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </aside>

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