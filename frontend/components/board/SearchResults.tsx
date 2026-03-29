'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Card, List } from '../../types';
import CardModal from '../card/CardModal';

interface Props {
  results: { card: Card; list: List }[];
  query: string;
  onClose: () => void;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{
        background: 'rgba(87, 157, 255, 0.25)',
        color: '#7dc0ff',
        borderRadius: 3,
        padding: '0 2px',
        fontWeight: 700,
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function SearchResults({ results, query, onClose }: Props) {
  const [selected, setSelected] = useState<{ card: Card; list: List } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleCardClick = (card: Card, list: List) => {
    setSelected({ card, list });
  };

  const handleModalClose = () => {
    setSelected(null);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) handleModalClose();
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, selected]);

  // Click-outside to close panel (disabled while modal is open)
  useEffect(() => {
    if (selected) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, selected]);

  if (!query || query.length < 2) return null;

  return (
    <>
      <style>{`
        @keyframes srFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        .sr-panel {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 420px;
          max-height: 72vh;
          overflow-y: auto;
          z-index: 9999;

          background: rgba(23, 27, 33, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.55),
            0 2px 8px  rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: srFadeIn 0.18s ease forwards;
        }

        @media (max-width: 768px) {
          .sr-panel {
            position: fixed;
            top: 58px;
            left: 10px;
            right: 10px;
            width: auto;
            max-height: calc(100dvh - 100px);
            border-radius: 12px;
          }
        }

        .sr-panel::-webkit-scrollbar { width: 5px; }
        .sr-panel::-webkit-scrollbar-track { background: transparent; }
        .sr-panel::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
        }

        .sr-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          position: sticky;
          top: 0;
          background: rgba(23, 27, 33, 0.98);
          backdrop-filter: blur(12px);
          border-radius: 14px 14px 0 0;
          z-index: 2;
        }

        .sr-badge {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #6b7a8d;
        }

        .sr-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          color: #8a99ab;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          transition: background 0.15s, color 0.15s;
        }
        .sr-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #c8d0d9;
        }

        .sr-body { padding: 6px; }

        .sr-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 9px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          color: inherit;
          transition: background 0.15s, border-color 0.15s;
          margin-bottom: 2px;
        }
        .sr-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .sr-item:active { background: rgba(255, 255, 255, 0.08); }

        .sr-item-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .sr-title {
          font-size: 13.5px;
          font-weight: 500;
          color: #c8d0d9;
          line-height: 1.4;
          flex: 1;
        }

        .sr-list-badge {
          flex-shrink: 0;
          font-size: 10.5px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: 20px;
          color: #7a8fa3;
          white-space: nowrap;
        }

        .sr-labels { display: flex; gap: 5px; flex-wrap: wrap; }
        .sr-label-chip { height: 6px; width: 30px; border-radius: 3px; }

        .sr-empty {
          padding: 40px 20px;
          text-align: center;
          color: #5a6472;
          font-size: 13px;
        }
        .sr-empty-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.5; }
      `}</style>

      {/* Search panel — hidden once a card is selected */}
      {!selected && (
        <div
          ref={panelRef}
          className="sr-panel"
          onClick={e => e.stopPropagation()}
        >
          <div className="sr-header">
            <span className="sr-badge">
              {results.length} {results.length === 1 ? 'card' : 'cards'} found
            </span>
            <button className="sr-close" onClick={onClose} aria-label="Close search">✕</button>
          </div>

          <div className="sr-body">
            {results.length === 0 ? (
              <div className="sr-empty">
                <div className="sr-empty-icon">🔍</div>
                No results for "<strong style={{ color: '#8a99ab' }}>{query}</strong>"
              </div>
            ) : (
              results.map(({ card, list }) => (
                <button
                  key={card.id}
                  className="sr-item"
                  onClick={() => handleCardClick(card, list)}
                >
                  <div className="sr-item-top">
                    <span className="sr-title">
                      <Highlight text={card.title} query={query} />
                    </span>
                    <span className="sr-list-badge">{list.title}</span>
                  </div>

                  {card.labels && card.labels.length > 0 && (
                    <div className="sr-labels">
                      {card.labels.map((l: any) => (
                        <div
                          key={l.id}
                          className="sr-label-chip"
                          style={{ background: l.color_code }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/*
        ── KEY FIX ──────────────────────────────────────────────────────────────
        Portal CardModal directly into document.body so it escapes the search
        panel's stacking context. Without this, the modal's `position: fixed`
        is scoped to the z-index:9999 ancestor and renders clipped/mispositioned.
        ─────────────────────────────────────────────────────────────────────────
      */}
      {selected && typeof document !== 'undefined' &&
        createPortal(
          <CardModal
            card={selected.card}
            list={selected.list}
            onClose={handleModalClose}
          />,
          document.body
        )
      }
    </>
  );
}