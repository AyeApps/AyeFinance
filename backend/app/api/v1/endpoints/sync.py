from datetime import datetime

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser
from app.schemas.sync import SyncDeltaResponse
from app.services.sync_service import get_sync_delta

router = APIRouter()


@router.get("/delta", response_model=SyncDeltaResponse)
async def sync_delta(
    current_user: CurrentUser,
    since: datetime | None = Query(
        default=None,
        description="ISO 8601 timestamp of client's last successful sync. If omitted, returns initial full dataset.",
    ),
):
    """
    Delta Synchronization endpoint for mobile/web clients:
    Returns only accounts, transactions, and recurring items created, modified,
    or soft-deleted since the provided `since` timestamp.
    If no items were updated, returns has_changes=False with lightweight metadata.
    """
    return await get_sync_delta(str(current_user.id), since)
