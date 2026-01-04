from sqlalchemy import Column, Integer, String, ForeignKey, Text
from app.db.base import Base

class CaseDocument(Base):
    __tablename__ = "case_documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)

    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="required")
    comment = Column(Text, nullable=True)  # ✅ нове поле
