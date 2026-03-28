'use client';
import { useState } from 'react';
import type { Card, List } from '../../types';
import CardModal from '../card/CardModal';

interface Props {
  results: { card: Card; list: List }[];
  query: string;
  onClose: () => void;
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function SearchResults({ results, query, onClose }: Props) {
  const [selected, setSelected] = useState<{ card: Card; list: List } | null>(null);

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 380,
        maxHeight: 480,
        overflowY: 'auto',
        zIndex: 300,
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-popup)',
        border: '1px solid var(--border)',
        animation: 'scaleIn 0.12s ease',
      }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </span>
        </div>
        {results.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            No cards found
          </div>
        ) : (
          <div style={{ padding: 4 }}>
            {results.map(({ card, list }) => (
              <button
                key={card.id}
                onClick={() => { setSelected({ card, list }); onClose(); }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  width: '100%', padding: '10px 12px',
                  borderRadius: 6, textAlign: 'left',
                  gap: 4,
                  transition: 'background 0.1s',
                }}
                className="btn-ghost"
              >
                {card.cover_image_color && (
                  <div style={{ height: 4, borderRadius: 2, background: card.cover_image_color, marginBottom: 2 }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/>
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                    {highlight(card.title, query)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 21 }}>
                  in <span style={{ color: 'var(--text-secondary)' }}>{list.title}</span>
                  {card.labels && card.labels.length > 0 && (
                    <span style={{ marginLeft: 8, display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
                      {card.labels.map(l => (
                        <span key={l.id} style={{ width: 24, height: 6, borderRadius: 3, background: l.color_code, display: 'inline-block' }} />
                      ))}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CardModal
          card={selected.card}
          list={selected.list}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}