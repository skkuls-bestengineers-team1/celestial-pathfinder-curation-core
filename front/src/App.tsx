import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  type ChatSession,
  type StoredMessage as Message,
  WELCOME_MESSAGE,
  createSession,
  hasUserMessage,
  loadActiveId,
  loadSessions,
  refreshSession,
  saveActiveId,
  saveSessions,
  upsertSession,
} from "./chatHistory";

type PlanTab = "region" | "date" | "style" | "transport";

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

const SEASONS = ["봄", "여름", "가을", "겨울"];
const DURATION_OPTIONS = [
  { label: "당일치기", nights: 0 },
  { label: "1박 2일", nights: 1 },
  { label: "2박 3일", nights: 2 },
  { label: "3박 4일", nights: 3 },
  { label: "4박 5일", nights: 4 },
];
const TRANSPORTS = [
  { id: "walk", label: "도보", icon: "🚶" },
  { id: "public", label: "대중교통", icon: "🚌" },
  { id: "car", label: "자차", icon: "🚗" },
];

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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function nowLabel() {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// 실제 /api/search가 요구하는 값들 — 데이터셋이 서울/2026년 7월치 뿐이라 고정.
const SEARCH_YEAR = "2026";
const SEARCH_MONTH = "07";
const SEARCH_AREA = "서울특별시";

const SEOUL_DISTRICTS_FULL = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
  "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
  "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
  "서초구", "강남구", "송파구", "강동구",
];

type CategoryCombo = { lcls: string; mcls: string; scls: string };

type SearchResultItem = {
  tAtsNm: string;
  signguNm: string;
  rlteTatsNm: string;
  rlteSignguNm: string;
  rlteCtgryLclsNm: string;
  rlteCtgryMclsNm: string;
  rlteCtgrySclsNm: string;
  rlteRank: number;
};

function BotMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h3 className="font-bold text-slate-800 mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="font-bold text-slate-800 mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="font-semibold text-slate-800 mt-2.5 mb-1 first:mt-0">{children}</h4>,
        strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{children}</a>,
        code: ({ children }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-[12px]">{children}</code>,
        hr: () => <hr className="my-2 border-slate-200" />,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-200 pl-2 text-slate-500 my-2">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-50 text-left">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPlanPanel, setShowPlanPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>("region");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["healing"]);
  const [planDistrict, setPlanDistrict] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<"calendar" | "season">("calendar");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [planSeason, setPlanSeason] = useState<string | null>(null);
  const [planNights, setPlanNights] = useState<number | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [activeHistory, setActiveHistory] = useState<string | null>(null);
  const historyReady = useRef(false);

  const [rightWidth, setRightWidth] = useState(DEFAULT_WIDTH);

  // 실제 /api/search 연동 — 대/중/소분류를 API에서 받아온 조합에서 단계적으로 필터링
  const [categoryCombos, setCategoryCombos] = useState<CategoryCombo[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [searchDistrict, setSearchDistrict] = useState(SEOUL_DISTRICTS_FULL[0]);
  const [searchLcls, setSearchLcls] = useState<string | null>(null);
  const [searchMcls, setSearchMcls] = useState<string | null>(null);
  const [searchScls, setSearchScls] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchTotalCount, setSearchTotalCount] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error(`카테고리 조회 실패 (${response.status})`);
        const data: { items: CategoryCombo[] } = await response.json();
        if (!cancelled) setCategoryCombos(data.items);
      } catch (error) {
        if (!cancelled) setCategoriesError(error instanceof Error ? error.message : "카테고리를 불러오지 못했어요.");
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const lclsOptions = Array.from(new Set(categoryCombos.map(c => c.lcls)));
  const mclsOptions = searchLcls
    ? Array.from(new Set(categoryCombos.filter(c => c.lcls === searchLcls).map(c => c.mcls)))
    : [];
  const sclsOptions = searchLcls && searchMcls
    ? Array.from(new Set(categoryCombos.filter(c => c.lcls === searchLcls && c.mcls === searchMcls).map(c => c.scls)))
    : [];

  function selectLcls(value: string) {
    setSearchLcls(value);
    setSearchMcls(null);
    setSearchScls(null);
  }
  function selectMcls(value: string) {
    setSearchMcls(value);
    setSearchScls(null);
  }

  async function runApiSearch() {
    if (!searchLcls || !searchMcls || !searchScls) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: SEARCH_YEAR,
          month: SEARCH_MONTH,
          areaNm: SEARCH_AREA,
          signguNm: searchDistrict,
          rlteCtgryLclsNm: searchLcls,
          rlteCtgryMclsNm: searchMcls,
          rlteCtgrySclsNm: searchScls,
          tAtsNm: "",
          page: 1,
          page_size: 10,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.detail ?? `서버 오류 (${response.status})`);
      }
      const data: { items: SearchResultItem[]; total_count: number } = await response.json();
      setSearchResults(data.items);
      setSearchTotalCount(data.total_count);
      setFiltersCollapsed(true);
    } catch (error) {
      setSearchResults([]);
      setSearchTotalCount(null);
      setSearchError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const stored = loadSessions();
    if (stored.length > 0) {
      const activeId = loadActiveId();
      const current = stored.find((item) => item.id === activeId) ?? stored[0];
      setSessions(stored);
      setActiveHistory(current.id);
      setMessages(current.messages.length ? current.messages : [WELCOME_MESSAGE]);
    } else {
      const created = createSession();
      setSessions([created]);
      setActiveHistory(created.id);
      setMessages(created.messages);
      saveSessions([created]);
      saveActiveId(created.id);
    }
    historyReady.current = true;
  }, []);

  useEffect(() => {
    if (!historyReady.current || !activeHistory) return;
    setSessions((prev) => {
      const current = prev.find((item) => item.id === activeHistory) ?? { ...createSession(messages), id: activeHistory };
      const updated = refreshSession({ ...current, id: activeHistory }, messages);
      const others = prev.filter((item) => item.id !== activeHistory);
      const keptOthers = hasUserMessage(updated.messages)
        ? others
        : others.filter((item) => hasUserMessage(item.messages));
      const next = upsertSession(keptOthers, updated);
      saveSessions(next);
      saveActiveId(activeHistory);
      return next;
    });
  }, [messages, activeHistory]);

  function startNewChat() {
    if (isSending) return;
    const current = sessions.find((item) => item.id === activeHistory);
    if (current && !hasUserMessage(current.messages)) {
      setMessages([WELCOME_MESSAGE]);
      setInput("");
      setShowPlanPanel(false);
      return;
    }
    const created = createSession();
    setSessions((prev) => upsertSession(prev, created));
    setActiveHistory(created.id);
    setMessages(created.messages);
    setInput("");
    setShowPlanPanel(false);
    saveActiveId(created.id);
  }

  function openChat(id: string) {
    if (isSending || id === activeHistory) return;
    const target = sessions.find((item) => item.id === id);
    if (!target) return;
    setActiveHistory(id);
    setMessages(target.messages.length ? target.messages : [WELCOME_MESSAGE]);
    setInput("");
    setShowPlanPanel(false);
    saveActiveId(id);
  }

  function deleteChat(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    if (isSending) return;
    const remaining = sessions.filter((item) => item.id !== id);
    if (remaining.length === 0) {
      const created = createSession();
      setSessions([created]);
      setActiveHistory(created.id);
      setMessages(created.messages);
      saveSessions([created]);
      saveActiveId(created.id);
      return;
    }
    setSessions(remaining);
    saveSessions(remaining);
    if (id === activeHistory) {
      setActiveHistory(remaining[0].id);
      setMessages(remaining[0].messages);
      saveActiveId(remaining[0].id);
    }
  }

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

  async function submitQuestion(text: string, options?: { isPlan?: boolean }) {
    if (!text.trim() || isSending) return;

    setMessages(prev => [...prev, { id: Date.now(), role: "user", text, time: nowLabel() }]);
    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.detail ?? `서버 오류가 발생했습니다 (${response.status})`);
      }

      const data: { answer: string } = await response.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: data.answer, time: nowLabel(), isPlan: options?.isPlan }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: `⚠️ 답변을 가져오지 못했어요: ${message}`, time: nowLabel() }]);
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await submitQuestion(text);
  }

  const messageContentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function downloadMessageAsPdf(messageId: number) {
    const node = messageContentRefs.current[messageId];
    if (!node) return;
    setDownloadingId(messageId);
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      pdf.save(`여행일정_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF 저장 실패:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`PDF 저장에 실패했어요: ${message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  function withRoParticle(word: string): string {
    const lastChar = word.charCodeAt(word.length - 1) - 0xAC00;
    if (lastChar < 0 || lastChar > 11171) return `${word}로`;
    const jong = lastChar % 28;
    return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
  }

  function buildPlanQuestion(): string {
    const parts: string[] = [];

    if (planDistrict) parts.push(`${planDistrict}로 여행을 가려고 해.`);

    if (dateMode === "calendar" && dateRange[0]) {
      const start = dateRange[0];
      const end = dateRange[1] ?? dateRange[0];
      const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
      parts.push(`${start.getMonth()+1}월 ${start.getDate()}일부터 ${nights}박 ${nights+1}일 일정이야.`);
    } else if (dateMode === "season" && planSeason) {
      if (planNights === 0) {
        parts.push(`${planSeason}에 당일치기로 갈 예정이야.`);
      } else if (planNights !== null) {
        parts.push(`${planSeason}에 ${planNights}박 ${planNights+1}일 일정으로 갈 예정이야.`);
      } else {
        parts.push(`${planSeason}에 갈 예정이야.`);
      }
    }

    if (selectedCategories.length) {
      const labels = selectedCategories.map(id => CATEGORIES.find(c=>c.id===id)?.label).filter(Boolean).join(", ");
      parts.push(`${labels} 스타일 여행을 원해.`);
    }

    if (transport) {
      const label = TRANSPORTS.find(t=>t.id===transport)?.label;
      if (label) parts.push(`이동은 ${withRoParticle(label)} 할 거야.`);
    }

    parts.push("이 조건으로 여행 일정을 짜줘.");
    return parts.join(" ");
  }

  function toggleCategory(id: string) {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c=>c!==id) : [...prev, id]);
  }

  const tabs: { id: PlanTab; label: string }[] = [
    { id: "region", label: "지역" },
    { id: "date", label: "날짜" },
    { id: "style", label: "여행 스타일" },
    { id: "transport", label: "이동 수단" },
  ];

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
          <button
            onClick={startNewChat}
            disabled={isSending}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">+</span> 새 여행 계획
          </button>
        </div>
        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">최근 계획</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-[11px] text-slate-400 text-center">아직 저장된 대화가 없습니다</p>
          ) : (
            sessions.map((item) => (
              <button
                key={item.id}
                onClick={() => openChat(item.id)}
                className={["w-full text-left px-3 py-2.5 rounded-lg transition-colors border group",
                  activeHistory===item.id ? "bg-blue-50 border-blue-200" : "hover:bg-white border-transparent",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className={["text-xs font-semibold leading-snug", activeHistory===item.id ? "text-blue-700" : "text-slate-700"].join(" ")}>{item.title}</p>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <span className="text-[10px] text-slate-400">{item.date.slice(5)}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => deleteChat(item.id, event)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") deleteChat(item.id, event as unknown as React.MouseEvent);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-[11px] leading-none px-0.5"
                      aria-label="대화 삭제"
                    >
                      ×
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.preview || "새 대화"}</p>
              </button>
            ))
          )}
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
            <h1 className="font-bold text-slate-800 text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {sessions.find((item) => item.id === activeHistory)?.title || "여행 계획 수립"}
            </h1>
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
                <div
                  ref={msg.role==="bot" ? (el => { messageContentRefs.current[msg.id] = el; }) : undefined}
                  className={["px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    msg.role==="user" ? "bg-blue-600 text-white rounded-tr-sm whitespace-pre-line" : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm",
                  ].join(" ")}>
                  {msg.role==="bot" ? <BotMarkdown text={msg.text} /> : msg.text}
                </div>
                {msg.isPlan && (
                  <button
                    onClick={() => downloadMessageAsPdf(msg.id)}
                    disabled={downloadingId===msg.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 text-[11px] font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>📄</span>{downloadingId===msg.id ? "PDF 생성 중..." : "PDF로 저장"}
                  </button>
                )}
                <span className="text-[10px] text-slate-400">{msg.time}</span>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">✈</div>
              <div className="max-w-[72%] flex flex-col gap-1 items-start">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm">
                  답변을 작성하고 있어요...
                </div>
              </div>
            </div>
          )}
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
                  <p className="text-xs text-slate-500 mb-3">여행하실 구를 선택하세요</p>
                  <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                    {SEOUL_DISTRICTS_FULL.map(r => (
                      <button key={r} onClick={() => setPlanDistrict(r)}
                        className={["py-2 rounded-lg text-sm font-medium border transition-colors",
                          planDistrict===r ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600",
                        ].join(" ")}>{r}</button>
                    ))}
                  </div>
                </div>
              )}
              {activeTab==="date" && (
                <div>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setDateMode("calendar")}
                      className={["flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        dateMode==="calendar" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300",
                      ].join(" ")}>특정 날짜</button>
                    <button onClick={() => setDateMode("season")}
                      className={["flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        dateMode==="season" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300",
                      ].join(" ")}>계절만</button>
                  </div>
                  {dateMode==="calendar" ? (
                    <CalendarPicker selected={dateRange} onSelect={setDateRange} />
                  ) : (
                    <div>
                      <p className="text-[11px] text-slate-400 mb-2">계절</p>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {SEASONS.map(s => (
                          <button key={s} onClick={() => setPlanSeason(s)}
                            className={["py-2 rounded-lg text-sm font-medium border transition-colors",
                              planSeason===s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600",
                            ].join(" ")}>{s}</button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">여행 기간</p>
                      <div className="grid grid-cols-3 gap-2">
                        {DURATION_OPTIONS.map(d => (
                          <button key={d.label} onClick={() => setPlanNights(d.nights)}
                            className={["py-2 rounded-lg text-xs font-medium border transition-colors",
                              planNights===d.nights ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600",
                            ].join(" ")}>{d.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  {planDistrict && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{planDistrict}</span>}
                  {dateMode==="calendar" && dateRange[0] && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{dateRange[0].getMonth()+1}/{dateRange[0].getDate()}{dateRange[1]?`~${dateRange[1].getMonth()+1}/${dateRange[1].getDate()}`:""}</span>}
                  {dateMode==="season" && planSeason && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{planSeason}{planNights!==null ? (planNights===0 ? " · 당일치기" : ` · ${planNights}박 ${planNights+1}일`) : ""}</span>}
                  {selectedCategories.length>0 && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{CATEGORIES.find(c=>c.id===selectedCategories[0])?.label}{selectedCategories.length>1?` 외 ${selectedCategories.length-1}`:""}</span>}
                  {transport && <span className="bg-white border border-blue-200 text-blue-600 text-[11px] px-2 py-0.5 rounded-full">{TRANSPORTS.find(t=>t.id===transport)?.label}</span>}
                </div>
                <button onClick={() => {
                  setShowPlanPanel(false);
                  submitQuestion(buildPlanQuestion(), { isPlan: true });
                }} disabled={isSending} className="shrink-0 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
                onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey&&!isSending){e.preventDefault();sendMessage();} }}
                placeholder="여행에 대해 자유롭게 이야기해주세요..."
                disabled={isSending}
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
            <button onClick={sendMessage} disabled={!input.trim() || isSending}
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

      {/* Right Sidebar — 실제 /api/search 연동 */}
      <aside
        className="flex-shrink-0 border-l border-slate-100 flex flex-col bg-white overflow-hidden"
        style={{ width: rightWidth }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>지역 정보 검색</h2>
            <p className="text-xs text-slate-400 mt-0.5">구 · 대/중/소분류 선택 (실제 DB 검색)</p>
          </div>
          {(searchTotalCount !== null || searchResults.length > 0) && (
            <button
              onClick={() => setFiltersCollapsed(prev => !prev)}
              className="text-[10px] px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 font-medium transition-colors shrink-0"
            >{filtersCollapsed ? "필터 펼치기 ▾" : "필터 접기 ▴"}</button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {filtersCollapsed ? (
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[11px] px-2 py-0.5 rounded-full">{searchDistrict}</span>
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[11px] px-2 py-0.5 rounded-full">{searchLcls} &gt; {searchMcls} &gt; {searchScls}</span>
            </div>
            <button onClick={() => setFiltersCollapsed(false)} className="shrink-0 text-[11px] text-blue-600 font-medium hover:underline">수정</button>
          </div>
        ) : (
          <>
            {/* 구 선택 */}
            <div className="px-4 pt-3 pb-3 border-b border-slate-50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">구</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SEOUL_DISTRICTS_FULL.map(d => (
                  <button key={d} onClick={() => setSearchDistrict(d)}
                    className={["py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                      searchDistrict===d ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                    ].join(" ")}>{d}</button>
                ))}
              </div>
            </div>

            {categoriesLoading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">카테고리 불러오는 중...</div>
            ) : categoriesError ? (
              <div className="px-4 py-3 text-xs text-red-500 bg-red-50 border-b border-red-100">⚠️ {categoriesError}</div>
            ) : (
              <>
                {/* 대분류 */}
                <div className="px-4 pt-3 pb-3 border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">대분류</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lclsOptions.map(v => (
                      <button key={v} onClick={() => selectLcls(v)}
                        className={["px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          searchLcls===v ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                        ].join(" ")}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* 중분류 */}
                <div className="px-4 pt-3 pb-3 border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">중분류</p>
                  {!searchLcls ? (
                    <p className="text-[11px] text-slate-400">대분류를 먼저 선택하세요</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {mclsOptions.map(v => (
                        <button key={v} onClick={() => selectMcls(v)}
                          className={["px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            searchMcls===v ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                          ].join(" ")}>{v}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 소분류 */}
                <div className="px-4 pt-3 pb-3 border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">소분류</p>
                  {!searchMcls ? (
                    <p className="text-[11px] text-slate-400">중분류를 먼저 선택하세요</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {sclsOptions.map(v => (
                        <button key={v} onClick={() => setSearchScls(v)}
                          className={["px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            searchScls===v ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200 hover:text-blue-600",
                          ].join(" ")}>{v}</button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="px-4 pb-3">
              <button onClick={runApiSearch} disabled={isSearching || !searchLcls || !searchMcls || !searchScls}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isSearching ? "검색 중..." : "검색"}
              </button>
            </div>
          </>
        )}

        {/* Results */}
        <div className="px-4 py-3 space-y-2.5">
          {searchError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-3">⚠️ {searchError}</div>
          )}
          {!searchError && searchTotalCount !== null && (
            <p className="text-xs text-slate-500 mb-1">총 {searchTotalCount}건</p>
          )}
          {!searchError && searchTotalCount === null && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs text-slate-400">구·대분류·중분류·소분류를<br />모두 선택하고 검색해보세요</p>
            </div>
          )}
          {searchResults.map((item, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-3.5 hover:border-blue-200 hover:shadow-sm transition-all">
              <p className="text-sm font-semibold text-slate-800">{item.rlteTatsNm}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.rlteSignguNm} · {item.rlteCtgrySclsNm} · 연관순위 {item.rlteRank}</p>
              <p className="text-[10px] text-slate-400 mt-1">기준 관광지: {item.tAtsNm} ({item.signguNm})</p>
            </div>
          ))}
        </div>
        </div>
      </aside>
    </div>
  );
}
