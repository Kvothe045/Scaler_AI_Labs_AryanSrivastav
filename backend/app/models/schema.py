from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from pydantic import BaseModel
# ==========================================
# Link Tables (Many-to-Many)
# ==========================================
class CardMemberLink(SQLModel, table=True):
    card_id: Optional[int] = Field(default=None, foreign_key="card.id", primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)

class CardLabelLink(SQLModel, table=True):
    card_id: Optional[int] = Field(default=None, foreign_key="card.id", primary_key=True)
    label_id: Optional[int] = Field(default=None, foreign_key="label.id", primary_key=True)

class BoardMember(SQLModel, table=True):
    board_id: int = Field(foreign_key="board.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    role: str = Field(default="viewer", description="Roles: owner, editor, viewer")

# ==========================================
# Main Entities
# ==========================================
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    avatar_url: Optional[str] = None
    
    cards: List["Card"] = Relationship(back_populates="members", link_model=CardMemberLink)
    board_memberships: List["BoardMember"] = Relationship()

class Board(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    background_color: str = Field(default="#0079bf")
    background_image: Optional[str] = None
    
    
    lists: List["ListModel"] = Relationship(back_populates="board", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    memberships: List["BoardMember"] = Relationship(sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class ListModel(SQLModel, table=True):
    __tablename__ = "list"
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id")
    title: str
    position: float = Field(index=True)
    color: Optional[str] = None
    
    board: Optional[Board] = Relationship(back_populates="lists")
    cards: List["Card"] = Relationship(back_populates="list", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Label(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color_code: str
    
    cards: List["Card"] = Relationship(back_populates="labels", link_model=CardLabelLink)
    


class Card(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    list_id: int = Field(foreign_key="list.id")
    title: str
    description: Optional[str] = None
    position: float = Field(index=True)
    due_date: Optional[datetime] = None
    cover_image_color: Optional[str] = None
    is_archived: bool = Field(default=False) # ARCHIVE FEATURE ADDED
    
    list: Optional[ListModel] = Relationship(back_populates="cards")
    members: List[User] = Relationship(back_populates="cards", link_model=CardMemberLink)
    labels: List[Label] = Relationship(back_populates="cards", link_model=CardLabelLink)
    
    # New 1:N Relationships with Cascade Deletes
    checklists: List["ChecklistItem"] = Relationship(back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    comments: List["Comment"] = Relationship(back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    attachments: List["Attachment"] = Relationship(back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    activities: List["ActivityLog"] = Relationship(back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class ChecklistItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="card.id")
    title: str
    is_completed: bool = Field(default=False)
    card: Optional[Card] = Relationship(back_populates="checklists")

class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="card.id")
    user_id: int = Field(foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    card: Optional[Card] = Relationship(back_populates="comments")
    user: Optional[User] = Relationship() # Fetches user details for the UI

class Attachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="card.id")
    file_name: str
    file_url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    card: Optional[Card] = Relationship(back_populates="attachments")

class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="card.id")
    user_id: int = Field(foreign_key="user.id")
    action: str 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    card: Optional[Card] = Relationship(back_populates="activities")
    user: Optional[User] = Relationship()
    
    
class UserCreate(BaseModel):
    """Schema for validating incoming data when creating a user."""
    email: str
    name: str
    avatar_url: Optional[str] = None