"""RAG Context 생성."""

import re

from src.retriever import retrieve_documents


# 현재 데이터셋이 서울 전용이라 자치구 25개를 하드코딩한다.
# (weather.py의 KNOWN_CITIES와 같은 방식 — 데이터 범위가 넓어지면 그때 확장)
SEOUL_DISTRICTS = [
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
    "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
    "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
    "서초구", "강남구", "송파구", "강동구",
]

# 카테고리(rlteCtgryLclsNm)당 문서 개수 상한. 여행 일수에 비례해서 늘어나되
# 컨텍스트가 지나치게 커지지 않도록 상한을 둔다.
MAX_PER_CATEGORY = 8
DEFAULT_TRIP_DAYS = 2


def _detect_district(question: str) -> str | None:
    """질문에 특정 구(區)가 언급되어 있으면 반환한다. 없으면 None(지역 제한 없음)."""
    for district in SEOUL_DISTRICTS:
        if district in question:
            return district
    return None


def _extract_trip_days(question: str) -> int:
    """'2박 3일', '3일' 같은 표현에서 여행 일수를 추출한다. 못 찾으면 기본값."""
    match = re.search(r"(\d+)\s*박\s*(\d+)\s*일", question)
    if match:
        return int(match.group(2))

    match = re.search(r"(\d+)\s*일", question)
    if match:
        return int(match.group(1))

    return DEFAULT_TRIP_DAYS


def _category_allocations(days: int) -> dict[str, int]:
    """여행 일수에 비례해 카테고리별 확보 개수를 정한다.

    - 관광지/음식: 하루 2곳(끼) 기준으로 늘어남 (2박3일 -> 6곳, 6끼 후보)
    - 숙박: 일수와 무관하게 1곳이면 충분 (여러 날 같은 숙소를 쓰는 게 자연스러움)
    """
    days = max(days, 1)
    return {
        "관광지": min(days * 2, MAX_PER_CATEGORY),
        "음식": min(days * 2, MAX_PER_CATEGORY),
        "숙박": 1,
    }


def _retrieve_balanced_documents(question: str) -> list[dict]:
    district = _detect_district(question)
    days = _extract_trip_days(question)
    allocations = _category_allocations(days)

    seen_ids: set[str] = set()
    documents: list[dict] = []

    for category, category_k in allocations.items():
        where: dict = {"rlteCtgryLclsNm": category}
        if district:
            where = {
                "$and": [
                    {"rlteCtgryLclsNm": category},
                    {"rlteSignguNm": district},
                ]
            }

        category_documents = retrieve_documents(
            query=question,
            k=category_k,
            where=where,
        )

        # 지역 제한을 걸었는데 해당 구에 그 카테고리 데이터가 아예 없으면,
        # 빈 결과보다는 지역 제한을 풀고 다시 검색하는 편이 낫다.
        if district and not category_documents:
            category_documents = retrieve_documents(
                query=question,
                k=category_k,
                where={"rlteCtgryLclsNm": category},
            )

        for document in category_documents:
            document_id = document.get("id")
            if document_id in seen_ids:
                continue
            seen_ids.add(document_id)
            documents.append(document)

    return documents


def build_context(documents: list[dict]) -> str:
    if not documents:
        return ""

    context_parts = []

    for index, document in enumerate(documents, start=1):
        metadata = document.get("metadata", {})
        content = document.get("content", "")

        context_parts.append(
            f"[검색 결과 {index}]\n"
            f"기준 관광지: {metadata.get('tAtsNm', '')}\n"
            f"기준 지역: {metadata.get('areaNm', '')} "
            f"{metadata.get('signguNm', '')}\n"
            f"연관 관광지: {metadata.get('rlteTatsNm', '')}\n"
            f"연관 지역: {metadata.get('rlteRegnNm', '')} "
            f"{metadata.get('rlteSignguNm', '')}\n"
            f"카테고리: "
            f"{metadata.get('rlteCtgryLclsNm', '')} > "
            f"{metadata.get('rlteCtgryMclsNm', '')} > "
            f"{metadata.get('rlteCtgrySclsNm', '')}\n"
            f"연관 순위: {metadata.get('rlteRank', '')}\n"
            f"내용:\n{content}"
        )

    return "\n\n".join(context_parts)


def retrieve_context(
    question: str,
    k: int = 4,
    where: dict | None = None,
) -> dict:

    if where is None:
        # 카테고리 필터가 지정되지 않은 일반 질문이면 카테고리별로 나눠 검색해
        # 특정 카테고리(예: 음식)가 통째로 누락되지 않도록 한다.
        documents = _retrieve_balanced_documents(question)
    else:
        documents = retrieve_documents(
            query=question,
            k=k,
            where=where,
        )

    context = build_context(documents)

    sources = []

    for document in documents:
        metadata = document.get("metadata", {})

        sources.append(
            {
                "id": document.get("id"),

                "tourist_spot": metadata.get(
                    "tAtsNm",
                    "",
                ),
                "tourist_district": metadata.get(
                    "signguNm",
                    "",
                ),

                "related_spot": metadata.get(
                    "rlteTatsNm",
                    "",
                ),
                "related_district": metadata.get(
                    "rlteSignguNm",
                    "",
                ),

                "category": metadata.get(
                    "rlteCtgryMclsNm",
                    "",
                ),
                "subcategory": metadata.get(
                    "rlteCtgrySclsNm",
                    "",
                ),

                "distance": document.get(
                    "distance"
                ),
            }
        )

    return {
        "context": context,
        "sources": sources,
    }