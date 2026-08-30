import os
from pathlib import Path
from openAPI_codes import area_codes, korean_keywords, english_keywords, baseYm_list
import requests
from dotenv import load_dotenv
import pandas as pd

# 현재 파이썬 파일이 있는 폴더
BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_DIR = BASE_DIR.parent.parent / "data" / "output" / "tour_data.csv"
print(OUTPUT_DIR)
# 현재 파이썬 파일과 같은 위치에 있는 .env 파일 경로
ENV_PATH = BASE_DIR.parent.parent / ".env"
print(ENV_PATH)
load_dotenv(dotenv_path=ENV_PATH)

# .env 파일에서 OPEN_API_KEY 값을 가져온다.
OPEN_API_KEY = os.getenv("OPEN_API_KEY")
print("OPEN_API_KEY 존재 여부:", OPEN_API_KEY is not None)
# {}, []로 감싸지 않는다.
OPEN_API_URL = "https://apis.data.go.kr/B551011/TarRlteTarService1/searchKeyword1"

def print_title(title : str) -> None:
    print("*" * 80)
    print(title)
    print("*" * 80, "\n")

def fetch_api(
    baseYm : str, 
    area_code : str, 
    signgu_code : str, 
    keyword : str
) -> list[dict]:
    params = {
        "serviceKey": OPEN_API_KEY,
        "pageNo": 1,
        "numOfRows": 50,
        "MobileOS": "ETC",
        "MobileApp": "AppTest",

        "baseYm": baseYm,
        "areaCd": area_code,
        "signguCd": signgu_code,
        "keyword": keyword,
        "_type": "json"
    }

    '''
    requests.get() : 순수한 URL 문자열만 전달해야 한다.
    '''
    response = requests.get(
        OPEN_API_URL,
        params=params,
        timeout=60
    )

    response.raise_for_status() # HTTP 요청이 실패했으면 예외(Exception)를 발생시켜라.

    # Response 객체 -> dict
    data = response.json()
    body = data.get("response", {}).get("body", {})
    items = body.get("items")

    # 검색 결과 없음
    if not items:
        return []

    return items.get("item", [])

def main():

    print_title("OPEN_API DATA를 가져온다.")

    keywords = korean_keywords + english_keywords

    rows = []

    count = 0

    for baseYm in baseYm_list:
        for area_code, signgu_codes in area_codes.items():
            for signgu_code in signgu_codes:
                for keyword in keywords:
                    count += 1
                    print(f"진행 상황 확인 count :{count}\n\n")
                    
                    print("요청 상황 진행 중 : ")
                    print("baseYm : ", baseYm),
                    print("area_code : ", area_code),
                    print("signgu_code : ", signgu_code),
                    print("keyword : ", keyword,"\n\n")

                    items = fetch_api(
                        baseYm=baseYm,
                        area_code=area_code,
                        signgu_code=signgu_code,
                        keyword=keyword
                    )

                    for item in items:
                        rows.append(item)
    
    # 결과값 받아와서 csv에 저장하기
    print_title("2. 결과값을 DataFrame으로 변환하여 csv로 저장한다.")
    # item = {"key" :  "values"} 형태로 변환 필요

    trip_df = pd.DataFrame(rows)
    trip_df.drop_duplicates(inplace=True)

    trip_df.to_csv(
        OUTPUT_DIR,
        index=False,
        encoding="utf-8-sig"
    )

    # 데이터베이스, 테이블, 컬럼 설계하기

if __name__ == "__main__":
    main()