"""Streamlit 앱 진입점."""
from data.load_base_data import load_database_config, create_database_engine, load_database_main
from src.trip_search.trip_search_service import TripService
from src.trip_search.trip_search_repository import TripRepository
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
print(ENV_PATH)
def main()->None:
    # app.py 실행 전 data/sql/create_database.sql 실행 요망
    # 스키마, 테이블 생성, 데이터를 insert한다.

    load_database_main()

    config = load_database_config()
    engine = create_database_engine(config)
    tripRepository = TripRepository(engine)
    tripService = TripService(tripRepository)

    # frontend에서 작업 시 아래 코드를 활용하세요.
    search_list = tripService.search_trips(
        year="2026",
        month="07",
        areaNm="서울특별시",
        signguNm="강동구",
        rlteCtgryLclsNm="음식",
        rlteCtgryMclsNm="음식",
        rlteCtgrySclsNm="한식",
        tAtsNm="호"
    )
    print(search_list)
if __name__ == "__main__":
    main()
