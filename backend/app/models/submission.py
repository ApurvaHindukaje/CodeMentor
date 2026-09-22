from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from ..db import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, index=True)
    code = Column(Text, nullable=False)
    language = Column(String(50), default="python", nullable=False)
    status = Column(String(50), nullable=False)
    passed_cases = Column(Integer, default=0, nullable=False)
    total_cases = Column(Integer, default=0, nullable=False)
    execution_time_ms = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
