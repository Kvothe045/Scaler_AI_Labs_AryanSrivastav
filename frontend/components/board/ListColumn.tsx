// frontend/components/board/ListColumn.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import type { Card, List } from '../../types';
import CardItem from '../card/CardItem';
import * as api from '../../lib/api';

interface Props {
  list: List;
  canEdit: boolean;
  hasColorBar: boolean;
  isDragOver: boolean;
  isListDragOver: boolean;
  dragOverCardId: number | null;
  draggingCardId: number | null;
  draggingListId: number | null;
  onCardClick: (card: Card, list: List) => void;
  onCardDragStart: (card: Card, listId: number) => void;
  onListDragStart: (list: List) => void;
  onDragOver: (listId: number, cardId?: number) => void;
  onDragEnd: () => void;
  onRefresh: () => void;
  onColorPickerOpen: () => void;
}

/* ─── Color utilities ─── */
function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function isDark(hex: string) { return getLuminance(hex) < 0.5; }
function getTextColor(hex: string) { return isDark(hex) ? '#ffffff' : '#1d2125'; }
function adjustBrightness(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(c.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(c.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(c.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function ListColumn({
  list, canEdit, hasColorBar,
  isDragOver, isListDragOver, dragOverCardId,
  draggingCardId, draggingListId,
  onCardClick, onCardDragStart, onListDragStart,
  onDragOver, onDragEnd, onRefresh, onColorPickerOpen,
}: Props) {
  const [addingCard,   setAddingCard]   = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editTitle,    setEditTitle]    = useState(false);
  const [titleVal,     setTitleVal]     = useState(list.title);
  const [showMenu,     setShowMenu]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const menuBtnRef  = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const cards        = [...(list.cards || [])].sort((a, b) => a.position - b.position);
  const visibleCards = cards.filter(c => !c.is_archived);

  /* ─── Theme from list.color ─── */
  const listColor: string | null = (list as any).color ?? null;
  const hasColor  = !!listColor;
  const dark      = hasColor ? isDark(listColor!) : true;
  const textCol   = hasColor ? getTextColor(listColor!) : '#b6c2cf';
  const mutedCol  = hasColor
    ? (dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')
    : 'rgba(182,194,207,0.75)';

  // Trello-style: header slightly darker, body is the main color
  const headerBg  = hasColor
    ? adjustBrightness(listColor!, dark ? -28 : -35)
    : '#1d2125';
  const bodyBg    = hasColor
    ? adjustBrightness(listColor!, dark ? -12 : -20)
    : '#101204';
  // Footer matches header for visual anchoring
  const footerBg  = headerBg;

  useEffect(() => {
    if (addingCard && textareaRef.current) textareaRef.current.focus();
  }, [addingCard]);

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || saving) return;
    setSaving(true);
    const title = newCardTitle.trim();
    setNewCardTitle('');
    setAddingCard(false);
    try {
      const maxPos = Math.max(...cards.map(c => c.position), 0);
      await api.createCard({ title, list_id: list.id, position: maxPos + 1000 });
      onRefresh();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleSaveTitle = async () => {
    setEditTitle(false);
    if (titleVal !== list.title && titleVal.trim()) {
      await api.updateList(list.id, { title: titleVal });
      onRefresh();
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Delete "${list.title}" and all its cards?`)) return;
    setShowMenu(false);
    await api.deleteList(list.id);
    onRefresh();
  };

  const handleArchiveAll = async () => {
    if (!confirm('Archive all cards in this list?')) return;
    setShowMenu(false);
    await Promise.all(visibleCards.map(c => api.updateCard(c.id, { is_archived: true })));
    onRefresh();
  };

  const isBeingDragged = draggingListId === list.id;

  return (
    <div
      draggable={canEdit}
      onDragStart={e => {
        if (draggingCardId !== null) return;
        e.stopPropagation();
        onListDragStart(list);
      }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(list.id); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDragEnd(); }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd(); }}
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 96px)',
        borderRadius: 12,
        background: bodyBg,
        opacity: isBeingDragged ? 0.4 : 1,
        outline: isListDragOver ? '2px solid rgba(87,157,255,0.9)' : 'none',
        outlineOffset: 2,
        transition: 'outline 0.1s, opacity 0.15s, background 0.3s, box-shadow 0.3s',
        cursor: canEdit ? 'grab' : 'default',
        boxShadow: hasColor
          ? `0 4px 20px ${listColor}55, 0 2px 6px rgba(0,0,0,0.45)`
          : '0 2px 8px rgba(0,0,0,0.45)',
        overflow: 'hidden',
      }}
    >

      {/* ════ HEADER ════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 8px 10px 12px',
          gap: 4,
          flexShrink: 0,
          background: headerBg,
          transition: 'background 0.3s',
          minHeight: 44,
        }}
        onClick={e => e.stopPropagation()}
      >
        {editTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setEditTitle(false); setTitleVal(list.title); }
            }}
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: 14,
              padding: '4px 8px',
              background: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)',
              borderRadius: 6,
              color: dark ? '#ffffff' : '#1d2125',
              border: '2px solid rgba(87,157,255,0.8)',
              outline: 'none',
              letterSpacing: 0.1,
              fontFamily: 'inherit',
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={e => { e.stopPropagation(); if (canEdit) setEditTitle(true); }}
            draggable={false}
            style={{
              flex: 1,
              textAlign: 'left',
              fontWeight: 700,
              fontSize: 14,
              color: textCol,
              padding: '3px 4px',
              borderRadius: 4,
              cursor: canEdit ? 'pointer' : 'default',
              background: 'transparent',
              border: 'none',
              lineHeight: 1.4,
              letterSpacing: 0.1,
              transition: 'color 0.3s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {list.title}
          </button>
        )}

        {/* Card count badge */}
        <span style={{
          fontSize: 12,
          color: mutedCol,
          fontWeight: 600,
          minWidth: 20,
          textAlign: 'center',
          flexShrink: 0,
          lineHeight: 1,
        }}>
          {visibleCards.length}
        </span>

        {/* ··· menu button */}
        {canEdit && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              ref={menuBtnRef}
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
              draggable={false}
              title="List actions"
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textCol,
                background: showMenu
                  ? (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
                  : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background = dark
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(0,0,0,0.12)')
              }
              onMouseLeave={e => {
                if (!showMenu) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* ··· horizontal dots */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill={textCol}>
                <circle cx="5"  cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {showMenu && (
              <ListMenuPortal
                anchorRef={menuBtnRef}
                onClose={() => setShowMenu(false)}
                onAddCard={() => { setShowMenu(false); setAddingCard(true); }}
                onChangeColor={() => { setShowMenu(false); onColorPickerOpen(); }}
                onArchiveAll={handleArchiveAll}
                onDelete={handleDeleteList}
              />
            )}
          </div>
        )}
      </div>

      {/* ════ CARDS SCROLL AREA ════ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px', // Increased top/bottom padding slightly
          display: 'flex',
          flexDirection: 'column',
          gap: 10, // Increased gap from 6 to 10 for more breathing room between cards
          background: isDragOver
            ? (hasColor
              ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
              : 'rgba(87,157,255,0.05)')
            : 'transparent',
          transition: 'background 0.15s',
          scrollbarWidth: 'thin',
          scrollbarColor: hasColor
            ? `${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'} transparent`
            : 'rgba(255,255,255,0.12) transparent',
        }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(list.id, undefined); }}
      >
        {visibleCards.map(card => (
          <div key={card.id}>
            {isDragOver && dragOverCardId === card.id && draggingCardId !== card.id && (
              <div style={{
                height: 4,
                background: '#579dff',
                borderRadius: 2,
                marginBottom: 6,
                boxShadow: '0 0 8px rgba(87,157,255,0.6)',
              }} />
            )}
            <CardItem
              card={card}
              list={list}
              isDragging={draggingCardId === card.id}
              isDragOver={false}
              canEdit={canEdit}
              onCardClick={onCardClick}
              onDragStart={onCardDragStart}
              onDragOver={(e, listId, cardId) => {
                e.preventDefault(); e.stopPropagation(); onDragOver(listId, cardId);
              }}
              onDragEnd={onDragEnd}
              onRefresh={onRefresh}
            />
          </div>
        ))}

        {/* Drop zone at bottom of list */}
        {isDragOver && dragOverCardId === null && (
          <div style={{
            height: 44,
            background: hasColor
              ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
              : 'rgba(87,157,255,0.08)',
            border: `2px dashed ${hasColor
              ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
              : 'rgba(87,157,255,0.4)'}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: mutedCol, fontWeight: 500 }}>Drop here</span>
          </div>
        )}

        {visibleCards.length === 0 && !isDragOver && (
          <div style={{
            padding: '14px 8px',
            textAlign: 'center',
            color: mutedCol,
            fontSize: 12,
            opacity: 0.65,
          }}>
            No cards yet
          </div>
        )}
      </div>

      {/* ════ FOOTER — Add a card ════ */}
      {canEdit && (
        <div style={{
          background: footerBg,
          padding: '6px 8px 8px',
          flexShrink: 0,
          transition: 'background 0.3s',
        }}>
          {addingCard ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                ref={textareaRef}
                value={newCardTitle}
                onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                  if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
                }}
                placeholder="Enter a title or paste a link"
                rows={3}
                style={{
                  width: '100%',
                  resize: 'none',
                  padding: '8px 10px',
                  background: '#ffffff',
                  borderRadius: 8,
                  color: '#172b4d',
                  fontSize: 14,
                  border: '2px solid #388bff',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  outline: 'none',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={handleAddCard}
                  disabled={saving || !newCardTitle.trim()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: '#0c66e4',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: saving || !newCardTitle.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !newCardTitle.trim() ? 0.55 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {saving ? 'Adding…' : 'Add card'}
                </button>
                <button
                  onClick={() => { setAddingCard(false); setNewCardTitle(''); }}
                  style={{
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: mutedCol,
                    fontSize: 22,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >×</button>
              </div>
            </div>
          ) : (
            /* ── "Add a card" row + open-card icon ── */
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setAddingCard(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 6,
                  color: mutedCol,
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = dark
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.color = textCol;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = mutedCol;
                }}
              >
                {/* + icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5"  y1="12" x2="19" y2="12" />
                </svg>
                Add a card
              </button>

              {/* Open-card template icon (Trello style) */}
              <button
                title="Create from template"
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: mutedCol,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = dark
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.color = textCol;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = mutedCol;
                }}
              >
                {/* card-with-arrow icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="14" height="17" rx="2" />
                  <path d="M16 2v4" />
                  <path d="M19 10l3-3-3-3" />
                  <path d="M22 7H16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════ LIST MENU PORTAL ════ */
function ListMenuPortal({
  anchorRef, onClose, onAddCard, onChangeColor, onArchiveAll, onDelete,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onAddCard: () => void;
  onChangeColor: () => void;
  onArchiveAll: () => void;
  onDelete: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      const menuW = 280;
      const left = Math.min(r.right - menuW, window.innerWidth - menuW - 8);
      setPos({ top: r.bottom + 6, left: Math.max(8, left) });
    }
  }, [anchorRef]);

  const items = [
    { label: 'Add card',          action: onAddCard },
    { label: 'Change list color', action: onChangeColor },
    { label: 'Copy list',         action: () => { alert('Coming soon!'); onClose(); } },
    { label: 'Move list',         action: () => { alert('Drag & drop to reorder!'); onClose(); } },
    { label: 'Sort by…',          action: () => { alert('Coming soon!'); onClose(); } },
    { label: 'Watch',             action: () => { alert('Coming soon!'); onClose(); } },
  ];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          width: 280,
          background: '#282e33',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#b6c2cf' }}>List actions</span>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: 4, background: 'transparent',
              border: 'none', color: '#9fadbc', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <div style={{ padding: '6px 4px' }}>
          {items.map(i => <MBtn key={i.label} onClick={i.action}>{i.label}</MBtn>)}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 4px' }} />
          <MBtn onClick={onDelete} danger>Archive this list</MBtn>
          <MBtn onClick={onArchiveAll} danger>Archive all cards in this list</MBtn>
        </div>
      </div>
    </>
  );
}

function MBtn({ onClick, children, danger }: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '9px 14px',
        fontSize: 13,
        color: danger ? '#f87168' : '#b6c2cf',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 6,
        display: 'block',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger
          ? 'rgba(248,113,104,0.12)'
          : 'rgba(255,255,255,0.1)';
        e.currentTarget.style.color = danger ? '#ff8f85' : '#ffffff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#f87168' : '#b6c2cf';
      }}
    >
      {children}
    </button>
  );
}