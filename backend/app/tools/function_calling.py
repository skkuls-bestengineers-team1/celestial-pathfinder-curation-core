"""Gemini Function Calling 흐름."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from google import genai

from .schemas import validate_arguments
from .weather import get_weather


ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")

FUNCTION_MAP = {
    "get_weather": get_weather,
}

GET_WEATHER_TOOL = {
    "type": "function",
    "name": "get_weather",
    "description": (
        "도시의 실제 날씨 예보를 조회합니다. "
        "여행 일정, 우천 여부, 기온, 강수 확률이 필요할 때 사용합니다. "
        "사용자가 시작 날짜를 말하면 반드시 start_date를 넣으세요. "
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
                "description": (
                    "여행 총 일수. 3박 4일이면 4. "
                    "기본값 7, 최소 1, 최대 16"
                ),
                "minimum": 1,
                "maximum": 16,
            },
            "start_date": {
                "type": "string",
                "description": (
                    "여행 시작일. 반드시 YYYY-MM-DD. "
                    "연도가 없으면 system_instruction에 안내된 오늘 날짜를 기준으로 "
                    "올해/내년을 판단하세요. "
                    "시작일을 말하지 않았을 때만 생략하고 오늘부터 조회한다. "
                    "season을 쓸 경우 start_date는 넣지 않는다."
                ),
            },
            "season": {
                "type": "string",
                "enum": ["봄", "여름", "가을", "겨울"],
                "description": (
                    "사용자가 '여름에', '겨울쯤' 처럼 계절만 언급하고 "
                    "구체적인 날짜나 기간을 말하지 않았을 때만 사용한다. "
                    "이 경우 start_date는 생략하고, 실시간 예보 대신 "
                    "해당 계절의 평균 날씨가 반환된다."
                ),
            },
        },
        "required": ["city"],
    },
}

TOOLS = [GET_WEATHER_TOOL]


def _build_system_instruction() -> str:
    """호출 시점의 실제 오늘 날짜를 프롬프트에 명시한다.

    Gemini는 서버의 시스템 시계에 접근할 수 없어 "오늘"을 스스로 알 수 없다.
    명시하지 않으면 모델이 임의로 연도를 추측해 오답을 낼 수 있다.
    """
    today = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    return f"""
당신은 여행 일정 도우미입니다.
오늘 날짜는 {today}입니다. 연도/날짜 관련 판단은 반드시 이 날짜를 기준으로 하세요.
사용자가 특정 지역의 날씨, 비, 기온, 예보, 여행 일정을 물어보면 get_weather를 호출하세요.
날씨가 필요 없는 질문에는 function을 호출하지 마세요.
city는 실제 도시명이어야 합니다.
days는 총 여행 일수입니다. 3박 4일이면 4, 없으면 7을 사용하세요.
사용자가 "9월 7일부터"처럼 구체적인 시작일을 말하면 반드시 start_date를 YYYY-MM-DD로 넣으세요.
연도가 없으면 오늘({today}) 기준으로 올해를 쓰고, 그 날짜가 이미 지났으면 내년을 쓰세요.
start_date가 없으면 오늘부터 조회됩니다. 시작일을 말했는데도 생략하지 마세요.
사용자가 "여름에", "겨울쯤" 처럼 구체적인 날짜/기간 없이 계절만 언급했다면,
start_date나 days를 오늘 기준으로 임의로 채우지 말고 season 파라미터에 해당 계절만 넣으세요.
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
        system_instruction=_build_system_instruction(),
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
