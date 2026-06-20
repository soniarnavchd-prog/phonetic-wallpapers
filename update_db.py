from database import engine
from models import Base
from sqlalchemy import text

print("Connecting to live database to force update user tables...")

try:
    # engine.begin() automatically commits the changes to the live database
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS favorites CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS collections CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        
    print("Old user tables and dependencies dropped successfully.")
    
    # Recreate all tables with your brand new schema (email, password)
    Base.metadata.create_all(bind=engine)
    print("New user tables created successfully!")
    
except Exception as e:
    print(f"An error occurred: {e}")