from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List

from app.core.database import get_session
from app.models.schema import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[User])
def get_all_users(session: Session = Depends(get_session)):
    """Fetches all users to populate the frontend Profile Switcher."""
    return session.exec(select(User)).all()