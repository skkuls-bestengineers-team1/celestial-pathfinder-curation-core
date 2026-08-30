"""React에서 호출하는 FastAPI 엔드포인트."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from .schemas import CategoriesResponse, CategoryCombo, ChatRequest, ChatResponse, SearchRequest, SearchResponse


router = APIRouter()


@router.get("/categories", response_model=CategoriesResponse)
def categories() -> CategoriesResponse:
    """실제 DB에 존재하는 카테고리(대/중/소분류) 조합을 전부 반환한다.

    프론트가 카테고리 값을 하드코딩하지 않고, 대분류 선택 시
    중/소분류를 이 목록에서 필터링해 쓸 수 있게 한다.
    """
    from ..database import get_engine

    try:
        engine = get_engine()
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT DISTINCT
                        "rlteCtgryLclsNm" AS lcls,
                        "rlteCtgryMclsNm" AS mcls,
                        "rlteCtgrySclsNm" AS scls
                    FROM trip_database_schema.trips
                    ORDER BY lcls, mcls, scls
                    """
                )
            ).mappings().all()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"카테고리 조회 중 오류가 발생했습니다: {error}",
        ) from error

    return CategoriesResponse(items=[CategoryCombo(**row) for row in rows])


@router.post("/search", response_model=SearchResponse)
def search(request: SearchRequest) -> SearchResponse:
    from src.trip_search.trip_search_repository import TripRepository
    from src.trip_search.trip_search_service import TripService

    from ..database import get_engine

    try:
        service = TripService(TripRepository(get_engine()))
        result = service.search_trips(
            year=request.year,
            month=request.month,
            areaNm=request.areaNm,
            signguNm=request.signguNm,
            rlteCtgryLclsNm=request.rlteCtgryLclsNm,
            rlteCtgryMclsNm=request.rlteCtgryMclsNm,
            rlteCtgrySclsNm=request.rlteCtgrySclsNm,
            tAtsNm=request.tAtsNm,
            page=request.page,
            page_size=request.page_size,
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"검색 처리 중 오류가 발생했습니다: {error}",
        ) from error

    return SearchResponse.model_validate(result)


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
