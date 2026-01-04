from typing import Optional
from pydantic import BaseModel


class CaseCreate(BaseModel):
    benefit_id: int
    note: Optional[str] = ""


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None


class CaseOut(BaseModel):
    id: int
    user_id: int
    benefit_id: int
    status: str
    note: str

    class Config:
        from_attributes = True
