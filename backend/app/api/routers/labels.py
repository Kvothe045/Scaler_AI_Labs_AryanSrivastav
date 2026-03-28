from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_session
from app.api.dependencies import get_current_user
from app.models.schema import Label, User

router = APIRouter(prefix="/labels", tags=["Labels"])

# DTOs
class LabelCreate(BaseModel):
    name: str
    color_code: str

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color_code: Optional[str] = None

@router.get("/", response_model=List[Label])
def get_all_labels(session: Session = Depends(get_session)):
    """Fetches all available labels to display in the frontend label picker."""
    return session.exec(select(Label)).all()

@router.post("/", response_model=Label, status_code=status.HTTP_201_CREATED)
def create_label(
    payload: LabelCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Creates a brand new label color/name dynamically."""
    new_label = Label(name=payload.name, color_code=payload.color_code)
    session.add(new_label)
    session.commit()
    session.refresh(new_label)
    return new_label

@router.patch("/{label_id}", response_model=Label)
def update_label(
    label_id: int, 
    payload: LabelUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Edits an existing label's name or color."""
    db_label = session.get(Label, label_id)
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
        
    if payload.name is not None:
        db_label.name = payload.name
    if payload.color_code is not None:
        db_label.color_code = payload.color_code
        
    session.add(db_label)
    session.commit()
    session.refresh(db_label)
    return db_label

@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(
    label_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Permanently deletes a label from the system."""
    db_label = session.get(Label, label_id)
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    session.delete(db_label)
    session.commit()