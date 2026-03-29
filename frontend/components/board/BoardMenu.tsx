// frontend/components/board/BoardMenu.tsx
'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import * as api from '../../lib/api';
import { 
  X, ChevronLeft, Users, Palette, Tag, Plus, 
  Pencil, Trash2, Check, ChevronRight, ChevronDown
} from 'lucide-react';

// Enhanced Backgrounds including Image Gradients
const BG_OPTIONS = [
  // Gradients (Images)
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&q=80&w=400', label: 'Dark Blue Gradient', icon: '🫧' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=400', label: 'Light Blue Gradient', icon: '❄️' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=400', label: 'Ocean Gradient', icon: '🌊' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557683304-673a23048d34?auto=format&fit=crop&q=80&w=400', label: 'Purple Gradient', icon: '🔮' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682260-96773eb01377?auto=format&fit=crop&q=80&w=400', label: 'Rainbow Gradient', icon: '🌈' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?auto=format&fit=crop&q=80&w=400', label: 'Orange Gradient', icon: '🍑' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&q=80&w=400', label: 'Pink Gradient', icon: '🌸' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?auto=format&fit=crop&q=80&w=400', label: 'Teal Gradient', icon: '🌍' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682233-43e671455dfa?auto=format&fit=crop&q=80&w=400', label: 'Slate Gradient', icon: '👽' },
  { type: 'image', value: 'https://images.unsplash.com/photo-1557682264-16e0b7405e3f?auto=format&fit=crop&q=80&w=400', label: 'Crimson Gradient', icon: '🌋' },
  // Solid Colors
  { type: 'color', value: '#0052cc', label: 'Ocean' },
  { type: 'color', value: '#00875a', label: 'Green' },
  { type: 'color', value: '#ff5630', label: 'Coral' },
  { type: 'color', value: '#ff991f', label: 'Peach' },
  { type: 'color', value: '#6554c0', label: 'Purple' },
  { type: 'color', value: '#00b8d9', label: 'Sky' },
  { type: 'color', value: '#403294', label: 'Indigo' },
  { type: 'color', value: '#e6225e', label: 'Pink' },
  { type: 'color', value: '#172b4d', label: 'Navy' },
  { type: 'color', value: '#344563', label: 'Slate' },
];

const LABEL_COLORS = [
  '#4bce97', '#f5cd47', '#fea362', '#f87168', '#9f8fef',
  '#579dff', '#60c6d2', '#94c748', '#e774bb', '#8590a2',
];

interface Props {
  onClose: () => void;
}

type MenuView = 'main' | 'labels' | 'members' | 'background' | 'create-label' | 'edit-label';

