'use client';
import { useEffect, useRef, useState } from 'react';
import type { Card, List } from '../../types';

interface Props {
  results: { card: Card; list: List }[];
  query: string;
  onClose: () => void;
  onCardSelect: (card: Card, list: List) => void;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{
        background: 'rgba(87,157,255,0.18)',
        color: '#93c5fd',
        borderRadius: 2,
        padding: '0 2px',
        fontWeight: 700,
        fontStyle: 'normal',
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function SearchResults({ results, query, onClose, onCardSelect }: Props) {
  const panelRef        = useRef<HTMLDivElement>(null);
  const listRef         = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  /* ── keyboard navigation ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[activeIdx]) {
        const { card, list } = results[activeIdx];
        onClose();
        onCardSelect(card, list);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, results, activeIdx, onCardSelect]);

  /* scroll active item into view */
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  /* outside click closes */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!query || query.length < 2) return null;

  const handleSelect = (card: Card, list: List) => {
    onClose();           // close search dropdown
    onCardSelect(card, list); // parent mounts CardModal independently
  };

  /* group by list */
  const grouped: { list: List; cards: { card: Card; originalIdx: number }[] }[] = [];
  const listMap: Record<string, number> = {};
  results.forEach(({ card, list }, i) => {
    if (listMap[list.id] === undefined) {
      listMap[list.id] = grouped.length;
      grouped.push({ list, cards: [] });
    }
    grouped[listMap[list.id]].cards.push({ card, originalIdx: i });
  });

  return (
    <>
      <style>{`
        @keyframes srDrop {
          from { opacity:0; transform:translateY(-6px) scaleY(0.96); }
          to   { opacity:1; transform:translateY(0)   scaleY(1); }
        }
        .sr-panel {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 480px;
          max-height: 66vh;
          z-index: 9999;
          background: #1c2128;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 8px 32px -4px rgba(0,0,0,0.7),
            0 2px 8px rgba(0,0,0,0.4);
          animation: srDrop 0.14s cubic-bezier(0.22,1,0.36,1) both;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: top center;
        }
        @media (max-width: 768px) {
          .sr-panel {
            position: fixed;
            top: 58px;
            left: 10px;
            right: 10px;
            width: auto;
            max-height: calc(100dvh - 80px);
            border-radius: 12px;
          }
        }

        /* ── Header ── */
        .sr-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .sr-head-icon {
          color: #579dff;
          opacity: 0.7;
          flex-shrink: 0;
        }
        .sr-head-text {
          flex: 1;
          font-size: 12px;
          color: #6b7a8d;
          font-weight: 500;
        }
        .sr-head-query {
          color: #c8d0d9;
          font-weight: 700;
        }
        .sr-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .sr-badge-found {
          background: rgba(75,206,151,0.1);
          color: #4bce97;
          border: 1px solid rgba(75,206,151,0.22);
        }
        .sr-badge-none {
          background: rgba(248,113,104,0.1);
          color: #f87168;
          border: 1px solid rgba(248,113,104,0.22);
        }
        .sr-close-btn {
          width: 26px; height: 26px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: #4b5563;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.1s, color 0.1s;
        }
        .sr-close-btn:hover { background: rgba(255,255,255,0.08); color: #9fadbc; }

        /* ── Scrollable body ── */
        .sr-body {
          overflow-y: auto;
          flex: 1;
          padding: 6px;
        }
        .sr-body::-webkit-scrollbar { width: 3px; }
        .sr-body::-webkit-scrollbar-track { background: transparent; }
        .sr-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }

        /* ── Group label ── */
        .sr-group-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 8px 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #374151;
        }
        .sr-group-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
        }

        /* ── Card row ── */
        .sr-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 10px;
          border-radius: 9px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          color: inherit;
          transition: background 0.1s, border-color 0.1s;
          margin-bottom: 1px;
          position: relative;
        }
        .sr-row:hover, .sr-row.active {
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,255,255,0.09);
        }
        .sr-row.active {
          background: rgba(87,157,255,0.08);
          border-color: rgba(87,157,255,0.18);
        }
        .sr-row:active { transform: scale(0.99); }

        .sr-row-icon {
          width: 28px; height: 28px;
          border-radius: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sr-row-main {
          flex: 1;
          min-width: 0;
        }
        .sr-row-title {
          font-size: 13px;
          font-weight: 500;
          color: #c8d0d9;
          line-height: 1.4;
          word-break: break-word;
          margin-bottom: 3px;
        }
        .sr-row-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .sr-list-chip {
          font-size: 10px;
          font-weight: 500;
          color: #6b7a8d;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .sr-label-dot {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 6px;
          border-radius: 99px;
          font-size: 9.5px;
          font-weight: 600;
          white-space: nowrap;
        }
        .sr-due {
          font-size: 10px;
          font-weight: 500;
          padding: 1px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .sr-due-overdue {
          background: rgba(248,113,104,0.1);
          color: #f87168;
          border: 1px solid rgba(248,113,104,0.22);
        }
        .sr-due-ok {
          background: rgba(255,255,255,0.05);
          color: #9fadbc;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .sr-row-arrow {
          color: #2d3748;
          flex-shrink: 0;
          transition: color 0.1s, transform 0.1s;
        }
        .sr-row:hover .sr-row-arrow,
        .sr-row.active .sr-row-arrow {
          color: #579dff;
          transform: translateX(2px);
        }

        /* ── Empty state ── */
        .sr-empty {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .sr-empty-orb {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          margin-bottom: 4px;
        }
        .sr-empty-title { font-size: 14px; font-weight: 600; color: #4b5563; }
        .sr-empty-sub   { font-size: 12px; color: #374151; }

        /* ── Footer ── */
        .sr-foot {
          padding: 7px 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .sr-foot-hint { font-size: 10.5px; color: #374151; }
        .sr-kbd {
          display: inline-flex; align-items: center;
          padding: 2px 5px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          font-size: 10px;
          color: #4b5563;
          font-family: monospace;
        }
        .sr-foot-sep { font-size: 10px; color: #2d3748; }
      `}</style>

      <div
        ref={panelRef}
        className="sr-panel"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sr-head">
          <span className="sr-head-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <span className="sr-head-text">
            Results for <span className="sr-head-query">"{query}"</span>
          </span>
          <span className={`sr-badge ${results.length > 0 ? 'sr-badge-found' : 'sr-badge-none'}`}>
            {results.length} {results.length === 1 ? 'card' : 'cards'}
          </span>
          <button className="sr-close-btn" onClick={onClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="sr-body" ref={listRef}>
          {results.length === 0 ? (
            <div className="sr-empty">
              <div className="sr-empty-orb">🔍</div>
              <div className="sr-empty-title">No cards found</div>
              <div className="sr-empty-sub">Try a different search term</div>
            </div>
          ) : (
            grouped.map(({ list, cards }) => (
              <div key={list.id}>
                {/* Group label */}
                <div className="sr-group-label">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  {list.title}
                  <span className="sr-group-line"/>
                  <span style={{ color: '#4b5563', fontWeight: 600 }}>{cards.length}</span>
                </div>

                {/* Card rows */}
                {cards.map(({ card, originalIdx }) => {
                  const isActive = originalIdx === activeIdx;
                  const isOverdue = (card as any).due_date && new Date((card as any).due_date) < new Date();
                  return (
                    <button
                      key={card.id}
                      className={`sr-row ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelect(card, list)}
                      onMouseEnter={() => setActiveIdx(originalIdx)}
                    >
                      {/* Card icon */}
                      <div className="sr-row-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7a8d" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="8" y1="10" x2="16" y2="10"/>
                          <line x1="8" y1="14" x2="13" y2="14"/>
                        </svg>
                      </div>

                      {/* Content */}
                      <div className="sr-row-main">
                        <div className="sr-row-title">
                          <Highlight text={card.title} query={query}/>
                        </div>
                        <div className="sr-row-meta">
                          {/* List pill */}
                          <span className="sr-list-chip">
                            {list.title}
                          </span>

                          {/* Due date */}
                          {(card as any).due_date && (
                            <span className={`sr-due ${isOverdue ? 'sr-due-overdue' : 'sr-due-ok'}`}>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              {new Date((card as any).due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}

                          {/* Checklist progress */}
                          {(card as any).checklists?.length > 0 && (
                            <span style={{ fontSize: 10, color: '#6b7a8d', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 11 12 14 22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                              </svg>
                              {(card as any).checklists.filter((c: any) => c.is_completed).length}/{(card as any).checklists.length}
                            </span>
                          )}

                          {/* Labels */}
                          {(card as any).labels?.map((l: any) => (
                            <span key={l.id} className="sr-label-dot"
                              style={{ background: l.color_code + '20', color: l.color_code, border: `1px solid ${l.color_code}44` }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: l.color_code, display: 'inline-block' }}/>
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="sr-row-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        {results.length > 0 && (
          <div className="sr-foot">
            <span className="sr-kbd">↑↓</span>
            <span className="sr-foot-hint">navigate</span>
            <span className="sr-foot-sep">·</span>
            <span className="sr-kbd">↵</span>
            <span className="sr-foot-hint">open card</span>
            <span className="sr-foot-sep">·</span>
            <span className="sr-kbd">Esc</span>
            <span className="sr-foot-hint">close</span>
          </div>
        )}
      </div>
    </>
  );
}