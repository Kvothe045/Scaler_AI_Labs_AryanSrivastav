'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../store';
import SearchResults from './SearchResults';
import * as api from '../../lib/api';
import type { Card, List } from '../../types';

interface Props {
  onMenuClick: () => void;
  onSwitcherClick: () => void;
}

export default function Header({ onMenuClick, onSwitcherClick }: Props) {
  const router = useRouter();
  const { boardState, currentUserEmail, users, setCurrentUser, fetchBoardState, activeBoardId } = useStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ card: Card; list: List }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const currentUser = users.find(u => u.email === currentUserEmail) || users[0];

  // Debounced search
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const lists = boardState?.lists || [];
    const results: { card: Card; list: List }[] = [];
    for (const list of lists) {
      for (const card of list.cards || []) {
        if (card.title.toLowerCase().includes(search.toLowerCase()) && !card.is_archived) {
          results.push({ card, list });
        }
      }
    }
    setSearchResults(results);
  }, [search, boardState]);

  useEffect(() => {
    if (editTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editTitle]);

  useEffect(() => {
    setTitleVal(boardState?.title || '');
  }, [boardState?.title]);

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
    if (activeBoardId) fetchBoardState(activeBoardId);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      height: 44,
      background: 'rgba(0,0,0,0.32)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: 4,
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Logo */}
      <button
        onClick={() => router.push('/')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', borderRadius: 4,
          color: 'white', fontWeight: 700, fontSize: 16,
          letterSpacing: '-0.5px',
        }}
        className="btn-ghost"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="9" height="15" rx="2"/>
          <rect x="13" y="2" width="9" height="9" rx="2"/>
        </svg>
        <span style={{ color: 'white' }}>Trello</span>
      </button>

      {/* Board title */}
      {boardState && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {editTitle ? (
            <input
              ref={titleRef}
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditTitle(false); }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 4,
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                padding: '4px 8px',
                width: Math.max(120, titleVal.length * 10),
              }}
            />
          ) : (
            <button
              onClick={() => { setEditTitle(true); setTitleVal(boardState.title); }}
              style={{
                color: 'white', fontWeight: 700, fontSize: 16,
                padding: '4px 8px', borderRadius: 4,
                background: 'transparent',
              }}
              className="btn-ghost"
            >
              {boardState.title}
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Search bar - centered */}
      <div ref={searchRef} style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '0 10px',
          gap: 6,
          border: showSearch ? '1px solid rgba(87,157,255,0.6)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Search cards..."
            style={{
              background: 'transparent', border: 'none',
              color: 'white', padding: '6px 0', width: '100%',
              fontSize: 14,
            }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]); }} style={{ color: 'rgba(255,255,255,0.6)', padding: '2px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        {showSearch && (search.length >= 2) && (
          <SearchResults
            results={searchResults}
            query={search}
            onClose={() => { setShowSearch(false); setSearch(''); }}
          />
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Menu button */}
      <button className="btn-ghost" onClick={onMenuClick} style={{
        color: 'white', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <span style={{ fontSize: 13 }}>Menu</span>
      </button>

      {/* Profile switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="avatar"
          style={{ cursor: 'pointer', flexShrink: 0 }}
          title={currentUser?.name || currentUserEmail}
        >
          {(currentUser?.name || currentUserEmail)[0].toUpperCase()}
        </button>
        {showProfile && (
          <div className="popup" style={{
            position: 'absolute', top: '110%', right: 0,
            width: 240, zIndex: 200, padding: 8,
          }}>
            <div style={{ padding: '4px 8px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Switch Account
            </div>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleUserSwitch(u.email)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px', borderRadius: 4,
                  background: u.email === currentUserEmail ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                className="btn-ghost"
              >
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{u.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.email}</div>
                </div>
                {u.email === currentUserEmail && (
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-btn)" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}