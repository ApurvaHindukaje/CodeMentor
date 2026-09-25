from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before importing routes that depend on environment variables
backend_env = Path(__file__).resolve().parent.parent / ".env"
if backend_env.exists():
    load_dotenv(backend_env)
load_dotenv()

import json
from .db import engine, Base, SessionLocal
from .models import user, problem, submission  # Ensure all models are registered with Base
from .models.problem import Problem
from .routes import auth, problems, submissions, ai, interview


def seed_problems_if_empty():
    db = SessionLocal()
    try:
        if db.query(Problem).count() == 0:
            data_file = Path(__file__).resolve().parent.parent / "data" / "leetcode_500.json"
            if data_file.exists():
                print("[Auto-Seed] Empty database detected. Seeding 500 problems into PostgreSQL...")
                with open(data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                db_objects = [
                    Problem(
                        title=p.get("title", ""),
                        description=p.get("description", ""),
                        difficulty=p.get("difficulty", "Medium"),
                        topics=p.get("topics", []),
                        sample_input=p.get("sample_input", ""),
                        sample_output=p.get("sample_output", ""),
                        starter_code=p.get("starter_code", ""),
                        hidden_test_cases=p.get("hidden_test_cases", []),
                        optimal_time_complexity=p.get("optimal_time_complexity", "O(N)"),
                        optimal_space_complexity=p.get("optimal_space_complexity", "O(1)"),
                        complexity_notes=p.get("complexity_notes", "")
                    )
                    for p in data
                ]
                db.bulk_save_objects(db_objects)
                db.commit()
                print(f"[Auto-Seed] Successfully seeded {len(db_objects)} problems!")
    except Exception as e:
        print(f"[Auto-Seed] Notice: Could not auto-seed database: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    try:
        Base.metadata.create_all(bind=engine)
        seed_problems_if_empty()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")
    yield


app = FastAPI(
    title="CodeMentor AI Backend",
    description="Full-Stack FastAPI + PostgreSQL + AI Mentor platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://apurvahindukaje.dev",
        "https://www.apurvahindukaje.dev",
        "https://codementor.apurvahindukaje.dev",
    ],
    allow_origin_regex=r"https://.*(\.vercel\.app|\.apurvahindukaje\.dev)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(ai.router)
app.include_router(interview.router)


@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "CodeMentor AI Backend (FastAPI + PostgreSQL + Submissions + AI Mentor) is running!"
    }