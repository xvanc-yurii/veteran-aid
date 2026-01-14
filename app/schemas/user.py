from pydantic import BaseModel, EmailStr

class UserPublic(BaseModel):
    id: int
    email: EmailStr
    role: str
    status: str
    full_name: str | None = None
    region: str | None = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: str
    region: str
    status: str  # veteran / ubd / family / disabled