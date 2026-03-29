// frontend/app/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store';
import * as api from '../lib/api';

const DEFAULT_USER = {
  email: 'kira@example.com',
  name: 'Kira',
  avatar_url: 'https://ui-avatars.com/api/?name=Kira&background=0D8ABC&color=fff',
};

export default function Home() {
  const router = useRouter();
  const { boards, fetchBoards, fetchUsers, setCurrentUser, users } = useStore();
  const [isLoading, setIsLoading]   = useState(true);
  const [loadingText, setLoadingText] = useState('Loading…');
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // 1. Ensure a default user exists in the DB and is set as current
      await ensureDefaultUser();

      // 2. Fetch boards as the now-active user
      await fetchBoards();

      // boards in store may not be updated yet — re-read from store after fetch
      const { boards: latestBoards } = useStore.getState();

      if (latestBoards.length > 0) {
        router.push(`/board/${latestBoards[0].id}`);
      } else {
        await buildWorkspace();
      }
    } catch (err) {
      console.error('Init failed:', err);
      setLoadingText('Something went wrong. Please refresh.');
      setIsLoading(false);
    }
  };

  /** Create default user if missing, then set them as the active persona. */
  const ensureDefaultUser = async () => {
    setLoadingText('Setting up your account…');

    // Always fetch the full user list first
    await fetchUsers();
    const { users: allUsers } = useStore.getState();

    // Check if default user already exists in DB
    const existing = allUsers.find((u: any) => u.email === DEFAULT_USER.email);

    if (!existing) {
      // Create in DB
      try {
        await api.createUser(DEFAULT_USER);
        // Re-fetch so the store has the new user with its id
        await fetchUsers();
      } catch (_) {
        // Race condition — another tab may have created it; fetch and continue
        await fetchUsers();
      }
    }

    // Persist to localStorage so api.ts picks it up for x-user-email header
    localStorage.setItem('currentUserEmail', DEFAULT_USER.email);
    // Sync the store
    setCurrentUser(DEFAULT_USER.email);
  };

  const buildWorkspace = async () => {
    setIsLoading(true);

    try {
      // 1. Create Board
      setLoadingText('Setting up your board…');
      const board = await api.createBoard({
        title: 'Trello Clone Development',
        background_color: '#0079bf',
      });

      // 2. Create Labels
      setLoadingText('Creating labels…');
      const [lUrgent, lFrontend, lBackend] = await Promise.all([
        api.createLabel({ name: 'Urgent',   color_code: '#ef4444' }),
        api.createLabel({ name: 'Frontend', color_code: '#3b82f6' }),
        api.createLabel({ name: 'Backend',  color_code: '#10b981' }),
      ]);

      // 3. Create Lists
      setLoadingText('Creating lists…');
      const [list1, list2, list3] = await Promise.all([
        api.createList({ board_id: board.id, title: 'To Do',       position: 1000 }),
        api.createList({ board_id: board.id, title: 'In Progress',  position: 2000 }),
        api.createList({ board_id: board.id, title: 'Done',         position: 3000 }),
      ]);

      // 4. Create Cards (sequential to respect position ordering)
      setLoadingText('Populating cards…');
      const card1 = await api.createCard({
        list_id: list1.id, title: 'Design Database Schema', position: 1000,
        description: 'Normalize tables and setup SQLModel.',
      });
      const card2 = await api.createCard({
        list_id: list1.id, title: 'Setup Next.js Frontend', position: 2000,
      });
      const card3 = await api.createCard({
        list_id: list2.id, title: 'Implement Drag and Drop', position: 1000,
        cover_image_color: '#f59e0b',
      });
      await api.createCard({
        list_id: list3.id, title: 'Initialize FastAPI', position: 1000,
      });

      // 5. Attach Labels
      await Promise.all([
        api.addLabelToCard(card1.id, lBackend.id),
        api.addLabelToCard(card1.id, lUrgent.id),
        api.addLabelToCard(card2.id, lFrontend.id),
      ]);

      // Done — navigate
      setLoadingText('Opening board…');
      await fetchBoards();
      router.push(`/board/${board.id}`);

    } catch (err) {
      console.error('buildWorkspace failed:', err);
      setLoadingText('Error building workspace. Please refresh.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100svh', width: '100vw',
        alignItems: 'center', justifyContent: 'center', background: '#1d2125', gap: 24,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '4px solid rgba(166,197,226,0.16)',
          borderTopColor: '#579dff',
          animation: 'spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite',
        }}/>
        <div style={{
          color: '#b6c2cf', fontSize: 15, fontWeight: 500,
          animation: 'pulse 1.5s ease-in-out infinite',
          letterSpacing: '0.02em',
        }}>
          {loadingText}
        </div>
      </div>
    </>
  );
}