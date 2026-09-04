from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.limiter import limiter
from app.core.security import create_access_token, decode_token
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    RefreshTokenRequest,
    UserLogin,
    UserProfileResponse,
    UserRegister,
)
from app.services.auth_service import authenticate_user, register_user, revoke_token

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, data: UserRegister, response: Response):
    client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host

    user, access_token, refresh_token, exp = await register_user(data, client_ip=client_ip)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int((exp - datetime.now(UTC)).total_seconds()),
        user=UserProfileResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            role=user.role,
            created_at=user.created_at,
        ),
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin, response: Response):
    client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host

    user, access_token, refresh_token, exp = await authenticate_user(data, client_ip=client_ip)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int((exp - datetime.now(UTC)).total_seconds()),
        user=UserProfileResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            role=user.role,
            created_at=user.created_at,
        ),
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    body: RefreshTokenRequest | None = None,
    refresh_token: str | None = Cookie(default=None),
):
    token = (body and body.refresh_token) or refresh_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación ausente.",
        )

    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación inválido o expirado.",
        ) from None

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token incorrecto.",
        )

    user_id = payload.get("sub")
    user = await User.get(str(user_id))
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o eliminado.",
        )

    new_access_token, _, exp = create_access_token(
        subject=str(user.id),
        email=user.email,
        name=user.name,
        apps_access={"finance": True},
    )

    return AuthResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=int((exp - datetime.now(UTC)).total_seconds()),
        user=UserProfileResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            role=user.role,
            created_at=user.created_at,
        ),
        refresh_token=token,
    )


@router.delete("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: CurrentUser,
    response: Response,
    authorization: str | None = Header(default=None),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            if jti:
                await revoke_token(jti, str(current_user.id))
        except Exception:
            pass

    response.delete_cookie(key="refresh_token")
    return None


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: CurrentUser):
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        role=current_user.role,
        created_at=current_user.created_at,
    )
