// frontend/components/board/ListColumn.tsx
'use client';
import { useState } from 'react';
import type { Card, List } from '../../types';
import CardItem from '../card/CardItem';
import * as api from '../../lib/api';

interface Props {
  list: List;
  canEdit: boolean;
  hasColorBar: boolean;          // ← tells column to add top padding for the accent bar
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

  const cards        = [...(list.cards || [])].sort((a, b) => a.position - b.position);
  const visibleCards = cards.filter(c => !c.is_archived);

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
    } catch (e) {
      console.error('Add card error:', e);
    } finally {
      setSaving(false);
    }
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
        width: 272,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 44px - 44px - 24px)',
        borderRadius: 12,
        background: '#101204',
        opacity: isBeingDragged ? 0.5 : 1,
        outline: isListDragOver ? '2px solid rgba(87,157,255,0.8)' : 'none',
        transition: 'outline 0.1s, opacity 0.15s',
        cursor: canEdit ? 'grab' : 'default',
        // Push content down so the absolute accent bar doesn't overlap header text
        paddingTop: hasColorBar ? 8 : 0,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{ display: 'flex', alignItems: 'center', padding: '10px 8px 6px 12px', gap: 4, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {editTitle ? (
          <input
            autoFocus value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setEditTitle(false); setTitleVal(list.title); }
            }}
            style={{ flex: 1, fontWeight: 700, fontSize: 14, padding: '4px 6px', background: 'white', borderRadius: 4, color: '#172b4d', border: '2px solid #388bff', outline: 'none' }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={e => { e.stopPropagation(); if (canEdit) setEditTitle(true); }}
            draggable={false}
            style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14, color: '#b6c2cf', padding: '4px 6px', borderRadius: 4, cursor: canEdit ? 'pointer' : 'default', background: 'transparent', border: 'none', lineHeight: 1.3 }}
          >
            {list.title}
          </button>
        )}

        {canEdit && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
              draggable={false}
              style={{ width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b6c2cf', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>

            {showMenu && (
              <ListMenu
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

      {/* ── Cards ── */}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: '0 4px', minHeight: 8,
          background: isDragOver ? 'rgba(87,157,255,0.06)' : 'transparent',
          borderRadius: 8, transition: 'background 0.15s',
        }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(list.id, undefined); }}
      >
        {visibleCards.map(card => (
          <div key={card.id} style={{ marginBottom: 6 }}>
            {isDragOver && dragOverCardId === card.id && draggingCardId !== card.id && (
              <div style={{ height: 4, background: '#579dff', borderRadius: 2, marginBottom: 4 }} />
            )}
            <CardItem
              card={card}
              list={list}
              isDragging={draggingCardId === card.id}
              isDragOver={false}
              canEdit={canEdit}
              onCardClick={onCardClick}
              onDragStart={onCardDragStart}
              onDragOver={(e, listId, cardId) => { e.preventDefault(); e.stopPropagation(); onDragOver(listId, cardId); }}
              onDragEnd={onDragEnd}
              onRefresh={onRefresh}
            />
          </div>
        ))}

        {isDragOver && dragOverCardId === null && (
          <div style={{ height: 40, background: 'rgba(87,157,255,0.1)', border: '2px dashed rgba(87,157,255,0.4)', borderRadius: 8, margin: '4px 0' }} />
        )}
      </div>

      {/* ── Add card ── */}
      {canEdit && (
        <div style={{ padding: '4px', flexShrink: 0 }}>
          {addingCard ? (
            <div style={{ padding: '4px' }}>
              <textarea
                autoFocus value={newCardTitle}
                onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                  if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
                }}
                placeholder="Enter a title or paste a link"
                rows={3}
                style={{ width: '100%', resize: 'none', padding: '8px 12px', background: 'white', borderRadius: 8, color: '#172b4d', fontSize: 14, border: '2px solid #388bff', boxSizing: 'border-box', boxShadow: '0 4px 8px rgba(0,0,0,0.3)', outline: 'none', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <button onClick={handleAddCard} disabled={saving || !newCardTitle.trim()} style={{ padding: '6px 12px', borderRadius: 4, background: '#0c66e4', color: 'white', fontSize: 14, fontWeight: 500, opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer', border: 'none' }}>
                  Add card
                </button>
                <button onClick={() => { setAddingCard(false); setNewCardTitle(''); }} style={{ color: '#b6c2cf', fontSize: 24, lineHeight: 1, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCard(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px', borderRadius: 8, color: '#b6c2cf', fontSize: 14, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b6c2cf'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add a card
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── List Actions Menu ─────────────────────────────────────────────────────────
function ListMenu({ onClose, onAddCard, onChangeColor, onArchiveAll, onDelete }: {
  onClose: () => void; onAddCard: () => void; onChangeColor: () => void;
  onArchiveAll: () => void; onDelete: () => void;
}) {
  const items = [
    { label: 'Add card',                    action: onAddCard },
    { label: 'Change list color',           action: onChangeColor },
    { label: 'Copy list',                   action: () => { alert('Coming soon!'); onClose(); } },
    { label: 'Move list',                   action: () => { alert('Drag & drop to reorder!'); onClose(); } },
    { label: 'Move all cards in this list', action: () => { alert('Coming soon!'); onClose(); } },
    { label: 'Sort by…',                    action: () => { alert('Coming soon!'); onClose(); } },
    { label: 'Watch',                       action: () => { alert('Coming soon!'); onClose(); } },
  ];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose} />
      <div
        style={{ position: 'absolute', top: '100%', right: 0, zIndex: 400, width: 304, background: '#282e33', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#b6c2cf' }}>List actions</span>
          <button onClick={onClose} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 4, background: 'transparent', border: 'none', color: '#9fadbc', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: 4 }}>
          {items.map(i => <MBtn key={i.label} onClick={i.action}>{i.label}</MBtn>)}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <MBtn onClick={onDelete}>Archive this list</MBtn>
          <MBtn onClick={onArchiveAll}>Archive all cards in this list</MBtn>
        </div>
      </div>
    </>
  );
}

function MBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 14, color: '#b6c2cf', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'block' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b6c2cf'; }}
    >
      {children}
    </button>
  );
}