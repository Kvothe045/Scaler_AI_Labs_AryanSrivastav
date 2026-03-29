# backend/app/api/routers/boards.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_session
from app.api.dependencies import get_current_user, verify_board_access
from app.models.schema import Board, ListModel, Card, BoardMember, User, Comment, ActivityLog, Attachment

router = APIRouter(prefix="/boards", tags=["Boards"])

# ==========================================
# Data Transfer Objects (DTOs)
# ==========================================
class BoardCreate(BaseModel):
    title: str
    background_color: str = "#0079bf"

class BoardUpdate(BaseModel):
    title: Optional[str] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None # <-- ADD THIS!

class BoardMemberCreate(BaseModel):
    user_id: int
    role: str = "viewer" # roles: "owner", "editor", "viewer"

# ==========================================
# Board Endpoints
# ==========================================
@router.get("/", response_model=List[Board])
def get_my_boards(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns only boards where the current user is an active member."""
    statement = select(Board).join(BoardMember).where(BoardMember.user_id == current_user.id)
    return session.exec(statement).all()

@router.post("/", response_model=Board, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) 
):
    """Creates a new board and automatically sets the creator as the Owner."""
    board = Board(title=payload.title, background_color=payload.background_color)
    session.add(board)
    session.commit()
    session.refresh(board)
    
    # Establish RBAC: Assign the creator as the owner
    membership = BoardMember(board_id=board.id, user_id=current_user.id, role="owner")
    session.add(membership)
    session.commit()
    
    session.refresh(board)
    
    return board

@router.patch("/{board_id}", response_model=Board)
def update_board(
    board_id: int, 
    payload: BoardUpdate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Updates board properties. Requires Owner or Editor."""
    verify_board_access(session, current_user.id, board_id, ["owner", "editor"])
    
    board = session.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    if payload.title is not None: 
        board.title = payload.title
    if payload.background_color is not None: 
        board.background_color = payload.background_color
    if payload.background_image is not None:  # <-- ADD THIS LOGIC
        board.background_image = payload.background_image
        
    session.add(board)
    session.commit()
    session.refresh(board)
    return board

@router.get("/{board_id}")
def get_board_state(
    board_id: int, 
    search: Optional[str] = Query(None, description="Search cards by title"),
    label_id: Optional[int] = Query(None, description="Filter by label ID"),
    member_id: Optional[int] = Query(None, description="Filter by assigned member ID"),
    due_date: Optional[datetime] = Query(None, description="Filter cards due before this date"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Hydrates the frontend. Checks access, returns lists, cards, and members."""
    # Security Gate
    membership = verify_board_access(session, current_user.id, board_id, ["owner", "editor", "viewer"])

    board = session.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    statement = select(ListModel).where(ListModel.board_id == board_id).order_by(ListModel.position)
    lists = session.exec(statement).all()

    # 1. Deep Serialization of Lists & Cards
    serialized_lists = []
    for lst in lists:
        card_stmt = select(Card).where(Card.list_id == lst.id, Card.is_archived == False)
        
        if search: card_stmt = card_stmt.where(Card.title.ilike(f"%{search}%"))
        if due_date: card_stmt = card_stmt.where(Card.due_date <= due_date)
        
        filtered_cards = session.exec(card_stmt).all()
        
        if label_id:
            filtered_cards = [c for c in filtered_cards if any(l.id == label_id for l in c.labels)]
        if member_id:
            filtered_cards = [c for c in filtered_cards if any(m.id == member_id for m in c.members)]
            
        lst_dict = lst.model_dump()
        lst_dict["cards"] = [
            {
                **card.model_dump(),
                "labels": [label.model_dump() for label in card.labels],
                "members": [member.model_dump() for member in card.members],
                "checklists": [cl.model_dump() for cl in card.checklists]
            }
            for card in filtered_cards
        ]
        serialized_lists.append(lst_dict)

    # 2. Fetch Board Members and User Details
    member_stmt = select(BoardMember, User).join(User, BoardMember.user_id == User.id).where(BoardMember.board_id == board_id)
    members_data = session.exec(member_stmt).all()
    
    serialized_members = []
    for bm_link, user_obj in members_data:
        serialized_members.append({
            "id": user_obj.id,
            "user_id": user_obj.id,
            "name": user_obj.name,
            "email": user_obj.email,
            "avatar_url": user_obj.avatar_url,
            "role": bm_link.role
        })

    # 3. Assemble Final Payload
    board_dict = board.model_dump()
    board_dict["lists"] = serialized_lists 
    board_dict["memberships"] = serialized_members 
    board_dict["my_role"] = membership.role 
    
    return board_dict

@router.post("/{board_id}/members", status_code=status.HTTP_201_CREATED)
def add_board_member(
    board_id: int, 
    payload: BoardMemberCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Invites a user to a workspace. Only Owners can do this."""
    verify_board_access(session, current_user.id, board_id, ["owner"])
    
    board = session.get(Board, board_id)
    user = session.get(User, payload.user_id)
    if not board or not user:
        raise HTTPException(status_code=404, detail="Board or User not found")

    statement = select(BoardMember).where(
        BoardMember.board_id == board_id, 
        BoardMember.user_id == payload.user_id
    )
    existing_member = session.exec(statement).first()
    
    if existing_member:
        existing_member.role = payload.role
        session.add(existing_member)
    else:
        new_member = BoardMember(board_id=board_id, user_id=payload.user_id, role=payload.role)
        session.add(new_member)
        
    session.commit()
    return {"message": f"User added to board as {payload.role}"}

@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a board and all its associated data (lists, cards, members, etc). 
    Requires Owner permissions.
    """
    verify_board_access(session, current_user.id, board_id, ["owner"])
    
    board = session.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    session.delete(board)
    session.commit()