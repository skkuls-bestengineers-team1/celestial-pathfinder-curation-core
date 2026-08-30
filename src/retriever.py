"""ChromaDB 검색 Retriever."""

from typing import Any

from src.embedding import embed_query
from src.vector_store import get_collection


TOP_K = 4


def retrieve_documents(
    query: str,
    k: int = TOP_K,
    where: dict[str, Any] | None = None,
) -> list[dict]:

    if not query or not query.strip():
        raise ValueError(
            "검색할 query가 비어 있습니다."
        )

    collection = get_collection()

    query_embedding = embed_query(
        query.strip()
    )

    query_args = {
        "query_embeddings": [
            query_embedding
        ],
        "n_results": k,
        "include": [
            "documents",
            "metadatas",
            "distances",
        ],
    }

    # metadata 조건이 있으면
    # Vector Search 전에 필터 적용
    if where:
        query_args["where"] = where

    result = collection.query(
        **query_args
    )

    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]
    ids = result["ids"][0]

    retrieved = []

    for (
        document_id,
        document,
        metadata,
        distance,
    ) in zip(
        ids,
        documents,
        metadatas,
        distances,
    ):
        retrieved.append(
            {
                "id": document_id,
                "content": document,
                "metadata": metadata,
                "distance": distance,
            }
        )

    return retrieved