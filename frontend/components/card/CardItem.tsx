// frontend/components/card/CardItem.tsx
'use client';
import { useState } from 'react';
import type { Card, List } from '../../types';

interface Props {
  card: Card;
  list: List;
  canEdit: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onCardClick: (card: Card, list: List) => void;
  onDragStart: (card: Card, listId: number) => void;
  onDragOver: (e: React.DragEvent, listId: number, cardId: number) => void;
  onDragEnd: () => void;
  onRefresh: () => void;
}

export default function CardItem({
  card, list, canEdit, isDragging, isDragOver,
  onCardClick, onDragStart, onDragOver, onDragEnd, onRefresh,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [completing, setCompleting] = useState(false);

  const storageKey = `card_done_${card.id}`;
  const [isDone, setIsDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(storageKey) === 'true';
  });

  const handleTickClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    const next = !isDone;
    setIsDone(next);
    sessionStorage.setItem(storageKey, String(next));
    setCompleting(false);
  };

  const hasCover   = !!card.cover_image_color;
  const doneItems  = card.checklists?.filter((c: any) => c.is_completed).length ?? 0;
  const totalItems = card.checklists?.length ?? 0;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Card itself ── */}
      <div
        draggable={canEdit}
        onDragStart={e => { e.stopPropagation(); onDragStart(card, list.id); }}
        onDragOver={e  => { e.preventDefault(); e.stopPropagation(); onDragOver(e, list.id, card.id); }}
        onDragEnd={e   => { e.stopPropagation(); onDragEnd(); }}
        onClick={() => onCardClick(card, list)}
        style={{
          background: '#22272b',
          borderRadius: 8,
          cursor: 'pointer',
          opacity: isDragging ? 0.35 : 1,
          boxShadow: isDragOver
            ? '0 0 0 2px #579dff'
            : '0 1px 3px rgba(0,0,0,0.36)',
          transition: 'box-shadow 0.1s, opacity 0.15s',
          overflow: 'hidden',
          userSelect: 'none',
          transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'none',
        }}
      >
        {/* Cover block */}
        {hasCover && (
          <div style={{ height: 24, background: card.cover_image_color!, width: '100%' }} />
        )}

        {/* Body */}
        <div style={{ padding: '8px 10px 10px' }}>
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {card.labels.map((label: any) => (
                <span key={label.id} title={label.name} style={{ display: 'inline-block', height: 8, minWidth: 40, borderRadius: 4, background: label.color_code }} />
              ))}
            </div>
          )}

          {/* Title row with inline tick */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            {/* Tick button — always in flow, shown on hover or when done */}
            <button
              onClick={handleTickClick}
              style={{
                flexShrink: 0,
                marginTop: 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: isDone
                  ? '2px solid #4bce97'
                  : hovered
                    ? '2px solid rgba(182,194,207,0.5)'
                    : '2px solid transparent',
                background: isDone ? '#4bce97' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
                padding: 0,
                // Always takes up space, just invisible when not hovered/done
                visibility: (isDone || hovered) ? 'visible' : 'hidden',
              }}
              title={isDone ? 'Mark incomplete' : 'Mark complete'}
            >
              {(isDone || hovered) && (
                <svg
                  width="10" height="10" viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDone ? 'white' : 'rgba(182,194,207,0.7)'}
                  strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Title — never dimmed or struck through */}
            <div style={{
              fontSize: 14,
              color: '#b6c2cf',
              lineHeight: 1.4,
              wordBreak: 'break-word',
              flex: 1,
            }}>
              {card.title}
            </div>
          </div>

          {/* Badges */}
          {/* {(card.due_date || totalItems > 0 || (card as any).attachments?.length > 0 || card.members?.length > 0) && ( */}
          {(card.due_date || 
  totalItems > 0 || 
  (card as any).attachments?.length > 0 || 
  (card.members?.length ?? 0) > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {card.due_date && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, color: isDueSoon(card.due_date) ? '#f87168' : '#9fadbc',
                  background: isDueSoon(card.due_date) ? 'rgba(248,113,104,0.12)' : 'transparent',
                  padding: '2px 5px', borderRadius: 3,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatDate(card.due_date)}
                </span>
              )}

              {totalItems > 0 && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3, fontSize: 11,
                  color: doneItems === totalItems ? '#4bce97' : '#9fadbc',
                  background: doneItems === totalItems ? 'rgba(75,206,151,0.12)' : 'transparent',
                  padding: '2px 5px', borderRadius: 3,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {doneItems}/{totalItems}
                </span>
              )}

              {(card as any).attachments?.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9fadbc' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  {(card as any).attachments.length}
                </span>
              )}

              {card.members && card.members.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                  {card.members.slice(0, 3).map((m: any) => (
                    <div key={m.id} title={m.name} style={{
                      width: 22, height: 22, borderRadius: '50%', background: strColor(m.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: 'white',
                    }}>
                      {m.name[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isDueSoon(d: string) {
  return new Date(d).getTime() - Date.now() < 86400000 * 2;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function strColor(s: string) {
  const c = ['#0052cc','#00875a','#6554c0','#ff5630','#00b8d9','#ff991f'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}