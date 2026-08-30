"""ChromaDB 벡터 스토어."""

from pathlib import Path

import chromadb

from src.embedding import embed_documents


# 프로젝트 루트
BASE_DIR = Path(__file__).resolve().parent.parent

# ChromaDB 저장 위치
CHROMA_PATH = BASE_DIR / "chroma_db"

# Collection 이름
COLLECTION_NAME = "travel_info"


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

    Collection이 없으면 새로 생성한다.
    """
    client = get_chroma_client()

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine"
        },
    )

    return collection


def upsert_documents(
    documents: list[str],
    metadatas: list[dict],
    ids: list[str],
):
    """
    여러 관광정보 문서를 Embedding한 뒤
    ChromaDB에 저장한다.

    기존 ID가 존재하면 update,
    존재하지 않으면 insert한다.
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

    # Document → Vector
    embeddings = embed_documents(
        documents
    )

    collection = get_collection()

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )


def get_document_count() -> int:
    """
    현재 Collection에 저장된 문서 개수를 반환한다.
    """
    collection = get_collection()

    return collection.count()