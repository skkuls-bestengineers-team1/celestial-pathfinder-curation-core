"""Gemini에 전달할 Prompt 관리."""

from __future__ import annotations

import json


SYSTEM_PROMPT = """
당신은 여행 계획을 도와주는 챗봇입니다.
아래에 [검색된 관광 정보]나 [도구 실행 결과]가 주어지면 그 내용만 근거로 답하고,
주어지지 않은 정보는 추측하거나 지어내지 마세요.
답변할 근거가 부족하면 모른다고 솔직히 답하세요.

[날씨 정보 사용 규칙]
날씨 정보에는 "[실제 예보]"와 "[추정 날씨]" 라벨이 붙어 있습니다.
"[추정 날씨]"는 실시간 예보가 아니라 평년 계절 평균값이라는 뜻이므로,
절대 실제 예보처럼 말하지 말고 반드시 "실제 예보가 아닌 해당 기간의 추정 날씨입니다"
같은 표현으로 명확히 구분해서 안내하세요. "[실제 예보]"만 있을 때는 이런 구분 문구가 필요 없습니다.

[검색된 관광 정보 사용 규칙]
[검색된 관광 정보]가 비어 있거나 질문과 관련 없는 내용뿐이면, 관련 정보를 찾지
못했다고 솔직히 답하고 억지로 끼워 맞추지 마세요.
장소를 추천할 때는 [검색된 관광 정보]에 있는 이름만 사용하고, distance·id 같은
내부 데이터 값은 답변 문장에 그대로 노출하지 마세요.
"""


def _format_weather_result(result: dict) -> str:
    """get_weather() 결과를 [실제 예보]/[추정 날씨] 라벨이 붙은 텍스트로 변환한다.

    Gemini에게 raw JSON을 그대로 주면 추정치를 실제 예보처럼 말하는 경우가
    있어서, 여기서 미리 라벨을 박아 넣고 Gemini는 그 라벨만 그대로 옮기게 한다.
    """
    if not result.get("success"):
        return json.dumps(result, ensure_ascii=False)

    location_name = result.get("location", {}).get("name", "")
    lines = [f"{location_name} 날씨"]

    season_average = result.get("season_average")
    if season_average:
        lines.append(
            f"[추정 날씨] {season_average['season']} 평년 평균 — "
            f"{season_average['weather_description']}, "
            f"최저 {season_average['temp_min']}°C / 최고 {season_average['temp_max']}°C, "
            f"강수확률 {season_average['precipitation_probability']}%, "
            f"강수량 {season_average['precipitation_sum']}mm"
        )
        return "\n".join(lines)

    for day in result.get("forecast", []):
        label = "[추정 날씨]" if day.get("is_estimated") else "[실제 예보]"
        lines.append(
            f"{label} {day['date']}: {day['weather_description']}, "
            f"최저 {day['temp_min']}°C / 최고 {day['temp_max']}°C, "
            f"강수확률 {day['precipitation_probability']}%, "
            f"강수량 {day['precipitation_sum']}mm"
        )

    return "\n".join(lines)


def _format_tool_result(tool_name: str, result: dict) -> str:
    if tool_name == "get_weather":
        return _format_weather_result(result)
    return json.dumps(result, ensure_ascii=False)


def build_final_prompt(question: str, rag_context: str, tool_result: dict | None) -> str:
    """질문 + RAG context + Tool 결과를 최종 Gemini 입력으로 합친다."""
    parts = [SYSTEM_PROMPT.strip()]

    if rag_context:
        parts.append(f"[검색된 관광 정보]\n{rag_context}")

    if tool_result:
        formatted_result = _format_tool_result(tool_result["tool_name"], tool_result["result"])
        parts.append(f"[도구 실행 결과: {tool_result['tool_name']}]\n{formatted_result}")

    parts.append(f"[사용자 질문]\n{question}")

    return "\n\n".join(parts)
