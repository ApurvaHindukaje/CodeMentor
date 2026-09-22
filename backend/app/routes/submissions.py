from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.problem import Problem
from ..models.submission import Submission
from ..routes.auth import get_current_user, security
from ..judge0 import execute_python_code
from ..complexity import analyze_complexity

router = APIRouter(prefix="/submissions", tags=["Submissions"])


class RunCodeRequest(BaseModel):
    problem_id: int
    code: str
    language: Optional[str] = "python"
    custom_test_cases: Optional[List[Dict[str, Any]]] = None


class SubmitCodeRequest(BaseModel):
    problem_id: int
    code: str
    language: Optional[str] = "python"


@router.post("/run")
def run_code(req: RunCodeRequest, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if req.custom_test_cases and len(req.custom_test_cases) > 0:
        test_cases = req.custom_test_cases
    else:
        test_cases = []
        if problem.sample_input and problem.sample_output:
            test_cases.append({
                "input": problem.sample_input,
                "expected_output": problem.sample_output
            })
        if problem.hidden_test_cases and isinstance(problem.hidden_test_cases, list):
            test_cases.extend(problem.hidden_test_cases[:1])

    result = execute_python_code(req.code, test_cases)
    optimal_time = problem.optimal_time_complexity or "O(N)"
    optimal_space = problem.optimal_space_complexity or "O(1)"
    result["complexity_analysis"] = analyze_complexity(req.code, problem.title, optimal_time, optimal_space)
    return result


@router.post("/submit")
def submit_code(
    req: SubmitCodeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Combine sample test case and all hidden test cases
    all_test_cases = []
    if problem.sample_input and problem.sample_output:
        all_test_cases.append({
            "input": problem.sample_input,
            "expected_output": problem.sample_output
        })

    if problem.hidden_test_cases and isinstance(problem.hidden_test_cases, list):
        all_test_cases.extend(problem.hidden_test_cases)

    result = execute_python_code(req.code, all_test_cases)

    # Record submission in PostgreSQL
    submission = Submission(
        user_id=current_user["id"],
        problem_id=problem.id,
        code=req.code,
        language=req.language or "python",
        status=result["status"],
        passed_cases=result["passed_count"],
        total_cases=result["total_count"],
        execution_time_ms=result["execution_time_ms"],
        error_message=result.get("error_message"),
        created_at=datetime.utcnow()
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    result["submission_id"] = submission.id
    result["created_at"] = submission.created_at.isoformat()
    optimal_time = problem.optimal_time_complexity or "O(N)"
    optimal_space = problem.optimal_space_complexity or "O(1)"
    result["complexity_analysis"] = analyze_complexity(req.code, problem.title, optimal_time, optimal_space)
    return result


@router.get("/history/{problem_id}")
def get_submission_history(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == current_user["id"], Submission.problem_id == problem_id)
        .order_by(Submission.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": s.id,
            "status": s.status,
            "passed_cases": s.passed_cases,
            "total_cases": s.total_cases,
            "execution_time_ms": s.execution_time_ms,
            "created_at": s.created_at.isoformat(),
            "code": s.code
        }
        for s in submissions
    ]
