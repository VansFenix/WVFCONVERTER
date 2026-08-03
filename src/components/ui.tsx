import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

/* ------------------------------- background ------------------------------- */

export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(125%_85%_at_50%_-10%,#141a44_0%,#0a0b1e_38%,#05060f_70%)]" />
      <div className="animate-grid grid-bg absolute inset-0 opacity-70 [mask-image:radial-gradient(90%_65%_at_50%_0%,black,transparent)]" />
      <div
        className="animate-aurora absolute -top-52 -left-40 h-[40rem] w-[40rem] rounded-full blur-[130px]"
        style={{ background: "color-mix(in srgb, var(--a1) 28%, transparent)" }}
      />
      <div
        className="animate-aurora-slow absolute top-1/4 -right-52 h-[38rem] w-[38rem] rounded-full blur-[140px]"
        style={{ background: "color-mix(in srgb, var(--a3) 24%, transparent)" }}
      />
      <div
        className="animate-aurora absolute bottom-[-12rem] left-1/4 h-[34rem] w-[34rem] rounded-full blur-[150px]"
        style={{ background: "color-mix(in srgb, var(--a2) 18%, transparent)" }}
      />
      <div className="accent-bg absolute inset-x-0 top-0 h-px opacity-60" />
    </div>
  );
}

/* --------------------------------- icons --------------------------------- */

const PATHS: Record<string, ReactNode> = {
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V4Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 17V5" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 21h16" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  code: <path d="m9 18-6-6 6-6m6 0 6 6-6 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  wand: (
    <>
      <path d="m4 20 12-12" />
      <path d="M14 4v3M20 10h-3M17.5 4.5 15.6 6.4M20.5 13.5 18.6 11.6" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20Z" />
  ),
  telegram: (
    <>
      <path d="M21.3 4.4 2.9 11.5c-.9.35-.86 1.65.06 1.94l4.6 1.45 1.76 5.3c.24.72 1.16.9 1.66.33l2.5-2.86 4.62 3.4c.63.46 1.53.11 1.7-.65l3.2-14.3c.17-.79-.6-1.44-1.35-1.14Z" />
      <path d="m7.56 14.89 10.6-7.4-8.13 8.32-.32 4.05" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.7,
}: {
  name: keyof typeof PATHS | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.sparkles}
    </svg>
  );
}

/* --------------------------------- toasts --------------------------------- */

type ToastKind = "ok" | "err" | "info";
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export function toast(message: string, kind: ToastKind = "ok") {
  window.dispatchEvent(new CustomEvent("wvf:toast", { detail: { message, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let id = 0;
    const handler = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail as {
        message: string;
        kind: ToastKind;
      };
      const item = { id: ++id, message, kind };
      setItems((prev) => [...prev.slice(-2), item]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== item.id)), 2600);
    };
    window.addEventListener("wvf:toast", handler);
    return () => window.removeEventListener("wvf:toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-8">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "glass pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-2xl shadow-black/60",
              t.kind === "err" ? "text-rose-200" : t.kind === "info" ? "text-sky-200" : "text-emerald-200"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                t.kind === "err"
                  ? "bg-rose-500/20"
                  : t.kind === "info"
                    ? "bg-sky-500/20"
                    : "bg-emerald-500/20"
              )}
            >
              <Icon name={t.kind === "err" ? "x" : t.kind === "info" ? "sparkles" : "check"} className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------- primitives ------------------------------- */

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"
    >
      <Pill className="mb-4 border-violet-400/20 bg-violet-400/10 text-violet-200">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        {eyebrow}
      </Pill>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{subtitle}</p>
      )}
    </motion.div>
  );
}

export function GlowButton({
  children,
  onClick,
  href,
  variant = "primary",
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  type?: "button" | "submit";
}) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.97]";
  const styles =
    variant === "primary"
      ? "text-white shadow-[0_10px_40px_-12px_rgba(139,92,246,0.9)]"
      : "glass text-slate-200 hover:border-white/25 hover:text-white";

  const inner = (
    <>
      {variant === "primary" && (
        <>
          <span className="accent-bg absolute inset-0 transition-[background-position] duration-700 group-hover:bg-[position:100%_0]" />
          <span className="absolute inset-px rounded-[15px] bg-gradient-to-b from-white/20 to-transparent opacity-60" />
        </>
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn(base, styles, className)}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cn(base, styles, className)}>
      {inner}
    </button>
  );
}
