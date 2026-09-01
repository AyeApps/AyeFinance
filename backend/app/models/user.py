from datetime import UTC, datetime

from beanie import Document
from pydantic import EmailStr, Field


class User(Document):
    id: str = Field(default=..., alias="_id")  # Matches sub from central aye-auth or ObjectId
    email: EmailStr
    name: str = "Usuario Aye"
    avatar_url: str | None = None
    hashed_password: str | None = None
    is_active: bool = True
    is_verified: bool = False
    role: str = "user"
    login_attempts: int = 0
    locked_until: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    class Settings:
        name = "users"
        use_state_management = True

    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > datetime.now(UTC))
