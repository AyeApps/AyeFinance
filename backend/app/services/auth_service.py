from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def authenticate_user(data: UserLogin) -> tuple[User, str, str, datetime]:
    user = await User.find_one(User.email == data.email)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check lockout
    if user.is_locked():
        remaining = int((user.locked_until - datetime.now(UTC)).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Cuenta temporalmente bloqueada. Inténtalo en {max(1, remaining)} minutos.",
        )

    if not user.hashed_password or not verify_password(data.password, user.hashed_password):
        user.login_attempts += 1
        if user.login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.now(UTC) + timedelta(minutes=LOCKOUT_MINUTES)
        await user.save()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Successful login: reset attempts
    user.login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.now(UTC)
    await user.save()

    access_token, _, exp = create_access_token(
        subject=str(user.id),
        email=user.email,
        name=user.name,
        apps_access={"finance": True},
    )
    refresh_token, _, _ = create_refresh_token(subject=str(user.id))

    return user, access_token, refresh_token, exp


async def register_user(data: UserRegister) -> tuple[User, str, str, datetime]:
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado.",
        )

    import uuid

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
        is_active=True,
    )
    await user.insert()

    access_token, _, exp = create_access_token(
        subject=user_id,
        email=user.email,
        name=user.name,
        apps_access={"finance": True},
    )
    refresh_token, _, _ = create_refresh_token(subject=user_id)
    return user, access_token, refresh_token, exp


async def revoke_token(jti: str, user_id: str, expires_at: datetime | None = None):
    exp = expires_at or (datetime.now(UTC) + timedelta(days=30))
    revoked = RevokedToken(
        jti=jti,
        user_id=user_id,
        revoked_at=datetime.now(UTC),
        expires_at=exp,
    )
    await revoked.insert()
