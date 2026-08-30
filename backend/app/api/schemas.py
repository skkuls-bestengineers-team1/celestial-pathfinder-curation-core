"""React ↔ FastAPI Request / Response 스키마."""

from __future__ import annotations

from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    question: str = Field(
        min_length=1,
        max_length=4000,
        validation_alias=AliasChoices("question", "message"),
    )
    chat_id: str | None = None


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str
    chat_id: str | None = None
    source: list[dict[str, Any]] | None = None
    tool: dict[str, Any] | None = None
