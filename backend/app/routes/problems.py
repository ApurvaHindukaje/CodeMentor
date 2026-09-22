from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.problem import Problem

router = APIRouter(prefix="/problems", tags=["Problems"])


@router.get("/")
def get_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem).all()
    return [
        {
            "id": problem.id,
            "title": problem.title,
            "difficulty": problem.difficulty,
            "topics": problem.topics or []
        }
        for problem in problems
    ]


@router.get("/{problem_id}")
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=404,
            detail="Problem not found"
        )

    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "topics": problem.topics or [],
        "sample_input": problem.sample_input,
        "sample_output": problem.sample_output,
        "starter_code": problem.starter_code,
        "optimal_time_complexity": problem.optimal_time_complexity or "O(N)",
        "optimal_space_complexity": problem.optimal_space_complexity or "O(1)",
        "complexity_notes": problem.complexity_notes
    }