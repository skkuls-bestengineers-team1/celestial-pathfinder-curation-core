"""RAG Context 생성."""

from src.retriever import retrieve_documents


def build_context(
    documents: list[dict],
) -> str:
    """
    Retrieval 결과를 LLM에 전달할
    Context 문자열로 변환한다.
    """

    if not documents:
        return ""

    context_parts = []

    for index, document in enumerate(
        documents,
        start=1,
    ):
        metadata = document.get(
            "metadata",
            {},
        )

        title = metadata.get(
            "title",
            "",
        )

        region = metadata.get(
            "region",
            "",
        )

        content = document.get(
            "content",
            "",
        )

        context_parts.append(
            f"[검색 결과 {index}]\n"
            f"관광지명: {title}\n"
            f"지역: {region}\n"
            f"내용: {content}"
        )

    return "\n\n".join(
        context_parts
    )


def retrieve_context(
    question: str,
    k: int = 4,
) -> dict:
    """
    사용자 질문을 받아 관련 문서를 검색하고
    Context와 Source 정보를 반환한다.
    """

    documents = retrieve_documents(
        query=question,
        k=k,
    )

    context = build_context(
        documents
    )

    sources = []

    for document in documents:
        metadata = document.get(
            "metadata",
            {},
        )

        sources.append(
            {
                "id": document.get("id"),
                "title": metadata.get(
                    "title",
                    "",
                ),
                "region": metadata.get(
                    "region",
                    "",
                ),
                "distance": document.get(
                    "distance",
                ),
            }
        )

    return {
        "context": context,
        "sources": sources,
    }