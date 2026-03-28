'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../store';

export default function Home() {
  const router = useRouter();
  const { boards, fetchBoards, createBoard } = useStore();

  useEffect(() => {
    const init = async () => {
      try {
        const fetchedBoards = await fetchBoards();

        // If boards exist → go to first
        if (fetchedBoards.length > 0) {
          router.replace(`/board/${fetchedBoards[0].id}`);
        } 
        // Else → auto create + redirect
        else {
          const newBoard = await createBoard("My Board", "#0079bf");
          router.replace(`/board/${newBoard.id}`);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    };

    init();
  }, [fetchBoards, createBoard, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1d2125]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A6C5E229] border-t-[#579dff]" />
    </div>
  );
}