"""ChromaDB 벡터 스토어."""

from pathlib import Path

import chromadb

from src.embedding import embed_documents


BASE_DIR = Path(__file__).resolve().parent.parent

CHROMA_PATH = BASE_DIR / "chroma_db"

COLLECTION_NAME = "travel_info"

DEFAULT_BATCH_SIZE = 50


def get_chroma_client():
    """
    로컬에 영구 저장되는 ChromaDB Client를 생성한다.
    """
    return chromadb.PersistentClient(
        path=str(CHROMA_PATH)
    )


def get_collection():
    """
    travel_info Collection을 가져온다.
    없으면 새로 생성한다.
    """
    client = get_chroma_client()

    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine"
        },
    )


def upsert_documents(
    documents: list[str],
    metadatas: list[dict],
    ids: list[str],
    batch_size: int = DEFAULT_BATCH_SIZE,
):
    """
    여러 관광정보 문서를 Batch 단위로 Embedding한 뒤
    ChromaDB에 저장한다.
    """

    if not documents:
        raise ValueError(
            "저장할 documents가 없습니다."
        )

    if not (
        len(documents)
        == len(metadatas)
        == len(ids)
    ):
        raise ValueError(
            "documents, metadatas, ids의 "
            "개수가 모두 같아야 합니다."
        )

    if batch_size <= 0:
        raise ValueError(
            "batch_size는 1 이상이어야 합니다."
        )

    collection = get_collection()

    total = len(documents)

    for start in range(
        0,
        total,
        batch_size,
    ):
        end = min(
            start + batch_size,
            total,
        )

        batch_documents = documents[
            start:end
        ]

        batch_metadatas = metadatas[
            start:end
        ]

        batch_ids = ids[
            start:end
        ]

        # 현재 Batch의 문서들만 Embedding
        batch_embeddings = embed_documents(
            batch_documents
        )

        # ChromaDB 저장
        collection.upsert(
            ids=batch_ids,
            documents=batch_documents,
            metadatas=batch_metadatas,
            embeddings=batch_embeddings,
        )

        print(
            f"[{end}/{total}] "
            "ChromaDB 적재 완료"
        )


def get_document_count() -> int:
    """
    Collection에 저장된 문서 개수를 반환한다.
    """
    collection = get_collection()

    return collection.count()