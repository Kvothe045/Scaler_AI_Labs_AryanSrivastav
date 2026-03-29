// frontend/store/index.ts
import { create } from 'zustand';
import * as api from '../lib/api';
import { ApiError } from '../lib/api';

export interface Filters {
  label_id?: number[];
  member_id?: number[];
  due_date?: string;
}

interface StoreState {
  // ── Auth ────────────────────────────────────────────
  token: string | null;
  currentUserEmail: string | null;
  currentUser: any | null;
  currentUserRole: string | null;
  setToken: (token: string | null) => void;
  setCurrentUser: (email: string) => void;

  // ── Permission toast ────────────────────────────────
  permissionError: string | null;
  setPermissionError: (msg: string | null) => void;

  // ── Boards list ─────────────────────────────────────
  boards: any[];
  fetchBoards: () => Promise<void>;
  createBoard: (title: string, color: string) => Promise<any>;

  // ── Active board & Filtering ────────────────────────
  activeBoardId: number | null;
  boardState: any | null;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  setBoardId: (id: number | null) => void;
  setActiveBoardId: (id: number | null) => void;
  // onAccessDenied now receives the user's own board id (or null) so the
  // page can route directly to it instead of just going to "/"
  fetchBoardState: (id: number, onAccessDenied?: (ownedBoardId: number | null) => void) => Promise<void>;
  refreshBoard: () => Promise<void>;

  // ── Labels & Users ──────────────────────────────────
  labels: any[];
  users: any[];
  fetchLabels: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  createUser: (data: { name: string; email: string; avatar_url?: string }) => Promise<any>;

  // ── Board access guard ──────────────────────────────
  ensureUserHasBoard: () => Promise<number | null>;
}

function deriveRole(boardState: any, email: string | null): string | null {
  if (!boardState || !email) return null;
  const memberships: any[] = boardState.memberships || [];
  const match = memberships.find(
    (m: any) => m.user?.email === email || m.email === email
  );
  return match?.role ?? null;
}

function isAccessError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return (
    err.status === 403 ||
    err.status === 404 ||
    err.detail.toLowerCase().includes('do not have access') ||
    err.detail.toLowerCase().includes('not a member') ||
    err.detail.toLowerCase().includes('forbidden')
  );
}

async function guardedCall<T>(
  call: () => Promise<T>,
  setPermissionError: (msg: string | null) => void
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError && err.isPermissionError) {
      setPermissionError(err.detail);
    }
    throw err;
  }
}

export const useStore = create<StoreState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  currentUserEmail:
    typeof window !== 'undefined' ? localStorage.getItem('currentUserEmail') : null,
  currentUser: null,
  currentUserRole: null,

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
    if (token) {
      api.getMe()
        .then((me: any) => {
          localStorage.setItem('currentUserEmail', me.email);
          set({ currentUserEmail: me.email, currentUser: me });
        })
        .catch(() => {});
    }
  },

  setCurrentUser: (email) => {
    const user = get().users.find((u: any) => u.email === email) ?? null;
    localStorage.setItem('currentUserEmail', email);
    const role = deriveRole(get().boardState, email);
    set({ currentUserEmail: email, currentUser: user, currentUserRole: role });
    get().fetchBoards();
    const id = get().activeBoardId;
    if (id) get().fetchBoardState(id);
  },

  // ── Permission toast ──────────────────────────────────────────────────────
  permissionError: null,
  setPermissionError: (msg) => set({ permissionError: msg }),

  // ── Boards ────────────────────────────────────────────────────────────────
  boards: [],

  fetchBoards: async () => {
    try {
      const boards = await api.getBoards();
      set({ boards });
    } catch (e) {
      console.error('fetchBoards error:', e);
    }
  },

  createBoard: async (title, color) => {
    const board = await guardedCall(
      () => api.createBoard({ title, background_color: color }),
      get().setPermissionError
    );
    set((state) => ({ boards: [...state.boards, board] }));
    return board;
  },

  // ── Board access guard ────────────────────────────────────────────────────
  /**
   * Fetches the current user's boards; creates a default one if empty.
   * Never throws — always resolves with a board id or null.
   */
  ensureUserHasBoard: async () => {
    try {
      const boards: any[] = await api.getBoards();
      if (boards && boards.length > 0) {
        set({ boards });
        return boards[0].id as number;
      }
      // User has no boards at all — create a safe default
      const newBoard = await api.createBoard({
        title: 'My Board',
        background_color: '#0052cc',
      });
      set((state) => ({ boards: [...state.boards, newBoard] }));
      return newBoard.id as number;
    } catch (e) {
      console.error('ensureUserHasBoard error:', e);
      return null;
    }
  },

  // ── Active board & Filtering ──────────────────────────────────────────────
  activeBoardId: null,
  boardState: null,
  filters: {},

  setFilters: (filters) => {
    set({ filters });
    const id = get().activeBoardId;
    if (id) get().fetchBoardState(id);
  },

  setBoardId: (id) => {
    set({ activeBoardId: id, filters: {}, currentUserRole: null });
  },

  setActiveBoardId: (id) => {
    set({ activeBoardId: id, filters: {}, currentUserRole: null });
    if (id) get().fetchBoardState(id);
  },

  /**
   * Fetches board state for `id`.
   *
   * Happy path  → updates store normally.
   *
   * Access denied (403 / 404 / no role in memberships):
   *   1. Clears broken state so the spinner doesn't hang
   *   2. Awaits ensureUserHasBoard() — creates a board if needed
   *   3. Calls onAccessDenied(ownedBoardId) so the page can navigate
   *      directly to /board/<ownedBoardId> (or "/" if id is null)
   *
   * Critically this is all awaited BEFORE the page's finally{} block runs,
   * so setIsLoading(false) fires only after the redirect is already queued.
   */
  fetchBoardState: async (id, onAccessDenied) => {
    try {
      const boardState = await api.getBoard(id, get().filters);
      const role = deriveRole(boardState, get().currentUserEmail);

      // Board loaded but user has zero membership rows → treat as access denied
      if (!role) {
        throw new ApiError(403, "You are not a member of this board.");
      }

      set({ boardState, activeBoardId: id, currentUserRole: role });
    } catch (e) {
      console.error('fetchBoardState error:', e);

      if (isAccessError(e)) {
        // Wipe stale state immediately — stops spinner rendering stale board
        set({ boardState: null, activeBoardId: null, currentUserRole: null });

        if (onAccessDenied) {
          // Await so navigation happens with a real destination, not a blind "/"
          const ownedBoardId = await get().ensureUserHasBoard();
          onAccessDenied(ownedBoardId);
        }
      }
    }
  },

  refreshBoard: async () => {
    const id = get().activeBoardId;
    if (!id) return;
    try {
      const boardState = await api.getBoard(id, get().filters);
      const role = deriveRole(boardState, get().currentUserEmail);
      set({ boardState, currentUserRole: role });
    } catch (e) {
      console.error('refreshBoard error:', e);
    }
  },

  // ── Labels ────────────────────────────────────────────────────────────────
  labels: [],

  fetchLabels: async () => {
    try {
      const labels = await api.getLabels();
      set({ labels });
    } catch (e) {
      console.error('fetchLabels error:', e);
    }
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: [],

  fetchUsers: async () => {
    try {
      const users = await api.getUsers();
      set({ users });
    } catch (e) {
      console.error('fetchUsers error:', e);
    }
  },

  createUser: async (data) => {
    const user = await api.createUser(data);
    set((state) => ({ users: [...state.users, user] }));
    return user;
  },
}));