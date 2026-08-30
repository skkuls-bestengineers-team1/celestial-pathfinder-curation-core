from sqlalchemy import Engine, select, func
from src.trip_search.models import Trips


class TripRepository:

    def __init__(self, engine: Engine):
        self.engine = engine

    def search_trips(
        self,
        year: str,
        month: str,
        areaNm: str,
        signguNm: str,
        rlteCtgryLclsNm: str,
        rlteCtgryMclsNm: str,
        rlteCtgrySclsNm: str,
        tAtsNm: str,
        page: int = 1,
        page_size: int = 5
    ) -> dict:

        offset = (page - 1) * page_size

        conditions = [
            Trips.year == year,
            Trips.month == month,
            Trips.areaNm == areaNm,
            Trips.signguNm == signguNm,
            Trips.rlteCtgryLclsNm == rlteCtgryLclsNm,
            Trips.rlteCtgryMclsNm == rlteCtgryMclsNm,
            Trips.rlteCtgrySclsNm == rlteCtgrySclsNm,
            Trips.tAtsNm.ilike(f"%{tAtsNm}%")
        ]

        # 전체 검색 결과 개수
        count_stmt = (
            select(func.count())
            .select_from(Trips)
            .where(*conditions)
        )

        # 현재 페이지 데이터
        stmt = (
            select(Trips.__table__)
            .where(*conditions)
            .order_by(
                Trips.tAtsNm.asc(),
                Trips.rlteRank.desc()
            )
            .limit(page_size)
            .offset(offset)
        )

        with self.engine.connect() as connection:

            rows = (
                connection
                .execute(stmt)
                .mappings()
                .all()
            )

            total_count = (
                connection
                .execute(count_stmt)
                .scalar_one()
            )

        return {
            "items": [dict(row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total_count": total_count
        }