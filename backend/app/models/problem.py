from sqlalchemy import Column, Integer, String, Text, JSON
from ..db import Base


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    difficulty = Column(String(50), nullable=False)
    topics = Column(JSON, default=list)
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)
    starter_code = Column(Text, nullable=True)
    hidden_test_cases = Column(JSON, default=list)
    optimal_time_complexity = Column(String(50), default="O(N)", nullable=True)
    optimal_space_complexity = Column(String(50), default="O(1)", nullable=True)
    complexity_notes = Column(Text, nullable=True)