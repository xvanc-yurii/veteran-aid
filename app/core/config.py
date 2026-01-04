from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "Veteran Aid"
    jwt_secret: str = "CHANGE_ME_SUPER_SECRET"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24h

settings = Settings()
