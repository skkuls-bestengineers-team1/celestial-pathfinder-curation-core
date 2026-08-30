from src.trip_search.trip_search_repository import TripRepository


class TripService:

    def __init__(self, repository: TripRepository):
        self.repository = repository

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
    ):
        return self.repository.search_trips(
            year=year,
            month=month,
            areaNm=areaNm,
            signguNm=signguNm,
            rlteCtgryLclsNm=rlteCtgryLclsNm,
            rlteCtgryMclsNm=rlteCtgryMclsNm,
            rlteCtgrySclsNm=rlteCtgrySclsNm,
            tAtsNm=tAtsNm,
            page=page,
            page_size=page_size
        )