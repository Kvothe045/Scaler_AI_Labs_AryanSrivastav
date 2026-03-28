'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store';

export default function Home() {
  const router = useRouter();
  const { boards, fetchBoards, createBoard } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await fetchBoards();
      } catch (error) {
        console.error("Failed to fetch boards", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, [fetchBoards]);

  // If we have boards, automatically redirect to the first one
  useEffect(() => {
    if (!isLoading && boards.length > 0) {
      router.push(`/board/${boards[0].id}`);
    }
  }, [isLoading, boards, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1d2125]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A6C5E229] border-t-[#579dff]"></div>
      </div>
    );
  }

  // If no boards exist, show a quick creation screen
  if (boards.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1d2125] text-white">
        <div className="bg-[#282e33] p-8 rounded-xl shadow-2xl border border-white/10 w-96">
          <h1 className="text-xl font-bold mb-2">Welcome to Trello Clone</h1>
          <p className="text-sm text-[#8c9bab] mb-6">You don't have any boards yet. Let's create your first workspace.</p>
          <button 
            onClick={async () => {
              const newBoard = await createBoard("My First Board", "#0079bf");
              router.push(`/board/${newBoard.id}`);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors"
          >
            Create Default Board
          </button>
        </div>
      </div>
    );
  }

  return null;
}