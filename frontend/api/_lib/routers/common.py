"""Helpers shared by routers."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import Response

DATA_SOURCE_HEADER = "X-Data-Source"


def tag(response: Response, source: str) -> None:
    """Expose where data came from: database | fallback | memory."""
    response.headers[DATA_SOURCE_HEADER] = source


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(10)}"


def new_code(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(3).upper()}"


def now() -> datetime:
    return datetime.now(timezone.utc)
