import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
};

type HistoryItem = {
  id: number;
  title: string;
  date: string;
  preview: string;
};

type PlanTab = "region" | "date" | "style" | "transport";
type InfoCategory = "맛집" | "명소" | "축제";

const HISTORY: HistoryItem[] = [
  { id: 1, title: "제주도 힐링 여행", date: "2026.08.20", preview: "3박 4일 · 자차" },
  { id: 2, title: "강원도 자연 힐링", date: "2026.08.14", preview: "2박 3일 · 대중교통" },
  { id: 3, title: "부산 도심 웰니스", date: "2026.08.05", preview: "1박 2일 · 도보" },
  { id: 4, title: "전주 한옥마을 여행", date: "2026.07.28", preview: "당일치기 · 자차" },
  { id: 5, title: "경주 역사 문화 탐방", date: "2026.07.15", preview: "2박 3일 · 대중교통" },
];

const CATEGORIES = [
  { id: "healing", label: "힐링", icon: "🌿" },
  { id: "wellness", label: "웰니스", icon: "🧘" },
  { id: "adventure", label: "액티비티", icon: "🏔️" },
  { id: "culture", label: "문화·예술", icon: "🎨" },
  { id: "food", label: "미식", icon: "🍽️" },
  { id: "photo", label: "사진 여행", icon: "📸" },
  { id: "family", label: "가족 여행", icon: "👨‍👩‍👧" },
  { id: "solo", label: "혼자 여행", icon: "🎒" },
];

const PLAN_REGIONS = ["서울", "경기", "인천", "강원", "충청", "경상", "전라", "제주"];
const TRANSPORTS = [
  { id: "walk", label: "도보", icon: "🚶" },
  { id: "public", label: "대중교통", icon: "🚌" },
  { id: "car", label: "자차", icon: "🚗" },
];

// Region -> famous cities
const REGION_CITIES: Record<string, { name: string; desc: string }[]> = {
  제주: [
    { name: "제주시", desc: "제주 최대 도심" },
    { name: "서귀포시", desc: "한라산 남쪽 관광 중심" },
    { name: "성산읍", desc: "일출봉·우도 관문" },
    { name: "한림읍", desc: "협재·금능 해변" },
    { name: "애월읍", desc: "카페·해안도로" },
    { name: "표선면", desc: "민속촌·표선해변" },
    { name: "안덕면", desc: "산방산·용머리해안" },
    { name: "조천읍", desc: "함덕 해수욕장" },
    { name: "구좌읍", desc: "만장굴·비자림" },
    { name: "대정읍", desc: "마라도·송악산" },
  ],
  강원: [
    { name: "강릉시", desc: "커피·경포 해변" },
    { name: "속초시", desc: "설악산·아바이마을" },
    { name: "춘천시", desc: "닭갈비·남이섬" },
    { name: "평창군", desc: "스키·오대산" },
    { name: "정선군", desc: "레일바이크·화암동굴" },
    { name: "양양군", desc: "서핑·낙산사" },
    { name: "동해시", desc: "무릉계곡·추암" },
    { name: "태백시", desc: "태백산·석탄박물관" },
    { name: "인제군", desc: "내린천·원대리자작나무숲" },
    { name: "화천군", desc: "산천어축제·평화의댐" },
  ],
  부산: [
    { name: "해운대구", desc: "해수욕장·마린시티" },
    { name: "중구", desc: "남포동·자갈치시장" },
    { name: "사하구", desc: "감천문화마을" },
    { name: "영도구", desc: "흰여울마을·절영도" },
    { name: "수영구", desc: "광안리 해수욕장" },
    { name: "동래구", desc: "온천·동래읍성" },
    { name: "기장군", desc: "죽성성당·해동용궁사" },
    { name: "강서구", desc: "을숙도·낙동강하구" },
    { name: "북구", desc: "금정산·화명수목원" },
    { name: "남구", desc: "오륙도·UN기념공원" },
  ],
  서울: [
    { name: "종로구", desc: "경복궁·북촌·인사동" },
    { name: "중구", desc: "명동·청계천·을지로" },
    { name: "마포구", desc: "홍대·연남동·상암" },
    { name: "용산구", desc: "이태원·한강공원" },
    { name: "성동구", desc: "성수동·서울숲" },
    { name: "영등포구", desc: "여의도·타임스퀘어" },
    { name: "송파구", desc: "잠실·석촌호수" },
    { name: "강남구", desc: "가로수길·코엑스" },
    { name: "노원구", desc: "불암산·경춘선숲길" },
    { name: "은평구", desc: "북한산·한옥마을" },
  ],
  경기: [
    { name: "수원시", desc: "화성·통닭거리" },
    { name: "가평군", desc: "아침고요수목원·남이섬" },
    { name: "파주시", desc: "DMZ·헤이리마을" },
    { name: "양평군", desc: "두물머리·세미원" },
    { name: "이천시", desc: "도자기·온천" },
    { name: "용인시", desc: "에버랜드·민속촌" },
    { name: "포천시", desc: "이동갈비·산정호수" },
    { name: "광주시", desc: "남한산성·팔당호" },
    { name: "연천군", desc: "한탄강·재인폭포" },
    { name: "안산시", desc: "대부도·시화호" },
  ],
  인천: [
    { name: "강화군", desc: "고인돌·마니산" },
    { name: "중구", desc: "차이나타운·개항장" },
    { name: "옹진군", desc: "백령도·을왕리해변" },
    { name: "연수구", desc: "송도국제도시" },
    { name: "서구", desc: "청라·경인아라뱃길" },
    { name: "계양구", desc: "계양산·귤현동" },
    { name: "남동구", desc: "소래포구·인천대공원" },
    { name: "부평구", desc: "부평문화의거리" },
    { name: "미추홀구", desc: "수봉공원·주안" },
    { name: "동구", desc: "배다리 헌책방거리" },
  ],
  충청: [
    { name: "대전시", desc: "성심당·계족산·엑스포" },
    { name: "천안시", desc: "독립기념관·병천순대" },
    { name: "공주시", desc: "공산성·무령왕릉" },
    { name: "부여군", desc: "궁남지·백제문화단지" },
    { name: "단양군", desc: "도담삼봉·단양팔경" },
    { name: "보령시", desc: "머드축제·대천해수욕장" },
    { name: "청주시", desc: "고인쇄박물관·올갱이국" },
    { name: "충주시", desc: "탄금대·수안보온천" },
    { name: "금산군", desc: "인삼축제·보석사" },
    { name: "태안군", desc: "안면도·꽃지해변" },
  ],
  경상: [
    { name: "경주시", desc: "불국사·첨성대·야경" },
    { name: "안동시", desc: "하회마을·찜닭골목" },
    { name: "통영시", desc: "케이블카·굴·미륵산" },
    { name: "거제시", desc: "바람의언덕·해금강" },
    { name: "남해군", desc: "독일마을·다랭이마을" },
    { name: "대구시", desc: "근대골목·서문시장" },
    { name: "울산시", desc: "간절곶·태화강대공원" },
    { name: "포항시", desc: "호미곶·죽도시장" },
    { name: "창원시", desc: "진해벚꽃·마산어시장" },
    { name: "밀양시", desc: "표충사·얼음골·사자평" },
  ],
  전라: [
    { name: "전주시", desc: "한옥마을·콩나물국밥" },
    { name: "순천시", desc: "순천만·낙안읍성" },
    { name: "여수시", desc: "돌산도·밤바다·케이블카" },
    { name: "광주시", desc: "국립박물관·비엔날레" },
    { name: "담양군", desc: "죽녹원·소쇄원·가사문학" },
    { name: "목포시", desc: "갓바위·세발낙지" },
    { name: "보성군", desc: "녹차밭·차문화제" },
    { name: "고창군", desc: "고인돌·선운사" },
    { name: "남원시", desc: "춘향테마파크·지리산" },
    { name: "완도군", desc: "청산도·장보고유적" },
  ],
};