export default function BoardMenu({ onClose }: Props) {
  const store = useStore() as any;
  // Use memberships for accurate member resolution based on recent backend updates
  const { boardState, labels, users, fetchLabels, activeBoardId } = store;
  const refreshBoard = typeof store.refreshBoard === 'function' ? store.refreshBoard : async () => {};

  const [view, setView] = useState<MenuView>('main');
  const [editingLabel, setEditingLabel] = useState<{ id?: number; name: string; color_code: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isProcessing, setIsProcessing] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBgChange = async (option: typeof BG_OPTIONS[0]) => {
    if (!activeBoardId) return;
    
    // Check if user selected an image or a solid color
    const update = option.type === 'image' 
      ? { background_image: option.value, background_color: "transparent" }
      : { background_color: option.value, background_image: "" };
      
    await api.updateBoard(activeBoardId, update);
    await refreshBoard();
  };

  const handleSaveLabel = async () => {
    if (!editingLabel?.name || !editingLabel.color_code) return;
    setIsProcessing(true);
    try {
      if (editingLabel.id) {
        await api.updateLabel(editingLabel.id, { name: editingLabel.name, color_code: editingLabel.color_code });
      } else {
        await api.createLabel({ name: editingLabel.name, color_code: editingLabel.color_code });
      }
      await fetchLabels();
      setView('labels');
      setEditingLabel(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLabel = async (id: number) => {
    if (!confirm('Are you sure you want to delete this label?')) return;
    await api.deleteLabel(id);
    await fetchLabels();
  };

  const handleInvite = async () => {
    if (!activeBoardId) return;
    const user = users?.find((u: any) => u.email === inviteEmail);
    if (!user) { alert('User not found with that email'); return; }
    
    setIsProcessing(true);
    try {
      await api.addBoardMember(activeBoardId, { user_id: user.id, role: inviteRole });
      setInviteEmail('');
      await refreshBoard();
    } finally {
      setIsProcessing(false);
    }
  };

  const viewTitle = {
    main: 'Menu',
    labels: 'Labels',
    members: 'Board Members',
    background: 'Change Background',
    'create-label': 'Create Label',
    'edit-label': 'Edit Label',
  }[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        .menu-backdrop {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(3px);
          animation: menuFadeIn 0.2s ease-out;
        }

        .menu-panel {
          font-family: 'DM Sans', system-ui, sans-serif;
          position: fixed; top: 0; right: 0; bottom: 0;
          width: 360px; 
          background: #282e33; 
          border-left: 1px solid rgba(255,255,255,0.08);
          z-index: 501;
          display: flex; flex-direction: column;
          box-shadow: -8px 0 32px rgba(0,0,0,0.5);
          transform: translateX(0);
          animation: menuSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 600px) {
          .menu-panel { width: 100vw; border-left: none; }
        }

        @keyframes menuFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes menuSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .menu-scroll::-webkit-scrollbar { width: 6px; }
        .menu-scroll::-webkit-scrollbar-track { background: transparent; }
        .menu-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .menu-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

        .menu-icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #9fadbc; transition: all 0.15s ease;
        }
        .menu-icon-btn:hover { background: rgba(255,255,255,0.1); color: #ffffff; }

        .menu-nav-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 10px 12px; border-radius: 8px;
          font-size: 14px; font-weight: 500; color: #b6c2cf;
          background: transparent; border: none; cursor: pointer;
          transition: background 0.15s, color 0.15s; text-align: left;
        }
        .menu-nav-item:hover { background: rgba(255,255,255,0.08); color: #ffffff; }

        .menu-section-title {
          font-size: 12px; font-weight: 700; color: #8c9bab;
          text-transform: uppercase; letter-spacing: 0.04em;
          margin-bottom: 8px; display: block;
        }

        .menu-input, .menu-select {
          width: 100%; padding: 10px 12px;
          background: #22272b; border: 2px solid rgba(255,255,255,0.08);
          border-radius: 8px; color: #b6c2cf; font-size: 14px;
          font-family: inherit; outline: none; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .menu-input:focus, .menu-select:focus { border-color: #579dff; }
        .menu-select { cursor: pointer; appearance: none; }
        
        .menu-btn-primary {
          width: 100%; padding: 10px; border-radius: 8px;
          font-size: 14px; font-weight: 600; background: #0c66e4;
          color: white; border: none; cursor: pointer;
          transition: background 0.15s;
        }
        .menu-btn-primary:hover:not(:disabled) { background: #0055cc; }
        .menu-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .menu-btn-secondary {
          padding: 10px 16px; border-radius: 8px;
          font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.08);
          color: #b6c2cf; border: none; cursor: pointer; transition: background 0.15s;
        }
        .menu-btn-secondary:hover { background: rgba(255,255,255,0.15); color: white; }
      `}</style>

      <div className="menu-backdrop" onClick={onClose} />

      <div className="menu-panel">
        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0
        }}>
          {view !== 'main' ? (
            <button 
              onClick={() => setView(view === 'create-label' || view === 'edit-label' ? 'labels' : 'main')} 
              className="menu-icon-btn"
            >
              <ChevronLeft size={20} />
            </button>
          ) : <div style={{ width: 32 }} />} 

          <span style={{ fontWeight: 600, fontSize: 16, color: '#e5e9ea', flex: 1, textAlign: 'center' }}>
            {viewTitle}
          </span>

          <button onClick={onClose} className="menu-icon-btn">
            <X size={20} />
          </button>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="menu-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* ── MAIN VIEW ── */}
          {view === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {boardState && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 14, 
                  padding: '12px', background: 'rgba(255,255,255,0.03)', 
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{
                    width: 56, height: 40, borderRadius: 6,
                    background: boardState.background_color !== 'transparent' ? boardState.background_color : '#1d2125',
                    backgroundImage: boardState.background_image ? `url(${boardState.background_image})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)'
                  }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#e5e9ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {boardState.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c9bab', textTransform: 'capitalize', marginTop: 2 }}>
                      {boardState.my_role} Workspace
                    </div>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => setView('members')} className="menu-nav-item">
                  <Users size={18} />
                  <span style={{ flex: 1 }}>Members</span>
                  <ChevronRight size={16} className="opacity-50" />
                </button>
                <button onClick={() => setView('background')} className="menu-nav-item">
                  <Palette size={18} />
                  <span style={{ flex: 1 }}>Change background</span>
                  <ChevronRight size={16} className="opacity-50" />
                </button>
                <button onClick={() => setView('labels')} className="menu-nav-item">
                  <Tag size={18} />
                  <span style={{ flex: 1 }}>Labels</span>
                  <ChevronRight size={16} className="opacity-50" />
                </button>
              </div>
            </div>
          )}

          {/* ── BACKGROUND VIEW ── */}
          {view === 'background' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Image Gradients Section */}
              <div>
                <span className="menu-section-title">Gradients</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {BG_OPTIONS.filter(opt => opt.type === 'image').map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleBgChange(opt)}
                      title={opt.label}
                      style={{
                        height: 72, borderRadius: 8, 
                        backgroundImage: `url(${opt.value})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: 'none', cursor: 'pointer', position: 'relative',
                        outline: boardState?.background_image === opt.value ? '3px solid #579dff' : '3px solid transparent',
                        outlineOffset: 2, transition: 'transform 0.15s, outline 0.15s',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 16 }}>{opt.icon}</span>
                      {boardState?.background_image === opt.value && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                          <Check size={24} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

              {/* Solid Colors Section */}
              <div>
                <span className="menu-section-title">Solid Colors</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {BG_OPTIONS.filter(opt => opt.type === 'color').map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleBgChange(opt)}
                      title={opt.label}
                      style={{
                        aspectRatio: '1.2', borderRadius: 8, background: opt.value,
                        border: 'none', cursor: 'pointer', position: 'relative',
                        outline: boardState?.background_color === opt.value ? '3px solid #579dff' : '3px solid transparent',
                        outlineOffset: 2, transition: 'transform 0.15s, outline 0.15s',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {boardState?.background_color === opt.value && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={20} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LABELS VIEW ── */}
          {view === 'labels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button
                onClick={() => { setEditingLabel({ name: '', color_code: LABEL_COLORS[0] }); setView('create-label'); }}
                className="menu-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
              >
                <Plus size={16} /> Create a new label
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {labels?.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#8c9bab', fontSize: 13, marginTop: 16 }}>No labels found.</div>
                )}
                {labels?.map((l: any) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, height: 36, borderRadius: 6, background: l.color_code,
                      display: 'flex', alignItems: 'center', padding: '0 12px', 
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)', cursor: 'pointer'
                    }}
                    onClick={() => { setEditingLabel({ id: l.id, name: l.name, color_code: l.color_code }); setView('edit-label'); }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                        {l.name}
                      </span>
                    </div>
                    <button 
                      onClick={() => { setEditingLabel({ id: l.id, name: l.name, color_code: l.color_code }); setView('edit-label'); }} 
                      className="menu-icon-btn" title="Edit label"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteLabel(l.id)} 
                      className="menu-icon-btn" title="Delete label"
                      style={{ color: '#f87168' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CREATE / EDIT LABEL ── */}
          {(view === 'create-label' || view === 'edit-label') && editingLabel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ 
                height: 64, background: editingLabel.color_code, borderRadius: 8, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' 
              }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                  {editingLabel.name || 'Label preview'}
                </span>
              </div>

              <div>
                <span className="menu-section-title">Name</span>
                <input 
                  autoFocus value={editingLabel.name} 
                  onChange={e => setEditingLabel({ ...editingLabel, name: e.target.value })} 
                  placeholder="e.g. Frontend, Urgent..." 
                  className="menu-input"
                />
              </div>

              <div>
                <span className="menu-section-title">Select a color</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {LABEL_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setEditingLabel({ ...editingLabel, color_code: c })} 
                      style={{ 
                        height: 40, borderRadius: 6, background: c, border: 'none', 
                        cursor: 'pointer', outline: editingLabel.color_code === c ? '3px solid #579dff' : '3px solid transparent', 
                        outlineOffset: 2, transition: 'outline 0.15s',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  onClick={handleSaveLabel} 
                  disabled={isProcessing || !editingLabel.name.trim()}
                  className="menu-btn-primary" style={{ flex: 1 }}
                >
                  {isProcessing ? 'Saving...' : (view === 'edit-label' ? 'Save Changes' : 'Create Label')}
                </button>
                <button 
                  onClick={() => { setView('labels'); setEditingLabel(null); }} 
                  className="menu-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── MEMBERS VIEW ── */}
          {view === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="menu-section-title">Invite a member</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <select value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="menu-select">
                      <option value="">Select user to invite…</option>
                      {users?.map((u: any) => (<option key={u.id} value={u.email}>{u.name} ({u.email})</option>))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: 12, color: '#8c9bab', pointerEvents: 'none' }} />
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="menu-select">
                      <option value="viewer">Viewer (Read Only)</option>
                      <option value="editor">Editor (Can Edit)</option>
                      <option value="owner">Owner (Full Access)</option>
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: 12, color: '#8c9bab', pointerEvents: 'none' }} />
                  </div>
                  
                  <button 
                    onClick={handleInvite} 
                    disabled={!inviteEmail || isProcessing} 
                    className="menu-btn-primary"
                  >
                    {isProcessing ? 'Inviting...' : 'Share Board'}
                  </button>
                </div>
              </div>

              <div>
                <span className="menu-section-title">Current Members</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {boardState?.memberships?.map((m: any) => (
                    <div key={m.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px', 
                      borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ 
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, 
                        background: 'linear-gradient(135deg, #0c66e4, #579dff)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: 14, fontWeight: 700, color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {m.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e9ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c9bab', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.email}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: 11, fontWeight: 600, color: '#9fadbc', 
                        background: 'rgba(255,255,255,0.1)', padding: '4px 8px', 
                        borderRadius: 4, textTransform: 'capitalize' 
                      }}>
                        {m.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}