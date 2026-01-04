from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic, UserProfileUpdate
from sqlalchemy.orm import Session
from app.db.session import get_db


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