from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import engine, Base
from .models import user, problem, submission  # Ensure all models are registered with Base
from .routes import auth, problems, submissions, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database tables could not be created immediately: {e}")
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
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(ai.router)


@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "CodeMentor AI Backend (FastAPI + PostgreSQL + Submissions + AI Mentor) is running!"
    }