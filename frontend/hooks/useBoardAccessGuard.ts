// frontend/hooks/useBoardAccessGuard.ts
'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { getBoards, createBoard } from '../lib/api';
import { ApiError } from '../lib/api';

/**
 * Returns a handler to call when a board fetch fails with an access error.
 * It redirects to "/" and ensures the user has at least one board of their own.
 */
export function useBoardAccessGuard() {
  const router = useRouter();

  const handleAccessDenied = useCallback(async (error: unknown) => {
    // Only act on access / not-found errors (403, 404, or generic "do not have access")
    const isAccessError =
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404 ||
       error.detail.toLowerCase().includes('do not have access'));

    if (!isAccessError) return false; // caller should handle this error itself

    // 1. Redirect immediately — don't leave the user stuck
    router.replace('/');

    // 2. In the background, ensure they have at least one board
    try {
      const boards: any[] = await getBoards();
      if (!boards || boards.length === 0) {
        await createBoard({
          title: 'My Board',
          description: '',
        });
        // Reload so the homepage re-fetches and shows the new board
        router.refresh();
      }
    } catch (e) {
      // Best-effort — don't block the redirect on this
      console.warn('[useBoardAccessGuard] Could not ensure board exists:', e);
    }

    return true; // access error was handled
  }, [router]);

  return { handleAccessDenied };
}