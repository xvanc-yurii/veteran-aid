from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic, UserProfileUpdate
from sqlalchemy.orm import Session
from app.db.session import get_db
from pydantic import BaseModel


router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me")
def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.full_name = data.full_name
    current_user.region = data.region
    current_user.status = data.status
    db.commit()
    return {"updated": True}

class UserUpdateMe(BaseModel):
    full_name: str | None = None
    region: str | None = None

@router.patch("/me")
def update_me(
    data: UserUpdateMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip() or None
    if data.region is not None:
        current_user.region = data.region.strip() or None

    db.commit()
    db.refresh(current_user)
    return current_user