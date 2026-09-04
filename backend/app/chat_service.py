"""RAG + Function Calling 결과를 조합해 최종 답변을 생성하는 채팅 서비스."""

from __future__ import annotations

from .graph import get_graph


def process_question(question: str) -> dict:
    """사용자 질문에 대한 최종 답변을 생성한다.

    흐름(LangGraph): retrieve(RAG) + tool(Function Calling) 병렬 실행
    -> prompt 조립 -> Gemini 호출
    """
    graph = get_graph()
    result = graph.invoke({"question": question, "chat_id": None})

    return {
        "answer": result["answer"],
        "source": result["sources"] or None,
        "tool": result["tool_result"],
    }
