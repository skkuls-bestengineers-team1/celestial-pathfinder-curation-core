"""Gemini Function Calling 흐름."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from .schemas import validate_arguments
from .weather import get_weather


ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

FUNCTION_MAP = {
    "get_weather": get_weather,
}

GET_WEATHER_TOOL = {
    "type": "function",
    "name": "get_weather",
    "description": (
        "도시의 실제 날씨 예보를 조회합니다. "
        "여행 일정, 우천 여부, 기온, 강수 확률이 필요할 때 사용합니다. "
        "날씨와 관련 없는 질문에는 호출하지 않습니다."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "날씨를 조회할 도시명. 예: 서울, 부산, 전주",
            },
            "days": {
                "type": "integer",
                "description": "예보 일수. 기본값 7, 최소 1, 최대 16",
                "minimum": 1,
                "maximum": 16,
            },
        },
        "required": ["city"],
    },
}

TOOLS = [GET_WEATHER_TOOL]

SYSTEM_INSTRUCTION = """
당신은 여행 일정 도우미입니다.
사용자가 특정 지역의 날씨, 비, 기온, 예보를 물어보면 get_weather를 호출하세요.
날씨가 필요 없는 질문에는 function을 호출하지 마세요.
city는 실제 도시명이어야 합니다. days는 사용자가 말한 여행 기간을 사용하고, 없으면 7을 사용하세요.
날씨 값을 추측해서 만들지 마세요.
"""

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY를 읽을 수 없습니다.")

    _client = genai.Client(api_key=api_key)
    return _client


def _parse_arguments(raw_arguments):
    if raw_arguments is None:
        return {}
    if isinstance(raw_arguments, dict):
        return raw_arguments
    if isinstance(raw_arguments, str):
        try:
            parsed = json.loads(raw_arguments)
        except json.JSONDecodeError:
            return raw_arguments
        return parsed if isinstance(parsed, dict) else raw_arguments
    return raw_arguments


def _get_function_calls(interaction) -> list:
    return [
        step
        for step in (interaction.steps or [])
        if getattr(step, "type", None) == "function_call"
    ]


def _validation_error_result(errors) -> dict:
    return {
        "success": False,
        "error": {
            "code": "argument_validation_error",
            "message": "Function Arguments 검증 실패",
            "details": errors,
            "retryable": False,
        },
    }


def _execute_function(function_name: str, arguments: dict) -> dict:
    python_function = FUNCTION_MAP.get(function_name)
    if python_function is None:
        return {
            "success": False,
            "error": {
                "code": "function_not_registered",
                "message": "실행할 Function을 찾을 수 없습니다.",
                "retryable": False,
            },
        }

    try:
        return python_function(**arguments)
    except Exception as error:
        return {
            "success": False,
            "error": {
                "code": "unexpected_function_error",
                "message": str(error),
                "error_type": type(error).__name__,
                "retryable": False,
            },
        }


def run_tools(question: str) -> dict | None:
    """질문에 도구가 필요하면 실행 결과를 반환하고, 아니면 None을 반환한다."""
    client = _get_client()

    interaction = client.interactions.create(
        model=MODEL_NAME,
        input=question,
        system_instruction=SYSTEM_INSTRUCTION,
        tools=TOOLS,
        generation_config={
            "tool_choice": "auto",
        },
    )

    function_calls = _get_function_calls(interaction)
    if not function_calls:
        return None

    call = function_calls[0]
    arguments = _parse_arguments(getattr(call, "arguments", None))
    validation = validate_arguments(call.name, arguments)

    if not validation["valid"]:
        result = _validation_error_result(validation["errors"])
    else:
        result = _execute_function(call.name, validation["data"])

    return {
        "tool_name": call.name,
        "result": result,
    }
