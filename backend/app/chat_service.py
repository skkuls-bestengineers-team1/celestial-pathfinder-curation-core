"""RAG + Function Calling 결과를 조합해 최종 답변을 생성하는 채팅 서비스."""

from __future__ import annotations

from . import llm, prompts
from .tools.function_calling import run_tools


def process_question(question: str) -> dict:
    """사용자 질문에 대한 최종 답변을 생성한다.

    흐름: RAG context 조회 -> Tool 실행 -> Final Prompt 생성 -> Gemini 호출
    """
    # TODO: RAG 완성되면 retrieve_context(question) 결과로 교체
    rag_context = ""
    sources: list[dict] = []

    tool_result = run_tools(question)

    final_prompt = prompts.build_final_prompt(
        question=question,
        rag_context=rag_context,
        tool_result=tool_result,
    )

    interaction = llm.call_gemini(final_prompt)

    return {
        "answer": interaction.output_text,
        "source": None,
        "tool": tool_result,
    }
