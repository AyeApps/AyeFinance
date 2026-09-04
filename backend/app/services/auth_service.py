from datetime import UTC, datetime, timedelta
import httpx

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import logger
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


async def verify_turnstile_token(token: str | None, ip_address: str | None = None) -> None:
    """
    Valida obligatoriamente el token de Cloudflare Turnstile con el endpoint oficial de Cloudflare.
    """
    if not settings.TURNSTILE_SECRET_KEY:
        logger.warning("[Turnstile] TURNSTILE_SECRET_KEY no configurada en entorno. Omitiendo validación.")
        return

    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere verificación de seguridad (Turnstile token requerido).",
        )

    try:
        data = {
            "secret": settings.TURNSTILE_SECRET_KEY,
            "response": token.strip(),
        }
        if ip_address:
            data["remoteip"] = ip_address

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=data,
            )
            if resp.status_code != 200:
                logger.error(f"[Turnstile] Error HTTP desde Cloudflare: {resp.status_code} - {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Error comunicando con el servicio de verificación de Cloudflare",
                )

            result = resp.json()
            if not result.get("success", False):
                error_codes = result.get("error-codes", [])
                logger.warning(f"[Turnstile] Verificación de bot fallida. Errores: {error_codes}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verificación de seguridad fallida. Por favor recarga e intenta de nuevo.",
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Turnstile] Excepción validando token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la verificación de seguridad.",
        )


async def authenticate_user(data: UserLogin, client_ip: str | None = None) -> tuple[User, str, str, datetime]:
    await verify_turnstile_token(data.turnstile_token, ip_address=client_ip)
    email_clean = data.email.lower().strip()
    user = await User.find_one(User.email == email_clean)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ACCOUNT_NOT_FOUND",
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
            detail="INVALID_PASSWORD",
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


async def register_user(data: UserRegister, client_ip: str | None = None) -> tuple[User, str, str, datetime]:
    await verify_turnstile_token(data.turnstile_token, ip_address=client_ip)
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
