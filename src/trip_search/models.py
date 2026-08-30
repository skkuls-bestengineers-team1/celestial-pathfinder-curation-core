from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Date, Text, DateTime, func, ForeignKey
from datetime import date

import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent.parent / ".env"

load_dotenv(dotenv_path=ENV_PATH)

USER_NAME = os.environ["PGUSER"]
SCHEMA = "trip_database_schema"

class Base(DeclarativeBase):
    pass

class Trips(Base):
    __tablename__ = "trips"
    __table_args__ = {
        "comment": "관광지 연관 관광정보",
        "schema": "trip_database_schema"
    }

    # baseYm : 기준연월
    baseYm : Mapped[str] = mapped_column(
        String(6),
        nullable=False,
        comment="기준연월",
        primary_key=True,
    )

    # year : 연도
    year : Mapped[str] = mapped_column(
        String(4),
        nullable=False,
        comment="연도"
    )

    # month : 월
    month : Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        comment="월"
    )

    # tAtsCd : 관광지코드
    tAtsCd : Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
        nullable=True,
        comment="관광지코드"
    )

    # tAtsNm : 관광지명
    tAtsNm : Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="관광지명"
    )

    # areaCd : 관광지지역코드
    areaCd : Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="관광지지역코드"
    )

    # areaNm : 관광지역명
    areaNm : Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="관광지역명"
    )

    # signguCd : 관광지시군구코드
    signguCd: Mapped[str] = mapped_column(
        String(10),
        nullable=True,
        comment="관광지시군구코드"
    )

    # signguNm : 관광지시군구명
    signguNm: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="관광지시군구명"
    )

    # rlteTatsCd : 연관관광지코드
    rlteTatsCd : Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="연관관광지코드",
        primary_key=True,
    )

    # rlteTatsNm : 연관관광지명
    rlteTatsNm: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="연관관광지명"
    )

    # rlteRegnCd : 연관관광지지역코드
    rlteRegnCd: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="연관관광지지역코드",
    )

    # rlteRegnNm : 연관관광지지역명
    rlteRegnNm: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="연관관광지지역명"
    )

    # rlteSignguCd : 연관관광지시군구코드
    rlteSignguCd: Mapped[str] = mapped_column(
        String(10),
        nullable=True,
        comment="연관관광지시군구코드"
    )

    # rlteSignguNm : 연관관광지시군구명
    rlteSignguNm: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
        comment="연관관광지시군구명"
    )

    # rlteCtgryLclsNm : 연관카테고리대분류명
    rlteCtgryLclsNm: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="연관카테고리대분류명"
    )

    # rlteCtgryMclsNm : 연관카테고리중분류명
    rlteCtgryMclsNm: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="연관카테고리중분류명"
    )

    # rlteCtgrySclsNm : 연관카테고리소분류명
    rlteCtgrySclsNm: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        comment="연관카테고리소분류명"
    )

    # rlteRank : 연관순위
    rlteRank: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="연관순위"
    )

    # updated_dt : 수정일자
    updated_dt: Mapped[date] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일자"
    )

    # updated_by : 수정자
    updated_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="수정자"
    )

    # registered_dt : 등록일자
    registered_dt: Mapped[date] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="등록일자"
    )

    # registered_by : 등록자
    registered_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="등록자"
    )

class ChatHistory(Base):

    __tablename__ = "chat_history"
    __table_args__ = {
        "comment": "대화 기록 테이블",
        "schema": "trip_database_schema"
    }

    # 채팅 ID
    id : Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="채팅 ID"
    )

    # 사용자 ID
    user_id : Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="사용자 ID"
    )

    # 대화 제목
    title : Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="대화 제목"
    )

    # 대화 요약
    summary : Mapped[str] = mapped_column(
        Text,
        nullable=True
    )

    # updated_dt : 수정일자
    updated_dt: Mapped[date] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일자"
    )

    # updated_by : 수정자
    updated_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="수정자"
    )

    # registered_dt : 등록일자
    registered_dt: Mapped[date] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="등록일자"
    )

    # registered_by : 등록자
    registered_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="등록자"
    )

class Messages(Base):
    __tablename__ = "messages"
    __table_args__ = {
        "comment": "대화별 메시지 테이블",
        "schema": "trip_database_schema"
    }

    # 메시지 ID
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
        comment="메시지 ID"
    )

    # 채팅 ID
    chat_history_id: Mapped[int] = mapped_column(
        ForeignKey(f"{SCHEMA}.chat_history.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="채팅 ID"
    )

    # 메시지 역할
    # user / assistant / system / tool
    role : Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="메시지 역할"
    )

    # 메시지 내용
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="메시지 내용"
    )

    # updated_by : 수정자
    updated_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="수정자"
    )

    # registered_dt : 등록일자
    registered_dt: Mapped[date] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="등록일자"
    )

    # registered_by : 등록자
    registered_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=USER_NAME,
        comment="등록자"
    )
