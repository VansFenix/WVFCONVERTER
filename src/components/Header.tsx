import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { ipInfo } from "../lib/net";
import { ACCENTS, applyTheme, loadTheme, saveTheme, type ThemeState } from "../lib/theme";
import { cn } from "../utils/cn";
import { Icon } from "./ui";

export type TabId = "converter" | "naming" | "parser" | "qr" | "urldec" | "youtube";

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "converter", label: "Конвертер", icon: "bolt" },
  { id: "naming", label: "Именование", icon: "wand" },
  { id: "parser", label: "Парсер", icon: "globe" },
  { id: "qr", label: "QR", icon: "sparkles" },
  { id: "urldec", label: "Декрипт", icon: "code" },
  { id: "youtube", label: "YouTube", icon: "download" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <a href="#top" className={cn("group flex items-center gap-2.5", className)}>
      <span className="accent-bg relative flex h-9 w-9 items-center justify-center rounded-xl shadow-lg">
        <span className="accent-bg absolute inset-0 rounded-xl opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <svg viewBox="0 0 64 64" className="relative h-5 w-5">
          <path
            d="M12 20l7 24 13-24 13 24 7-24"
            fill="none"
            stroke="white"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[15px] font-bold tracking-[0.14em] text-white sm:text-base">
        WVF<span className="text-gradient">CONVERTER</span>
      </span>
    </a>
  );
}

function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeState>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const custom = theme.custom ?? { a1: "#8b5cf6", a2: "#c084fc", a3: "#22d3ee" };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Тема"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <span className="accent-bg h-4 w-4 rounded-full" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 z-50 mt-2 w-[19rem] rounded-2xl border border-white/12 bg-[#080a18]/97 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl"
            >
              <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Акцент · градиенты
              </div>
              <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    title={a.name}
                    onClick={() => setTheme({ ...theme, accent: a.id, custom: null })}
                    className={cn(
                      "h-10 rounded-xl ring-2 transition-transform hover:scale-105",
                      theme.accent === a.id && !theme.custom
                        ? "ring-white/70"
                        : "ring-white/10"
                    )}
                    style={{ background: `linear-gradient(120deg, ${a.a1}, ${a.a2}, ${a.a3})` }}
                  />
                ))}
              </div>

              <div className="mt-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Свои цвета
              </div>
              <div className="mt-2 flex items-center gap-2">
                {(["a1", "a2", "a3"] as const).map((k) => (
                  <input
                    key={k}
                    type="color"
                    value={custom[k]}
                    onChange={(e) =>
                      setTheme({ ...theme, custom: { ...custom, [k]: e.target.value } })
                    }
                    className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent"
                  />
                ))}
                <button
                  onClick={() => setTheme({ ...theme, custom: null })}
                  className="shrink-0 rounded-lg bg-white/5 px-2 py-2 text-[10px] text-slate-300 ring-1 ring-white/10"
                >
                  сброс
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Контраст <span className="text-slate-500">{theme.contrast}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={140}
                value={theme.contrast}
                onChange={(e) => setTheme({ ...theme, contrast: Number(e.target.value) })}
                className="mt-1 w-full"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Header({
  tab,
  setTab,
}: {
  tab: TabId;
  setTab: (t: TabId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [ip, setIp] = useState<string>("…");
  const [hideIp, setHideIp] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 24));

  useEffect(() => {
    applyTheme(loadTheme());
    ipInfo()
      .then((i) => setIp(`${i.flag || ""} ${i.ip}`))
      .catch(() => setIp("скрыт"));
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div style={{ scaleX: scrollYProgress }} className="accent-bg h-0.5 origin-left" />
      <div
        className={cn(
          "transition-all duration-500",
          solid ? "border-b border-white/10 bg-[#06070f]/85 backdrop-blur-xl" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />

          <nav className="no-scrollbar hidden items-center gap-1 overflow-x-auto md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  tab === t.id ? "text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/12"
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-slate-400 ring-1 ring-white/10 lg:inline-flex">
              IP: <span className={cn(hideIp && "blur-[5px] select-none")}>{ip}</span>
              <button
                onClick={() => setHideIp((v) => !v)}
                title={hideIp ? "Показать IP" : "Скрыть IP"}
                className="text-slate-500 transition hover:text-white"
              >
                <Icon name="eye" className="h-3.5 w-3.5" />
              </button>
            </span>
            <a
              href="https://t.me/wildVF"
              target="_blank"
              rel="noopener noreferrer"
              title="Telegram — @wildVF"
              className="group hidden h-9 items-center gap-1.5 rounded-xl bg-white/5 px-2.5 text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white sm:flex"
            >
              <Icon name="telegram" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="hidden text-xs font-semibold lg:inline">@wildVF</span>
            </a>
            <ThemePicker />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Меню"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 md:hidden"
            >
              <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-2 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-white/10 bg-[#080a18]/97 p-2 backdrop-blur-xl md:hidden"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition",
                  tab === t.id ? "accent-soft border" : "text-slate-200 active:bg-white/5"
                )}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
            <a
              href="https://t.me/wildVF"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="accent-soft col-span-2 flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold"
            >
              <Icon name="telegram" className="h-4 w-4" />
              Telegram · @wildVF
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
