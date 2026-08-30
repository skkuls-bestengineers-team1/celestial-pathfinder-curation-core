"""ChromaDB 검색 Retriever."""

from src.embedding import embed_query
from src.vector_store import get_collection


TOP_K = 4


def retrieve_documents(
    query: str,
    k: int = TOP_K,
) -> list[dict]:
    """
    사용자 질문과 유사한 문서를
    ChromaDB에서 Top-K 검색한다.
    """

    if not query or not query.strip():
        raise ValueError(
            "검색할 query가 비어 있습니다."
        )

    collection = get_collection()

    # 사용자 질문 → Query Vector
    query_embedding = embed_query(
        query.strip()
    )

    # ChromaDB Vector Search
    result = collection.query(
        query_embeddings=[
            query_embedding
        ],
        n_results=k,
        include=[
            "documents",
            "metadatas",
            "distances",
        ],
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