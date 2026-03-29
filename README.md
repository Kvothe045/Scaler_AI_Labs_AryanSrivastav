# Scaler Trello Clone — Full-Stack Project Documentation

> A feature-complete Trello-inspired project management board built with **FastAPI** (Python) on the backend and **Next.js 14** (TypeScript) on the frontend, deployed via Docker + DuckDNS + Caddy HTTPS.

## 🌐 Live Links

### 🚀 Frontend
🔗 **Live App:**  
[https://scalartrello.vercel.app]

---

### ⚙️ Backend
🔗 **API Base URL:**  
[https://scalarapi.duckdns.org:8443]

📄 **Swagger Docs:**  
[https://scalarapi.duckdns.org:8443/docs]

📘 **ReDoc Documentation:**  
[https://scalarapi.duckdns.org:8443/redoc]

---

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Backend — API Reference](#5-backend--api-reference)
   - [Auth](#51-auth)
   - [Users](#52-users)
   - [Boards](#53-boards)
   - [Lists](#54-lists)
   - [Cards](#55-cards)
   - [Labels](#56-labels)
   - [Checklists](#57-checklists)
   - [Comments & Activity](#58-comments--activity)
   - [Attachments](#59-attachments)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Frontend — Component Guide](#7-frontend--component-guide)
   - [Pages](#71-pages)
   - [Board Components](#72-board-components)
   - [Card Components](#73-card-components)
   - [State Management (Zustand)](#74-state-management-zustand)
   - [API Layer](#75-api-layer)
8. [Key Features](#8-key-features)
9. [Backend Setup Guide (Docker)](#9-backend-setup-guide-docker)
   - [Prerequisites](#91-prerequisites)
   - [Environment Variables](#92-environment-variables)
   - [DuckDNS + Caddy HTTPS Setup](#93-duckdns--caddy-https-setup)
   - [Running the Container](#94-running-the-container)
   - [Seeding the Database](#95-seeding-the-database)
   - [Verifying the Deployment](#96-verifying-the-deployment)
10. [Frontend Setup Guide](#10-frontend-setup-guide)
11. [Project Structure](#11-project-structure)

---

## 1. Project Overview

This project is a full-stack clone of Trello built as part of Scaler AI Labs. It supports the complete Trello workflow: multiple boards with role-based membership, draggable lists and cards, labels, checklists, comments, file attachments, activity logs, and card filtering. The backend exposes a REST API consumed by the Next.js frontend, which is deployed independently on Vercel while the backend runs inside a Docker container on a VPS with HTTPS provided by Caddy and a free DuckDNS domain.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
              ┌────────────▼────────────┐
              │   Vercel (Next.js 14)   │  scalartrello.vercel.app
              │   Frontend / SSR        │
              └────────────┬────────────┘
                           │ REST API calls (HTTPS :8443)
              ┌────────────▼──────────────────────┐
              │   VPS / Home Server               │
              │  ┌────────────────────────────┐   │
              │  │  Caddy (Reverse Proxy)     │   │  ← TLS via DuckDNS ACME
              │  │  scalarapi.duckdns.org     │   │
              │  └────────────┬───────────────┘   │
              │               │ :8000 (internal)  │
              │  ┌────────────▼───────────────┐   │
              │  │  Docker Container          │   │
              │  │  FastAPI + Uvicorn         │   │
              │  └────────────┬───────────────┘   │
              │               │                   │
              │  ┌────────────▼───────────────┐   │
              │  │      PostgreSQL DB         │
              │  └────────────────────────────┘   │
              └───────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router, TypeScript) |
| Frontend Styling | Tailwind CSS |
| State Management | Zustand |
| Drag & Drop | (custom or dnd-kit) |
| Backend Framework | FastAPI (Python 3.12+) |
| Backend Hosting | Azure VM |
| ORM | SQLModel (built on SQLAlchemy + Pydantic) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT Bearer tokens + email header (`x-user-email`) |
| Containerization | Docker + Docker Compose |
| Reverse Proxy / TLS | Caddy |
| Dynamic DNS | DuckDNS |
| Frontend Hosting | Vercel |

---

## 4. Database Schema

The data model uses SQLModel (Pydantic + SQLAlchemy). Below is the complete entity relationship overview.

### Core Entities

```
User
 ├── board_memberships → BoardMember (role: owner | editor | viewer)
 └── cards (M2M) → CardMemberLink

Board
 ├── lists → ListModel (ordered by position float)
 └── memberships → BoardMember

ListModel
 └── cards → Card (ordered by position float)

Card
 ├── members (M2M) → CardMemberLink → User
 ├── labels (M2M) → CardLabelLink → Label
 ├── checklists → ChecklistItem
 ├── comments → Comment
 ├── attachments → Attachment
 └── activities → ActivityLog

Label (global, board-agnostic)
ChecklistItem (belongs to Card)
Comment (belongs to Card + User)
Attachment (belongs to Card)
ActivityLog (belongs to Card + User)
```

### Link / Junction Tables

| Table | Purpose |
|---|---|
| `CardMemberLink` | Many-to-many: Cards ↔ Users |
| `CardLabelLink` | Many-to-many: Cards ↔ Labels |
| `BoardMember` | Many-to-many with role: Boards ↔ Users |

### Position System

Lists and Cards both use a **float `position` field** (indexed) to allow O(1) reordering without re-numbering all siblings — insert at `(prev + next) / 2`.

### Cascade Deletes

All child relationships on `Card` (`checklists`, `comments`, `attachments`, `activities`) use `cascade: all, delete-orphan`. Similarly, `Board → lists` and `Board → memberships` cascade on delete.

---

## 5. Backend — API Reference

All endpoints are prefixed with `/api/v1`. Authentication uses the `x-user-email` header (and optionally a `Bearer` JWT token).

### 5.1 Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login, returns JWT token |
| `GET` | `/api/v1/auth/me` | Get the currently authenticated user |

### 5.2 Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users/` | List all users |
| `POST` | `/api/v1/users/` | Create a user (admin/seed use) |

**UserCreate schema:**
```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://..." // optional
}
```

### 5.3 Boards

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/boards/` | List boards accessible to the current user |
| `POST` | `/api/v1/boards/` | Create a new board |
| `GET` | `/api/v1/boards/{id}` | Get a full board (lists + cards + members) with optional filters |
| `PATCH` | `/api/v1/boards/{id}` | Update board title / background |
| `DELETE` | `/api/v1/boards/{id}` | Delete a board (owner only) |
| `POST` | `/api/v1/boards/{id}/members` | Add a member to a board |

**GET `/api/v1/boards/{id}` — Query Filters:**

| Param | Type | Description |
|---|---|---|
| `label_id` | int (repeatable) | Filter cards by one or more label IDs |
| `member_id` | int | Filter cards assigned to a specific user |
| `due_date` | string (ISO date) | Filter cards by due date |

### 5.4 Lists

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/lists/` | Create a new list on a board |
| `PATCH` | `/api/v1/lists/{id}` | Update list title, position, or color |
| `DELETE` | `/api/v1/lists/{id}` | Delete a list (cascades to cards) |

**Move a list** — send `PATCH /api/v1/lists/{id}` with `{ "position": <float> }`.

### 5.5 Cards

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/cards/` | Create a card in a list |
| `PATCH` | `/api/v1/cards/{id}` | Update card fields (title, description, due_date, cover, is_archived) |
| `DELETE` | `/api/v1/cards/{id}` | Delete a card |
| `PUT` | `/api/v1/cards/{id}/move` | Move card to a new list and/or position |

**Move card body:**
```json
{
  "new_list_id": 3,
  "new_position": 65536.0
}
```

**Card fields (PATCH):**

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `description` | string | Markdown supported |
| `due_date` | datetime (ISO) | |
| `cover_image_color` | string (hex) | e.g. `#ff5733` |
| `is_archived` | boolean | Soft-delete / archive |

### 5.6 Labels

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/labels/` | List all labels |
| `POST` | `/api/v1/labels/` | Create a label |
| `PATCH` | `/api/v1/labels/{id}` | Update label name/color |
| `DELETE` | `/api/v1/labels/{id}` | Delete a label |
| `POST` | `/api/v1/cards/{cardId}/labels/{labelId}` | Attach label to card |
| `DELETE` | `/api/v1/cards/{cardId}/labels/{labelId}` | Detach label from card |

### 5.7 Checklists

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/cards/{cardId}/checklists` | Add a checklist item |
| `PATCH` | `/api/v1/cards/{cardId}/checklists/{itemId}` | Toggle completion / rename item |
| `DELETE` | `/api/v1/cards/{cardId}/checklists/{itemId}` | Delete item |

### 5.8 Comments & Activity

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/cards/{cardId}/comments` | Add a comment |
| `GET` | `/api/v1/cards/{cardId}/comments` | List comments (with user details) |
| `GET` | `/api/v1/cards/{cardId}/activity` | Get activity log for a card |

### 5.9 Attachments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/cards/{cardId}/attachments` | List attachments |
| `POST` | `/api/v1/cards/{cardId}/attachments` | Upload file (multipart/form-data) |

Uploaded files are stored in the container's `app/uploads/` directory and served at a static URL. The `Attachment` record stores `file_name`, `file_url`, and `uploaded_at`.

---

## 6. Role-Based Access Control (RBAC)

Board membership is controlled via the `BoardMember` table with three roles:

| Role | Permissions |
|---|---|
| `owner` | Full access: edit board, delete board, manage members, full card CRUD |
| `editor` | Create/edit/move/delete lists and cards, add labels, comments, attachments |
| `viewer` | Read-only: can view boards, lists, and cards but cannot modify anything |

Permission enforcement happens in `backend/app/api/dependencies.py`. When a `viewer` attempts a write operation, the API returns HTTP `403 Forbidden`. The frontend intercepts all `403` responses at the `req()` helper in `api.ts` and calls `useStore.getState().setPermissionError(detail)` to display a `PermissionToast` notification without crashing the UI.

---

## 7. Frontend — Component Guide

### 7.1 Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Home / board selection page |
| `/board/[boardId]` | `app/board/[boardId]/page.tsx` | Main board view with lists and cards |

### 7.2 Board Components

| Component | File | Responsibility |
|---|---|---|
| `BoardView` | `components/board/BoardView.tsx` | Root board canvas; renders lists, handles DnD |
| `ListColumn` | `components/board/ListColumn.tsx` | A single list column with its cards |
| `Header` | `components/board/Header.tsx` | Top navigation bar with board title and user avatar |
| `NavbarBottom` | `components/board/NavbarBottom.tsx` | Bottom action bar (mobile-friendly) |
| `Sidebar` | `components/board/Sidebar.tsx` | Left sidebar for board switching and navigation |
| `BoardSwitcher` | `components/board/BoardSwitcher.tsx` | Dropdown to switch between boards |
| `BoardMenu` | `components/board/BoardMenu.tsx` | Board settings: rename, background, delete |
| `FilterBar` | `components/board/FilterBar.tsx` | Filter cards by label, member, or due date |
| `SearchResults` | `components/board/SearchResults.tsx` | Inline search results across cards |
| `PermissionToast` | `components/board/PermissionToast.tsx` | Floating toast shown on 403 errors |

### 7.3 Card Components

| Component | File | Responsibility |
|---|---|---|
| `CardItem` | `components/card/CardItem.tsx` | Card tile rendered inside a ListColumn; shows cover, labels, due date, member avatars |
| `CardModal` | `components/card/CardModal.tsx` | Full card detail modal: title editing, description (markdown), checklist, members, labels, due date, comments, attachments, activity log |

### 7.4 State Management (Zustand)

Global state lives in `store/index.ts` using Zustand. Key slices:

| State Slice | Purpose |
|---|---|
| `boards` | Array of boards the user can access |
| `currentBoard` | The fully-loaded board object (with lists and cards nested) |
| `currentUser` | Authenticated user object |
| `permissionError` | String message for the PermissionToast (null when hidden) |
| `filters` | Active filter state (label IDs, member ID, due date) |

Key actions:

```typescript
// Load a board with active filters
useStore.getState().loadBoard(boardId, filters)

// Show a permission denied toast
useStore.getState().setPermissionError("You don't have permission to edit this board.")

// Clear filters
useStore.getState().clearFilters()
```

### 7.5 API Layer

All HTTP calls are centralized in `frontend/lib/api.ts`. The base URL is `https://scalarapi.duckdns.org:8443`.

Every request automatically attaches:
- `Content-Type: application/json`
- `x-user-email` header from `localStorage`
- `Authorization: Bearer <token>` header from `localStorage`

**Error handling:** Non-2xx responses throw an `ApiError` with `status`, `detail`, and `isPermissionError` fields. HTTP 403 errors are intercepted globally and trigger the permission toast, so individual callers don't need to handle them.

**File uploads** bypass the JSON `req()` helper and send `multipart/form-data` directly via `fetch`, still attaching the auth headers manually.

---

## 8. Key Features

- **Boards** — Create boards with custom background color or image; soft-delete with cascade.
- **Lists** — Ordered by float position for seamless drag reordering.
- **Cards** — Rich card detail with description (markdown), due dates, colored cover images, and archive support.
- **Drag & Drop** — Cards and lists can be reordered and cards can be moved across lists.
- **Labels** — Global labels with name and color, attachable to any card.
- **Checklists** — Per-card checklist items with completion toggle.
- **Members** — Assign board members (owner/editor/viewer) and assign users to individual cards.
- **Comments** — Timestamped comments with user attribution.
- **Attachments** — File uploads stored server-side; listed with download links.
- **Activity Log** — Automatic audit trail per card.
- **Filtering** — Filter board view by label(s), assigned member, or due date via query params.
- **RBAC** — Role enforcement on every write endpoint; graceful 403 handling in the UI.
- **HTTPS** — Full TLS via Caddy + DuckDNS ACME; no self-signed certs.

---

## 9. Backend Setup Guide (Docker)

### 9.1 Prerequisites

- A Linux VPS or home server with a public IP address
- Docker and Docker Compose installed
- A free [DuckDNS](https://www.duckdns.org) account and subdomain
- [Caddy](https://caddyserver.com) installed on the host (or run as a separate container)
- Ports `80`, `443`, and `8443` open in your firewall/security group

### 9.2 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database URL — SQLite for dev, PostgreSQL for prod
DATABASE_URLfor PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/trello_db


# CORS — set to your Vercel frontend URL
ALLOWED_ORIGINS=https://scalartrello.vercel.app,http://localhost:3000
```

### 9.3 DuckDNS + Caddy HTTPS Setup

This project uses **DuckDNS** for a free dynamic DNS subdomain and **Caddy** as the reverse proxy to terminate TLS automatically using Let's Encrypt.

#### Step 1 — Register a DuckDNS subdomain

1. Go to [duckdns.org](https://www.duckdns.org) and sign in.
2. Create a subdomain (e.g., `scalarapi`) and point it at your server's public IP.
3. Copy your DuckDNS **token** — you'll need it for Caddy.

#### Step 2 — Update IP automatically (optional cron)

```bash
# Run this on your server to keep the DNS record updated
echo "url=\"https://www.duckdns.org/update?domains=scalarapi&token=YOUR_TOKEN&ip=\" | curl -s -k -o ~/duckdns.log -K -" | sudo tee /etc/cron.d/duckdns
# Or use their official duck.sh script
```

#### Step 3 — Install Caddy with DuckDNS plugin

The standard Caddy binary does not include DNS challenge support. You need to build or download a Caddy binary with the `caddy-dns/duckdns` module:

```bash
# Option A: use xcaddy to build a custom binary
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build --with github.com/caddy-dns/duckdns

# Option B: download a prebuilt binary from https://caddyserver.com/download
# Select the duckdns DNS provider plugin before downloading
```

#### Step 4 — Write the Caddyfile

Create `/etc/caddy/Caddyfile`:

```caddy
scalarapi.duckdns.org:8443 {
    tls {
        dns duckdns YOUR_DUCKDNS_TOKEN
    }

    reverse_proxy localhost:8000

    header {
        Access-Control-Allow-Origin "https://scalartrello.vercel.app"
        Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization, x-user-email"
    }
}
```

> **Why port 8443?** Port 443 is standard HTTPS but may conflict with other services. Running Caddy on 8443 keeps things clean, and the frontend is configured to use that port in `api.ts`.

#### Step 5 — Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
# Check TLS certificate issued:
sudo journalctl -u caddy -f
```

### 9.4 Running the Container

From the `backend/` directory:

```bash
# Build and start the FastAPI container
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

The `docker-compose.yml` maps container port `8000` to host port `8000`. Caddy then proxies `scalarapi.duckdns.org:8443 → localhost:8000`.

**Sample `docker-compose.yml`** (already in the repo):

```yaml
version: "3.9"
services:
  api:
    build: .
    container_name: trello_api
    ports:
      - "8000:8000"
    volumes:
      - ./app/uploads:/app/uploads   # persist uploaded files
      - ./app.db:/app/app.db         
    env_file:
      - .env
    restart: unless-stopped
```

**Sample `Dockerfile`** (already in the repo):

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 9.5 Seeding the Database

A `seed.py` script is included to populate the database with sample boards, lists, cards, users, and labels for testing:

```bash
# Run inside the container
docker exec -it trello_api python seed.py

# Or on the host (with virtualenv active)
cd backend
python seed.py
```

### 9.6 Verifying the Deployment

```bash
# Health check — should return {"status": "ok"} or the API root
curl https://scalarapi.duckdns.org:8443/

# List boards (replace with a valid user email)
curl -H "x-user-email: test@example.com" https://scalarapi.duckdns.org:8443/api/v1/boards/

# Interactive API docs (Swagger UI)
open https://scalarapi.duckdns.org:8443/docs

# ReDoc
open https://scalarapi.duckdns.org:8443/redoc
```

---

## 10. Frontend Setup Guide

```bash
cd frontend

# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_BASE=https://scalarapi.duckdns.org:8443
```

```bash
# Run development server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start
```

**Deploy to Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set `NEXT_PUBLIC_API_BASE` as an environment variable in the Vercel project dashboard.

---

## 11. Project Structure

```
Scaler_AI_Labs_AryanSrivastav/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py        # Auth & RBAC dependency injection
│   │   │   └── routers/
│   │   │       ├── boards.py          # Board CRUD + member management
│   │   │       ├── cards.py           # Card CRUD + move + sub-resources
│   │   │       ├── labels.py          # Label CRUD + card-label linking
│   │   │       ├── lists.py           # List CRUD + reorder
│   │   │       └── users.py           # User registration
│   │   ├── core/
│   │   │   ├── config.py              # App settings (env vars)
│   │   │   └── database.py            # SQLModel engine + session factory
│   │   ├── models/
│   │   │   └── schema.py              # All SQLModel table definitions
│   │   ├── uploads/                   # Uploaded attachment files (persisted via volume)
│   │   └── main.py                    # FastAPI app factory, router registration, CORS
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── seed.py                        # Database seed script
│   └── test_api.py                    # API integration tests
│
└── frontend/
    ├── app/
    │   ├── board/[boardId]/
    │   │   └── page.tsx               # Dynamic board page
    │   ├── globals.css
    │   ├── layout.tsx                 # Root layout with providers
    │   └── page.tsx                   # Home / boards list
    ├── components/
    │   ├── board/
    │   │   ├── BoardMenu.tsx
    │   │   ├── BoardSwitcher.tsx
    │   │   ├── BoardView.tsx          # Main board canvas + DnD logic
    │   │   ├── FilterBar.tsx
    │   │   ├── Header.tsx
    │   │   ├── ListColumn.tsx
    │   │   ├── NavbarBottom.tsx
    │   │   ├── PermissionToast.tsx
    │   │   ├── SearchResults.tsx
    │   │   └── Sidebar.tsx
    │   └── card/
    │       ├── CardItem.tsx           # Card tile in list
    │       └── CardModal.tsx          # Full card detail modal
    ├── hooks/                         # Custom React hooks
    ├── lib/
    │   └── api.ts                     # All API calls + error handling
    ├── store/
    │   └── index.ts                   # Zustand global store
    ├── types/
    │   └── index.ts                   # TypeScript interfaces
    ├── AGENTS.md                      # AI agent instructions
    ├── CLAUDE.md                      # Claude-specific project notes
    ├── next.config.ts
    └── package.json
```

---