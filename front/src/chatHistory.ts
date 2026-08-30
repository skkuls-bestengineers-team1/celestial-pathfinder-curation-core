export type StoredMessage = {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
};

export type ChatSession = {
  id: string;
  title: string;
  preview: string;
  date: string;
  updatedAt: number;
  messages: StoredMessage[];
};

export const WELCOME_MESSAGE: StoredMessage = {
  id: 1,
  role: "bot",
  text: "안녕하세요! 여행 계획 도우미입니다 ✈️\n어떤 여행을 꿈꾸고 계신가요? 원하시는 여행 스타일이나 목적지를 알려주세요.",
  time: "지금",
};

const STORAGE_KEY = "tripplan.chat.sessions";
const ACTIVE_KEY = "tripplan.chat.activeId";

function formatDateLabel(timestamp: number) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export function createSession(messages: StoredMessage[] = [WELCOME_MESSAGE]): ChatSession {
  const now = Date.now();
  return {
    id: String(now),
    title: titleFromMessages(messages),
    preview: previewFromMessages(messages),
    date: formatDateLabel(now),
    updatedAt: now,
    messages,
  };
}

export function titleFromMessages(messages: StoredMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "새 여행 계획";
  const title = firstUser.text.replace(/\s+/g, " ").trim();
  return title.length > 28 ? `${title.slice(0, 28)}…` : title;
}

export function previewFromMessages(messages: StoredMessage[]) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const source = lastUser ?? messages[messages.length - 1];
  if (!source) return "";
  const preview = source.text.replace(/\s+/g, " ").trim();
  return preview.length > 36 ? `${preview.slice(0, 36)}…` : preview;
}

export function upsertSession(sessions: ChatSession[], session: ChatSession) {
  const next = sessions.filter((item) => item.id !== session.id);
  return [session, ...next].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];
    return dedupeSessions(
      parsed.filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages)),
    );
  } catch {
    return [];
  }
}

export function hasUserMessage(messages: StoredMessage[]) {
  return messages.some((message) => message.role === "user");
}

export function dedupeSessions(sessions: ChatSession[]) {
  const withUser = sessions.filter((session) => hasUserMessage(session.messages));
  const empty = sessions.find((session) => !hasUserMessage(session.messages));
  const merged = empty ? [empty, ...withUser] : withUser;
  return merged.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function loadActiveId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function refreshSession(session: ChatSession, messages: StoredMessage[]): ChatSession {
  const now = Date.now();
  return {
    ...session,
    title: titleFromMessages(messages),
    preview: previewFromMessages(messages),
    date: formatDateLabel(now),
    updatedAt: now,
    messages,
  };
}
