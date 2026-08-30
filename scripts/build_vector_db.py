"""실제 관광 데이터를 이용한 ChromaDB 구축."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import pandas as pd


# 프로젝트 루트를 Python import 경로에 추가
ROOT_DIR = Path(__file__).resolve().parent.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


from src.documents import (
    build_document_id,
    build_document_text,
    build_metadata,
)
from src.vector_store import (
    get_document_count,
    upsert_documents,
)


CSV_PATH = ROOT_DIR / "data" / "output" / "tour_data.csv"


def normalize_record(
    record: dict[str, Any],
) -> dict[str, Any]:
    """
    pandas에서 읽은 값을
    일반 Python 값으로 변환한다.
    """

    normalized = {}

    for key, value in record.items():

        if pd.isna(value):
            normalized[key] = None

        elif hasattr(value, "item"):
            normalized[key] = value.item()

        else:
            normalized[key] = value

    return normalized


def load_trip_data(
    limit: int | None = None,
) -> list[dict]:
    """
    관광정보 CSV를 읽어 RAG에서 사용할 record 목록으로 변환한다.
    """

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"관광정보 CSV가 없습니다: {CSV_PATH}"
        )

    df = pd.read_csv(
        CSV_PATH,
        encoding="utf-8-sig",
        dtype={
            "baseYm": str,
            "tAtsCd": str,
            "areaCd": str,
            "signguCd": str,
            "rlteTatsCd": str,
            "rlteRegnCd": str,
            "rlteSignguCd": str,
        },
    )

    if limit is not None:
        df = df.head(limit)

    records = []

    for raw_record in df.to_dict(
        orient="records"
    ):
        record = normalize_record(
            raw_record
        )

        # CSV에는 year/month 컬럼이 없으므로
        # baseYm에서 생성
        base_ym = record.get("baseYm")

        if base_ym:
            record["year"] = base_ym[:4]
            record["month"] = base_ym[4:6]

        records.append(record)

    return records


def build_vector_db(
    limit: int | None = None,
) -> None:
    """
    관광정보 CSV
    → RAG Document
    → Embedding
    → ChromaDB 저장
    """

    records = load_trip_data(
        limit=limit
    )

    print(
        f"관광정보 {len(records)}건 로드 완료"
    )

    documents = []
    metadatas = []
    ids = []

    for record in records:

        documents.append(
            build_document_text(record)
        )

        metadatas.append(
            build_metadata(record)
        )

        ids.append(
            build_document_id(record)
        )

    # Document ID 중복 확인
    if len(ids) != len(set(ids)):
        raise ValueError(
            "중복된 Document ID가 존재합니다."
        )

    print(
        f"RAG Document {len(documents)}건 생성 완료"
    )

    upsert_documents(
        documents=documents,
        metadatas=metadatas,
        ids=ids,
    )

    print(
        f"ChromaDB 구축 완료 "
        f"(총 {get_document_count()}건)"
    )


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="테스트 시 처리할 최대 데이터 개수",
    )

    args = parser.parse_args()

    build_vector_db(
        limit=args.limit
    )