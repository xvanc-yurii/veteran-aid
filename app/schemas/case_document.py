from pydantic import BaseModel
from typing import Optional, Literal

CaseDocumentStatus = Literal["required", "uploaded", "approved", "rejected"]
ALLOWED_DOC_STATUSES = {"required", "uploaded", "approved", "rejected"}


class CaseDocumentOut(BaseModel):
    id: int
    case_id: int
    title: str
    status: CaseDocumentStatus

    # ✅ важливо: optional, бо в БД може бути NULL
    comment: Optional[str] = None

    # ✅ варіант B
    file_name: Optional[str] = None

    class Config:
        from_attributes = True


class CaseDocumentUpdate(BaseModel):
    status: Optional[CaseDocumentStatus] = None
    comment: Optional[str] = None