type InfoItem = {
  name: string;
  tag: string;
  desc: string;
  rating?: string;
  extra?: string;
};

const INFO_DATA: Record<string, Record<string, Record<InfoCategory, InfoItem[]>>> = {
  제주: {
    전체: {
      맛집: [
        { name: "제주 흑돼지 명가", tag: "흑돼지", desc: "제주 토종 흑돼지를 직화로 구워내는 35년 전통 식당", rating: "4.8", extra: "제주시 연동" },
        { name: "올레국수", tag: "고기국수", desc: "진한 사골 육수에 제주 고기를 올린 제주 대표 국수", rating: "4.7", extra: "서귀포시 중문" },
        { name: "만춘정", tag: "해산물", desc: "제주 자연산 해산물 코스 요리, 예약 필수", rating: "4.9", extra: "제주시 한림" },
      ],
      명소: [
        { name: "성산일출봉", tag: "유네스코", desc: "제주의 상징, 일출 명소이자 천연기념물", rating: "4.9", extra: "서귀포시 성산읍" },
        { name: "한라산 어리목 코스", tag: "등산", desc: "한라산 대표 코스, 억새 군락과 백록담 전망", rating: "4.8", extra: "한라산국립공원" },
        { name: "협재 해수욕장", tag: "해변", desc: "에메랄드빛 바다와 비양도가 펼쳐지는 해변", rating: "4.7", extra: "제주시 한림읍" },
      ],
      축제: [
        { name: "제주 들불축제", tag: "3월", desc: "새별오름 들불놓기 퍼포먼스, 정월대보름 전통 계승", extra: "새별오름 일대" },
        { name: "제주 유채꽃 축제", tag: "4월", desc: "가시리 광치기 해변 유채꽃 물결과 포토존", extra: "성산읍 가시리" },
        { name: "탐라문화제", tag: "10월", desc: "제주 전통 문화와 공연, 민속 체험 종합 축제", extra: "제주시 탑동" },
      ],
    },
    제주시: {
      맛집: [
        { name: "동문시장 야시장", tag: "야시장", desc: "제주 대표 재래시장, 다양한 먹거리와 야시장 운영", rating: "4.6", extra: "제주시 이도1동" },
        { name: "우진해장국", tag: "몸국", desc: "제주 전통 몸국과 고사리국, 현지인 즐겨 찾는 맛집", rating: "4.7", extra: "제주시 삼도2동" },
        { name: "흑돼지 거리", tag: "흑돼지", desc: "연동 흑돼지 거리, 직화 구이 전문점 밀집", rating: "4.8", extra: "제주시 연동" },
      ],
      명소: [
        { name: "용두암", tag: "해안", desc: "바다에서 솟아오른 용 형상의 현무암 기암", rating: "4.3", extra: "제주시 용담2동" },
        { name: "제주 민속자연사박물관", tag: "박물관", desc: "제주 자연·민속 유물 총망라한 도내 최대 박물관", rating: "4.4", extra: "제주시 삼도2동" },
        { name: "사라봉공원", tag: "전망", desc: "제주시 시내와 항구를 한눈에 담는 야경 명소", rating: "4.3", extra: "제주시 건입동" },
      ],
      축제: [
        { name: "탐라문화제", tag: "10월", desc: "제주 전통 문화와 민속 공연 종합 축제", extra: "탑동 광장 일대" },
        { name: "제주 빛의 축제", tag: "12~1월", desc: "탑동 해변 미디어아트 빛 조형 전시", extra: "제주시 탑동" },
        { name: "새봄 전통시장 축제", tag: "3~4월", desc: "동문·서문시장 봄 먹거리 및 공연 축제", extra: "동문시장 일대" },
      ],
    },
    서귀포시: {
      맛집: [
        { name: "서귀포 매일올레시장", tag: "재래시장", desc: "감귤·오메기떡·제주 특산물이 가득한 시장", rating: "4.6", extra: "서귀포시 서귀동" },
        { name: "천지연 흑돼지", tag: "흑돼지", desc: "천지연폭포 인근 흑돼지 전문점", rating: "4.7", extra: "서귀포시 서귀동" },
        { name: "자리돔 횟집 골목", tag: "자리물회", desc: "서귀포 대표 향토 음식 자리물회 전문 골목", rating: "4.5", extra: "서귀포시 법환동" },
      ],
      명소: [
        { name: "천지연폭포", tag: "폭포", desc: "높이 22m 제주 3대 폭포 중 하나, 야간 개장", rating: "4.7", extra: "서귀포시 서귀동" },
        { name: "외돌개", tag: "해안절경", desc: "홀로 서 있는 20m 돌기둥과 범섬 뷰", rating: "4.6", extra: "서귀포시 서홍동" },
        { name: "정방폭포", tag: "폭포", desc: "바다로 직접 떨어지는 동양 유일의 해안 폭포", rating: "4.5", extra: "서귀포시 동홍동" },
      ],
      축제: [
        { name: "서귀포 칠십리 축제", tag: "10월", desc: "서귀포 대표 가을 축제, 문화 공연과 불꽃쇼", extra: "서귀포 해변공원" },
        { name: "감귤박람회", tag: "11월", desc: "제주 감귤 수확 시즌 감귤 따기 체험 행사", extra: "서귀포시 감귤박물관" },
        { name: "올레 걷기 축제", tag: "11월", desc: "제주 올레 코스 전 구간 도보 여행 축제", extra: "제주 올레 전 코스" },
      ],
    },
    성산읍: {
      맛집: [
        { name: "성산항 고등어쌈밥", tag: "고등어", desc: "성산항 신선 고등어 구이와 제주 쌈밥 정식", rating: "4.6", extra: "서귀포시 성산읍" },
        { name: "해녀촌 해산물", tag: "해녀", desc: "해녀 직접 채취한 성게·전복·소라 코스", rating: "4.8", extra: "성산 일출봉 인근" },
        { name: "오조해녀의집", tag: "해산물", desc: "오조리 해녀 가족 운영, 싱싱한 해산물 정식", rating: "4.7", extra: "서귀포시 오조리" },
      ],
      명소: [
        { name: "성산일출봉", tag: "유네스코", desc: "제주 대표 일출 명소, 수중 화산 분화구", rating: "4.9", extra: "서귀포시 성산읍" },
        { name: "우도", tag: "섬", desc: "배로 15분, 땅콩아이스크림과 에메랄드 해변", rating: "4.8", extra: "제주시 우도면" },
        { name: "광치기 해변", tag: "해변", desc: "일출봉을 배경으로 한 유채꽃밭 포토 명소", rating: "4.5", extra: "서귀포시 성산읍" },
      ],
      축제: [
        { name: "성산 일출 해맞이 축제", tag: "1월", desc: "신년 일출봉 일출 기원 행사와 불꽃놀이", extra: "성산일출봉" },
        { name: "우도 산호 축제", tag: "5월", desc: "우도 산호 해변 체험과 해양 문화 행사", extra: "우도 산호해변" },
        { name: "성산 해녀 축제", tag: "9월", desc: "제주 해녀 문화 UNESCO 등재 기념 체험 축제", extra: "성산읍 일대" },
      ],
    },
    애월읍: {
      맛집: [
        { name: "애월 카페거리 브런치", tag: "카페·브런치", desc: "해안도로 따라 이어진 뷰 맛집 카페 밀집 구역", rating: "4.5", extra: "제주시 애월읍" },
        { name: "금능 은성식당", tag: "갈치조림", desc: "애월 현지인 맛집, 제주 은갈치 조림 정식", rating: "4.6", extra: "제주시 한림읍 금능리" },
        { name: "곽지과물해변 해녀식당", tag: "해산물", desc: "곽지 해변 해녀 운영 싱싱한 전복죽·성게비빔밥", rating: "4.7", extra: "제주시 애월읍 곽지리" },
      ],
      명소: [
        { name: "애월 해안도로", tag: "드라이브", desc: "제주 최고의 해안 드라이브 코스, 카페와 절경", rating: "4.7", extra: "제주시 애월읍" },
        { name: "한담해안산책로", tag: "산책", desc: "기암절벽을 따라 걷는 1.2km 해안 산책로", rating: "4.6", extra: "제주시 애월읍 한담리" },
        { name: "곽지과물해변", tag: "해변", desc: "천연 담수와 바닷물이 만나는 독특한 해변", rating: "4.4", extra: "제주시 애월읍" },
      ],
      축제: [
        { name: "애월 이호테우 해변 말축제", tag: "7~8월", desc: "목마 형상의 이호테우 등대와 제주마 체험 행사", extra: "이호테우해변" },
        { name: "한림 수박 축제", tag: "7월", desc: "한림읍 수박 농가 직거래와 수박 먹기 대회", extra: "한림읍 일대" },
        { name: "애월 봄꽃 산책 축제", tag: "4월", desc: "애월 해안도로 봄꽃 산책과 포토존 행사", extra: "애월 해안도로" },
      ],
    },
  },
  강원: {
    전체: {
      맛집: [
        { name: "속초 아바이마을 순대", tag: "순대국밥", desc: "실향민의 손맛, 함경도식 오징어 순대국", rating: "4.6", extra: "속초시 청호동" },
        { name: "강릉 교동반점", tag: "짬뽕", desc: "강릉 현지인이 줄 서는 짬뽕 명가", rating: "4.7", extra: "강릉시 교동" },
        { name: "춘천 명동닭갈비골목", tag: "닭갈비", desc: "철판 닭갈비 원조 골목, 막국수와 함께", rating: "4.5", extra: "춘천시 명동" },
      ],
      명소: [
        { name: "설악산 국립공원", tag: "산악", desc: "울산바위, 대청봉 등 사계절 절경의 명산", rating: "4.9", extra: "속초·인제·양양" },
        { name: "정동진 해돋이", tag: "해변", desc: "세계에서 바다와 가장 가까운 기차역", rating: "4.6", extra: "강릉시 정동진" },
        { name: "남이섬", tag: "섬", desc: "메타세쿼이아 길과 낭만 가득한 섬 여행", rating: "4.5", extra: "춘천시 남산면" },
      ],
      축제: [
        { name: "화천 산천어축제", tag: "1월", desc: "세계 4대 겨울 축제, 산천어 얼음낚시 체험", extra: "화천읍 화천천" },
        { name: "강릉 커피축제", tag: "10월", desc: "커피 도시 강릉의 바리스타 경연과 시음", extra: "강릉시 녹색도시체험센터" },
        { name: "춘천 마임축제", tag: "5월", desc: "국내 최대 거리 예술 축제, 마임 퍼포먼스", extra: "춘천 문화광장" },
      ],
    },
    강릉시: {
      맛집: [
        { name: "강릉 교동반점", tag: "짬뽕", desc: "강릉 현지인이 줄 서는 짬뽕 명가", rating: "4.7", extra: "강릉시 교동" },
        { name: "순두부마을", tag: "순두부", desc: "초당 해수로 만든 강릉 전통 초당순두부", rating: "4.6", extra: "강릉시 초당동" },
        { name: "강릉 중앙시장 닭강정", tag: "닭강정", desc: "바삭한 닭강정과 찹쌀도넛, 중앙시장 인기 간식", rating: "4.5", extra: "강릉시 성남동" },
      ],
      명소: [
        { name: "경포 해수욕장", tag: "해변", desc: "강릉 대표 해수욕장, 석호 경포호와 함께", rating: "4.6", extra: "강릉시 경포동" },
        { name: "오죽헌", tag: "역사", desc: "신사임당·율곡이이 생가, 조선 대표 목조건물", rating: "4.5", extra: "강릉시 죽헌동" },
        { name: "정동진 해변", tag: "일출", desc: "세계에서 바다와 가장 가까운 기차역 일출 명소", rating: "4.7", extra: "강릉시 강동면" },
      ],
      축제: [
        { name: "강릉 단오제", tag: "5~6월", desc: "유네스코 인류무형유산, 씨름·그네·강릉 탈놀이", extra: "강릉 남대천 일대" },
        { name: "강릉 커피축제", tag: "10월", desc: "커피 수도 강릉의 바리스타 경연과 시음 행사", extra: "녹색도시체험센터" },
        { name: "경포 벚꽃 축제", tag: "4월", desc: "경포호 둘레길 벚꽃과 봄꽃 산책 이벤트", extra: "경포호 둘레길" },
      ],
    },
    속초시: {
      맛집: [
        { name: "아바이마을 오징어순대", tag: "순대", desc: "함경도 실향민 전통 오징어 순대, 50년 노포", rating: "4.6", extra: "속초시 청호동" },
        { name: "속초 중앙시장 닭강정", tag: "닭강정", desc: "중앙시장 명물 매콤달콤 닭강정", rating: "4.5", extra: "속초시 중앙동" },
        { name: "동명항 대게집", tag: "대게", desc: "속초항 위판 신선 대게와 홍게 찜 전문", rating: "4.7", extra: "속초시 동명동" },
      ],
      명소: [
        { name: "설악산 국립공원", tag: "산악", desc: "울산바위·비선대·대청봉 사계절 등산 명소", rating: "4.9", extra: "속초시 설악동" },
        { name: "영랑호", tag: "호수", desc: "설악산을 배경으로 한 아름다운 자연 석호", rating: "4.5", extra: "속초시 영랑동" },
        { name: "속초 해수욕장", tag: "해변", desc: "등대와 속초 시내를 바라보는 도심 해변", rating: "4.4", extra: "속초시 조양동" },
      ],
      축제: [
        { name: "속초 대포항 오징어 축제", tag: "8~9월", desc: "속초 대표 특산물 오징어 요리 경연과 체험", extra: "대포항 일대" },
        { name: "설악 문화제", tag: "10월", desc: "설악산 단풍 시즌 등반 행사와 문화 공연", extra: "설악산 일대" },
        { name: "속초 불꽃 축제", tag: "7월", desc: "속초 해변 여름 밤 불꽃 쇼와 콘서트", extra: "속초해수욕장" },
      ],
    },
  },
  부산: {
    전체: {
      맛집: [
        { name: "해운대 원조 할매 국밥", tag: "돼지국밥", desc: "60년 전통 부산 돼지국밥, 진한 사골 육수", rating: "4.7", extra: "해운대구 우동" },
        { name: "자갈치시장 회센터", tag: "회·해산물", desc: "부산 최대 수산시장, 활어회 직접 구매 가능", rating: "4.6", extra: "중구 남포동" },
        { name: "밀면 대가", tag: "밀면", desc: "부산 향토음식 밀면 원조집, 물밀면·비빔밀면", rating: "4.5", extra: "연제구 연산동" },
      ],
      명소: [
        { name: "감천문화마을", tag: "마을·예술", desc: "알록달록한 계단식 마을, 부산의 마추픽추", rating: "4.7", extra: "사하구 감천동" },
        { name: "해운대 해수욕장", tag: "해변", desc: "국내 최대 해수욕장, 마린시티 야경과 함께", rating: "4.6", extra: "해운대구" },
        { name: "흰여울문화마을", tag: "마을", desc: "절벽 위 하얀 골목과 영도 바다가 한눈에", rating: "4.8", extra: "영도구 영선동" },
      ],
      축제: [
        { name: "부산국제영화제", tag: "10월", desc: "아시아 최대 영화제, 스타 거리 행진과 상영회", extra: "해운대·남포동" },
        { name: "부산불꽃축제", tag: "10월", desc: "광안대교를 배경으로 한 초대형 불꽃쇼", extra: "광안리 해수욕장" },
        { name: "부산 자갈치 축제", tag: "10월", desc: "수산물 요리 경연, 맨손 물고기 잡기 체험", extra: "자갈치시장 일대" },
      ],
    },
    해운대구: {
      맛집: [
        { name: "해운대 암소갈비집", tag: "갈비", desc: "해운대 대표 갈비, 50년 한우 숯불 구이 명가", rating: "4.7", extra: "해운대구 좌동" },
        { name: "원조 할매 국밥", tag: "돼지국밥", desc: "60년 전통 부산 돼지국밥, 진한 사골 육수", rating: "4.7", extra: "해운대구 우동" },
        { name: "해운대 전통시장 회", tag: "회", desc: "해운대 재래시장 2층 활어회 센터, 합리적 가격", rating: "4.5", extra: "해운대구 해운대시장" },
      ],
      명소: [
        { name: "해운대 해수욕장", tag: "해변", desc: "국내 최대 해수욕장, 마린시티 야경과 함께", rating: "4.6", extra: "해운대구 중동" },
        { name: "동백섬", tag: "섬·산책", desc: "누리마루 APEC 하우스와 동백꽃 산책로", rating: "4.5", extra: "해운대구 우동" },
        { name: "해운대 블루라인파크", tag: "열차", desc: "해안 절벽 레일 위를 달리는 해변 열차", rating: "4.6", extra: "해운대구 청사포" },
      ],
      축제: [
        { name: "해운대 모래 축제", tag: "5월", desc: "세계 최대 규모 모래 조각 전시 축제", extra: "해운대 해수욕장" },
        { name: "부산 불꽃 축제", tag: "10월", desc: "광안대교 배경 초대형 불꽃쇼 최고 뷰 포인트", extra: "해운대 해수욕장" },
        { name: "부산국제영화제", tag: "10월", desc: "영화의전당 야외 상영과 GV 행사 메인 회장", extra: "해운대 영화의전당" },
      ],
    },
    중구: {
      맛집: [
        { name: "자갈치시장", tag: "해산물", desc: "부산 최대 수산시장, 신선한 활어회 현장 구매", rating: "4.6", extra: "중구 남포동" },
        { name: "부평 깡통시장", tag: "야시장", desc: "부산 야시장의 원조, 다국적 야식 먹거리 천국", rating: "4.4", extra: "중구 부평동" },
        { name: "남포동 씨앗호떡", tag: "호떡", desc: "부산 명물 씨앗이 가득 든 남포동 호떡", rating: "4.5", extra: "중구 광복동" },
      ],
      명소: [
        { name: "용두산 공원·부산타워", tag: "전망", desc: "부산 도심 한복판 120m 타워, 항구 파노라마 뷰", rating: "4.4", extra: "중구 광복동" },
        { name: "BIFF 광장", tag: "영화·문화", desc: "부산국제영화제 핵심 거리, 핸드프린팅 명패", rating: "4.3", extra: "중구 남포동" },
        { name: "40계단 문화관광 테마거리", tag: "역사", desc: "6.25 피란민 애환이 서린 부산 역사 거리", rating: "4.2", extra: "중구 동광동" },
      ],
      축제: [
        { name: "자갈치 축제", tag: "10월", desc: "수산물 요리 경연과 맨손 물고기 잡기 체험", extra: "자갈치 일대" },
        { name: "남포동 빛 축제", tag: "12월", desc: "광복로 크리스마스 조명과 겨울 문화 행사", extra: "광복로 일대" },
        { name: "영도다리 도개 행사", tag: "상시", desc: "역사적 영도다리 도개 시연과 해설 행사", extra: "영도대교 일대" },
      ],
    },
    사하구: {
      맛집: [
        { name: "감천 할매 칼국수", tag: "칼국수", desc: "감천문화마을 골목 안 손칼국수 노포", rating: "4.4", extra: "사하구 감천동" },
        { name: "다대포 조개구이 거리", tag: "조개구이", desc: "다대포 해수욕장 인근 신선 조개 직화 구이", rating: "4.5", extra: "사하구 다대동" },
        { name: "을숙도 갈매기집", tag: "해산물", desc: "낙동강 하구 을숙도 인근 신선 해산물 백반", rating: "4.3", extra: "사하구 하단동" },
      ],
      명소: [
        { name: "감천문화마을", tag: "마을·예술", desc: "알록달록 계단식 마을, 부산의 마추픽추", rating: "4.7", extra: "사하구 감천2동" },
        { name: "다대포 해수욕장", tag: "해변", desc: "낙조 명소, 국내 최대 음악 분수 야간 공연", rating: "4.5", extra: "사하구 다대동" },
        { name: "몰운대", tag: "절경", desc: "안개 속에 잠기는 절벽과 솔숲 해안 전망대", rating: "4.4", extra: "사하구 다대동" },
      ],
      축제: [
        { name: "다대포 낙조 축제", tag: "10월", desc: "다대포 해변 낙조와 음악 분수 콜라보 이벤트", extra: "다대포 해수욕장" },
        { name: "감천 빛 축제", tag: "12월", desc: "감천 골목 조명 설치 예술과 야간 마을 투어", extra: "감천문화마을" },
        { name: "을숙도 철새 축제", tag: "11월", desc: "낙동강 하구 철새 도래지 생태 축제", extra: "을숙도 일대" },
      ],
    },
  },
  서울: {
    전체: {
      맛집: [
        { name: "광장시장 빈대떡 골목", tag: "전통시장", desc: "100년 역사 시장의 녹두빈대떡과 마약김밥", rating: "4.6", extra: "종로구 예지동" },
        { name: "을지로 노가리 골목", tag: "노가리·호프", desc: "레트로 감성 골목, 황태·노가리와 생맥주", rating: "4.5", extra: "중구 을지로" },
        { name: "이태원 경리단길", tag: "이국적", desc: "세계 각국 음식이 밀집한 다국적 미식 거리", rating: "4.4", extra: "용산구 이태원동" },
      ],
      명소: [
        { name: "경복궁", tag: "궁궐", desc: "조선 최대 법궁, 한복 입고 야간 특별 개방 체험", rating: "4.8", extra: "종로구 세종로" },
        { name: "북촌 한옥마을", tag: "한옥", desc: "600년 역사의 한옥 골목과 공방 탐방", rating: "4.6", extra: "종로구 계동" },
        { name: "서울 하늘공원", tag: "자연", desc: "억새가 넘실대는 하늘 위 공원, 한강 파노라마", rating: "4.7", extra: "마포구 상암동" },
      ],
      축제: [
        { name: "서울빛초롱축제", tag: "11월", desc: "청계천을 수놓는 한국 전통 등불 축제", extra: "청계천 일대" },
        { name: "서울재즈페스티벌", tag: "5월", desc: "국내외 정상급 재즈 뮤지션 라이브 공연", extra: "올림픽공원" },
        { name: "한강 봄꽃 축제", tag: "4월", desc: "여의도 벚꽃길과 윤중로 봄꽃 산책", extra: "여의도 한강공원" },
      ],
    },
    종로구: {
      맛집: [
        { name: "광장시장 빈대떡·마약김밥", tag: "전통시장", desc: "100년 역사 시장, 녹두 빈대떡과 참기름 마약김밥", rating: "4.6", extra: "종로구 예지동" },
        { name: "인사동 쌈지길 먹거리", tag: "전통 간식", desc: "호떡·엿·뻥튀기 등 전통 간식 집결지", rating: "4.3", extra: "종로구 관훈동" },
        { name: "삼청동 수제비", tag: "수제비", desc: "삼청동 골목 50년 수제비 명가, 칼국수도 인기", rating: "4.5", extra: "종로구 삼청동" },
      ],
      명소: [
        { name: "경복궁", tag: "궁궐", desc: "조선 정궁, 야간 개방과 한복 체험 필수 코스", rating: "4.8", extra: "종로구 세종로" },
        { name: "북촌 한옥마을", tag: "한옥", desc: "600년 역사 한옥 골목, 공방과 갤러리 산책", rating: "4.6", extra: "종로구 계동·가회동" },
        { name: "창덕궁 후원", tag: "궁궐·정원", desc: "유네스코 세계문화유산, 비밀정원 가이드 투어", rating: "4.7", extra: "종로구 와룡동" },
      ],
      축제: [
        { name: "인사동 거리 예술 축제", tag: "4~5월", desc: "인사동 전통 문화·공예·공연 봄 거리 축제", extra: "인사동 문화거리" },
        { name: "서울빛초롱축제", tag: "11월", desc: "청계천 전통 등불 점등과 한국 문화 퍼포먼스", extra: "청계천 광장~광교" },
        { name: "경복궁 별빛야행", tag: "7~9월", desc: "야간 경복궁 특별 해설 투어와 국악 공연", extra: "경복궁 내" },
      ],
    },
    마포구: {
      맛집: [
        { name: "홍대 상수 양고기 골목", tag: "양고기", desc: "홍대·상수 MZ 핫플, 양꼬치와 양갈비 전문 밀집", rating: "4.4", extra: "마포구 상수동" },
        { name: "연남동 포케 거리", tag: "이국적", desc: "연남동 감성 맛집 거리, 포케·타코·브런치 카페", rating: "4.3", extra: "마포구 연남동" },
        { name: "마포 돼지갈비 거리", tag: "갈비", desc: "마포역 인근 50년 전통 돼지갈비 골목", rating: "4.6", extra: "마포구 공덕동" },
      ],
      명소: [
        { name: "서울 하늘공원", tag: "자연", desc: "난지천 위 억새밭, 한강과 서울 스카이라인 뷰", rating: "4.7", extra: "마포구 상암동" },
        { name: "경의선 숲길", tag: "산책", desc: "폐철길을 공원으로 변신, 홍대~공덕 6.3km 산책로", rating: "4.5", extra: "마포구 일대" },
        { name: "홍대 거리", tag: "문화·예술", desc: "인디 음악·미술·패션의 성지, 버스킹과 갤러리", rating: "4.4", extra: "마포구 서교동" },
      ],
      축제: [
        { name: "홍대 거리 예술 축제", tag: "5월", desc: "홍대 거리 버스킹과 인디 밴드 공연 페스티벌", extra: "홍대 걷고싶은거리" },
        { name: "서울 재즈 페스티벌", tag: "5월", desc: "국내외 재즈 뮤지션 모여드는 야외 음악 축제", extra: "올림픽공원" },
        { name: "월드컵공원 억새 축제", tag: "10월", desc: "하늘공원 억새 물결과 노을 포토 이벤트", extra: "상암 하늘공원" },
      ],
    },
  },
};

