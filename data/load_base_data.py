from __future__ import annotations
from src.trip_search.models import Base

import os
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from sqlalchemy import Engine, URL, create_engine, text
import pandas as pd
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from src.trip_search.models import Trips


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent / ".env"
SCHEMA = "trip_database_schema"

CSV_FILE = BASE_DIR / "output" / "tour_data.csv"

trips_df = pd.read_csv(
    CSV_FILE
    , encoding="utf-8-sig"
    , dtype={"baseYm" : str}
)

def load_database_config() -> dict[str, Any]:
    if not ENV_PATH.exists():
        raise FileNotFoundError(".env 파일이 없습니다.")

    load_dotenv(dotenv_path=ENV_PATH)

    required_keys = [
        "PGHOST",
        "PGPORT",
        "PGDATABASE",
        "PGUSER",
        "PGPASSWORD",
    ]

    missing_key = [key for key in required_keys if not os.getenv(key)]

    if missing_key:
        raise ValueError(
            ".env 파일에 다음 설정이 없습니다. : "
            + ", ".join(missing_key)
        )
    
    return {
        "host" : os.environ["PGHOST"],
        "port" : os.environ["PGPORT"],
        "database" : os.environ["PGDATABASE"],
        "username" : os.environ["PGUSER"],
        "password" : os.environ["PGPASSWORD"],
    }

def create_database_engine(config : dict[str, Any]) -> Engine:
    database_url = URL.create(
        drivername="postgresql+psycopg2",
        host=config["host"],
        port=config["port"],
        database=config["database"],
        username=config["username"],
        password=config["password"],
    )

    return create_engine(database_url, pool_pre_ping=True)

# load_trip_data() 생성

def check_schema(engine: Engine) -> None:
    query = text(
        f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA}"'
    )

    with engine.begin() as connection:
        connection.execute(query)


def check_tables(engine: Engine) -> None:
    query = text(
        f"""
        SELECT
            to_regclass('{SCHEMA}.trips') AS trips,
            to_regclass('{SCHEMA}.chat_history') AS chat_history,
            to_regclass('{SCHEMA}.messages') AS messages
        """
    )

    with engine.connect() as connection:
        row = connection.execute(query).mappings().one()

        if (
            row["trips"] is None
            or row["chat_history"] is None
            or row["messages"] is None
        ):
            raise RuntimeError(
                f"테이블이 존재하지 않습니다. "
                f"trips={row['trips']}, "
                f"chat_history={row['chat_history']}, "
                f"messages={row['messages']}"
            )

def insert_trips(engine : Engine, trip_df : pd.DataFrame, ) -> int:
    # baseYm : YYYYMM => YYYY / MM으로 분리
    trip_df["year"] = trip_df["baseYm"].str[:4]
    trip_df["month"] = trip_df["baseYm"].str[4:6]

    # DataFrame -> list[dict]
    rows = trip_df.to_dict(orient="records")

    if not rows:
        raise ValueError("insert할 데이터가 없습니다. ")
        return
    try : 
        # connection 생성
        with engine.begin() as connection:

           
           stmt = pg_insert(Trips).values(rows)
           result = connection.execute(stmt)

        return result.rowcount

    # pk 에러 추가
    except IntegrityError as error:
        print("PK 또는 UK 에러 : ", error)
        raise
    except SQLAlchemyError as error:
        print(f"insert 실패 : {error}")
        raise
        

def load_database_main():
    config = load_database_config()

    engine = create_database_engine(config)

    # 1. schema 생성
    check_schema(engine)

    # 2. table 생성
    Base.metadata.create_all(engine)

    # 3. table 존재 확인
    check_tables(engine)

    # 4. table insert
    rowcount = insert_trips(engine, trip_df=trips_df)
    print(f"{rowcount}건 insert")

if __name__ == "__main__":
    load_database_main()