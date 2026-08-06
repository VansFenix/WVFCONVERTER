export interface HistoryItem {
  id: string;
  ts: number;
  label: string;
  count: number;
  preview: string;
  content: string;
}

const KEY = "wvf-history";
const LIMIT = 12;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
  } catch {
    /* quota */
  }
}

export function pushHistory(content: string, count: number, label: string): HistoryItem[] {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 200_000) return loadHistory();
  const items = loadHistory();
  if (items[0]?.content === trimmed) return items;
  const item: HistoryItem = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    label,
    count,
    preview: trimmed.replace(/\s+/g, " ").slice(0, 90),
    content: trimmed,
  };
  const next = [item, ...items.filter((i) => i.content !== trimmed)].slice(0, LIMIT);
  saveHistory(next);
  return next;
}

export function removeHistory(id: string): HistoryItem[] {
  const next = loadHistory().filter((i) => i.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): HistoryItem[] {
  saveHistory([]);
  return [];
}

export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}
