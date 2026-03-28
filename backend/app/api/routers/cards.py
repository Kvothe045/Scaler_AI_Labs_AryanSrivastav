import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_session
from app.api.dependencies import get_current_user, verify_board_access
from app.models.schema import (
    Card, ChecklistItem, User, Label, CardMemberLink, CardLabelLink, ListModel, Comment, Attachment, ActivityLog
)

router = APIRouter(prefix="/cards", tags=["Cards"])

# ==========================================
# DTOs
# ==========================================
class CardCreate(BaseModel):
    title: str
    list_id: int
    position: float

class CardMove(BaseModel):
    new_list_id: int
    new_position: float

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    cover_image_color: Optional[str] = None
    is_archived: Optional[bool] = None

class CommentCreate(BaseModel):
    content: str
    
class ChecklistUpdate(BaseModel):
    is_completed: bool
    
class ChecklistCreate(BaseModel):
    title: str

# Helper function to check access for card operations
def _verify_card_access(session: Session, current_user: User, list_id: int, allowed_roles=None):
    if allowed_roles is None:
        allowed_roles = ["owner", "editor"]
        
    lst = session.get(ListModel, list_id)
    if not lst: raise HTTPException(status_code=404, detail="Parent list not found")
    
    return verify_board_access(session, current_user.id, lst.board_id, allowed_roles)

def _log_activity(session: Session, card_id: int, user_id: int, action: str):
    log = ActivityLog(card_id=card_id, user_id=user_id, action=action)
    session.add(log)

# ==========================================
# Core Card Endpoints
# ==========================================

@router.post("/", response_model=Card, status_code=status.HTTP_201_CREATED)
def create_card(payload: CardCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    _verify_card_access(session, current_user, payload.list_id)
    card = Card(title=payload.title, list_id=payload.list_id, position=payload.position)
    session.add(card)
    session.commit()
    session.refresh(card)
    
    _log_activity(session, card.id, current_user.id, f"added this card to '{card.list.title}'")
    session.commit()
    session.refresh(card)
    return card

@router.put("/{card_id}/move", response_model=Card)
def move_card(card_id: int, payload: CardMove, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    
    _verify_card_access(session, current_user, card.list_id)
    _verify_card_access(session, current_user, payload.new_list_id)
    
    old_list_id = card.list_id
    card.list_id = payload.new_list_id
    card.position = payload.new_position
    session.add(card)
    
    if old_list_id != payload.new_list_id:
        new_list = session.get(ListModel, payload.new_list_id)
        _log_activity(session, card.id, current_user.id, f"moved this card to '{new_list.title}'")
        
    session.commit()
    session.refresh(card)
    return card

@router.patch("/{card_id}")
def update_card_details(card_id: int, payload: CardUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
        
    if payload.title is not None: card.title = payload.title
    if payload.description is not None: card.description = payload.description
    if payload.due_date is not None: card.due_date = payload.due_date
    if payload.cover_image_color is not None: card.cover_image_color = payload.cover_image_color
    if payload.is_archived is not None:
        card.is_archived = payload.is_archived
        action = "archived this card" if payload.is_archived else "sent this card to the board"
        _log_activity(session, card.id, current_user.id, action)
        
    session.add(card)
    session.commit()
    session.refresh(card)
    return card

@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404, detail="Card not found")
    _verify_card_access(session, current_user, card.list_id)
    
    session.delete(card)
    session.commit()

# ==========================================
# Relational Endpoints
# ==========================================
@router.patch("/{card_id}/checklists/{checklist_id}")
def toggle_checklist_item(card_id: int, checklist_id: int, payload: ChecklistUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    item = session.get(ChecklistItem, checklist_id)
    if not item or item.card_id != card_id: raise HTTPException(status_code=404)
    
    _verify_card_access(session, current_user, item.card.list_id)
    item.is_completed = payload.is_completed
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.post("/{card_id}/checklists", response_model=ChecklistItem, status_code=status.HTTP_201_CREATED)
def add_checklist_item(card_id: int, payload: ChecklistCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
        
    item = ChecklistItem(card_id=card_id, title=payload.title)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.delete("/{card_id}/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_item(card_id: int, checklist_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    item = session.get(ChecklistItem, checklist_id)
    if not item or item.card_id != card_id: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, item.card.list_id)
    session.delete(item)
    session.commit()

@router.post("/{card_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
def assign_member(card_id: int, user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
    
    link = CardMemberLink(card_id=card_id, user_id=user_id)
    session.add(link)
    try: session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="User already assigned.")
    return {"message": "Member assigned successfully"}

@router.delete("/{card_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(card_id: int, user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
    
    statement = select(CardMemberLink).where(CardMemberLink.card_id == card_id, CardMemberLink.user_id == user_id)
    link = session.exec(statement).first()
    if link:
        session.delete(link)
        session.commit()

@router.post("/{card_id}/labels/{label_id}", status_code=status.HTTP_201_CREATED)
def add_label(card_id: int, label_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
    
    link = CardLabelLink(card_id=card_id, label_id=label_id)
    session.add(link)
    try: session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Label already added.")
    return {"message": "Label added successfully"}

@router.delete("/{card_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_label(card_id: int, label_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)
    
    statement = select(CardLabelLink).where(CardLabelLink.card_id == card_id, CardLabelLink.label_id == label_id)
    link = session.exec(statement).first()
    if link:
        session.delete(link)
        session.commit()
        
# ==========================================
# Comments & Attachments
# ==========================================

@router.post("/{card_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(card_id: int, payload: CommentCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id, ["owner", "editor", "viewer"]) 
    
    comment = Comment(card_id=card_id, user_id=current_user.id, content=payload.content)
    session.add(comment)
    _log_activity(session, card.id, current_user.id, "left a comment")
    session.commit()
    session.refresh(comment)
    
    return {
        "id": comment.id,
        "card_id": comment.card_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "user_id": comment.user_id
    }

# ── FIXED: upload dir and URL path now both use "uploads/" ──
UPLOAD_DIR = "uploads"

@router.post("/{card_id}/attachments", status_code=status.HTTP_201_CREATED)
def upload_attachment(
    card_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Handles real file uploads, saving to local disk and DB."""
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id)

    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Use a safe filename to avoid path traversal
    safe_name = f"{card_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ✅ URL must match the StaticFiles mount path in main.py
    # If main.py does: app.mount("/uploads", StaticFiles(directory="uploads"))
    # then the URL should be /uploads/<filename>
    file_url = f"/uploads/{safe_name}"

    attachment = Attachment(card_id=card_id, file_name=file.filename, file_url=file_url)
    session.add(attachment)
    _log_activity(session, card.id, current_user.id, f"attached {file.filename}")
    session.commit()
    session.refresh(attachment)

    return {
        "id": attachment.id,
        "card_id": attachment.card_id,
        "file_name": attachment.file_name,
        "file_url": attachment.file_url,
        "uploaded_at": attachment.uploaded_at,
    }


# ── NEW: GET endpoint to fetch attachments for a card ──
@router.get("/{card_id}/attachments", status_code=status.HTTP_200_OK)
def get_attachments(
    card_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns all attachments for a card."""
    card = session.get(Card, card_id)
    if not card: raise HTTPException(status_code=404)
    _verify_card_access(session, current_user, card.list_id, ["owner", "editor", "viewer"])

    statement = select(Attachment).where(Attachment.card_id == card_id)
    attachments = session.exec(statement).all()

    return [
        {
            "id": att.id,
            "card_id": att.card_id,
            "file_name": att.file_name,
            "file_url": att.file_url,
            "uploaded_at": att.uploaded_at,
        }
        for att in attachments
    ]