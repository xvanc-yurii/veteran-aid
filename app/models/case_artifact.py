from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class CaseArtifact(Base):
    __tablename__ = "case_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)

    type = Column(String(50), nullable=False)   # application_text / application_pdf
    title = Column(String(255), nullable=False)
    content_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
