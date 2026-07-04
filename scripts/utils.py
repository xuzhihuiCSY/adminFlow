from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_iso() -> str:
    return datetime.now(UTC).date().isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(f"{json.dumps(payload, indent=2, ensure_ascii=False)}\n", encoding="utf-8")


def is_http_url(value: Any) -> bool:
    return isinstance(value, str) and re.match(r"^https?://\S+$", value.strip(), re.I) is not None


def normalize_name(value: str) -> str:
    normalized = (
        value.replace("&", " and ")
        .replace("–", "-")
        .replace("—", "-")
    )
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", normalized)
    normalized = re.sub(r"\bthe\b", " ", normalized, flags=re.I)
    return re.sub(r"\s+", " ", normalized).strip().lower()


def truncate(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value

    return f"{value[: max_length - 1].strip()}…"
