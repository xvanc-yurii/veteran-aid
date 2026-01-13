from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.db.base import Base


class CaseDocument(Base):
    __tablename__ = "case_documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True, nullable=False)

    title = Column(String, nullable=False)
    status = Column(String, default="required", nullable=False)

    # ✅ коментар модератора/користувача
    comment = Column(String, nullable=True)

    # ✅ файл (варіант B)
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)      # відносний шлях в uploads/
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
