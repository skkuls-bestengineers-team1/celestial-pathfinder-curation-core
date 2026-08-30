"""RAG용 문서/metadata 생성."""

from typing import Any, Mapping


def build_document_text(
    record: Mapping[str, Any],
) -> str:
    """
    Trips 데이터 한 행을
    Embedding용 텍스트로 변환한다.
    """

    return (
        f"기준연월: {record.get('baseYm', '')}\n"
        f"관광지명: {record.get('tAtsNm', '')}\n"
        f"관광지역: {record.get('areaNm', '')}\n"
        f"관광지 시군구: {record.get('signguNm', '')}\n"
        f"연관 관광지명: {record.get('rlteTatsNm', '')}\n"
        f"연관 관광지역: {record.get('rlteRegnNm', '')}\n"
        f"연관 관광지 시군구: {record.get('rlteSignguNm', '')}\n"
        f"연관 카테고리 대분류: {record.get('rlteCtgryLclsNm', '')}\n"
        f"연관 카테고리 중분류: {record.get('rlteCtgryMclsNm', '')}\n"
        f"연관 카테고리 소분류: {record.get('rlteCtgrySclsNm', '')}\n"
        f"연관 순위: {record.get('rlteRank', '')}"
    )


def build_metadata(
    record: Mapping[str, Any],
) -> dict:
    """
    ChromaDB 검색 결과와 함께 사용할
    metadata를 생성한다.
    """

    metadata = {
        "baseYm": record.get("baseYm"),
        "year": record.get("year"),
        "month": record.get("month"),

        "tAtsCd": record.get("tAtsCd"),
        "tAtsNm": record.get("tAtsNm"),

        "areaNm": record.get("areaNm"),
        "signguNm": record.get("signguNm"),

        "rlteTatsCd": record.get("rlteTatsCd"),
        "rlteTatsNm": record.get("rlteTatsNm"),

        "rlteRegnNm": record.get("rlteRegnNm"),
        "rlteSignguNm": record.get("rlteSignguNm"),

        "rlteCtgryLclsNm": record.get(
            "rlteCtgryLclsNm"
        ),
        "rlteCtgryMclsNm": record.get(
            "rlteCtgryMclsNm"
        ),
        "rlteCtgrySclsNm": record.get(
            "rlteCtgrySclsNm"
        ),

        "rlteRank": record.get("rlteRank"),
    }

    # ChromaDB metadata에는 None을 넣지 않도록 제거
    return {
        key: value
        for key, value in metadata.items()
        if value is not None
    }


def build_document_id(
    record: Mapping[str, Any],
) -> str:
    """
    Trips 테이블의 복합 PK를 이용해
    ChromaDB Document ID를 만든다.
    """

    base_ym = record.get("baseYm")
    tourist_code = record.get("tAtsCd")
    related_code = record.get("rlteTatsCd")

    if not all(
        [
            base_ym,
            tourist_code,
            related_code,
        ]
    ):
        raise ValueError(
            "Document ID 생성에 필요한 "
            "baseYm, tAtsCd, rlteTatsCd가 없습니다."
        )

    return (
        f"{base_ym}_"
        f"{tourist_code}_"
        f"{related_code}"
    )