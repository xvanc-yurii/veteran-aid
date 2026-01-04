from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(50), default="veteran")   # veteran/family/admin
    status: Mapped[str] = mapped_column(String(100), default="unknown")  # UBD/інвалідність/...

    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
region: Mapped[str] = mapped_column(String(100), nullable=False, default="")
