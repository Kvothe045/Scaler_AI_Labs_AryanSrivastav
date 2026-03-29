# Scaler Trello Clone — Frontend

A feature-complete Trello-inspired project management board built with **Next.js 14** (App Router, TypeScript), styled with **Tailwind CSS**, and powered by a **FastAPI** backend.

**Live URL:** [scalartrello.vercel.app](https://scalartrello.vercel.app)  
**Backend API:** `https://scalarapi.duckdns.org:8443`

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Pages](#pages)
6. [Components](#components)
7. [State Management](#state-management)
8. [API Layer](#api-layer)
9. [Custom Hooks](#custom-hooks)
10. [Drag & Drop](#drag--drop)
11. [Role-Based UI](#role-based-ui)
12. [Deploying to Vercel](#deploying-to-vercel)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework / SSR |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| Zustand | Global state management |
| Fetch API | HTTP requests to the backend |

---

## Project Structure

```
frontend/
├── app/
│   ├── board/
│   │   └── [boardId]/
│   │       └── page.tsx        # Dynamic board page (SSR route)
│   ├── favicon.ico
│   ├── globals.css             # Global Tailwind + base styles
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Home — board selection / login
│
├── components/
│   ├── board/
│   │   ├── BoardMenu.tsx       # Board settings: rename, background, delete
│   │   ├── BoardSwitcher.tsx   # Dropdown to switch between boards
│   │   ├── BoardView.tsx       # Main board canvas + drag-and-drop logic
│   │   ├── FilterBar.tsx       # Filter cards by label, member, due date
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── ListColumn.tsx      # Single list column with its cards
│   │   ├── NavbarBottom.tsx    # Bottom action bar (mobile)
│   │   ├── PermissionToast.tsx # Toast shown on 403 errors
│   │   ├── SearchResults.tsx   # Inline search across cards
│   │   └── Sidebar.tsx         # Left sidebar for board navigation
│   └── card/
│       ├── CardItem.tsx        # Card tile rendered inside a list
│       └── CardModal.tsx       # Full card detail modal
│
├── hooks/
│   └── useBoardAccessGuard.ts  # Redirect logic for unauthorized board access
│
├── lib/
│   └── api.ts                  # Centralised API calls + error handling
│
├── store/
│   └── index.ts                # Zustand global store
│
├── types/
│   └── index.ts                # Shared TypeScript interfaces
│
├── .env                        # Local environment variables (not committed)
├── .gitignore
├── AGENTS.md                   # AI agent instructions
├── CLAUDE.md                   # Claude-specific project notes
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend

# Install dependencies
npm install

# Create local environment file
cp .env .env.local
```

### Development server

```bash
npm run dev
# → http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE=https://scalarapi.duckdns.org:8443
```

> Change this to `http://localhost:8000` when running the backend locally.

---

## Pages

### `/` — Home (`app/page.tsx`)

The landing page where users log in or register. After authentication, it displays all boards accessible to the current user. From here users can create a new board or navigate into an existing one.

### `/board/[boardId]` — Board View (`app/board/[boardId]/page.tsx`)

The main board view. On mount it:

1. Fetches the full board (lists, cards, members) via `fetchBoardState`.
2. Runs access-guard logic — if the user doesn't have access to the requested board, they are redirected to an owned board or back to `/`.
3. Loads supporting data (all users, all boards, all labels) in parallel.
4. Renders the board canvas inside a responsive shell with sidebar, header, and optional bottom nav.

The page manages the following UI states locally: `isLoading`, `isMenuOpen`, `isSwitcherOpen`, `isSidebarOpen`, and `selectedCard` (which drives the `CardModal`).

---

## Components

### Board Components

#### `BoardView.tsx`
The root board canvas. Renders a horizontally-scrollable row of `ListColumn` components. Owns all drag-and-drop state (see [Drag & Drop](#drag--drop)). Also renders the **Add list** form and the per-list `ListColorPicker` popover.

#### `ListColumn.tsx`
Represents a single Trello list. Renders its title (inline-editable), an ordered list of `CardItem` tiles, and controls to add a card, change the list colour, or delete the list.

#### `CardItem.tsx`
The compact card tile shown inside a list. Displays the cover colour, label chips, due date badge, member avatars, and checklist progress. Clicking it opens the `CardModal`.

#### `CardModal.tsx`
Full-screen card detail modal. Contains:
- Inline title editing
- Markdown description editor
- Due date picker
- Cover colour selector
- Label attachment/detachment
- Member assignment
- Checklist management
- Comment thread
- Attachment upload and list
- Activity log

#### `Header.tsx`
Top navigation bar showing the board title, member avatars, a filter icon, and hamburger controls for the sidebar and board menu.

#### `Sidebar.tsx`
Left sidebar listing all boards the user is a member of. Supports creating a new board. On mobile it slides in as an overlay.

#### `BoardMenu.tsx`
Right-side panel for board settings: rename the board, change background colour or image, and delete the board (owner only).

#### `BoardSwitcher.tsx`
A modal/dropdown that lists all accessible boards and lets the user jump to one quickly.

#### `FilterBar.tsx`
Renders filter chips for labels, members, and due date. Applies filters by updating the Zustand store, which triggers a re-fetch of the board with query parameters.

#### `SearchResults.tsx`
Inline search bar that queries card titles across the current board and highlights matches.

#### `PermissionToast.tsx`
A floating toast notification that appears when the backend returns a `403 Forbidden` response. The toast message is driven by `useStore().permissionError` and auto-dismisses after a few seconds.

#### `NavbarBottom.tsx`
A mobile-only bottom action bar with shortcuts for switching boards.

---

## State Management

Global state is managed by **Zustand** in `store/index.ts`.

### Key State Slices

| Slice | Type | Description |
|---|---|---|
| `boards` | `Board[]` | All boards accessible to the current user |
| `boardState` | `BoardDetail \| null` | Fully-loaded current board with nested lists and cards |
| `activeBoardId` | `number \| null` | ID of the board currently in view |
| `currentUser` | `User \| null` | Authenticated user object |
| `users` | `User[]` | All users (for member assignment) |
| `labels` | `Label[]` | All labels |
| `permissionError` | `string \| null` | Drives the `PermissionToast`; `null` hides it |
| `filters` | `FilterState` | Active filter values (label IDs, member ID, due date) |

### Key Actions

```typescript
// Load (or re-load) the current board, applying any active filters
useStore.getState().fetchBoardState(boardId, onAccessDenied)

// Reload the board without changing filters — called after mutations
useStore.getState().refreshBoard()

// Show a permission-denied toast
useStore.getState().setPermissionError("You don't have permission to do that.")

// Clear all active filters and reload
useStore.getState().clearFilters()
```

---

## API Layer

All HTTP calls are centralised in `lib/api.ts`.

### Base URL

```typescript
export const BASE = 'https://scalarapi.duckdns.org:8443';
```

### Authentication

Every request automatically attaches:
- `Content-Type: application/json`
- `x-user-email` — read from `localStorage`
- `Authorization: Bearer <token>` — read from `localStorage`

### Error Handling

Non-2xx responses throw an `ApiError`:

```typescript
class ApiError extends Error {
  status: number;
  detail: string;
  isPermissionError: boolean; // true when status === 403
}
```

`403` errors are intercepted at the lowest level inside `req()` and automatically call `useStore.getState().setPermissionError(detail)`, so individual callers never need to handle permission errors explicitly.

### File Uploads

Attachment uploads bypass the JSON `req()` helper and send `multipart/form-data` directly via `fetch`, while still attaching auth headers manually.

### Available API Functions

```typescript
// Auth
login(data)  |  register(data)  |  getMe()

// Users
getUsers()  |  createUser(data)

// Boards
getBoards()  |  createBoard(data)  |  getBoard(id, filters?)
updateBoard(id, data)  |  deleteBoard(id)  |  addBoardMember(boardId, data)

// Lists
createList(data)  |  updateList(id, data)  |  deleteList(id)  |  moveList(id, data)

// Cards
createCard(data)  |  updateCard(id, data)  |  deleteCard(id)  |  moveCard(id, data)

// Labels
getLabels()  |  createLabel(data)  |  updateLabel(id, data)  |  deleteLabel(id)
addLabelToCard(cardId, labelId)  |  removeLabelFromCard(cardId, labelId)

// Members
assignMember(cardId, userId)  |  removeMember(cardId, userId)

// Checklists
addChecklistItem(cardId, data)  |  toggleChecklistItem(cardId, itemId, data)
deleteChecklistItem(cardId, itemId)

// Comments & Activity
addComment(cardId, data)  |  getComments(cardId)  |  getActivity(cardId)

// Attachments
getAttachments(cardId)  |  uploadAttachment(cardId, file)
```

---

## Custom Hooks

### `useBoardAccessGuard` (`hooks/useBoardAccessGuard.ts`)

Encapsulates the redirect logic that runs when a user tries to access a board they are not a member of. It finds the first board the user owns and redirects there, or falls back to `/`.

---

## Drag & Drop

Drag-and-drop is implemented natively using the HTML5 Drag and Drop API inside `BoardView.tsx`. No external DnD library is required.

### How it works

- **Card drag**: `CardItem` sets `draggable` and fires `onCardDragStart` with the card ID and source list ID.
- **List drag**: `ListColumn` sets `draggable` and fires `onListDragStart` with the list ID.
- `BoardView` tracks `dragState`, `dragOverListId`, and `dragOverCardId` in React state.
- On `dragEnd`, the component computes the new `position` float using the midpoint formula:  
  `newPosition = (prevPosition + nextPosition) / 2`
- The computed position is sent to the backend (`moveCard` or `moveList`), then the board is refreshed.

---

## Role-Based UI

The current user's role on the board is exposed as `boardState.my_role` (`owner | editor | viewer`).

```typescript
const canEdit = boardState?.my_role === 'owner' || boardState?.my_role === 'editor';
```

- When `canEdit` is `false`, all mutation controls (add list, add card, drag handles, edit buttons) are hidden or disabled.
- Any accidental write attempt that reaches the backend returns `403`, which triggers the `PermissionToast` automatically.

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the frontend/ directory
vercel --prod
```

Set the following environment variable in the **Vercel project dashboard**:

```
NEXT_PUBLIC_API_BASE = https://scalarapi.duckdns.org:8443
```

The frontend is stateless and deploys as a standard Next.js App Router project. No special build configuration is required.