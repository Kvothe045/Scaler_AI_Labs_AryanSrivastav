import asyncio
from sqlmodel import Session, SQLModel, select
from app.core.database import engine, init_db
from app.models.schema import User, Board, ListModel, Card, BoardMember, Label, CardLabelLink, Comment

def seed_data():
    print("🌱 Dropping old tables and recreating...")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        print("👥 Seeding Users...")
        # MUST include Kira because our frontend Axios is hardcoded to use this email
        kira = User(email="kira@example.com", name="Kira", avatar_url="https://ui-avatars.com/api/?name=Kira&background=0D8ABC&color=fff")
        bob = User(email="bob@example.com", name="Bob (Viewer)", avatar_url="https://ui-avatars.com/api/?name=Bob&background=E5A50A&color=fff")
        session.add_all([kira, bob])
        session.commit()

        print("🏷️ Seeding Labels...")
        l_urgent = Label(name="Urgent", color_code="#ef4444") # Tailwind Red-500
        l_frontend = Label(name="Frontend", color_code="#3b82f6") # Tailwind Blue-500
        l_backend = Label(name="Backend", color_code="#10b981") # Tailwind Green-500
        session.add_all([l_urgent, l_frontend, l_backend])
        session.commit()

        print("📋 Seeding Board & Roles...")
        # Classic Trello Blue background
        board = Board(title="Trello Clone Development", background_color="#0079bf")
        session.add(board)
        session.commit()

        session.add(BoardMember(board_id=board.id, user_id=kira.id, role="owner"))
        session.add(BoardMember(board_id=board.id, user_id=bob.id, role="viewer"))
        session.commit()

        print("🗂️ Seeding Lists...")
        list1 = ListModel(board_id=board.id, title="To Do", position=1000.0)
        list2 = ListModel(board_id=board.id, title="In Progress", position=2000.0)
        list3 = ListModel(board_id=board.id, title="Done", position=3000.0)
        session.add_all([list1, list2, list3])
        session.commit()

        print("🎟️ Seeding Cards...")
        card1 = Card(list_id=list1.id, title="Design Database Schema", position=1000.0, description="Normalize tables and setup SQLModel.")
        card2 = Card(list_id=list1.id, title="Setup Next.js Frontend", position=2000.0)
        card3 = Card(list_id=list2.id, title="Implement Drag and Drop", position=1000.0, cover_image_color="#f59e0b")
        card4 = Card(list_id=list3.id, title="Initialize FastAPI", position=1000.0)
        session.add_all([card1, card2, card3, card4])
        session.commit()

        print("🔗 Attaching Labels & Comments...")
        session.add(CardLabelLink(card_id=card1.id, label_id=l_backend.id))
        session.add(CardLabelLink(card_id=card1.id, label_id=l_urgent.id))
        session.add(CardLabelLink(card_id=card2.id, label_id=l_frontend.id))
        
        session.add(Comment(card_id=card3.id, user_id=bob.id, content="Are we using dnd-kit for this?"))
        session.commit()

        print("✅ Seeding Complete! Ready for UI development.")

if __name__ == "__main__":
    seed_data()