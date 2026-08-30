"""Gemini API 호출 공통화."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = None


def get_client():
    """Gemini client를 생성하거나 캐시된 client를 반환한다."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY를 읽을 수 없습니다.")

    _client = genai.Client(api_key=api_key)
    return _client


def call_gemini(prompt: str, tools: list[dict] | None = None):
    """Gemini를 호출하고 Interaction 응답을 반환한다.

    tools가 주어지면 Function Calling을 허용하고,
    없으면 일반 텍스트 생성만 수행한다.
    최종 답변 텍스트는 반환값의 `.output_text`로 꺼내면 된다.
    """
    client = get_client()

    kwargs: dict = {}
    if tools:
        kwargs["tools"] = tools
        kwargs["generation_config"] = {"tool_choice": "auto"}

    return client.interactions.create(
        model=MODEL_NAME,
        input=prompt,
        **kwargs,
    )
