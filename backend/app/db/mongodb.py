import base64
import os
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
    cert_path = settings.MONGODB_CERT_PATH
    if settings.MONGODB_CERT_B64 and settings.MONGODB_CERT_B64.strip():
        temp_cert = "/tmp/aye_finance_cert.pem"
        try:
            cert_bytes = base64.b64decode(settings.MONGODB_CERT_B64.strip())
            with open(temp_cert, "wb") as f:
                f.write(cert_bytes)
            cert_path = temp_cert
            logger.info("Decoded X.509 certificate from MONGODB_CERT_B64 successfully.")
        except Exception as e:
            logger.error(f"Error decoding MONGODB_CERT_B64: {e}")

    client_kwargs = {
        "serverSelectionTimeoutMS": 5000,
    }

    if cert_path and os.path.exists(cert_path):
        client_kwargs["tls"] = True
        client_kwargs["tlsCertificateKeyFile"] = cert_path
        client_kwargs["authMechanism"] = "MONGODB-X509"
        client_kwargs["authSource"] = "$external"
        logger.info(f"Connecting to MongoDB with X.509 Certificate ({cert_path})...")
    else:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL.split('@')[-1]}...")

    client = AsyncIOMotorClient(settings.MONGODB_URL, **client_kwargs)
    db_name = getattr(settings, "DATABASE_NAME", getattr(settings, "DB_NAME", "aye_finance_dev"))
    db = client[db_name]

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
    logger.info(f"Beanie initialized successfully with database: {db_name}")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")
