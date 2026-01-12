from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    benefit_id: int

    # NEW
    title: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=2000)

    # LEGACY (щоб не ламати старий фронт/запити)
    note: Optional[str] = ""


class CaseUpdate(BaseModel):
    status: Optional[str] = None

    # NEW
    title: Optional[str] = None
    description: Optional[str] = None

    # LEGACY
    note: Optional[str] = None


class CaseOut(BaseModel):
    id: int
    user_id: int
    benefit_id: int
    status: str

    # NEW
    title: str
    description: str

    # LEGACY
    note: str

    created_at: datetime

    class Config:
        from_attributes = True
