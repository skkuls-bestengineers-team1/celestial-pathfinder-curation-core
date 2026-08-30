"""Gemini에 전달할 Prompt 관리."""

from __future__ import annotations

import json


SYSTEM_PROMPT = """
당신은 여행 계획을 도와주는 챗봇입니다.
아래에 [검색된 관광 정보]나 [도구 실행 결과]가 주어지면 그 내용만 근거로 답하고,
주어지지 않은 정보는 추측하거나 지어내지 마세요.
답변할 근거가 부족하면 모른다고 솔직히 답하세요.
"""

RAG_PROMPT = """
# TODO: 검색된 관광 정보(context)를 어떤 형식으로 넣을지 정의
# TODO: 검색 결과가 없을 때 규칙
# TODO: 출처 표시 규칙
"""


def build_rag_prompt(context: str, sources: list[dict]) -> str:
    """RAG 검색 결과를 프롬프트 조각으로 변환한다."""
    # TODO: RAG_PROMPT에 context/sources를 채워 반환 (RAG 완성 후 연결)
    raise NotImplementedError


def build_final_prompt(question: str, rag_context: str, tool_result: dict | None) -> str:
    """질문 + RAG context + Tool 결과를 최종 Gemini 입력으로 합친다."""
    parts = [SYSTEM_PROMPT.strip()]

    if rag_context:
        parts.append(f"[검색된 관광 정보]\n{rag_context}")

    if tool_result:
        result_json = json.dumps(tool_result["result"], ensure_ascii=False)
        parts.append(f"[도구 실행 결과: {tool_result['tool_name']}]\n{result_json}")

    parts.append(f"[사용자 질문]\n{question}")

    return "\n\n".join(parts)
