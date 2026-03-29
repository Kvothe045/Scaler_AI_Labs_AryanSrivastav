# backend/app/api/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from app.core.database import get_session
# Import both User and UserCreate from your schema file
from app.models.schema import User, UserCreate 

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[User])
def get_all_users(session: Session = Depends(get_session)):
    """Fetches all users to populate the frontend Profile Switcher."""
    return session.exec(select(User)).all()

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, session: Session = Depends(get_session)):
    """
    Creates a new user (Demo Mode - No Auth).
    Expects email and name.
    """
    existing_user = session.exec(select(User).where(User.email == payload.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A user with this email already exists."
        )
    
    new_user = User(**payload.model_dump())
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return new_user