"""Gemini Function Calling arguments 검증."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


class WeatherArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")

    city: str = Field(min_length=1, max_length=100)
    days: int = Field(default=7, ge=1, le=16)

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        city = value.strip()
        if not city:
            raise ValueError("city는 비어 있을 수 없습니다.")
        return city


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
            "data": validated.model_dump(),
            "errors": [],
        }
    except ValidationError as error:
        return {
            "valid": False,
            "data": None,
            "errors": error.errors(),
        }
