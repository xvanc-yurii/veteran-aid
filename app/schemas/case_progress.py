from pydantic import BaseModel


class CaseProgressOut(BaseModel):
    case_id: int
    total: int
    approved: int
    uploaded: int
    rejected: int
    required: int
    percent: int  # 0..100
    is_ready_to_submit: bool
    is_ready_for_approval: bool

    class Config:
        from_attributes = True
