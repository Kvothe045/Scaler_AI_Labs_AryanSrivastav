# Scaler Trello Clone — Backend

A fully-featured REST API for a Trello-inspired project management board, built with **FastAPI** (Python 3.11+), **SQLModel**, and containerised with **Docker**. TLS is provided by **Caddy** + **DuckDNS**.

**API Base URL:** `https://scalarapi.duckdns.org:8443`  
**Swagger UI:** `https://scalarapi.duckdns.org:8443/docs`  
**ReDoc:** `https://scalarapi.duckdns.org:8443/redoc`

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started (Local)](#getting-started-local)
4. [Environment Variables](#environment-variables)
5. [Application Entry Point](#application-entry-point)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Role-Based Access Control](#role-based-access-control)
9. [File Uploads](#file-uploads)
10. [Docker Deployment](#docker-deployment)
11. [DuckDNS + Caddy HTTPS Setup](#duckdns--caddy-https-setup)
12. [Seeding the Database](#seeding-the-database)
13. [Testing](#testing)
14. [Health Check](#health-check)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| FastAPI | Web framework |
| SQLModel | ORM (SQLAlchemy + Pydantic) |
| SQLite | Default database (development) |
| PostgreSQL | Production database (optional) |
| JWT (python-jose) | Authentication tokens |
| Uvicorn | ASGI server |
| Docker + Compose | Containerisation |
| Caddy | Reverse proxy + automatic TLS |
| DuckDNS | Free dynamic DNS |

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── dependencies.py        # Auth & RBAC dependency injection
│   │   └── routers/
│   │       ├── boards.py          # Board CRUD + member management
│   │       ├── cards.py           # Card CRUD + move + sub-resources
│   │       ├── labels.py          # Label CRUD + card-label linking
│   │       ├── lists.py           # List CRUD + reorder
│   │       └── users.py           # User registration + listing
│   ├── core/
│   │   ├── config.py              # App settings loaded from env vars
│   │   └── database.py            # SQLModel engine + session factory
│   ├── models/
│   │   └── schema.py              # All SQLModel table definitions
│   ├── uploads/                   # Uploaded attachment files (Docker volume)
│   └── main.py                    # FastAPI app factory, router registration, CORS
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── seed.py                        # Database seed script
└── test_api.py                    # API integration tests
```

---

## Getting Started (Local)

### Prerequisites

- Python 3.11+
- pip

### Installation

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Run the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database connection string
DATABASE_URL=sqlite:///./app.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/trello_db

# JWT settings
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=https://scalartrello.vercel.app,http://localhost:3000
```

---

## Application Entry Point

`app/main.py` bootstraps the entire application:

```python
app = FastAPI(
    title="Trello Kanban API",
    description="Scalar AI LABS ASSIGNMENT",
    version="1.0.0"
)
```

### What happens on startup

1. **Database initialisation** — `init_db()` creates all tables if they don't exist.
2. **Static file mounting** — the `uploads/` directory is mounted at `/uploads` so attachment files can be downloaded directly by URL.
3. **CORS middleware** — configured to allow the frontend origin(s) defined in `ALLOWED_ORIGINS`.
4. **Router registration** — all five routers are registered under the `/api/v1` prefix.

### Registered routers

| Router | Prefix |
|---|---|
| `boards.router` | `/api/v1` |
| `cards.router` | `/api/v1` |
| `lists.router` | `/api/v1` |
| `users.router` | `/api/v1` |
| `labels.router` | `/api/v1` |

---

## Database Schema

All models are defined in `app/models/schema.py` using **SQLModel** (Pydantic + SQLAlchemy).

### Core entities

```
User
 ├── board_memberships → BoardMember (role: owner | editor | viewer)
 └── assigned cards (M2M) → CardMemberLink

Board
 ├── lists → ListModel  (ordered by float position)
 └── memberships → BoardMember

ListModel
 └── cards → Card  (ordered by float position)

Card
 ├── members (M2M) → CardMemberLink → User
 ├── labels  (M2M) → CardLabelLink  → Label
 ├── checklists  → ChecklistItem
 ├── comments    → Comment
 ├── attachments → Attachment
 └── activities  → ActivityLog
```

### Junction tables

| Table | Purpose |
|---|---|
| `BoardMember` | Many-to-many with role: Boards ↔ Users |
| `CardMemberLink` | Many-to-many: Cards ↔ Users |
| `CardLabelLink` | Many-to-many: Cards ↔ Labels |

### Position system

Both `ListModel` and `Card` use a **float `position` field** (indexed) for O(1) drag-reordering. New items are inserted using the midpoint formula:

```
new_position = (prev_position + next_position) / 2
```

### Cascade deletes

- `Board` → `lists`, `memberships`
- `Card` → `checklists`, `comments`, `attachments`, `activities`

All use `cascade: all, delete-orphan`.

---

## API Reference

All endpoints are prefixed with `/api/v1`. Authentication uses the `x-user-email` header plus an optional `Authorization: Bearer <token>` header.

### Auth — `/api/v1/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login — returns a JWT token |
| `GET` | `/auth/me` | Return the currently authenticated user |

### Users — `/api/v1/users`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/` | List all users |
| `POST` | `/users/` | Create a user (admin / seed use) |

**UserCreate body:**

```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://..."
}
```

### Boards — `/api/v1/boards`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/boards/` | List boards accessible to the current user |
| `POST` | `/boards/` | Create a new board |
| `GET` | `/boards/{id}` | Get a full board with nested lists, cards, and members |
| `PATCH` | `/boards/{id}` | Update board title or background |
| `DELETE` | `/boards/{id}` | Delete a board (owner only) |
| `POST` | `/boards/{id}/members` | Add a member to the board |

**GET `/boards/{id}` query parameters:**

| Param | Type | Description |
|---|---|---|
| `label_id` | int (repeatable) | Filter cards by one or more label IDs |
| `member_id` | int | Filter cards assigned to a specific user |
| `due_date` | string (ISO date) | Filter cards with this due date |

### Lists — `/api/v1/lists`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/lists/` | Create a new list on a board |
| `PATCH` | `/lists/{id}` | Update title, position, or colour |
| `DELETE` | `/lists/{id}` | Delete a list (cascades to cards) |

To **reorder** a list, send `PATCH /lists/{id}` with `{ "position": <float> }`.

### Cards — `/api/v1/cards`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cards/` | Create a card in a list |
| `PATCH` | `/cards/{id}` | Update card fields |
| `DELETE` | `/cards/{id}` | Delete a card |
| `PUT` | `/cards/{id}/move` | Move card to a new list and/or position |

**Move card body:**

```json
{
  "new_list_id": 3,
  "new_position": 65536.0
}
```

**PATCH card fields:**

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `description` | string | Markdown supported |
| `due_date` | datetime (ISO 8601) | |
| `cover_image_color` | string | Hex colour, e.g. `#ff5733` |
| `is_archived` | boolean | Soft-delete / archive |

### Labels — `/api/v1/labels`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/labels/` | List all labels |
| `POST` | `/labels/` | Create a label |
| `PATCH` | `/labels/{id}` | Update label name or colour |
| `DELETE` | `/labels/{id}` | Delete a label |
| `POST` | `/cards/{cardId}/labels/{labelId}` | Attach label to a card |
| `DELETE` | `/cards/{cardId}/labels/{labelId}` | Detach label from a card |

### Checklists — `/api/v1/cards/{cardId}/checklists`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cards/{cardId}/checklists` | Add a checklist item |
| `PATCH` | `/cards/{cardId}/checklists/{itemId}` | Toggle completion or rename |
| `DELETE` | `/cards/{cardId}/checklists/{itemId}` | Delete an item |

### Comments & Activity

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cards/{cardId}/comments` | Add a comment |
| `GET` | `/cards/{cardId}/comments` | List comments with user details |
| `GET` | `/cards/{cardId}/activity` | Get the activity log for a card |

### Attachments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/cards/{cardId}/attachments` | List attachments |
| `POST` | `/cards/{cardId}/attachments` | Upload a file (`multipart/form-data`) |

---

## Role-Based Access Control

Board membership roles are stored in `BoardMember.role`:

| Role | Permissions |
|---|---|
| `owner` | Full access — edit and delete the board, manage members, full card CRUD |
| `editor` | Create, edit, move, and delete lists and cards; add labels, comments, and attachments |
| `viewer` | Read-only — can view the board but cannot modify anything |

Permission enforcement lives in `app/api/dependencies.py`. Write operations attempted by a `viewer` return `HTTP 403 Forbidden`. The frontend intercepts all `403` responses globally and displays a `PermissionToast` without crashing the UI.

---

## File Uploads

Uploaded files are stored at `app/uploads/` inside the container (persisted via a Docker volume). The directory is mounted as a static file server at the `/uploads` URL path, so each attachment record's `file_url` field is directly downloadable.

```python
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

---

## Docker Deployment

### `docker-compose.yml`

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
      - ./app.db:/app/app.db         # persist SQLite DB
    env_file:
      - .env
    restart: unless-stopped
```

### `Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build and run

```bash
# From the backend/ directory
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## DuckDNS + Caddy HTTPS Setup

This setup provides free HTTPS using **DuckDNS** for dynamic DNS and **Caddy** as the reverse proxy with automatic Let's Encrypt certificates.

### Step 1 — Register a DuckDNS subdomain

1. Go to [duckdns.org](https://www.duckdns.org) and sign in.
2. Create a subdomain (e.g. `scalarapi`) pointing at your server's public IP.
3. Copy your DuckDNS **token**.

### Step 2 — Keep DNS updated (optional cron)

```bash
echo "url=\"https://www.duckdns.org/update?domains=scalarapi&token=YOUR_TOKEN&ip=\" | curl -s -k -o ~/duckdns.log -K -" \
  | sudo tee /etc/cron.d/duckdns
```

### Step 3 — Install Caddy with the DuckDNS plugin

```bash
# Build with xcaddy
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build --with github.com/caddy-dns/duckdns
```

Or download a pre-built binary from [caddyserver.com/download](https://caddyserver.com/download) with the `duckdns` DNS provider selected.

### Step 4 — Write the Caddyfile

`/etc/caddy/Caddyfile`:

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

### Step 5 — Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy

# Verify TLS certificate was issued
sudo journalctl -u caddy -f
```

---

## Seeding the Database

A `seed.py` script populates the database with sample boards, lists, cards, labels, and users for development and testing:

```bash
# Inside the running container
docker exec -it trello_api python seed.py

# Or locally with the virtualenv active
cd backend
python seed.py
```

---

## Testing

Integration tests live in `test_api.py`:

```bash
# With the server running locally
python test_api.py
```

---

## Health Check

```bash
curl https://scalarapi.duckdns.org:8443/health
# → {"status": "ok", "message": "Backend is running smoothly."}
```

Interactive API docs:

```
Swagger UI : https://scalarapi.duckdns.org:8443/docs
ReDoc      : https://scalarapi.duckdns.org:8443/redoc
```