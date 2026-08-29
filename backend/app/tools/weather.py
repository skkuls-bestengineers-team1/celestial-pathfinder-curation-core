"""Open-Meteo Weather API 호출."""

from __future__ import annotations

import time

import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

REQUEST_TIMEOUT = 8
MAX_HTTP_ATTEMPTS = 3

WMO_WEATHER_MAP = {
    0: "맑음",
    1: "대체로 맑음",
    2: "부분적으로 흐림",
    3: "흐림",
    45: "안개",
    48: "서리성 안개",
    51: "약한 이슬비",
    53: "보통 이슬비",
    55: "강한 이슬비",
    56: "약한 어는 이슬비",
    57: "강한 어는 이슬비",
    61: "약한 비",
    63: "보통 비",
    65: "강한 비",
    66: "약한 어는 비",
    67: "강한 어는 비",
    71: "약한 눈",
    73: "보통 눈",
    75: "강한 눈",
    77: "싸락눈",
    80: "약한 소나기",
    81: "보통 소나기",
    82: "강한 소나기",
    85: "약한 눈 소나기",
    86: "강한 눈 소나기",
    95: "뇌우",
    96: "약한 우박을 동반한 뇌우",
    99: "강한 우박을 동반한 뇌우",
}


class RetryableApiError(RuntimeError):
    """일시적 외부 API 오류."""


class PermanentApiError(RuntimeError):
    """재시도해도 해결되지 않는 외부 API 오류."""


def weather_code_to_text(weather_code) -> str:
    try:
        code = int(weather_code)
    except (TypeError, ValueError):
        return "알 수 없음"
    return WMO_WEATHER_MAP.get(code, f"알 수 없는 코드({code})")


def _request_json(url: str, params: dict) -> dict:
    last_error: Exception | None = None

    for attempt in range(1, MAX_HTTP_ATTEMPTS + 1):
        try:
            response = requests.get(
                url,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )

            if response.status_code == 429 or 500 <= response.status_code <= 599:
                raise RetryableApiError(
                    f"외부 API가 일시적으로 요청을 처리하지 못했습니다. HTTP {response.status_code}"
                )

            if 400 <= response.status_code <= 499:
                try:
                    error_body = response.json()
                except ValueError:
                    error_body = {"raw_text": response.text[:500]}
                raise PermanentApiError(
                    f"외부 API 요청이 거부되었습니다. HTTP {response.status_code}, body={error_body}"
                )

            response.raise_for_status()

            try:
                return response.json()
            except ValueError as error:
                raise PermanentApiError("외부 API 응답을 JSON으로 해석할 수 없습니다.") from error

        except requests.Timeout as error:
            last_error = error
            if attempt >= MAX_HTTP_ATTEMPTS:
                raise RetryableApiError("외부 API 요청 시간이 초과되었습니다.") from error

        except requests.ConnectionError as error:
            last_error = error
            if attempt >= MAX_HTTP_ATTEMPTS:
                raise RetryableApiError("외부 API에 연결할 수 없습니다.") from error

        except RetryableApiError:
            if attempt >= MAX_HTTP_ATTEMPTS:
                raise
            last_error = None

        time.sleep(min(2 ** (attempt - 1), 4))

    raise RetryableApiError("외부 API 요청에 실패했습니다.") from last_error


def _error_result(code: str, message: str, retryable: bool, **extra) -> dict:
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "retryable": retryable,
        },
    }
    payload.update(extra)
    return payload


KNOWN_CITIES = {
    "서울": (37.5665, 126.9780, "서울특별시"),
    "서울시": (37.5665, 126.9780, "서울특별시"),
    "서울특별시": (37.5665, 126.9780, "서울특별시"),
    "seoul": (37.5665, 126.9780, "서울특별시"),
    "부산": (35.1796, 129.0756, "부산광역시"),
    "부산시": (35.1796, 129.0756, "부산광역시"),
    "부산광역시": (35.1796, 129.0756, "부산광역시"),
    "busan": (35.1796, 129.0756, "부산광역시"),
    "전주": (35.8242, 127.1480, "전주시"),
    "전주시": (35.8242, 127.1480, "전주시"),
    "jeonju": (35.8242, 127.1480, "전주시"),
    "제주": (33.4996, 126.5312, "제주시"),
    "제주시": (33.4996, 126.5312, "제주시"),
    "서귀포": (33.2541, 126.5600, "서귀포시"),
    "jeju": (33.4996, 126.5312, "제주시"),
    "인천": (37.4563, 126.7052, "인천광역시"),
    "incheon": (37.4563, 126.7052, "인천광역시"),
    "대구": (35.8714, 128.6014, "대구광역시"),
    "daegu": (35.8714, 128.6014, "대구광역시"),
    "광주": (35.1595, 126.8526, "광주광역시"),
    "대전": (36.3504, 127.3845, "대전광역시"),
    "울산": (35.5384, 129.3114, "울산광역시"),
    "강릉": (37.7519, 128.8761, "강릉시"),
    "속초": (38.2070, 128.5918, "속초시"),
    "여수": (34.7604, 127.6622, "여수시"),
    "경주": (35.8562, 129.2247, "경주시"),
}


