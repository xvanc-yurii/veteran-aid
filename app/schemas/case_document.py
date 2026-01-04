from typing import Optional
from pydantic import BaseModel

ALLOWED_DOC_STATUSES = {"required", "uploaded", "approved", "rejected"}

class CaseDocumentOut(BaseModel):
    id: int
    case_id: int
    title: str
    status: str
    comment: Optional[str] = None

    class Config:
        from_attributes = True

class CaseDocumentUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
