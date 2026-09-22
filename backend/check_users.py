import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load backend/.env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL", "postgresql:///codementor")
if len(sys.argv) > 1:
    db_url = sys.argv[1]

# Format URL if needed
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        users = conn.execute(
            text("SELECT id, name, email, created_at FROM users ORDER BY id ASC;")
        ).fetchall()
        
        print("\n" + "=" * 65)
        print(f"  TOTAL REGISTERED USERS: {len(users)}")
        print("=" * 65)
        
        if not users:
            print("  (No users registered in this database yet)")
        else:
            for u in users:
                print(f"  ID: {u[0]:<4} | Name: {u[1]:<15} | Email: {u[2]:<25} | Created: {u[3]}")
        print("=" * 65 + "\n")
except Exception as e:
    print(f"Error querying database: {e}")
