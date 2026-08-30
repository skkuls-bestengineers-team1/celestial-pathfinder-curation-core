"""RAG Context 생성."""

from src.retriever import retrieve_documents


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