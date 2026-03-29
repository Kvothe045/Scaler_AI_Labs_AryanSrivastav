// frontend/components/board/BoardSwitcher.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store';

const BG_COLORS = [
  { hex: '#0052cc', label: 'Ocean' },
  { hex: '#00875a', label: 'Forest' },
  { hex: '#ff5630', label: 'Flame' },
  { hex: '#ff991f', label: 'Amber' },
  { hex: '#6554c0', label: 'Violet' },
  { hex: '#00b8d9', label: 'Cyan' },
  { hex: '#403294', label: 'Indigo' },
  { hex: '#e6225e', label: 'Rose' },
  { hex: '#172b4d', label: 'Navy' },
  { hex: '#344563', label: 'Slate' },
];

/**
 * Utility: Lightens or darkens a hex color for creating dynamic gradients.
 */
function hexAdjust(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(c.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(c.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(c.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getBoardGradient(hex: string) {
  return `linear-gradient(135deg, ${hex} 0%, ${hexAdjust(hex, 32)} 100%)`;
}

interface Props {
  onClose: () => void;
}

/**
 * BoardSwitcher Component
 * * A modal overlay allowing users to search, switch between, and create new boards.
 * * Implements dynamic gradients, keyboard navigation, responsive mobile docking, 
 * and debounce locks to prevent duplicate submissions.
 */
export default function BoardSwitcher({ onClose }: Props) {
  const router = useRouter();
  const { boards, createBoard, activeBoardId } = useStore();

  const [creating, setCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // <-- NEW: Locks the UI while API runs
  const [title, setTitle]       = useState('');
  const [color, setColor]       = useState(BG_COLORS[0].hex);
  const [search, setSearch]     = useState('');
  const [mounted, setMounted]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Entrance animation & auto-focus
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    // Focus search when opening (if not on a mobile device where keyboard popups are annoying)
    if (window.innerWidth > 768) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, []);

  // Auto-focus title input when creating a new board
  useEffect(() => {
    if (creating && window.innerWidth > 768) {
      setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [creating]);

  const filtered = boards.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!title.trim() || isSaving) return; // <-- NEW: Exit if already saving
    
    setIsSaving(true);
    try {
      const board = await createBoard(title, color);
      setTitle('');
      setCreating(false);
      onClose();
      router.push(`/board/${board.id}`);
    } catch (error) {
      console.error("Failed to create board:", error);
      setIsSaving(false); // Unlock if there's an error so they can try again
    }
  };

  const handleSwitch = (id: number) => {
    onClose();
    router.push(`/board/${id}`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        /* NEW: Spinner animation */
        @keyframes bs-spin {
          to { transform: rotate(360deg); }
        }

        /* ── Overlay ── */
        .bs-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(52px, 8vw, 72px) clamp(8px, 4vw, 24px) 24px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        /* ── Panel ── */
        .bs-panel {
          font-family: 'DM Sans', system-ui, sans-serif;
          width: min(400px, 100%);
          background: #161b22;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 32px 80px rgba(0,0,0,0.8),
            0 8px 24px rgba(0,0,0,0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: min(88vh, 680px);
          transform: translateY(${mounted ? '0px' : '-14px'});
          opacity: ${mounted ? 1 : 0};
          transition:
            transform 0.28s cubic-bezier(0.34, 1.46, 0.64, 1),
            opacity 0.22s ease;
        }

        /* ── Header ── */
        .bs-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 16px 13px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .bs-hd-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.38);
        }
        .bs-close-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s, color 0.12s;
        }
        .bs-close-btn:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }

        /* ── Search bar ── */
        .bs-search-wrap {
          padding: 10px 12px 8px;
          flex-shrink: 0;
        }
        .bs-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          padding: 0 11px;
          transition: border-color 0.15s, background 0.15s;
        }
        .bs-search-box:focus-within {
          border-color: rgba(87,157,255,0.55);
          background: rgba(87,157,255,0.05);
        }
        .bs-search-box svg { color: rgba(255,255,255,0.3); flex-shrink: 0; }
        .bs-search-inp {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,0.85);
          padding: 10px 0;
        }
        .bs-search-inp::placeholder { color: rgba(255,255,255,0.22); }
        .bs-search-clear {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.25); padding: 0;
          display: flex; align-items: center;
          transition: color 0.1s;
        }
        .bs-search-clear:hover { color: rgba(255,255,255,0.55); }

        /* ── Board list ── */
        .bs-list {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding: 6px 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .bs-board-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .bs-board-row:hover { background: rgba(255,255,255,0.06); }
        .bs-board-row.active { background: rgba(87,157,255,0.1); }
        .bs-board-row.active:hover { background: rgba(87,157,255,0.14); }

        .bs-thumb {
          width: 42px; height: 32px;
          border-radius: 7px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          position: relative;
          overflow: hidden;
        }
        .bs-thumb::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(to bottom right, rgba(255,255,255,0.08), transparent);
        }

        .bs-board-name {
          flex: 1;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .bs-board-row.active .bs-board-name {
          color: rgba(255,255,255,0.92);
        }

        .bs-active-pip {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #579dff;
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(87,157,255,0.8);
        }

        .bs-empty {
          padding: 32px 16px;
          text-align: center;
          color: rgba(255,255,255,0.22);
          font-size: 13px;
          line-height: 1.5;
        }
        .bs-empty strong {
          display: block;
          font-size: 15px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 4px;
        }

        /* ── Separator ── */
        .bs-sep {
          height: 1px;
          background: rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        /* ── Footer ── */
        .bs-foot {
          flex-shrink: 0;
          padding: 10px 10px 14px;
        }

        .bs-new-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px dashed rgba(255,255,255,0.14);
          background: transparent;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          text-align: left;
        }
        .bs-new-btn:hover {
          border-color: rgba(87,157,255,0.5);
          background: rgba(87,157,255,0.06);
          color: rgba(87,157,255,0.9);
        }

        /* ── Create form ── */
        .bs-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 4px 4px 0;
        }

        .bs-preview {
          border-radius: 10px;
          height: 60px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          padding: 8px 12px;
          transition: background 0.3s ease;
        }
        .bs-preview::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);
        }
        .bs-preview-cards {
          position: absolute;
          top: 8px; left: 10px;
          display: flex; gap: 5px;
          opacity: 0.35;
        }
        .bs-preview-card {
          width: 28px; height: 16px;
          border-radius: 3px;
          background: rgba(255,255,255,0.6);
        }
        .bs-preview-name {
          position: relative;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          text-shadow: 0 1px 3px rgba(0,0,0,0.6);
        }

        .bs-field-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .bs-text-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 9px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }
        .bs-text-input:focus {
          border-color: rgba(87,157,255,0.6);
          background: rgba(87,157,255,0.08);
        }
        /* Lock input styles when saving */
        .bs-text-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bs-swatches {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }
        .bs-swatch {
          aspect-ratio: 7 / 5;
          border-radius: 8px;
          border: 2.5px solid transparent;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.13s, border-color 0.13s, box-shadow 0.13s;
        }
        .bs-swatch:hover:not(:disabled) { transform: scale(1.06); }
        .bs-swatch.sel {
          border-color: #fff;
          transform: scale(1.08);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.25), 0 4px 14px rgba(0,0,0,0.5);
        }
        .bs-swatch-tick {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.12s;
        }
        .bs-swatch.sel .bs-swatch-tick { opacity: 1; }
        .bs-swatch:disabled { cursor: not-allowed; opacity: 0.6; }

        .bs-acts {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 4px;
        }
        .bs-btn-primary {
          flex: 1;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: #0c66e4;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s, transform 0.1s, opacity 0.12s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .bs-btn-primary:hover:not(:disabled) {
          background: #0550ae;
          transform: translateY(-1px);
        }
        .bs-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .bs-btn-cancel {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }
        .bs-btn-cancel:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
        }
        .bs-btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Responsive docking for Mobile ── */
        @media (max-width: 600px) {
          .bs-overlay {
            padding: 0;
            align-items: flex-end; /* Docks to the bottom on mobile */
          }
          .bs-panel {
            width: 100vw;
            border-radius: 20px 20px 0 0;
            max-height: 90svh; /* svh ensures it respects mobile browser UI bars */
            transform: translateY(${mounted ? '0px' : '100%'}); /* Slides up from bottom */
            border-bottom: none;
            border-left: none;
            border-right: none;
            padding-bottom: env(safe-area-inset-bottom, 20px); /* iPhone home indicator safety */
          }
        }
      `}</style>

      <div className="bs-overlay" onClick={() => !isSaving && onClose()}>
        <div className="bs-panel" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="bs-hd">
            <span className="bs-hd-label">
              {creating ? 'Create Board' : 'Your Boards'}
            </span>
            <button className="bs-close-btn" onClick={() => !isSaving && onClose()} aria-label="Close" disabled={isSaving}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Search (only when browsing) ── */}
          {!creating && (
            <div className="bs-search-wrap">
              <div className="bs-search-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  className="bs-search-inp"
                  placeholder="Find a board…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && (search ? setSearch('') : onClose())}
                />
                {search && (
                  <button className="bs-search-clear" onClick={() => setSearch('')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Board list ── */}
          {!creating && (
            <div className="bs-list">
              {filtered.length === 0 ? (
                <div className="bs-empty">
                  <strong>{search ? 'No results' : 'No boards'}</strong>
                  {search
                    ? `Nothing matches "${search}"`
                    : 'Create your first board below.'}
                </div>
              ) : (
                filtered.map((b: any) => (
                  <button
                    key={b.id}
                    className={`bs-board-row ${b.id === activeBoardId ? 'active' : ''}`}
                    onClick={() => handleSwitch(b.id)}
                  >
                    <div
                      className="bs-thumb"
                      style={{ background: getBoardGradient(b.background_color) }}
                    />
                    <span className="bs-board-name">{b.title}</span>
                    {b.id === activeBoardId && <div className="bs-active-pip" />}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="bs-sep" />

          {/* ── Footer ── */}
          <div className="bs-foot">
            {creating ? (
              <div className="bs-form">

                {/* Live preview */}
                <div
                  className="bs-preview"
                  style={{ background: getBoardGradient(color) }}
                >
                  <div className="bs-preview-cards">
                    <div className="bs-preview-card" />
                    <div className="bs-preview-card" style={{ width: 20 }} />
                    <div className="bs-preview-card" style={{ width: 24 }} />
                  </div>
                  <span className="bs-preview-name">
                    {title.trim() || 'Board name…'}
                  </span>
                </div>

                {/* Title input */}
                <div>
                  <label className="bs-field-label">Title</label>
                  <input
                    ref={titleRef}
                    className="bs-text-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={isSaving} // <-- Lock during save
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !isSaving) handleCreate(); // <-- Lock during save
                      if (e.key === 'Escape' && !isSaving) { setCreating(false); setTitle(''); }
                    }}
                    placeholder="e.g. Product Roadmap"
                    maxLength={60}
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label className="bs-field-label">Background Color</label>
                  <div className="bs-swatches">
                    {BG_COLORS.map(c => (
                      <button
                        key={c.hex}
                        disabled={isSaving} // <-- Lock during save
                        className={`bs-swatch ${color === c.hex ? 'sel' : ''}`}
                        style={{ background: getBoardGradient(c.hex) }}
                        onClick={() => setColor(c.hex)}
                        title={c.label}
                        aria-label={c.label}
                      >
                        <span className="bs-swatch-tick">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="bs-acts">
                  <button
                    className="bs-btn-primary"
                    onClick={handleCreate}
                    disabled={!title.trim() || isSaving} // <-- Lock during save
                  >
                    {isSaving ? (
                      <>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          animation: 'bs-spin 0.6s linear infinite'
                        }} />
                        Creating...
                      </>
                    ) : (
                      'Create board'
                    )}
                  </button>
                  <button
                    className="bs-btn-cancel"
                    onClick={() => { setCreating(false); setTitle(''); }}
                    disabled={isSaving} // <-- Lock during save
                  >
                    Cancel
                  </button>
                </div>

              </div>
            ) : (
              <button className="bs-new-btn" onClick={() => setCreating(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create new board
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}