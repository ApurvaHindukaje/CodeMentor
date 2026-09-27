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


import re

@router.post("/run")
def run_code(req: RunCodeRequest, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Extract entry point from starter code if available
    entry_point = None
    if problem.starter_code:
        m = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", problem.starter_code)
        if m:
            entry_point = m.group(1)

    # Use valid custom test cases or fallback to problem defaults
    valid_custom = [tc for tc in (req.custom_test_cases or []) if str(tc.get("input", "")).strip()]
    if valid_custom:
        test_cases = valid_custom
    else:
        test_cases = []
        if problem.sample_input:
            test_cases.append({
                "input": problem.sample_input,
                "expected_output": problem.sample_output or ""
            })
        if problem.hidden_test_cases and isinstance(problem.hidden_test_cases, list):
            test_cases.extend(problem.hidden_test_cases[:2])

    result = execute_python_code(req.code, test_cases, entry_point=entry_point)
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

    entry_point = None
    if problem.starter_code:
        m = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", problem.starter_code)
        if m:
            entry_point = m.group(1)

    # Combine sample test case and all hidden test cases
    all_test_cases = []
    if problem.sample_input:
        all_test_cases.append({
            "input": problem.sample_input,
            "expected_output": problem.sample_output or ""
        })

    if problem.hidden_test_cases and isinstance(problem.hidden_test_cases, list):
        for tc in problem.hidden_test_cases:
            if tc.get("input") != problem.sample_input:
                all_test_cases.append(tc)

    result = execute_python_code(req.code, all_test_cases, entry_point=entry_point)

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


@router.get("/solved")
def get_user_solved_problems(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns distinct problem IDs that the current user has successfully solved ('Accepted').
    """
    solved = (
        db.query(Submission.problem_id)
        .filter(
            Submission.user_id == current_user["id"],
            Submission.status == "Accepted"
        )
        .distinct()
        .all()
    )
    return [s[0] for s in solved]


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
