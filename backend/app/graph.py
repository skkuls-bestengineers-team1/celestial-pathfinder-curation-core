"""LangGraph 기반 채팅 파이프라인."""

from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from src.rag import retrieve_context

from . import llm, prompts
from .tools.function_calling import run_tools


class ChatState(TypedDict):
    # input
    question: str
    chat_id: str | None

    # 노드가 하나씩 채워나가는 중간 값
    rag_context: str
    sources: list[dict]
    tool_result: dict | None
    final_prompt: str

    # output
    answer: str


def retrieve_node(state: ChatState) -> dict:
    rag_result = retrieve_context(state["question"])
    return {
        "rag_context": rag_result["context"],
        "sources": rag_result["sources"],
    }


def tool_node(state: ChatState) -> dict:
    return {"tool_result": run_tools(state["question"])}


def prompt_node(state: ChatState) -> dict:
    final_prompt = prompts.build_final_prompt(
        question=state["question"],
        rag_context=state["rag_context"],
        tool_result=state["tool_result"],
    )
    return {"final_prompt": final_prompt}


def generate_node(state: ChatState) -> dict:
    interaction = llm.call_gemini(state["final_prompt"])
    return {"answer": interaction.output_text}


def build_graph():
    graph = StateGraph(ChatState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("tool", tool_node)
    graph.add_node("prompt", prompt_node)
    graph.add_node("generate", generate_node)

    # retrieve/tool은 둘 다 question만 필요해서 병렬로 실행하고, prompt에서 합류한다.
    graph.add_edge(START, "retrieve")
    graph.add_edge(START, "tool")
    graph.add_edge("retrieve", "prompt")
    graph.add_edge("tool", "prompt")
    graph.add_edge("prompt", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph
