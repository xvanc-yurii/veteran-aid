from pydantic import BaseModel
from typing import List

class BenefitBase(BaseModel):
    title: str
    category: str = "other"
    description: str = ""
    authority: str = ""
    required_documents: List[str] = []
    eligible_statuses: List[str] = ["veteran"]

class BenefitCreate(BenefitBase):
    pass

class BenefitUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    description: str | None = None
    authority: str | None = None
    required_documents: List[str] | None = None
    eligible_statuses: List[str] | None = None

class BenefitOut(BenefitBase):
    id: int

    class Config:
        from_attributes = True
