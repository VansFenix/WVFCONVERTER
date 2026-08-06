import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Icon, toast } from "./ui";

export function Panel({
  title,
  subtitle,
  icon,
  children,
  className,
  right,
}: {
  title?: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("glass rounded-3xl p-4 sm:p-5", className)}
    >
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="accent-soft flex h-9 w-9 items-center justify-center rounded-xl border">
                <Icon name={icon} className="h-4.5 w-4.5" />
              </span>
            )}
            <div>
              {title && <div className="text-sm font-semibold text-white">{title}</div>}
              {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
            </div>
          </div>
          {right}
        </div>
      )}
      {children}
    </motion.div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  id,
}: {
  options: { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  id: string;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-black/25 p-1 ring-1 ring-white/8">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative shrink-0 rounded-lg font-semibold whitespace-nowrap transition-colors",
            size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
            value === o.id ? "text-white" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${id}`}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="accent-bg absolute inset-0 rounded-lg opacity-90 shadow-lg"
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      {children}
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  onEnter,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  onEnter?: () => void;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      className={cn("field placeholder:text-slate-600", mono && "font-mono", className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 6,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "field resize-y font-mono text-[12px] leading-relaxed placeholder:text-slate-600",
        className
      )}
    />
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs font-medium text-slate-300 transition hover:text-white"
    >
      <span
        className={cn(
          "flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all",
          checked ? "accent-bg border-transparent text-white" : "border-white/20 bg-black/30"
        )}
      >
        {checked && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export function Btn({
  children,
  onClick,
  variant = "soft",
  icon,
  className,
  disabled,
  loading,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "accent" | "soft" | "danger";
  icon?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "accent" && "accent-bg accent-glow text-white",
        variant === "soft" && "bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10",
        variant === "danger" &&
          "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/25 hover:bg-rose-500/20",
        className
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        icon && <Icon name={icon} className="h-3.5 w-3.5" />
      )}
      {children}
    </button>
  );
}

export function CopyBtn({
  text,
  label = "Копировать",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (!text) return toast("Нечего копировать", "err");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    toast("Скопировано");
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <Btn onClick={copy} icon={done ? "check" : "copy"} className={className}>
      {done ? "Готово" : label}
    </Btn>
  );
}

export function Result({
  value,
  placeholder = "Результат появится здесь",
  rows = 6,
  mono = true,
}: {
  value: string;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div
      className="relative overflow-auto rounded-xl border border-white/10 bg-black/40 p-3"
      style={{ minHeight: rows * 22 }}
    >
      {value ? (
        <pre
          className={cn(
            "text-[11.5px] leading-relaxed break-all whitespace-pre-wrap text-slate-200",
            mono && "font-mono"
          )}
        >
          {value}
        </pre>
      ) : (
        <span className="text-xs text-slate-600">{placeholder}</span>
      )}
    </div>
  );
}

export function KeyVal({ k, v, accent }: { k: string; v: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <span className="text-[11px] text-slate-500">{k}</span>
      <span
        className={cn(
          "text-right font-mono text-[11.5px] break-all",
          accent ? "accent-text" : "text-slate-200"
        )}
      >
        {v ?? "—"}
      </span>
    </div>
  );
}
