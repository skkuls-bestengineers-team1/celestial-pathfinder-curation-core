"""RAG + Function Calling 결과를 조합해 최종 답변을 생성하는 채팅 서비스."""

from __future__ import annotations

from src.rag import retrieve_context

from . import llm, prompts
from .tools.function_calling import run_tools


def process_question(question: str) -> dict:
    """사용자 질문에 대한 최종 답변을 생성한다.

    흐름: RAG context 조회 -> Tool 실행 -> Final Prompt 생성 -> Gemini 호출
    """
    rag_result = retrieve_context(question)
    rag_context = rag_result["context"]
    sources = rag_result["sources"]

    tool_result = run_tools(question)

    final_prompt = prompts.build_final_prompt(
        question=question,
        rag_context=rag_context,
        tool_result=tool_result,
    )

    interaction = llm.call_gemini(final_prompt)

    return {
        "answer": interaction.output_text,
        "source": sources or None,
        "tool": tool_result,
    }