def _known_city(city: str) -> dict | None:
    key = city.strip()
    coords = KNOWN_CITIES.get(key) or KNOWN_CITIES.get(key.lower())
    if coords is None:
        return None
    latitude, longitude, name = coords
    return {
        "success": True,
        "data": {
            "name": name,
            "country": "대한민국",
            "admin1": name,
            "latitude": latitude,
            "longitude": longitude,
            "timezone": "Asia/Seoul",
        },
    }


def geocode_city(city: str) -> dict:
    known = _known_city(city)
    if known is not None:
        return known

    search_params = [
        {"name": city, "count": 1, "language": "ko", "format": "json"},
        {"name": city, "count": 1, "format": "json"},
        {"name": city, "count": 1, "language": "en", "format": "json"},
    ]

    for params in search_params:
        data = _request_json(GEOCODING_URL, params)
        results = data.get("results") or []
        if not results:
            continue

        first = results[0]
        return {
            "success": True,
            "data": {
                "name": first.get("name"),
                "country": first.get("country"),
                "admin1": first.get("admin1"),
                "latitude": first.get("latitude"),
                "longitude": first.get("longitude"),
                "timezone": first.get("timezone") or "Asia/Seoul",
            },
        }

    return _error_result(
        "location_not_found",
        "도시를 찾을 수 없습니다.",
        retryable=False,
        query=city,
    )


def get_weather(city: str, days: int = 7) -> dict:
    """지역 날씨를 조회하고 dict로 반환한다."""
    city = city.strip()

    try:
        location_result = geocode_city(city)
        if not location_result.get("success"):
            return location_result

        location = location_result["data"]

        data = _request_json(
            WEATHER_URL,
            {
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "daily": (
                    "weather_code,"
                    "temperature_2m_max,"
                    "temperature_2m_min,"
                    "precipitation_sum,"
                    "precipitation_probability_max,"
                    "wind_speed_10m_max"
                ),
                "forecast_days": days,
                "timezone": "auto",
            },
        )

        daily = data.get("daily") or {}
        dates = daily.get("time") or []
        if not dates:
            return _error_result(
                "weather_data_missing",
                "날씨 데이터가 없습니다.",
                retryable=False,
            )

        units = data.get("daily_units") or {}
        forecast = []
        for index, date in enumerate(dates):
            weather_code = _list_get(daily.get("weather_code"), index)
            forecast.append(
                {
                    "date": date,
                    "temp_max": _list_get(daily.get("temperature_2m_max"), index),
                    "temp_min": _list_get(daily.get("temperature_2m_min"), index),
                    "precipitation_sum": _list_get(daily.get("precipitation_sum"), index),
                    "precipitation_probability": _list_get(
                        daily.get("precipitation_probability_max"),
                        index,
                    ),
                    "wind_speed_max": _list_get(daily.get("wind_speed_10m_max"), index),
                    "weather_code": weather_code,
                    "weather_description": weather_code_to_text(weather_code),
                }
            )

        return {
            "success": True,
            "source": "Open-Meteo",
            "query": {
                "city": city,
                "days": days,
            },
            "location": location,
            "units": {
                "temperature": units.get("temperature_2m_max"),
                "precipitation": units.get("precipitation_sum"),
                "precipitation_probability": units.get("precipitation_probability_max"),
                "wind_speed": units.get("wind_speed_10m_max"),
            },
            "forecast": forecast,
        }

    except RetryableApiError as error:
        return _error_result("weather_temporary_error", str(error), retryable=True)

    except PermanentApiError as error:
        return _error_result("weather_api_error", str(error), retryable=False)


def _list_get(values, index):
    if not isinstance(values, list) or index >= len(values):
        return None
    return values[index]
