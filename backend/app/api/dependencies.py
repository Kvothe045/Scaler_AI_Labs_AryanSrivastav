from fastapi import Header, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from app.core.database import get_session
from app.models.schema import User, BoardMember, Board, ListModel, Card

def get_current_user(
    x_user_email: str = Header(default="kira@example.com", description="Simulates logged-in user"),
    session: Session = Depends(get_session)
) -> User:
    """Mock authentication."""
    statement = select(User).where(User.email == x_user_email)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user

def verify_board_access(session: Session, user_id: int, board_id: int, allowed_roles: List[str]):
    """
    The Core Security Gate.
    Verifies if the user is a member of the board AND has the required role.
    """
    statement = select(BoardMember).where(
        BoardMember.board_id == board_id, 
        BoardMember.user_id == user_id
    )
    membership = session.exec(statement).first()
    
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this board.")
        
    if membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Action requires one of these roles: {allowed_roles}. You are a '{membership.role}'."
        )
    return membership