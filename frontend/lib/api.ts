// frontend/lib/api.ts
import { useStore } from '../store';

const BASE = 'http://localhost:8123';

function getCurrentUserEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('currentUserEmail') || '';
}

/** Thrown when the backend returns a non-2xx response */
export class ApiError extends Error {
  status: number;
  detail: string;
  isPermissionError: boolean;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.isPermissionError = status === 403;
  }
}

async function req(method: string, path: string, body?: any) {
  const token     = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userEmail = getCurrentUserEmail();

  const safePath = path.startsWith('/') ? path : `/${path}`;
  const url      = `${BASE}${safePath}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userEmail ? { 'x-user-email': userEmail } : {}),
      ...(token     ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const raw = await res.text();
    let detail = raw || res.statusText;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.detail) detail = parsed.detail;
    } catch (_) { /* raw was plain text */ }

    const err = new ApiError(res.status, detail);

    // ── Intercept 403s here, at the lowest level, so EVERY caller gets the toast
    //    useStore.getState() works outside React — no hook rules violated
    if (err.isPermissionError) {
      useStore.getState().setPermissionError(detail);
    }

    throw err;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Users ─────────────────────────────────────────────
export const getUsers   = ()          => req('GET',  '/api/v1/users/');
export const createUser = (data: any) => req('POST', '/api/v1/users/', data);

// ── Auth ──────────────────────────────────────────────
export const login    = (data: any) => req('POST', '/api/v1/auth/login', data);
export const register = (data: any) => req('POST', '/api/v1/auth/register', data);
export const getMe    = ()          => req('GET',  '/api/v1/auth/me');

// ── Boards ────────────────────────────────────────────
export const getBoards      = ()                           => req('GET',   '/api/v1/boards/');
export const createBoard    = (data: any)                  => req('POST',  '/api/v1/boards/', data);
export const updateBoard    = (id: number, data: any)      => req('PATCH', `/api/v1/boards/${id}`, data);
export const addBoardMember = (boardId: number, data: any) => req('POST',  `/api/v1/boards/${boardId}/members`, data);
export const deleteBoard    = (id: number)                 => req('DELETE', `/api/v1/boards/${id}`);

export const getBoard = (id: number, filters?: any) => {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.label_ids?.length > 0) {
      filters.label_ids.forEach((labelId: number) => params.append('label_id', labelId.toString()));
    } else if (filters.label_id) {
      params.append('label_id', filters.label_id.toString());
    }
    if (filters.member_id) params.append('member_id', filters.member_id.toString());
    if (filters.due_date)  params.append('due_date',  filters.due_date);
  }
  const qs = params.toString();
  return req('GET', `/api/v1/boards/${id}${qs ? `?${qs}` : ''}`);
};

// ── Lists ─────────────────────────────────────────────
export const createList = (data: any)             => req('POST',   '/api/v1/lists/', data);
export const updateList = (id: number, data: any) => req('PATCH',  `/api/v1/lists/${id}`, data);
export const deleteList = (id: number)            => req('DELETE', `/api/v1/lists/${id}`);

export const moveList = (id: number, data: { board_id?: number; position: number }) =>
  req('PATCH', `/api/v1/lists/${id}`, { position: data.position });

// ── Cards ─────────────────────────────────────────────
export const createCard = (data: any)             => req('POST',   '/api/v1/cards/', data);
export const updateCard = (id: number, data: any) => req('PATCH',  `/api/v1/cards/${id}`, data);
export const deleteCard = (id: number)            => req('DELETE', `/api/v1/cards/${id}`);

export const moveCard = (id: number, data: { list_id: number; position: number }) =>
  req('PUT', `/api/v1/cards/${id}/move`, {
    new_list_id:  data.list_id,
    new_position: data.position,
  });

// ── Labels ────────────────────────────────────────────
export const getLabels           = ()                          => req('GET',    '/api/v1/labels/');
export const createLabel         = (data: any)                 => req('POST',   '/api/v1/labels/', data);
export const updateLabel         = (id: number, data: any)     => req('PATCH',  `/api/v1/labels/${id}`, data);
export const deleteLabel         = (id: number)                => req('DELETE', `/api/v1/labels/${id}`);

export const addLabelToCard      = (cardId: number, labelId: number) => req('POST',   `/api/v1/cards/${cardId}/labels/${labelId}`);
export const removeLabelFromCard = (cardId: number, labelId: number) => req('DELETE', `/api/v1/cards/${cardId}/labels/${labelId}`);

// ── Members ───────────────────────────────────────────
export const assignMember = (cardId: number, userId: number) => req('POST',   `/api/v1/cards/${cardId}/members/${userId}`);
export const removeMember = (cardId: number, userId: number) => req('DELETE', `/api/v1/cards/${cardId}/members/${userId}`);

// ── Checklists ────────────────────────────────────────
export const addChecklistItem    = (cardId: number, data: any)                  => req('POST',   `/api/v1/cards/${cardId}/checklists`, data);
export const toggleChecklistItem = (cardId: number, itemId: number, data: any) => req('PATCH',  `/api/v1/cards/${cardId}/checklists/${itemId}`, data);
export const deleteChecklistItem = (cardId: number, itemId: number)             => req('DELETE', `/api/v1/cards/${cardId}/checklists/${itemId}`);

// ── Comments & Activity ───────────────────────────────
export const addComment  = (cardId: number, data: any) => req('POST', `/api/v1/cards/${cardId}/comments`, data);
export const getComments = (cardId: number)            => req('GET',  `/api/v1/cards/${cardId}/comments`);
export const getActivity = (cardId: number)            => req('GET',  `/api/v1/cards/${cardId}/activity`);

// ── Attachments ───────────────────────────────────────
export const getAttachments = (cardId: number) => req('GET', `/api/v1/cards/${cardId}/attachments`);

export const uploadAttachment = async (cardId: number, file: File) => {
  const token     = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userEmail = getCurrentUserEmail();
  const form      = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/v1/cards/${cardId}/attachments`, {
    method: 'POST',
    headers: {
      ...(userEmail ? { 'x-user-email': userEmail } : {}),
      ...(token     ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const raw = await res.text();
    let detail = raw || `Upload Failed: ${res.status}`;
    try { const p = JSON.parse(raw); if (p?.detail) detail = p.detail; } catch (_) {}
    const err = new ApiError(res.status, detail);
    if (err.isPermissionError) {
      useStore.getState().setPermissionError(detail);
    }
    throw err;
  }
  return res.json();
};