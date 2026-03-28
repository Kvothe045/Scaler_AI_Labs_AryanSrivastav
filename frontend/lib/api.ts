// frontend/lib/api.ts

/**
 * Hardcoded Environment Check to prevent Vercel Env Var overriding.
 * - SERVER: Uses the absolute VM URL with the port.
 * - CLIENT: Strictly uses relative path '' to trigger the Vercel Proxy.
 */
const BASE = typeof window === 'undefined' ? 'http://20.193.130.195:8123' : '';

async function req(method: string, path: string, body?: any) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || res.statusText);
    }
    
    const text = await res.text();
    return text ? JSON.parse(text) : null;
    
  } catch (error) {
    console.error(`[API Client] ${method} ${path} failed:`, error);
    throw error;
  }
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

export const uploadAttachment = async (cardId: number, file: File) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('file', file);
  
  try {
    const res = await fetch(`${BASE}/api/v1/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Upload Failed: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`[API Client] Attachment upload failed:`, error);
    throw error;
  }
};