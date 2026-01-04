from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Benefit(Base):
    __tablename__ = "benefits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="other")

    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    authority: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    # простий формат для диплома: рядок з переносами
    required_documents: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # простий формат: "veteran,family,ubd,disabled"
    eligible_statuses: Mapped[str] = mapped_column(String(255), nullable=False, default="veteran")
