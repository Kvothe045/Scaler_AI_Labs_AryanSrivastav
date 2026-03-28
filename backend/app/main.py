from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
import os
from fastapi.staticfiles import StaticFiles

from app.api.routers import boards, cards, lists, users,labels

app = FastAPI(
    title="Trello Kanban API",
    description="Scalar AI LABS ASSIGNMENT",
    version="1.0.0"
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}

# Register the routers with standard API prefixes
app.include_router(boards.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")
app.include_router(lists.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(labels.router, prefix="/api/v1")