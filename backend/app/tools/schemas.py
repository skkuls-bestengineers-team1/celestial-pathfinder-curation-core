"""Gemini Function Calling arguments 검증."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


class WeatherArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")

    city: str = Field(min_length=1, max_length=100)
    days: int = Field(default=7, ge=1, le=16)
    start_date: str | None = Field(
        default=None,
        description="여행 시작일 YYYY-MM-DD. 없으면 오늘부터 조회한다.",
    )
    season: str | None = Field(
        default=None,
        description="봄/여름/가을/겨울 중 하나. 구체적 날짜 없이 계절만 언급됐을 때만 사용.",
    )

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        city = value.strip()
        if not city:
            raise ValueError("city는 비어 있을 수 없습니다.")
        return city

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        start_date = value.strip()
        if not start_date:
            return None
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError as error:
            raise ValueError("start_date는 YYYY-MM-DD 형식이어야 합니다.") from error
        return start_date

    @field_validator("season")
    @classmethod
    def validate_season(cls, value: str | None) -> str | None:
        if value is None:
            return None
        season = value.strip()
        if not season:
            return None
        if season not in {"봄", "여름", "가을", "겨울"}:
            raise ValueError("season은 봄/여름/가을/겨울 중 하나여야 합니다.")
        return season


ARGUMENT_MODEL_MAP = {
    "get_weather": WeatherArguments,
}


def validate_arguments(function_name: str, arguments) -> dict:
    """Function arguments를 검증한다."""
    model_class = ARGUMENT_MODEL_MAP.get(function_name)
    if model_class is None:
        return {
            "valid": False,
            "data": None,
            "errors": [
                {
                    "type": "unknown_function",
                    "message": "등록되지 않은 Function입니다.",
                }
            ],
        }

    if not isinstance(arguments, dict):
        return {
            "valid": False,
            "data": None,
            "errors": [
                {
                    "type": "invalid_arguments_type",
                    "message": "arguments는 dict여야 합니다.",
                }
            ],
        }

    try:
        validated = model_class.model_validate(arguments)
        return {
            "valid": True,
            "data": validated.model_dump(exclude_none=True),
            "errors": [],
        }
    except ValidationError as error:
        return {
            "valid": False,
            "data": None,
            "errors": error.errors(),
        }
