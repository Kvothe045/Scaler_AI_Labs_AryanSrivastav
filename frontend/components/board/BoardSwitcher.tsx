'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store';

const BG_COLORS = [
  '#0052cc', '#00875a', '#ff5630', '#ff991f', '#6554c0',
  '#00b8d9', '#403294', '#e6225e', '#172b4d', '#344563',
];

interface Props {
  onClose: () => void;
}

export default function BoardSwitcher({ onClose }: Props) {
  const router = useRouter();
  const { boards, createBoard, fetchBoards, activeBoardId } = useStore();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(BG_COLORS[0]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const board = await createBoard(title, color);
    setTitle('');
    setCreating(false);
    onClose();
    router.push(`/board/${board.id}`);
  };

  const handleSwitch = (id: number) => {
    onClose();
    router.push(`/board/${id}`);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="popup"
        onClick={e => e.stopPropagation()}
        style={{ width: 360, padding: 0, overflow: 'hidden', marginTop: 44 }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Switch boards</span>
          <button onClick={onClose} className="btn-ghost" style={{ color: 'var(--text-muted)', padding: '2px 6px' }}>×</button>
        </div>

        <div style={{ padding: 8, maxHeight: 360, overflowY: 'auto' }}>
          {boards.map(b => (
            <button
              key={b.id}
              onClick={() => handleSwitch(b.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '8px 10px', borderRadius: 6,
                background: b.id === activeBoardId ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.1s',
              }}
              className="btn-ghost"
            >
              <div style={{
                width: 36, height: 28, borderRadius: 4,
                background: b.background_color,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
                {b.title}
              </span>
              {b.id === activeBoardId && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-btn)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: 8 }}>
          {creating ? (
            <div style={{ padding: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Board title</div>
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                  placeholder="My new board"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 6, border: '2px solid var(--bg-btn)' }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Background</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {BG_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: 36, height: 28, borderRadius: 4, background: c,
                        border: color === c ? '3px solid white' : '3px solid transparent',
                        transition: 'border-color 0.1s, transform 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" onClick={handleCreate} style={{ fontSize: 13 }}>Create board</button>
                <button className="btn-ghost" onClick={() => setCreating(false)} style={{ fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px', borderRadius: 6,
                fontSize: 14, color: 'var(--text-primary)',
                background: 'rgba(166,197,226,0.08)',
                transition: 'background 0.1s',
              }}
              className="btn-ghost"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create new board
            </button>
          )}
        </div>
      </div>
    </div>
  );
}