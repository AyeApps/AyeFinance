from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(default="Usuario Aye", min_length=2, max_length=100)
    turnstile_token: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número.")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    turnstile_token: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str | None = None


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar_url: str | None = None
    is_active: bool
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse
    refresh_token: str | None = None
