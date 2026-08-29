"""React에서 호출하는 FastAPI 엔드포인트."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .schemas import ChatRequest, ChatResponse


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        from ..services.chat_service import process_question
    except ImportError:
        try:
            from ..chat_service import process_question
        except ImportError as error:
            raise HTTPException(
                status_code=503,
                detail="chat_service.process_question()이 아직 연결되지 않았습니다.",
            ) from error

    try:
        result = process_question(request.question)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"채팅 처리 중 오류가 발생했습니다: {error}",
        ) from error

    response = _to_chat_response(result)
    if request.chat_id and response.chat_id is None:
        response.chat_id = request.chat_id
    return response


def _to_chat_response(result) -> ChatResponse:
    if isinstance(result, ChatResponse):
        return result
    if isinstance(result, dict):
        if "answer" not in result and "reply" in result:
            result = {**result, "answer": result["reply"]}
        return ChatResponse.model_validate(result)
    return ChatResponse(answer=str(result))
