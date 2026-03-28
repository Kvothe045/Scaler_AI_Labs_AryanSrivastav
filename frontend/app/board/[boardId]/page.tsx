// frontend/app/board/[boardId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '../../../store';
import type { Card, List } from '../../../types';

import Sidebar      from '../../../components/board/Sidebar';
import Header       from '../../../components/board/Header';
import BoardView    from '../../../components/board/BoardView';
import BottomNav    from '../../../components/board/BottomNav';
import BoardSwitcher from '../../../components/board/BoardSwitcher';
import BoardMenu    from '../../../components/board/BoardMenu';
import CardModal    from '../../../components/card/CardModal';

export default function BoardPage() {
  const params  = useParams();
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

  const [isLoading,       setIsLoading]       = useState(true);
  const [isMenuOpen,      setIsMenuOpen]      = useState(false);
  const [isSwitcherOpen,  setIsSwitcherOpen]  = useState(false);
  const [selectedCard,    setSelectedCard]    = useState<{ card: Card; list: List } | null>(null);

  useEffect(() => {
    if (!boardId) return;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setBoardId(boardId);
      try {
        await Promise.all([
          fetchBoardState(boardId),
          fetchUsers(),
          fetchBoards(),
          fetchLabels(),
        ]);
      } catch (err) {
        console.error('Board load error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !boardState) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1d2125',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '4px solid rgba(166,197,226,0.16)',
            borderTopColor: '#579dff',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: boardState.background_color || '#89609e',
    backgroundImage:
      'linear-gradient(rgba(0,0,0,0.12), rgba(0,0,0,0.12))',
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#1d2125',
      }}
    >
      {/* Left sidebar */}
      <Sidebar />

      {/* Main board area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          ...bgStyle,
        }}
      >
        {/* Top header bar (logo, board title, search, profile) */}
        <Header
          onMenuClick={() => setIsMenuOpen(true)}
          onSwitcherClick={() => setIsSwitcherOpen(true)}
        />

        {/* Board columns area — grows to fill remaining height */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <BoardView onCardClick={(card, list) => setSelectedCard({ card, list })} />

          {/* Trello-style bottom tab bar: Inbox | Planner | Board | Switch boards */}
          <BottomNav onSwitchBoardsClick={() => setIsSwitcherOpen(true)} />
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────── */}
      {isMenuOpen    && <BoardMenu     onClose={() => setIsMenuOpen(false)}     />}
      {isSwitcherOpen && <BoardSwitcher onClose={() => setIsSwitcherOpen(false)} />}
      {selectedCard  && (
        <CardModal
          card={selectedCard.card}
          list={selectedCard.list}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}