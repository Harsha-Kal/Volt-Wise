from app.db.database import SessionLocal, engine
from app.db.models import User, Base

try:
    print("Testing DB connection...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    new_user = User(email="testdb@example.com", hashed_password="pwd", provider="Xcel")
    db.add(new_user)
    db.commit()
    print("Successfully inserted user.")
except Exception as e:
    print(f"DB Error: {e}")
finally:
    db.close()
