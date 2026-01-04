from pydantic import BaseModel
from datetime import datetime


class CaseArtifactOut(BaseModel):
    id: int
    case_id: int
    type: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True
