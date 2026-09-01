from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging import logger
from app.models.account import Account
from app.models.recurring_item import RecurringItem
from app.models.revoked_token import RevokedToken
from app.models.transaction import Transaction
from app.models.user import User

client: AsyncIOMotorClient = None


async def init_db():
    global client
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    await init_beanie(
        database=db,
        document_models=[
            User,
            RevokedToken,
            Account,
            Transaction,
            RecurringItem,
        ],
    )
    logger.info(f"Beanie initialized successfully with database: {settings.DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")
