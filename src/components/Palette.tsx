import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { clearHistory, loadHistory, removeHistory, timeAgo, type HistoryItem } from "../lib/history";
import { cn } from "../utils/cn";
import { Icon, toast } from "./ui";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

export default function Palette({
  commands,
  onRestore,
}: {
  commands: Command[];
  onRestore: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setCursor(0);
        setHistory(loadHistory());
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setHistory(loadHistory());
    };
    window.addEventListener("wvf:palette", handler);
    return () => window.removeEventListener("wvf:palette", handler);
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cmds = commands
      .filter((c) => !q || c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q))
      .map((c) => ({ kind: "cmd" as const, cmd: c }));
    const hist = history
      .filter((h) => !q || h.preview.toLowerCase().includes(q) || h.label.toLowerCase().includes(q))
      .map((h) => ({ kind: "hist" as const, hist: h }));
    return [...cmds, ...hist];
  }, [commands, history, query]);

  useEffect(() => setCursor(0), [query]);

  const activate = (i: number) => {
    const item = items[i];
    if (!item) return;
    if (item.kind === "cmd") item.cmd.run();
    else {
      onRestore(item.hist.content);
      toast(`Восстановлено: ${item.hist.count} узлов`, "info");
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[96] flex items-start justify-center bg-black/70 p-3 pt-[12vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: -20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -12, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl shadow-black/70"
          >
            <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
              <Icon name="bolt" className="accent-text h-4 w-4" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, items.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  }
                  if (e.key === "Enter") activate(cursor);
                }}
                placeholder="Команда или запись истории…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <kbd className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">esc</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-slate-500">Ничего не найдено</div>
              )}

              {items.map((item, i) => (
                <button
                  key={item.kind === "cmd" ? item.cmd.id : item.hist.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => activate(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    cursor === i ? "bg-white/8" : "hover:bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      cursor === i ? "accent-bg text-white" : "bg-white/6 text-slate-300"
                    )}
                  >
                    <Icon name={item.kind === "cmd" ? item.cmd.icon : "clipboard"} className="h-4 w-4" />
                  </span>
                  {item.kind === "cmd" ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{item.cmd.label}</span>
                      {item.cmd.hint && (
                        <span className="block truncate text-[11px] text-slate-500">{item.cmd.hint}</span>
                      )}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {item.hist.label} · {item.hist.count} узлов
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-slate-500">
                        {timeAgo(item.hist.ts)} · {item.hist.preview}
                      </span>
                    </span>
                  )}
                  {item.kind === "hist" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistory(removeHistory(item.hist.id));
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10.5px] text-slate-500">
              <span className="flex gap-2">
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 font-mono">↑↓</kbd> навигация
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 font-mono">↵</kbd> выбрать
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory(clearHistory())}
                  className="text-rose-300/70 hover:text-rose-200"
                >
                  очистить историю
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
