// frontend/components/board/BoardView.tsx
'use client';
import { useState, useCallback, useRef } from 'react';
import type { Card, List } from '../../types';
import { useStore } from '../../store';
import * as api from '../../lib/api';
import ListColumn from './ListColumn';

interface DragState {
  type: 'card' | 'list';
  id: number;
  sourceListId?: number;
}

interface Props {
  onCardClick: (card: Card, list: List) => void;
}

const LIST_COLORS = [
  { label: 'None',   value: null      },
  { label: 'Red',    value: '#C9372C' },
  { label: 'Orange', value: '#E2812D' },
  { label: 'Yellow', value: '#CF9F02' },
  { label: 'Green',  value: '#1F845A' },
  { label: 'Teal',   value: '#227D9B' },
  { label: 'Blue',   value: '#0C66E4' },
  { label: 'Purple', value: '#6E5DC6' },
  { label: 'Pink',   value: '#C4446C' },
  { label: 'Dark',   value: '#172B4D' },
  { label: 'Black',  value: '#1D2125' },
];

function ListColorPicker({
  listId, current, onClose, onRefresh,
}: {
  listId: number; current: string | null; onClose: () => void; onRefresh: () => void;
}) {
  const save = async (color: string | null) => {
    await api.updateList(listId, { color });
    onRefresh();
    onClose();
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 398 }} onClick={onClose} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 44, right: 0, zIndex: 399,
          background: '#282e33', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: 12, width: 224,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9fadbc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            List colour
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9fadbc', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LIST_COLORS.map(c => (
            <button
              key={c.label} onClick={() => save(c.value)} title={c.label}
              style={{
                width: 32, height: 32, borderRadius: 6,
                background: c.value ?? 'rgba(255,255,255,0.08)',
                border: c.value === current ? '3px solid white' : c.value === null ? '2px dashed #6c7983' : '2px solid transparent',
                cursor: 'pointer', fontSize: c.value === null ? 14 : 0, color: '#9fadbc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {c.value === null ? '✕' : ''}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function BoardView({ onCardClick }: Props) {
  const { boardState, refreshBoard, activeBoardId } = useStore();

  const [dragState,         setDragState]        = useState<DragState | null>(null);
  const [dragOverListId,    setDragOverListId]    = useState<number | null>(null);
  const [dragOverCardId,    setDragOverCardId]    = useState<number | null>(null);
  const [draggingListId,    setDraggingListId]    = useState<number | null>(null);
  const [colorPickerListId, setColorPickerListId] = useState<number | null>(null);
  const [addingList,        setAddingList]        = useState(false);
  const [newListTitle,      setNewListTitle]      = useState('');

  const dragSnapRef = useRef<{ dragState: DragState; lists: List[] } | null>(null);

  const lists: List[] = boardState?.lists
    ? [...boardState.lists].sort((a: List, b: List) => a.position - b.position)
    : [];

  const canEdit = boardState?.my_role === 'owner' || boardState?.my_role === 'editor';

  const handleCardDragStart = useCallback((card: Card, listId: number) => {
    const ds: DragState = { type: 'card', id: card.id, sourceListId: listId };
    setDragState(ds);
    setDraggingListId(null);
    dragSnapRef.current = { dragState: ds, lists };
  }, [lists]);

  const handleListDragStart = useCallback((list: List) => {
    const ds: DragState = { type: 'list', id: list.id };
    setDragState(ds);
    setDraggingListId(list.id);
    dragSnapRef.current = { dragState: ds, lists };
  }, [lists]);

  const handleDragOver = useCallback((listId: number, cardId?: number) => {
    setDragOverListId(listId);
    setDragOverCardId(cardId ?? null);
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (!dragSnapRef.current) return;
    const { dragState: ds } = dragSnapRef.current;
    const overListId = dragOverListId;
    const overCardId = dragOverCardId;

    setDragState(null);
    setDragOverListId(null);
    setDragOverCardId(null);
    setDraggingListId(null);
    dragSnapRef.current = null;

    try {
      if (ds.type === 'card' && overListId !== null) {
        const targetList = lists.find(l => l.id === overListId);
        if (!targetList) return;
        const targetCards = [...(targetList.cards || [])]
          .filter(c => !c.is_archived && c.id !== ds.id)
          .sort((a, b) => a.position - b.position);

        let newPosition: number;
        if (overCardId !== null && overCardId !== ds.id) {
          const idx = targetCards.findIndex(c => c.id === overCardId);
          if (idx === -1)     newPosition = (targetCards[targetCards.length - 1]?.position ?? 0) + 1000;
          else if (idx === 0) newPosition = targetCards[0].position / 2;
          else                newPosition = (targetCards[idx - 1].position + targetCards[idx].position) / 2;
        } else {
          newPosition = (targetCards[targetCards.length - 1]?.position ?? 0) + 1000;
        }
        await api.moveCard(ds.id, { list_id: overListId, position: newPosition });
        await refreshBoard();
      } else if (ds.type === 'list' && overListId !== null && overListId !== ds.id) {
        const otherLists = lists.filter(l => l.id !== ds.id);
        const targetIdx  = otherLists.findIndex(l => l.id === overListId);
        let newPosition: number;
        if (targetIdx === -1)     newPosition = (otherLists[otherLists.length - 1]?.position ?? 0) + 1000;
        else if (targetIdx === 0) newPosition = otherLists[0].position / 2;
        else                      newPosition = (otherLists[targetIdx - 1].position + otherLists[targetIdx].position) / 2;
        await api.moveList(ds.id, { position: newPosition });
        await refreshBoard();
      }
    } catch (e) {
      console.error('Drag end error:', e);
      await refreshBoard();
    }
  }, [dragOverListId, dragOverCardId, lists, refreshBoard]);

  const handleAddList = async () => {
    if (!newListTitle.trim() || !activeBoardId) return;
    const maxPos = Math.max(...lists.map(l => l.position), 0);
    await api.createList({ title: newListTitle, board_id: activeBoardId, position: maxPos + 1000 });
    setNewListTitle('');
    setAddingList(false);
    await refreshBoard();
  };

  if (!boardState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'white', fontSize: 15, opacity: 0.7 }}>
        Loading board…
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 16px', overflowX: 'auto', flex: 1, minHeight: 0,
      }}
      onDragOver={e => e.preventDefault()}
      onClick={() => setColorPickerListId(null)}
    >
      {lists.map(list => (
        <div key={list.id} style={{ position: 'relative', flexShrink: 0 }}>
          {/* Color accent bar — rendered INSIDE the relative wrapper so absolute children align */}
          {list.color && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 8, borderRadius: '12px 12px 0 0',
              background: list.color, zIndex: 2, pointerEvents: 'none',
            }} />
          )}

          <ListColumn
            list={list}
            canEdit={canEdit}
            hasColorBar={!!list.color}
            isDragOver={dragOverListId === list.id && dragState?.type === 'card'}
            isListDragOver={dragOverListId === list.id && dragState?.type === 'list'}
            dragOverCardId={dragOverListId === list.id ? dragOverCardId : null}
            draggingCardId={dragState?.type === 'card' ? dragState.id : null}
            draggingListId={draggingListId}
            onCardClick={onCardClick}
            onCardDragStart={handleCardDragStart}
            onListDragStart={handleListDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onRefresh={refreshBoard}
            onColorPickerOpen={() => setColorPickerListId(prev => prev === list.id ? null : list.id)}
          />

          {colorPickerListId === list.id && (
            <ListColorPicker
              listId={list.id}
              current={list.color ?? null}
              onClose={() => setColorPickerListId(null)}
              onRefresh={refreshBoard}
            />
          )}
        </div>
      ))}

      {canEdit && (
        <div style={{ flexShrink: 0, width: 272 }}>
          {addingList ? (
            <div style={{ background: '#101204', borderRadius: 12, padding: 8 }}>
              <input
                autoFocus value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
                placeholder="Enter list name…"
                style={{ width: '100%', padding: '8px 10px', background: 'white', borderRadius: 6, color: '#172b4d', fontSize: 14, border: '2px solid #388bff', marginBottom: 8, boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={handleAddList} style={{ padding: '6px 12px', borderRadius: 4, background: '#0c66e4', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>Add list</button>
                <button onClick={() => { setAddingList(false); setNewListTitle(''); }} style={{ color: 'white', fontSize: 22, padding: '0 4px', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.24)', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.24)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add another list
            </button>
          )}
        </div>
      )}
    </div>
  );
}