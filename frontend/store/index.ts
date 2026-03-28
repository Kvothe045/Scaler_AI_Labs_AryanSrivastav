// frontend/store.ts
import { create } from 'zustand';
import * as api from '../lib/api';

interface StoreState {
  // ── Auth ────────────────────────────────────────────
  token: string | null;
  currentUserEmail: string | null;
  currentUser: any | null;
  setToken: (token: string | null) => void;
  /** Switch the active "persona" locally — used by Header's account switcher */
  setCurrentUser: (email: string) => void;

  // ── Boards list ─────────────────────────────────────
  boards: any[];
  fetchBoards: () => Promise<void>;
  /** Create a new board and append it to the local list. Returns the created board. */
  createBoard: (title: string, color: string) => Promise<any>;

  // ── Active board ────────────────────────────────────
  activeBoardId: number | null;
  boardState: any | null;
  /** Set the active board id — used by BoardPage */
  setBoardId: (id: number | null) => void;
  /** Alias kept for backwards-compat (BoardPage, Header) */
  setActiveBoardId: (id: number | null) => void;
  /** Fetch board by explicit id — used by BoardPage & Header after title save */
  fetchBoardState: (id: number) => Promise<void>;
  /** Re-fetch with current activeBoardId — used by BoardView drag handlers */
  refreshBoard: () => Promise<void>;

  // ── Labels & Users ──────────────────────────────────
  labels: any[];
  users: any[];
  fetchLabels: () => Promise<void>;
  fetchUsers: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  currentUserEmail: null,
  currentUser: null,

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
    if (token) {
      api.getMe()
        .then((me: any) => set({ currentUserEmail: me.email, currentUser: me }))
        .catch(() => {});
    }
  },

  setCurrentUser: (email) => {
    const user = get().users.find((u: any) => u.email === email) ?? null;
    set({ currentUserEmail: email, currentUser: user });
  },

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

  createBoard: async (title: string, color: string) => {
    const board = await api.createBoard({ title, background_color: color });
    set((state) => ({ boards: [...state.boards, board] }));
    return board;
  },

  // ── Active board ──────────────────────────────────────────────────────────
  activeBoardId: null,
  boardState: null,

  // Primary setter used by BoardPage
  setBoardId: (id) => {
    set({ activeBoardId: id });
  },

  // Alias so any component calling setActiveBoardId also works
  setActiveBoardId: (id) => {
    set({ activeBoardId: id });
    if (id) get().fetchBoardState(id);
  },

  fetchBoardState: async (id: number) => {
    try {
      const boardState = await api.getBoard(id);
      set({ boardState, activeBoardId: id });
    } catch (e) {
      console.error('fetchBoardState error:', e);
    }
  },

  refreshBoard: async () => {
    const id = get().activeBoardId;
    if (!id) return;
    try {
      const boardState = await api.getBoard(id);
      set({ boardState });
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
}));