// Fallback for regions not fully detailed
function getInfoItems(region: string, city: string, category: InfoCategory): InfoItem[] {
  const regionData = INFO_DATA[region];
  if (!regionData) return [];
  const cityData = regionData[city] ?? regionData["전체"];
  if (!cityData) return regionData["전체"]?.[category] ?? [];
  return cityData[category] ?? [];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CalendarPicker({
  selected,
  onSelect,
}: {
  selected: [Date | null, Date | null];
  onSelect: (range: [Date | null, Date | null]) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

  function handleDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const [start, end] = selected;
    if (!start || (start && end)) { onSelect([d, null]); }
    else { if (d < start) onSelect([d, start]); else onSelect([start, d]); }
  }
  function isInRange(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const [start, end] = selected;
    const effectiveEnd = end || hovered;
    if (!start || !effectiveEnd) return false;
    const lo = start < effectiveEnd ? start : effectiveEnd;
    const hi = start < effectiveEnd ? effectiveEnd : start;
    return d > lo && d < hi;
  }
  const isStart = (day: number) => selected[0]?.toDateString() === new Date(viewYear, viewMonth, day).toDateString();
  const isEnd = (day: number) => selected[1]?.toDateString() === new Date(viewYear, viewMonth, day).toDateString();
  function prevMonth() { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); }
  function nextMonth() { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); }

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-50 text-slate-500 transition-colors">‹</button>
        <span className="font-semibold text-slate-700 text-sm">{viewYear}년 {monthNames[viewMonth]}</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-50 text-slate-500 transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekdays.map(w => <div key={w} className="text-center text-[10px] font-medium text-slate-400 py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const start = isStart(day); const end = isEnd(day); const inRange = isInRange(day);
          const d = new Date(viewYear, viewMonth, day);
          const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <button key={day} disabled={isPast}
              onClick={() => handleDay(day)}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              className={["h-7 w-full rounded text-xs font-medium transition-colors",
                isPast ? "text-slate-300 cursor-not-allowed" : "cursor-pointer",
                start||end ? "bg-blue-600 text-white" : "",
                inRange ? "bg-blue-100 text-blue-700" : "",
                !start&&!end&&!inRange&&!isPast ? "hover:bg-blue-50 text-slate-600" : "",
              ].join(" ")}
            >{day}</button>
          );
        })}
      </div>
      {(selected[0]||selected[1]) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {selected[0] ? `${selected[0].getMonth()+1}/${selected[0].getDate()}` : "—"}
            {" "}<span className="text-blue-400">→</span>{" "}
            {selected[1] ? `${selected[1].getMonth()+1}/${selected[1].getDate()}` : "?"}
          </span>
          {selected[0]&&selected[1]&&(
            <span className="text-xs font-medium text-blue-600">
              {Math.ceil((selected[1].getTime()-selected[0].getTime())/86400000)+1}일
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const MIN_WIDTH = 260;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 288;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "bot", text: "안녕하세요! 여행 계획 도우미입니다 ✈️\n어떤 여행을 꿈꾸고 계신가요? 원하시는 여행 스타일이나 목적지를 알려주세요.", time: "지금" },
  ]);
  const [input, setInput] = useState("");
  const [showPlanPanel, setShowPlanPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>("region");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["healing"]);
  const [planRegion, setPlanRegion] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [transport, setTransport] = useState<string | null>(null);
  const [activeHistory, setActiveHistory] = useState<number | null>(null);

  // Right panel
  const [infoRegion, setInfoRegion] = useState<string>("제주");
  const [infoCity, setInfoCity] = useState<string>("전체");
  const [infoCategory, setInfoCategory] = useState<InfoCategory>("명소");
  const [rightWidth, setRightWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset city when region changes
  useEffect(() => {
    setInfoCity("전체");
  }, [infoRegion]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = rightWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [rightWidth]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setRightWidth(newWidth);
    }
    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text, time }]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now()+1, role: "bot", text: "좋은 여행 계획이네요! 아래 '계획 수립' 버튼을 눌러 세부 옵션을 설정해보세요. 지역, 날짜, 여행 스타일, 이동 수단을 선택하시면 맞춤 일정을 추천해드릴게요.", time }]);
    }, 900);
  }

  function toggleCategory(id: string) {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c=>c!==id) : [...prev, id]);
  }

  const infoItems = getInfoItems(infoRegion, infoCity, infoCategory);
  const cities = REGION_CITIES[infoRegion] ?? [];
  const categoryIcons: Record<InfoCategory, string> = { 맛집: "🍽️", 명소: "🗺️", 축제: "🎉" };
  const tabs: { id: PlanTab; label: string }[] = [
    { id: "region", label: "지역" },
    { id: "date", label: "날짜" },
    { id: "style", label: "여행 스타일" },
    { id: "transport", label: "이동 수단" },
  ];

  const isWide = rightWidth > 380;

  return (
    <div className="h-full flex bg-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-blue-600 text-lg">✈️</span>
            <span className="font-bold text-slate-800 text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>TripPlan AI</span>
          </div>
          <p className="text-xs text-slate-400">AI 여행 계획 도우미</p>
        </div>
        <div className="px-4 py-3">
          <button className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
            <span className="text-base leading-none">+</span> 새 여행 계획
          </button>
        </div>
        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">최근 계획</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {HISTORY.map(item => (
            <button key={item.id} onClick={() => setActiveHistory(item.id)}
              className={["w-full text-left px-3 py-2.5 rounded-lg transition-colors border",
                activeHistory===item.id ? "bg-blue-50 border-blue-200" : "hover:bg-white border-transparent",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-1">
                <p className={["text-xs font-semibold leading-snug", activeHistory===item.id ? "text-blue-700" : "text-slate-700"].join(" ")}>{item.title}</p>
                <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{item.date.slice(5)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.preview}</p>
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">K</div>
            <div>
              <p className="text-xs font-medium text-slate-700">김여행</p>
              <p className="text-[10px] text-slate-400">프리미엄 플랜</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Center */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h1 className="font-bold text-slate-800 text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>여행 계획 수립</h1>
            <p className="text-xs text-slate-400">AI와 함께 나만의 완벽한 여행을 계획하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-slate-500">AI 온라인</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={["flex gap-3", msg.role==="user" ? "flex-row-reverse" : ""].join(" ")}>
              {msg.role==="bot" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✈</div>
              )}
              <div className={["max-w-[72%] flex flex-col gap-1", msg.role==="user" ? "items-end" : "items-start"].join(" ")}>
                <div className={["px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
                  msg.role==="user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm",
                ].join(" ")}>{msg.text}</div>
                <span className="text-[10px] text-slate-400">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Plan Panel */}
        {showPlanPanel && (
          <div className="mx-6 mb-3 border border-blue-200 rounded-2xl bg-blue-50/60 overflow-hidden shadow-sm">
            <div className="flex border-b border-blue-100 bg-white">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={["flex-1 py-2.5 text-xs font-medium transition-colors",
                    activeTab===tab.id ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-slate-500 hover:text-slate-700",
                  ].join(" ")}>{tab.label}</button>
              ))}
            </div>
            <div className="p-4">
              {activeTab==="region" && (
                <div>
                  <p className="text-xs text-slate-500 mb-3">여행하실 지역을 선택하세요</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PLAN_REGIONS.map(r => (
                      <button key={r} onClick={() => setPlanRegion(r)}
                        className={["py-2 rounded-lg text-sm font-medium border transition-colors",
                          planRegion===r ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600",
                        ].join(" ")}>{r}</button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab==="date" && <CalendarPicker selected={dateRange} onSelect={setDateRange} />}
              {activeTab==="style" && (
                <div>
                  <p className="text-xs text-slate-500 mb-3">관심 있는 여행 스타일을 선택하세요 (복수 선택)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                        className={["flex flex-col items-center gap-1 py-3 rounded-xl border transition-all text-center",
                          selectedCategories.includes(cat.id) ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                        ].join(" ")}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-[11px] font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab==="transport" && (
                <div>
                  <p className="text-xs text-slate-500 mb-4">이동 수단을 선택하세요</p>
                  <div className="flex gap-3">
                    {TRANSPORTS.map(t => (
                      <button key={t.id} onClick={() => setTransport(t.id)}
                        className={["flex-1 py-4 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-2",
                          transport===t.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                        ].join(" ")}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {planRegion && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{planRegion}</span>}
                  {dateRange[0] && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{dateRange[0].getMonth()+1}/{dateRange[0].getDate()}{dateRange[1]?`~${dateRange[1].getMonth()+1}/${dateRange[1].getDate()}`:""}</span>}
                  {selectedCategories.length>0 && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{CATEGORIES.find(c=>c.id===selectedCategories[0])?.label}{selectedCategories.length>1?` 외 ${selectedCategories.length-1}`:""}</span>}
                  {transport && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{TRANSPORTS.find(t=>t.id===transport)?.label}</span>}
                </div>
                <button onClick={() => {
                  setShowPlanPanel(false);
                  const parts: string[] = [];
                  if (planRegion) parts.push(`📍 ${planRegion}`);
                  if (dateRange[0]) parts.push(`📅 ${dateRange[0].getMonth()+1}/${dateRange[0].getDate()}${dateRange[1]?`~${dateRange[1].getMonth()+1}/${dateRange[1].getDate()}`:""}`);
                  if (selectedCategories.length) parts.push(`🎒 ${selectedCategories.map(id=>CATEGORIES.find(c=>c.id===id)?.label).join(", ")}`);
                  if (transport) parts.push(`${TRANSPORTS.find(t=>t.id===transport)?.icon} ${TRANSPORTS.find(t=>t.id===transport)?.label}`);
                  const summary = parts.length ? parts.join(" · ") : "기본 옵션";
                  const now = new Date();
                  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
                  setMessages(prev => [...prev, { id: Date.now(), role: "user", text: `계획 수립 요청:\n${summary}`, time }]);
                  setTimeout(() => {
                    setMessages(prev => [...prev, { id: Date.now()+1, role: "bot", text: `선택하신 옵션으로 맞춤 여행 일정을 준비하고 있습니다! 🗺️\n\n${summary}\n\n잠시 후 최적의 여행 코스를 추천해드릴게요.`, time }]);
                  }, 800);
                }} className="shrink-0 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  적용하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
                placeholder="여행에 대해 자유롭게 이야기해주세요..."
                rows={1}
                className="w-full px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none bg-transparent"
                style={{ minHeight: 44, maxHeight: 120 }}
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
                <button onClick={() => setShowPlanPanel(prev => !prev)}
                  className={["flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                    showPlanPanel ? "bg-blue-600 text-white border-blue-600" : "border-blue-200 text-blue-600 hover:bg-blue-50",
                  ].join(" ")}
                >
                  <span>🗺️</span> 계획 수립 <span className="opacity-60 text-[10px]">{showPlanPanel ? "▲" : "▼"}</span>
                </button>
                <span className="text-[10px] text-slate-400">Enter로 전송</span>
              </div>
            </div>
            <button onClick={sendMessage} disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-px"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 flex-shrink-0 bg-slate-100 hover:bg-blue-300 cursor-col-resize transition-colors relative group"
        title="드래그하여 패널 크기 조절"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {[0,1,2].map(i => <div key={i} className="w-0.5 h-1.5 bg-blue-400 rounded-full" />)}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside
        className="flex-shrink-0 border-l border-slate-100 flex flex-col bg-white overflow-hidden"
        style={{ width: rightWidth }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>지역 정보 검색</h2>
            <p className="text-xs text-slate-400 mt-0.5">지역·도시·카테고리 선택</p>
          </div>
          <div className="text-[10px] text-slate-300 select-none">⟺ 드래그</div>
        </div>

        {/* Region selector */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">지역</p>
          <div className={["grid gap-1.5", isWide ? "grid-cols-4" : "grid-cols-4"].join(" ")}>
            {PLAN_REGIONS.map(r => (
              <button key={r} onClick={() => setInfoRegion(r)}
                className={["py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  infoRegion===r ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                ].join(" ")}>{r}</button>
            ))}
          </div>
        </div>

        {/* City selector */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">시·군·구</p>
          <div className={["grid gap-1.5", isWide ? "grid-cols-3" : "grid-cols-2"].join(" ")}>
            <button
              onClick={() => setInfoCity("전체")}
              className={["py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors text-left",
                infoCity==="전체" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
              ].join(" ")}
            >전체</button>
            {cities.map(city => (
              <button key={city.name} onClick={() => setInfoCity(city.name)}
                className={["py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors text-left leading-tight",
                  infoCity===city.name ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                ].join(" ")}
              >
                <span className="block">{city.name}</span>
                {isWide && <span className={["text-[9px] mt-0.5 block truncate", infoCity===city.name ? "text-blue-200" : "text-slate-400"].join(" ")}>{city.desc}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">카테고리</p>
          <div className="flex gap-2">
            {(["맛집","명소","축제"] as InfoCategory[]).map(cat => (
              <button key={cat} onClick={() => setInfoCategory(cat)}
                className={["flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border transition-colors",
                  infoCategory===cat ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                ].join(" ")}
              >
                <span>{categoryIcons[cat]}</span>{cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-600">
              {infoRegion}{infoCity!=="전체" ? ` · ${infoCity}` : ""} · {infoCategory}
            </p>
            <span className="text-[10px] text-slate-400">{infoItems.length}개</span>
          </div>
          {infoItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs text-slate-400">해당 도시의 정보를<br />준비 중입니다</p>
            </div>
          ) : (
            infoItems.map((item, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3.5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors leading-snug">{item.name}</p>
                  {item.rating && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs font-medium text-slate-600">{item.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium">{item.tag}</span>
                  {item.extra && <span className="text-[10px] text-slate-400 truncate">{item.extra}</span>}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">카드를 클릭해 계획에 추가하세요</p>
        </div>
      </aside>
    </div>
  );
}
