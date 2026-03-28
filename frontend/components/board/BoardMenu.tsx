// frontend/components/board/BoardMenu.tsx
'use client';
import { useState } from 'react';
import { useStore } from '../../store';
import * as api from '../../lib/api';

const BG_COLORS = [
  { color: '#0052cc', label: 'Ocean' },
  { color: '#00875a', label: 'Green' },
  { color: '#ff5630', label: 'Coral' },
  { color: '#ff991f', label: 'Peach' },
  { color: '#6554c0', label: 'Purple' },
  { color: '#00b8d9', label: 'Sky' },
  { color: '#403294', label: 'Indigo' },
  { color: '#e6225e', label: 'Pink' },
  { color: '#172b4d', label: 'Navy' },
  { color: '#344563', label: 'Slate' },
  { color: '#1d2125', label: 'Midnight' },
  { color: '#0747a6', label: 'Royal' },
  { color: '#006644', label: 'Forest' },
  { color: '#bf2600', label: 'Crimson' },
  { color: '#974f0c', label: 'Amber' },
];

// Unsplash-style background photos (using picsum for demo — replace with real Unsplash API in production)
const BG_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=160&q=60', label: 'Mountains' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&q=60', label: 'Beach' },
  { url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=160&q=60', label: 'Puppy' },
  { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=160&q=60', label: 'Night Sky' },
  { url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=160&q=60', label: 'Forest' },
  { url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=160&q=60', label: 'Architecture' },
];

interface Props {
  onClose: () => void;
}

type MenuView = 'main' | 'labels' | 'members' | 'background' | 'create-label' | 'edit-label';

export default function BoardMenu({ onClose }: Props) {
  const store = useStore() as any;
  const { boardState, labels, users, fetchLabels, activeBoardId } = store;
  const refreshBoard = typeof store.refreshBoard === 'function' ? store.refreshBoard : async () => {};

  const [view, setView] = useState<MenuView>('main');
  const [bgTab, setBgTab] = useState<'photos' | 'colors'>('photos');
  const [editingLabel, setEditingLabel] = useState<{ id?: number; name: string; color_code: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  const handleBgChange = async (value: string, type: 'color' | 'image') => {
    if (!activeBoardId) return;
    const update = type === 'color'
      ? { background_color: value, background_image: null }
      : { background_image: value, background_color: null };
    await api.updateBoard(activeBoardId, update);
    await refreshBoard();
  };

  const handleSaveLabel = async () => {
    if (!editingLabel?.name || !editingLabel.color_code) return;
    if (editingLabel.id) {
      await api.updateLabel(editingLabel.id, { name: editingLabel.name, color_code: editingLabel.color_code });
    } else {
      await api.createLabel({ name: editingLabel.name, color_code: editingLabel.color_code });
    }
    await fetchLabels();
    setView('labels');
    setEditingLabel(null);
  };

  const handleDeleteLabel = async (id: number) => {
    if (!confirm('Delete this label?')) return;
    await api.deleteLabel(id);
    await fetchLabels();
  };

  const handleInvite = async () => {
    if (!activeBoardId) return;
    const user = users?.find((u: any) => u.email === inviteEmail);
    if (!user) { alert('User not found with that email'); return; }
    await api.addBoardMember(activeBoardId, { user_id: user.id, role: inviteRole });
    setInviteEmail('');
    await refreshBoard();
  };

  const labelColors = [
    '#4bce97', '#f5cd47', '#fea362', '#f87168', '#9f8fef',
    '#579dff', '#60c6d2', '#94c748', '#e774bb', '#8590a2',
  ];

  const viewTitle = {
    main: boardState?.title || 'Menu',
    labels: 'Labels',
    members: 'Members',
    background: 'Change background',
    'create-label': 'Create label',
    'edit-label': 'Edit label',
  }[view];

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 140 }}
        onClick={onClose}
      />

      <div style={{
        position: 'fixed', top: 44, right: 0, bottom: 0,
        width: 340,
        background: '#282e33',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 8px 12px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          gap: 4,
        }}>
          {view !== 'main' && (
            <button
              onClick={() => setView(view === 'create-label' || view === 'edit-label' ? 'labels' : 'main')}
              style={{
                width: 28, height: 28, borderRadius: 4, border: 'none',
                background: 'transparent', color: '#9fadbc', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <span style={{
            fontWeight: 600, fontSize: 14, color: '#b6c2cf',
            flex: 1, textAlign: 'center',
          }}>
            {viewTitle}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 4, border: 'none',
              background: 'transparent', color: '#9fadbc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>

          {/* ── MAIN VIEW ── */}
          {view === 'main' && (
            <div>
              {/* Board preview */}
              {boardState && (
                <div style={{ padding: '8px 12px 16px', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 32, borderRadius: 6,
                      background: boardState.background_color || '#0052cc',
                      backgroundImage: boardState.background_image ? `url(${boardState.background_image})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#b6c2cf' }}>{boardState.title}</div>
                      <div style={{ fontSize: 12, color: '#9fadbc' }}>{boardState.my_role}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />

              {[
                {
                  label: 'About this board',
                  sub: 'Add a description to your board',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                  action: () => alert('Board description — coming soon!'),
                },
                {
                  label: 'Members',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  action: () => setView('members'),
                },
                {
                  label: 'Change background',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
                  action: () => setView('background'),
                },
                {
                  label: 'Labels',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
                  action: () => setView('labels'),
                },
                {
                  label: 'Activity',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                  action: () => alert('Activity log — coming soon!'),
                },
              ].map(item => (
                <MenuRow key={item.label} icon={item.icon} label={item.label} sub={(item as any).sub} onClick={item.action} />
              ))}
            </div>
          )}

          {/* ── BACKGROUND VIEW ── */}
          {view === 'background' && (
            <div>
              {/* Tab switcher */}
              <div style={{ display: 'flex', gap: 4, padding: '4px 4px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                {(['photos', 'colors'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setBgTab(tab)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: bgTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: bgTab === tab ? 'white' : '#9fadbc',
                      fontWeight: bgTab === tab ? 600 : 400, fontSize: 14,
                      transition: 'all 0.1s',
                    }}
                  >
                    {tab === 'photos' ? '📷 Photos' : '🎨 Colors'}
                  </button>
                ))}
              </div>

              {bgTab === 'photos' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {BG_PHOTOS.map(photo => (
                      <button
                        key={photo.url}
                        onClick={() => handleBgChange(photo.url, 'image')}
                        style={{
                          height: 80, borderRadius: 8, overflow: 'hidden',
                          backgroundImage: `url(${photo.thumb})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          border: 'none', cursor: 'pointer', position: 'relative',
                          outline: boardState?.background_image === photo.url ? '3px solid white' : '3px solid transparent',
                          transition: 'transform 0.1s, outline 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title={photo.label}
                      >
                        {boardState?.background_image === photo.url && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)',
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '4px 6px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                          fontSize: 11, color: 'white', fontWeight: 500,
                          textAlign: 'left',
                        }}>
                          {photo.label}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom upload option */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: '#9fadbc', marginBottom: 6, fontWeight: 600 }}>Custom</div>
                    <button style={{
                      width: '100%', height: 64, borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.2)',
                      color: '#9fadbc', fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'background 0.1s, border-color 0.1s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                      onClick={() => alert('Custom upload — coming soon!')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Upload a photo
                    </button>
                  </div>
                </>
              )}

              {bgTab === 'colors' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {BG_COLORS.map(({ color, label }) => (
                    <button
                      key={color}
                      onClick={() => handleBgChange(color, 'color')}
                      title={label}
                      style={{
                        height: 64, borderRadius: 8, background: color,
                        border: 'none', cursor: 'pointer', position: 'relative',
                        outline: boardState?.background_color === color ? '3px solid white' : '3px solid transparent',
                        transition: 'transform 0.1s, outline 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {boardState?.background_color === color && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LABELS VIEW ── */}
          {view === 'labels' && (
            <div>
              <button
                onClick={() => { setEditingLabel({ name: '', color_code: labelColors[0] }); setView('create-label'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  marginBottom: 12, background: 'rgba(255,255,255,0.08)',
                  fontSize: 14, color: '#b6c2cf', border: 'none', cursor: 'pointer',
                  fontWeight: 500, transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create a new label
              </button>

              {labels?.map((l: any) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{
                    flex: 1, height: 36, borderRadius: 6, background: l.color_code,
                    display: 'flex', alignItems: 'center', paddingLeft: 12, cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{l.name}</span>
                  </div>
                  <button
                    onClick={() => { setEditingLabel({ id: l.id, name: l.name, color_code: l.color_code }); setView('edit-label'); }}
                    style={iconBtnStyle}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteLabel(l.id)}
                    style={iconBtnStyle}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,104,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87168" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── CREATE / EDIT LABEL ── */}
          {(view === 'create-label' || view === 'edit-label') && editingLabel && (
            <div>
              <div style={{
                height: 56, background: editingLabel.color_code, borderRadius: 8,
                marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>
                  {editingLabel.name || 'Label preview'}
                </span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9fadbc', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</div>
                <input
                  value={editingLabel.name}
                  onChange={e => setEditingLabel({ ...editingLabel, name: e.target.value })}
                  placeholder="Label name…"
                  style={{
                    width: '100%', padding: '8px 10px',
                    background: '#22272b', borderRadius: 4,
                    color: '#b6c2cf', border: '2px solid rgba(255,255,255,0.2)',
                    outline: 'none', fontSize: 14, boxSizing: 'border-box',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#388bff'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9fadbc', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select a color</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {labelColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditingLabel({ ...editingLabel, color_code: c })}
                      style={{
                        height: 36, borderRadius: 4, background: c, border: 'none', cursor: 'pointer',
                        outline: editingLabel.color_code === c ? '3px solid white' : '3px solid transparent',
                        transition: 'transform 0.1s, outline 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSaveLabel}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 4, fontSize: 14, fontWeight: 600,
                    background: '#0c66e4', color: 'white', border: 'none', cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0055cc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0c66e4'}
                >
                  {view === 'edit-label' ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={() => { setView('labels'); setEditingLabel(null); }}
                  style={{
                    padding: '8px 16px', borderRadius: 4, fontSize: 14, fontWeight: 500,
                    background: 'rgba(255,255,255,0.08)', color: '#b6c2cf',
                    border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── MEMBERS VIEW ── */}
          {view === 'members' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fadbc', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Invite member
              </div>
              <div style={{ marginBottom: 16 }}>
                <select
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select user…</option>
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...selectStyle, marginTop: 6 }}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  onClick={handleInvite}
                  style={{
                    marginTop: 8, width: '100%', padding: '8px', borderRadius: 4, fontSize: 14, fontWeight: 600,
                    background: '#0c66e4', color: 'white', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0055cc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0c66e4'}
                >
                  Share
                </button>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9fadbc', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Board members
              </div>
              {boardState?.members?.map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderRadius: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#0052cc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white',
                  }}>
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#b6c2cf' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#9fadbc' }}>{m.email}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9fadbc', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                    {m.role}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MenuRow({ icon, label, sub, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px', borderRadius: 6,
        fontSize: 14, color: '#b6c2cf',
        background: 'transparent', border: 'none', cursor: 'pointer',
        transition: 'background 0.1s', marginBottom: 2, textAlign: 'left',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: '#9fadbc', flexShrink: 0 }}>{icon}</span>
      <div>
        <div>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#9fadbc', marginTop: 1 }}>{sub}</div>}
      </div>
      <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9fadbc" strokeWidth="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 32, height: 36, borderRadius: 6,
  background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.1s',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: '#22272b', borderRadius: 6,
  color: '#b6c2cf', border: '1px solid rgba(255,255,255,0.2)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};