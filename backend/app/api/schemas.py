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


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year: str
    month: str
    areaNm: str
    signguNm: str
    rlteCtgryLclsNm: str
    rlteCtgryMclsNm: str
    rlteCtgrySclsNm: str
    tAtsNm: str = ""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=5, ge=1, le=50)


class SearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[dict[str, Any]]
    page: int
    page_size: int
    total_count: int


class CategoryCombo(BaseModel):
    lcls: str
    mcls: str
    scls: str


class CategoriesResponse(BaseModel):
    items: list[CategoryCombo]
