"""Gemini Embedding 처리."""

import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = 768


if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY가 설정되어 있지 않습니다."
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)


def prepare_query(text: str) -> str:
    """
    검색용 사용자 Query 형식으로 변환.
    """
    return f"task: search result | query: {text}"


def prepare_document(
    text: str,
    title: str | None = None,
) -> str:
    """
    검색 대상 Document 형식으로 변환.
    """
    title = title or "none"

    return f"title: {title} | text: {text}"


def embed_query(
    text: str,
) -> list[float]:
    """
    사용자 질문 1개를 Embedding Vector로 변환.
    """

    if not text or not text.strip():
        raise ValueError(
            "Embedding할 query가 비어 있습니다."
        )

    prepared_text = prepare_query(
        text.strip()
    )

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=prepared_text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    return response.embeddings[0].values


def embed_document(
    text: str,
    title: str | None = None,
) -> list[float]:
    """
    관광정보 Document 1개를 Embedding Vector로 변환.
    """

    if not text or not text.strip():
        raise ValueError(
            "Embedding할 document가 비어 있습니다."
        )

    prepared_text = prepare_document(
        text=text.strip(),
        title=title,
    )

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=prepared_text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    return response.embeddings[0].values


def embed_documents(
    texts: list[str],
) -> list[list[float]]:
    """
    여러 관광정보 Document를 각각 Embedding Vector로 변환.
    """

    if not texts:
        return []

    contents = [
        types.Content(
            parts=[
                types.Part.from_text(
                    text=prepare_document(text)
                )
            ]
        )
        for text in texts
    ]

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=contents,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    return [
        embedding.values
        for embedding in response.embeddings
    ]