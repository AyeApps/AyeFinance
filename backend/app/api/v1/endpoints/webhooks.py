from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.models.user import User

router = APIRouter()

PRO_ACTIVATE_EVENTS = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE"}
PRO_DEACTIVATE_EVENTS = {"EXPIRATION"}

@router.post("/revenuecat", status_code=status.HTTP_200_OK)
async def revenuecat_webhook(
    request: Request,
    authorization: str | None = Header(default=None),
):
    expected = f"Bearer {settings.REVENUECAT_WEBHOOK_SECRET}"
    if not settings.REVENUECAT_WEBHOOK_SECRET or authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma de webhook inválida.")

    payload = await request.json()
    event = payload.get("event", {})
    app_user_id = event.get("app_user_id")
    event_type = event.get("type")

    if not app_user_id:
        return {"status": "ignored"}

    user = await User.get(app_user_id)
    if not user:
        return {"status": "user_not_found"}

    if event_type in PRO_ACTIVATE_EVENTS:
        user.is_pro = True
        user.pro_updated_at = datetime.now(UTC)
        await user.save()
    elif event_type in PRO_DEACTIVATE_EVENTS:
        user.is_pro = False
        user.pro_updated_at = datetime.now(UTC)
        await user.save()

    return {"status": "processed"}
