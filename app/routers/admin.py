from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.case import Case
from app.models.case_history import CaseHistory
from app.models.user import User
from app.schemas.case import CaseOut

router = APIRouter(prefix="/admin", tags=["admin"])

ALLOWED_CASE_STATUSES = {"draft", "submitted", "in_review", "approved", "rejected", "done"}


class AdminCaseUpdate(BaseModel):
    status: str
    comment: Optional[str] = ""


def _admin_only(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/cases", response_model=list[CaseOut])
def admin_list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _admin_only(current_user)
    return db.query(Case).order_by(Case.id.desc()).all()


@router.patch("/cases/{case_id}", response_model=CaseOut)
def admin_update_case_status(
    case_id: int,
    data: AdminCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _admin_only(current_user)

    if data.status not in ALLOWED_CASE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    c.status = data.status
    db.add(
        CaseHistory(
            case_id=case_id,
            status=data.status,
            comment=f"[ADMIN] {data.comment or 'Зміна статусу'}",
        )
    )
    db.commit()
    db.refresh(c)
    return c
