from sqlmodel import create_engine, SQLModel, Session
from app.core.config import settings

# connect_args ensures SQLite doesn't complain about multiple threads during local dev
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session