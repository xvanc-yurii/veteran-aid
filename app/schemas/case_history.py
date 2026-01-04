from pydantic import BaseModel
from datetime import datetime

class CaseHistoryOut(BaseModel):
    id: int
    case_id: int
    status: str
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True
