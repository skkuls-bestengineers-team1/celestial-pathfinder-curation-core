# LangGraph 포팅 내용 정리

## 배경
- 과제 요구사항: LangChain/LangGraph 사용
- 대상 범위: 챗봇 답변 생성 파이프라인(RAG + 날씨 함수 호출 + Gemini 호출) 전체
- 미변경: `/api/search`(정확 검색)와 프론트엔드는 LangChain과 무관해서 그대로 둠

## 기존 구조
`chat_service.py` 하나의 함수 안에서 순서대로 직접 호출:
RAG 검색 → 날씨 도구 호출 → 프롬프트 조립 → Gemini 호출

## 바뀐 구조

**`ChatState`**: 파이프라인 전체가 공유하는 상태값 정의
- input: 질문
- 중간값: RAG 검색 결과, 도구 실행 결과, 조립된 프롬프트
- output: 최종 답변

**4개 노드로 분리**

| 노드 | 역할 |
|---|---|
| `retrieve_node` | RAG 검색 |
| `tool_node` | 날씨 등 외부 도구 호출 |
| `prompt_node` | 검색 결과 + 도구 결과로 최종 프롬프트 조립 |
| `generate_node` | Gemini 호출, 답변 생성 |

**병렬 실행**: `retrieve_node`와 `tool_node`는 서로 의존성이 없어서 순차 실행 대신 그래프 시작점에서 병렬로 분기, `prompt_node`에서 합류. 단순 순서 재구성이 아니라 LangGraph의 병렬 구조를 실제로 활용한 부분.

**`chat_service.py`**: 그래프를 직접 조립하지 않고 `graph.py`에서 컴파일된 그래프를 가져와 `invoke()`만 호출. API 응답 형태(`answer`, `source`, `tool`)는 기존과 동일하게 유지 — 프론트엔드/라우터 변경 없음.

## 검증
`/api/chat`에 실제 질문("강남구 2박 3일 여행 코스, 날씨도") 전송 → RAG 검색 결과 + 실제 날씨 예보 반영된 답변 정상 생성 확인.

## 브랜치 전략
- `main`: 기존 버전 유지 (발표/데모용)
- `test_graph`: LangGraph 버전 커밋·푸시, 별도 검토 가능
