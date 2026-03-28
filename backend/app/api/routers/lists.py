from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_session
from app.api.dependencies import get_current_user, verify_board_access
from app.models.schema import ListModel, User

router = APIRouter(prefix="/lists", tags=["Lists"])

class ListCreate(BaseModel):
    title: str
    board_id: int
    position: float

class ListUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[float] = None

@router.post("/", response_model=ListModel, status_code=status.HTTP_201_CREATED)
def create_list(
    payload: ListCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Creates a new list column. Requires Owner or Editor."""
    verify_board_access(session, current_user.id, payload.board_id, ["owner", "editor"])
    
    new_list = ListModel(**payload.model_dump())
    session.add(new_list)
    session.commit()
    session.refresh(new_list)
    return new_list

@router.patch("/{list_id}", response_model=ListModel)
def update_list(
    list_id: int, 
    payload: ListUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Updates list title or position (DnD). Requires Owner or Editor."""
    db_list = session.get(ListModel, list_id)
    if not db_list: raise HTTPException(status_code=404, detail="List not found")
    
    verify_board_access(session, current_user.id, db_list.board_id, ["owner", "editor"])
        
    if payload.title is not None: db_list.title = payload.title
    if payload.position is not None: db_list.position = payload.position
        
    session.add(db_list)
    session.commit()
    session.refresh(db_list)
    return db_list

@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Removes a list and its cards. Requires Owner or Editor."""
    db_list = session.get(ListModel, list_id)
    if not db_list: raise HTTPException(status_code=404, detail="List not found")
    
    verify_board_access(session, current_user.id, db_list.board_id, ["owner", "editor"])
    
    session.delete(db_list)
    session.commit()