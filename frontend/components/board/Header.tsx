'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, Filters } from '../../store';
import SearchResults from './SearchResults';
import CardModal from '../card/CardModal';
import * as api from '../../lib/api';
import type { Card, List } from '../../types';

interface Props {
  onMenuClick: () => void;
  onSwitcherClick: () => void;
  onSidebarToggle?: () => void;
}

// ── Role badge colours ─────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  owner:  { bg: 'rgba(255,171,0,0.18)',  color: '#ffab00', border: 'rgba(255,171,0,0.4)'  },
  editor: { bg: 'rgba(87,157,255,0.18)', color: '#7dc0ff', border: 'rgba(87,157,255,0.4)' },
  viewer: { bg: 'rgba(154,187,101,0.18)',color: '#9abb65', border: 'rgba(154,187,101,0.4)'},
};

export default function Header({ onMenuClick, onSwitcherClick, onSidebarToggle }: Props) {
  const router = useRouter();
  const {
    boardState, currentUserEmail, currentUserRole, users,
    setCurrentUser, fetchBoardState, activeBoardId, labels,
    filters, setFilters, createUser,
  } = useStore() as any;

  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState<{ card: Card; list: List }[]>([]);
  const [showSearch,    setShowSearch]    = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [showFilter,    setShowFilter]    = useState(false);
  const [editTitle,     setEditTitle]     = useState(false);
  const [titleVal,      setTitleVal]      = useState('');
  const [mobileSearch,  setMobileSearch]  = useState(false);

  // ── Card selected from search results — rendered at top level ──────────
  const [searchCard, setSearchCard] = useState<{ card: Card; list: List } | null>(null);

  // Create-user modal state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName,    setNewUserName]    = useState('');
  const [newUserEmail,   setNewUserEmail]   = useState('');
  const [creating,       setCreating]       = useState(false);
  const [createError,    setCreateError]    = useState('');

  const searchRef  = useRef<HTMLDivElement>(null);
  const filterRef  = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentUser = users.find((u: any) => u.email === currentUserEmail) || users[0];
  const labelCount  = filters.label_ids?.length || 0;
  const hasFilters  = !!(labelCount > 0 || filters.member_id || filters.due_date);
  const filterCount = labelCount + (filters.member_id ? 1 : 0) + (filters.due_date ? 1 : 0);

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setSearchResults([]); return; }
    const lists = boardState?.lists || [];
    const results: { card: Card; list: List }[] = [];
    for (const list of lists)
      for (const card of list.cards || [])
        if (card.title.toLowerCase().includes(search.toLowerCase()) && !card.is_archived)
          results.push({ card, list });
    setSearchResults(results);
  }, [search, boardState]);

  useEffect(() => {
    if (editTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); }
  }, [editTitle]);

  useEffect(() => { setTitleVal(boardState?.title || ''); }, [boardState?.title]);

  const saveTitle = async () => {
    if (!titleVal.trim() || !activeBoardId) return;
    setEditTitle(false);
    if (titleVal !== boardState?.title) {
      await api.updateBoard(activeBoardId, { title: titleVal });
      fetchBoardState(activeBoardId);
    }
  };

  const handleUserSwitch = (email: string) => {
    setCurrentUser(email);
    setShowProfile(false);
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setCreateError('Name and email are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createUser({ name: newUserName.trim(), email: newUserEmail.trim() });
      setNewUserName('');
      setNewUserEmail('');
      setShowCreateUser(false);
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  // ── Shared helpers for closing search ─────────────────────────────────
  const closeDesktopSearch = () => {
    setShowSearch(false);
    setSearch('');
    setSearchResults([]);
  };
  const closeMobileSearch = () => {
    setMobileSearch(false);
    setSearch('');
    setSearchResults([]);
  };

  // ── Card selected from search: close search, open modal at top level ──
  const handleCardSelect = (card: Card, list: List) => {
    closeDesktopSearch();
    closeMobileSearch();
    setSearchCard({ card, list });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setShowSearch(false);
      if (filterRef.current  && !filterRef.current.contains(e.target as Node))  setShowFilter(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
        setShowCreateUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileSearch(false); setShowCreateUser(false); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const avatarColors = ['#0c66e4', '#6554c0', '#00875a', '#cf9f02', '#c9372c', '#e56910'];
  const getAvatarColor = (name: string) => avatarColors[(name || '').charCodeAt(0) % avatarColors.length] || '#0c66e4';

  const avatarInitial = (currentUser?.name || currentUserEmail || 'U')[0].toUpperCase();
  const avatarColor   = getAvatarColor(currentUser?.name || '');

  const roleStyle = currentUserRole ? ROLE_STYLE[currentUserRole] : null;

  return (
    <>
      <style>{`
        .hdr {
          height: 48px; background: rgba(0,0,0,0.35);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; padding: 0 10px; gap: 6px;
          flex-shrink: 0; position: relative; z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          box-sizing: border-box; width: 100%;
        }
        .hdr-sidebar-btn { display: none !important; }
        .hdr-logo-text { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
        .hdr-title-btn {
          color: white; font-weight: 700; font-size: 15px;
          padding: 4px 8px; border-radius: 6px;
          background: transparent; border: none; cursor: pointer;
          max-width: 200px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; transition: background 0.15s; flex-shrink: 1;
        }
        .hdr-role-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 2px 7px; border-radius: 20px;
          border: 1px solid; flex-shrink: 0;
        }
        .hdr-search { width: clamp(120px, 18vw, 230px); position: relative; flex-shrink: 1; }
        .hdr-search-mobile-btn { display: none !important; }
        .hdr-btn-label { display: inline; }
        .hdr-filter-drop {
          position: absolute; top: calc(100% + 8px); right: 0; width: 320px;
          background: #282e33; border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.75);
          border: 1px solid rgba(255,255,255,0.1);
          z-index: 300; max-height: 80vh; overflow-y: auto;
        }
        .hdr-profile-drop {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #282e33; border-radius: 12px; padding: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.7);
          z-index: 300; min-width: 220px; max-width: min(270px, 90vw);
        }
        .hdr-create-user {
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 6px; padding-top: 8px;
        }
        .hdr-user-input {
          width: 100%; padding: 8px 10px; border-radius: 8px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          color: #c8d0d9; font-size: 13px; outline: none; box-sizing: border-box;
          font-family: inherit; transition: border-color 0.15s;
        }
        .hdr-user-input:focus { border-color: rgba(87,157,255,0.6); }
        .hdr-msearch {
          display: none; position: fixed; inset: 0; top: 0;
          background: rgba(14,17,20,0.97); z-index: 600;
          flex-direction: column; padding: 12px 14px 20px;
          box-sizing: border-box; gap: 12px;
        }
        .hdr-msearch.open { display: flex; }

        @media (max-width: 960px) {
          .hdr-btn-label { display: none; }
          .hdr-search { width: clamp(90px, 14vw, 155px); }
          .hdr-title-btn { max-width: 140px; font-size: 14px; }
          .hdr-role-badge { display: none; }
        }
        @media (max-width: 640px) {
          .hdr { padding: 0 8px; gap: 4px; }
          .hdr-logo-text { display: none; }
          .hdr-search { display: none; }
          .hdr-search-mobile-btn { display: flex !important; }
          .hdr-sidebar-btn { display: flex !important; }
          .hdr-title-btn { max-width: 110px; font-size: 13px; }
          .hdr-filter-drop {
            position: fixed; top: 56px; left: 8px; right: 8px;
            width: auto; max-height: 75vh;
          }
          .hdr-profile-drop {
            position: fixed; top: 56px; right: 8px;
          }
        }
        @media (max-width: 380px) {
          .hdr { gap: 2px; padding: 0 6px; }
          .hdr-title-btn { max-width: 75px; font-size: 12px; }
        }
      `}</style>

      {/* ── CardModal opened from search — rendered here, OUTSIDE the header
           so it has a clean stacking context and appears fully in front ── */}
      {searchCard && (
        <CardModal
          card={searchCard.card}
          list={searchCard.list}
          onClose={() => setSearchCard(null)}
        />
      )}

      {/* Mobile search fullscreen */}
      <div className={`hdr-msearch${mobileSearch ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.1)', borderRadius: 10,
            padding: '0 12px', height: 44,
            border: '1.5px solid rgba(87,157,255,0.5)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              autoFocus={mobileSearch} value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cards…"
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 15, outline: 'none', flex: 1 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 20, cursor: 'pointer', padding: 0 }}>×</button>
            )}
          </div>
          <button
            onClick={closeMobileSearch}
            style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
          >Cancel</button>
        </div>
        {search.length >= 2 ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <SearchResults
              results={searchResults}
              query={search}
              onClose={closeMobileSearch}
              onCardSelect={handleCardSelect}
            />
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center', paddingTop: 48 }}>
            Type at least 2 characters to search
          </div>
        )}
      </div>

      <header className="hdr">
        {/* Sidebar toggle — mobile only */}
        {onSidebarToggle && (
          <button
            className="hdr-sidebar-btn"
            onClick={onSidebarToggle} aria-label="Open sidebar"
            style={{
              alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'white', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}

        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
            borderRadius: 6, background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'white', flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="2" width="9" height="15" rx="2"/>
            <rect x="13" y="2" width="9" height="9" rx="2"/>
          </svg>
          <span className="hdr-logo-text">Trello</span>
        </button>

        {/* Board title + role badge */}
        {boardState && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 }}>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.25)', margin: '0 4px', flexShrink: 0 }}/>
            {editTitle ? (
              <input
                ref={titleRef} value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditTitle(false); }}
                style={{
                  background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(87,157,255,0.7)',
                  borderRadius: 6, color: 'white', fontWeight: 700, fontSize: 14,
                  padding: '4px 8px', minWidth: 60,
                  width: Math.max(60, Math.min(titleVal.length * 9, 190)),
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            ) : (
              <button
                className="hdr-title-btn"
                onClick={() => { setEditTitle(true); setTitleVal(boardState.title); }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{boardState.title}</button>
            )}

            {/* Role badge */}
            {roleStyle && (
              <span
                className="hdr-role-badge"
                style={{ background: roleStyle.bg, color: roleStyle.color, borderColor: roleStyle.border }}
              >
                {currentUserRole}
              </span>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}/>

        {/* Desktop search */}
        <div ref={searchRef} className="hdr-search">
          <div style={{
            display: 'flex', alignItems: 'center',
            background: showSearch ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '0 8px', gap: 6,
            border: showSearch ? '1.5px solid rgba(87,157,255,0.6)' : '1.5px solid transparent',
            transition: 'all 0.18s', height: 32,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setShowSearch(true)}
              placeholder="Search…"
              style={{ background: 'transparent', border: 'none', color: 'white', padding: 0, width: '100%', fontSize: 13, outline: 'none' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer', padding: 0 }}>×</button>
            )}
          </div>
          {showSearch && (
            <SearchResults
              results={searchResults}
              query={search}
              onClose={closeDesktopSearch}
              onCardSelect={handleCardSelect}
            />
          )}
        </div>

        {/* Mobile search icon */}
        <button
          className="hdr-search-mobile-btn"
          onClick={() => setMobileSearch(true)} aria-label="Search"
          style={{
            alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 6,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: 'white', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Filter */}
        <div ref={filterRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowFilter(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 8px', height: 32, borderRadius: 8,
              background: hasFilters ? 'rgba(87,157,255,0.22)' : 'rgba(255,255,255,0.1)',
              color: hasFilters ? '#7dc0ff' : 'rgba(255,255,255,0.85)',
              fontSize: 13, fontWeight: 500,
              border: hasFilters ? '1.5px solid rgba(87,157,255,0.5)' : '1.5px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = hasFilters ? 'rgba(87,157,255,0.3)' : 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = hasFilters ? 'rgba(87,157,255,0.22)' : 'rgba(255,255,255,0.1)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span className="hdr-btn-label">Filter</span>
            {filterCount > 0 && (
              <span style={{ background: '#579dff', color: '#0c1b33', borderRadius: '50%', width: 17, height: 17, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{filterCount}</span>
            )}
          </button>
          {showFilter && <FilterDropdown filters={filters} onFilter={setFilters} onClose={() => setShowFilter(false)}/>}
        </div>

        {/* Menu */}
        <button
          onClick={onMenuClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', height: 32,
            borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
            fontSize: 13, fontWeight: 500, border: '1.5px solid transparent',
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span className="hdr-btn-label">Menu</span>
        </button>

        {/* Avatar / Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowCreateUser(false); }}
            title={currentUser?.name || currentUserEmail}
            style={{
              width: 32, height: 32, borderRadius: '50%', background: avatarColor,
              border: showProfile ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
          >{avatarInitial}</button>

          {showProfile && !showCreateUser && (
            <div className="hdr-profile-drop">
              {/* Current user info */}
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#9fadbc', marginBottom: 2 }}>Signed in as</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c8d0d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.name || currentUserEmail}
                </div>
                {currentUserEmail && (
                  <div style={{ fontSize: 11, color: '#8a9bb0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {currentUserEmail}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 8px 6px' }}>
                Switch account
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {users.map((u: any) => {
                  const uColor = getAvatarColor(u.name || '');
                  const isActive = u.email === currentUserEmail;
                  return (
                    <button
                      key={u.email} onClick={() => handleUserSwitch(u.email)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '7px 8px', borderRadius: 8, background: isActive ? 'rgba(87,157,255,0.1)' : 'none',
                        border: 'none', cursor: 'pointer',
                        color: isActive ? '#7dc0ff' : '#b6c2cf',
                        fontSize: 13, textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: uColor,
                        color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#8a9bb0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                      {isActive && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4bce97" strokeWidth="3" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hdr-create-user">
                <button
                  onClick={() => setShowCreateUser(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 8px', borderRadius: 8, background: 'none', border: 'none',
                    cursor: 'pointer', color: '#9fadbc', fontSize: 13,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>
                    </svg>
                  </div>
                  Add new user
                </button>
              </div>
            </div>
          )}

          {/* Create user panel */}
          {showProfile && showCreateUser && (
            <div className="hdr-profile-drop">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <button
                  onClick={() => setShowCreateUser(false)}
                  style={{ background: 'none', border: 'none', color: '#8a9bb0', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#c8d0d9' }}>Create new user</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
                <div>
                  <label style={{ fontSize: 11, color: '#8a9bb0', fontWeight: 600, display: 'block', marginBottom: 4 }}>Full name</label>
                  <input className="hdr-user-input" placeholder="Jane Smith" value={newUserName} onChange={e => setNewUserName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8a9bb0', fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
                  <input className="hdr-user-input" placeholder="jane@example.com" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateUser(); }} />
                </div>
                {createError && (
                  <div style={{ fontSize: 12, color: '#f87168', background: 'rgba(248,113,104,0.1)', padding: '6px 8px', borderRadius: 6 }}>
                    {createError}
                  </div>
                )}
                <button
                  onClick={handleCreateUser} disabled={creating}
                  style={{
                    padding: '8px 0', borderRadius: 8, border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                    background: creating ? 'rgba(87,157,255,0.3)' : '#0c66e4',
                    color: 'white', fontWeight: 600, fontSize: 13,
                    transition: 'background 0.15s', marginTop: 2,
                  }}
                  onMouseEnter={e => { if (!creating) (e.currentTarget as HTMLElement).style.background = '#0055cc'; }}
                  onMouseLeave={e => { if (!creating) (e.currentTarget as HTMLElement).style.background = '#0c66e4'; }}
                >
                  {creating ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

// ── Filter Dropdown ────────────────────────────────────────────────────────────
function FilterDropdown({ filters, onFilter, onClose }: { filters: Filters; onFilter: (f: Filters) => void; onClose: () => void; }) {
  const { labels = [], users = [] } = useStore() as any;
  const activeLabelIds: number[] = filters.label_id || [];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose}/>
      <div className="hdr-filter-drop" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#282e33', zIndex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#c8d0d9' }}>Filter cards</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(activeLabelIds.length > 0 || filters.member_id || filters.due_date) && (
              <button onClick={() => onFilter({})} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'rgba(248,113,104,0.15)', color: '#f87168', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a9bb0', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Labels</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {labels.length === 0 && <span style={{ fontSize: 12, color: '#8a9bb0' }}>No labels</span>}
              {labels.map((l: any) => {
                const isActive = activeLabelIds.includes(l.id);
                return (
                  <button key={l.id}
                    onClick={() => {
                      const newIds = isActive ? activeLabelIds.filter((id: number) => id !== l.id) : [...activeLabelIds, l.id];
                      onFilter({ ...filters, label_id: newIds.length ? newIds : undefined });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: isActive ? l.color_code : 'rgba(255,255,255,0.06)', color: isActive ? 'white' : '#b6c2cf', border: `1.5px solid ${isActive ? l.color_code : 'transparent'}`, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: isActive ? 'white' : l.color_code, flexShrink: 0, opacity: isActive ? 0.3 : 1 }}/>
                    {l.name}
                    {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Member</div>
            {users.map((u: any) => {
              const isActive = filters.member_id === u.id;
              return (
                <button key={u.id}
                  onClick={() => onFilter({ ...filters, member_id: isActive ? undefined : u.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 8, background: isActive ? 'rgba(87,157,255,0.15)' : 'transparent', border: 'none', cursor: 'pointer', width: '100%', marginBottom: 4 }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0c66e4', color: 'white', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{u.name[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: isActive ? '#7dc0ff' : '#b6c2cf', fontWeight: isActive ? 600 : 400 }}>{u.name}</span>
                  {isActive && <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#579dff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              );
            })}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Due Date (before)</div>
            <input type="date" value={filters.due_date || ''}
              onChange={e => onFilter({ ...filters, due_date: e.target.value || undefined })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#c8d0d9', fontSize: 13, outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}