// frontend/lib/api.ts

/**
 * Determines the correct base URL based on the execution environment.
 * * - SERVER SIDE (SSR/Server Components): Bypasses the proxy and talks directly to the VM.
 * (Servers do not have mixed content restrictions).
 * - CLIENT SIDE (Browser): Uses a relative path ('') to trigger the Next.js rewrites,
 * bypassing browser HTTPS -> HTTP Mixed Content errors.
 */
const IS_SERVER = typeof window === 'undefined';
const BASE = IS_SERVER 
  ? (process.env.INTERNAL_API_URL || 'http://20.193.130.195:8123') 
  : (process.env.NEXT_PUBLIC_API_URL || '');

/**
 * Core request utility for standardizing fetch calls and error handling.
 */
async function req(method: string, path: string, body?: any) {
  const token = !IS_SERVER ? localStorage.getItem('token') : null;
  
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Provide a detailed error for debugging, fallback to status text
    throw new Error(errText || `HTTP Error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Auth ──────────────────────────────────────────────
export const login    = (data: any) => req('POST', '/api/v1/auth/login', data);
export const register = (data: any) => req('POST', '/api/v1/auth/register', data);
export const getMe    = ()          => req('GET',  '/api/v1/auth/me');

// ── Boards ────────────────────────────────────────────
export const getBoards      = ()                           => req('GET',   '/api/v1/boards/');
export const createBoard    = (data: any)                  => req('POST',  '/api/v1/boards/', data);
export const getBoard       = (id: number)                 => req('GET',   `/api/v1/boards/${id}`);
export const updateBoard    = (id: number, data: any)      => req('PATCH', `/api/v1/boards/${id}`, data);
export const addBoardMember = (boardId: number, data: any) => req('POST',  `/api/v1/boards/${boardId}/members`, data);

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

export const addLabelToCard      = (cardId: number, labelId: number) =>
  req('POST',   `/api/v1/cards/${cardId}/labels/${labelId}`);
export const removeLabelFromCard = (cardId: number, labelId: number) =>
  req('DELETE', `/api/v1/cards/${cardId}/labels/${labelId}`);

// ── Members ───────────────────────────────────────────
export const getUsers     = () => req('GET', '/api/v1/users/');

export const assignMember = (cardId: number, userId: number) =>
  req('POST',   `/api/v1/cards/${cardId}/members/${userId}`);
export const removeMember = (cardId: number, userId: number) =>
  req('DELETE', `/api/v1/cards/${cardId}/members/${userId}`);

// ── Checklists ────────────────────────────────────────
export const addChecklistItem    = (cardId: number, data: any)                  =>
  req('POST',   `/api/v1/cards/${cardId}/checklists`, data);
export const toggleChecklistItem = (cardId: number, itemId: number, data: any) =>
  req('PATCH',  `/api/v1/cards/${cardId}/checklists/${itemId}`, data);
export const deleteChecklistItem = (cardId: number, itemId: number)             =>
  req('DELETE', `/api/v1/cards/${cardId}/checklists/${itemId}`);

// ── Comments ──────────────────────────────────────────
export const addComment = (cardId: number, data: any) =>
  req('POST', `/api/v1/cards/${cardId}/comments`, data);

// ── Attachments ───────────────────────────────────────
export const getAttachments = (cardId: number) =>
  req('GET', `/api/v1/cards/${cardId}/attachments`);

/**
 * Handles file uploads. Uses standard FormData to transmit binary files to the backend.
 */
export const uploadAttachment = async (cardId: number, file: File) => {
  const token = !IS_SERVER ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('file', file);
  
  const res = await fetch(`${BASE}/api/v1/cards/${cardId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Upload Failed: ${res.status}`);
  }
  return res.json();
};