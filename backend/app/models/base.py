from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Any, TypeVar

from beanie import Document
from bson.decimal128 import Decimal128
from pydantic import BeforeValidator, Field, PlainSerializer

T = TypeVar("T", bound="SoftDeleteDocument")


def parse_decimal(v: Any) -> Decimal:
    if isinstance(v, Decimal128):
        return v.to_decimal()
    if isinstance(v, (int, float, str)):
        return Decimal(str(v))
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


AyeDecimal = Annotated[
    Decimal,
    BeforeValidator(parse_decimal),
    PlainSerializer(lambda x: str(x), return_type=str),
]


def get_link_id(link_or_doc: Any) -> str | None:
    if link_or_doc is None:
        return None
    if hasattr(link_or_doc, "ref"):
        return str(link_or_doc.ref.id)
    if hasattr(link_or_doc, "id"):
        return str(link_or_doc.id)
    return str(link_or_doc)


def is_same_id(link_or_doc: Any, other_id_or_doc: Any) -> bool:
    id1 = get_link_id(link_or_doc)
    id2 = get_link_id(other_id_or_doc)
    return id1 == id2 if id1 is not None and id2 is not None else False


class SoftDeleteDocument(Document):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    async def soft_delete(self):
        self.deleted_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)
        await self.save()

    @classmethod
    def active_query(cls: type[T]):
        return cls.find(cls.deleted_at == None)  # noqa: E711
