import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { QwdttMode } from "../lib/crypt";
import { FORMATS, downloadText, generate, type OutputFormat } from "../lib/export";
import { b64encode, dedupe, parseInput, uniqueNames } from "../lib/parse";
import { PROTOCOL_META, type Protocol, type ProxyNode } from "../lib/types";
import { cn } from "../utils/cn";
import { Check, Segmented } from "./kit";
import { AutoNameTool } from "./tools/NamingTools";
import { CheburnetTool, ProxyTool, WlTool } from "./tools/NetTools";
import { Base64Tool, CryptTool, UrlCodecTool } from "./tools/TextTools";
import { Icon, SectionTitle, toast } from "./ui";

/* ------------------------------- sample data ------------------------------ */

function sampleInput() {
  const vmess = b64encode(
    JSON.stringify({
      v: "2",
      ps: "🇺🇸 Dallas · VMess WS",
      add: "us-dal-07.wvfnet.io",
      port: "443",
      id: "1f0d9c33-4ab2-4e39-8d55-2c1b7f6ea920",
      aid: "0",
      scy: "auto",
      net: "ws",
      type: "none",
      host: "cdn.wvfnet.io",
      path: "/wvf-ws",
      tls: "tls",
      sni: "cdn.wvfnet.io",
    })
  );
  return [
    "vless://d3f8a1c2-6b7e-4f21-9a35-77c0e5b1a9d4@de-fra-01.wvfnet.io:443?type=ws&security=tls&sni=cdn.wvfnet.io&host=cdn.wvfnet.io&path=%2Fwvf&fp=chrome#Frankfurt%20%C2%B7%20Premium",
    "vless://d3f8a1c2-6b7e-4f21-9a35-77c0e5b1a9d4@nl-ams-02.wvfnet.io:443?type=tcp&security=reality&sni=www.microsoft.com&pbk=xN9Q1Kk3s0Zm9dQe4Yq7Rj2Vt8Lp0Wc6Hb5Fa1Gd3Ie&sid=9a2f4b&fp=chrome&flow=xtls-rprx-vision#Amsterdam%20%C2%B7%20Reality",
    `vmess://${vmess}`,
    "trojan://Str0ngPass23@us-mia-03.wvfnet.io:443?security=tls&sni=us-mia-03.wvfnet.io&type=grpc&serviceName=wvfgrpc#Miami%20%C2%B7%20gRPC",
    "ss://YWVzLTI1Ni1nY206c3VwZXJTZWNyZXQxMjM@fi-hel-04.wvfnet.io:8388#Helsinki%20%C2%B7%20Shadowsocks",
    "hysteria2://Hy2Pass456@jp-tok-05.wvfnet.io:443?sni=jp-tok-05.wvfnet.io&insecure=0#Tokyo%20%C2%B7%20Hysteria2",
    "tuic://8f14e45f-ceea-467a-9c4f-0b3a1d29e7b1:tuicPass99@sg-sin-06.wvfnet.io:443?congestion_control=bbr&udp_relay_mode=native&alpn=h3&sni=sg-sin-06.wvfnet.io#Singapore%20%C2%B7%20TUIC",
  ].join("\n");
}

/* ------------------------------- highlighting ----------------------------- */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlight(code: string, kind: "yaml" | "json" | "text"): string {
  const esc = escapeHtml(code);
  if (code.length > 90000) return esc;
  if (kind === "json") {
    return esc.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g,
      (_m, str, colon, kw, num) => {
        if (str)
          return colon
            ? `<span class="text-violet-300">${str}</span>${colon}`
            : `<span class="text-emerald-300">${str}</span>`;
        if (kw) return `<span class="text-amber-300">${kw}</span>`;
        return `<span class="text-cyan-300">${num}</span>`;
      }
    );
  }
  if (kind === "yaml") {
    return esc.replace(
      /(#[^\n]*)|("(?:\\.|[^"\\])*")|^([ \t]*-?[ \t]*)([A-Za-z0-9_.\-]+)(:)/gm,
      (_m, comment, str, indent, key, colon) => {
        if (comment) return `<span class="text-slate-500">${comment}</span>`;
        if (str) return `<span class="text-emerald-300">${str}</span>`;
        return `${indent}<span class="text-violet-300">${key}</span>${colon}`;
      }
    );
  }
  return esc.replace(
    /^([a-z0-9]+):\/\//gm,
    '<span class="text-violet-300">$1://</span>'
  );
}

/* --------------------------------- toggle --------------------------------- */

function Toggle({
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
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ring-1 transition-all",
        checked
          ? "bg-violet-500/15 text-violet-100 ring-violet-400/40"
          : "bg-white/[0.03] text-slate-400 ring-white/10 hover:text-slate-200"
      )}
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-violet-500" : "bg-white/20"
        )}
      >
        <motion.span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow"
          animate={{ left: checked ? 14 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
      {label}
    </button>
  );
}

/* -------------------------------- node card ------------------------------- */

function NodeCard({
  node,
  index,
  disabled,
  onToggle,
}: {
  node: ProxyNode;
  index: number;
  disabled: boolean;
  onToggle: () => void;
}) {
  const meta = PROTOCOL_META[node.type];
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.5) }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300",
        disabled
          ? "border-white/5 bg-white/[0.01] opacity-40"
          : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-violet-950/40"
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70",
          meta.color
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg leading-none">{node.flag}</span>
          <span className="truncate text-sm font-semibold text-white">{node.name}</span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider uppercase ring-1",
            meta.ring,
            meta.text
          )}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-2 truncate font-mono text-[11px] text-slate-400">
        {node.server}:{node.port}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400 uppercase">
          {node.network}
        </span>
        {node.security !== "none" && (
          <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-300 uppercase">
            {node.security}
          </span>
        )}
        {node.flow && (
          <span className="rounded-md bg-fuchsia-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-fuchsia-300">
            vision
          </span>
        )}
        {node.insecure && (
          <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-300">
            insecure
          </span>
        )}
      </div>
      <span className="absolute right-3 bottom-3 text-[10px] font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
        {disabled ? "включить" : "исключить"}
      </span>
    </motion.button>
  );
}

/* -------------------------------- converter ------------------------------- */

function ConverterCore({
  input,
  setInput,
}: {
  input: string;
  setInput: (v: string) => void;
}) {
  const [format, setFormat] = useState<OutputFormat>("clash");
  const [balancer, setBalancer] = useState(false);
  const [qwdttMode, setQwdttMode] = useState<QwdttMode>("qwdtt");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [protoFilter, setProtoFilter] = useState<Set<Protocol>>(new Set());
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [opts, setOpts] = useState({
    dedupe: true,
    flags: true,
    numbering: false,
    prefix: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseInput(input), [input]);

  useEffect(() => {
    setExcluded(new Set());
    setShowAll(false);
  }, [input]);

  const counts = useMemo(() => {
    const map = new Map<Protocol, number>();
    parsed.nodes.forEach((n) => map.set(n.type, (map.get(n.type) || 0) + 1));
    return map;
  }, [parsed]);

  const processed = useMemo(() => {
    let list = parsed.nodes.filter((n) => !excluded.has(n.id));
    if (protoFilter.size) list = list.filter((n) => protoFilter.has(n.type));
    if (opts.dedupe) list = dedupe(list);
    list = list.map((n, i) => {
      let name = n.name.trim() || `${n.server}:${n.port}`;
      if (opts.flags && n.flag && !name.startsWith(n.flag)) name = `${n.flag} ${name}`;
      if (opts.prefix.trim()) name = `${opts.prefix.trim()} ${name}`;
      if (opts.numbering) name = `${String(i + 1).padStart(2, "0")} · ${name}`;
      return name === n.name ? n : { ...n, name };
    });
    return uniqueNames(list);
  }, [parsed, excluded, protoFilter, opts]);

  const output = useMemo(
    () => generate(format, processed, { balancer, qwdttMode }),
    [format, processed, balancer, qwdttMode]
  );
  const fmt = FORMATS.find((f) => f.id === format)!;
  const lang: "yaml" | "json" | "text" =
    format === "clash" ? "yaml" : format === "base64" || format === "uri" ? "text" : "json";
  const html = useMemo(() => highlight(output, lang), [output, lang]);

  const sizeKb = (new TextEncoder().encode(output).length / 1024).toFixed(1);

  /* ----------------------------- actions ----------------------------- */

  const doCopy = async () => {
    if (!output) return toast("Сначала вставьте конфиги", "err");
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast(`${fmt.label} скопирован — ${processed.length} узлов`);
    setTimeout(() => setCopied(false), 1800);
  };

  const doPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return toast("Буфер обмена пуст", "err");
      setInput(text.trim());
      toast("Вставлено из буфера", "info");
    } catch {
      toast("Браузер запретил доступ к буферу", "err");
    }
  };

  const doDownload = () => {
    if (!output) return toast("Нечего скачивать", "err");
    downloadText(`wvf-${format}.${fmt.ext}`, output);
    toast("Файл сохранён");
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setInput(String(reader.result || "").trim());
      toast(`Загружен ${file.name}`, "info");
    };
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
    else {
      const text = e.dataTransfer.getData("text");
      if (text) setInput(text.trim());
    }
  };

  const visibleNodes = showAll ? parsed.nodes : parsed.nodes.slice(0, 12);

  return (
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ------------------------------ INPUT ------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
            className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
                  <Icon name="clipboard" className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">Исходные конфиги</div>
                  <div className="text-[11px] text-slate-500">vless · vmess · trojan · ss · hy2 · tuic</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={doPaste}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon name="clipboard" className="h-3.5 w-3.5" /> Вставить
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon name="upload" className="h-3.5 w-3.5" /> Файл
                </button>
                <button
                  onClick={() => {
                    setInput(sampleInput());
                    toast("Загружен демо-набор", "info");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon name="wand" className="h-3.5 w-3.5" /> Пример
                </button>
                <button
                  onClick={() => setInput("")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-rose-300/80 ring-1 ring-white/10 transition hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "relative rounded-2xl border transition-all duration-300",
                dragging
                  ? "border-violet-400/60 bg-violet-500/10"
                  : "border-white/10 bg-black/35"
              )}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                placeholder={"vless://uuid@host:443?security=reality&pbk=...#Node\nvmess://eyJ2IjoiMiIsInBzIjoi...\ntrojan://pass@host:443#Node\n\n…или просто вставь base64-подписку целиком"}
                className="h-[240px] w-full resize-none bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none sm:h-[300px]"
              />
              <AnimatePresence>
                {dragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0b1e]/80 text-sm font-semibold text-violet-200"
                  >
                    Отпустите файл, чтобы загрузить
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.yaml,.yml,.json,.conf,text/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-slate-400">
                строк: {input ? input.trim().split(/\n+/).length : 0}
              </span>
              <span className="rounded-lg bg-emerald-400/10 px-2 py-1 font-mono text-emerald-300">
                узлов: {parsed.nodes.length}
              </span>
              {parsed.errors.length > 0 && (
                <span className="rounded-lg bg-rose-400/10 px-2 py-1 font-mono text-rose-300">
                  ошибок: {parsed.errors.length}
                </span>
              )}
              <span className="ml-auto rounded-lg bg-violet-400/10 px-2 py-1 font-mono text-violet-300">
                на выходе: {processed.length}
              </span>
            </div>

            {/* protocol filter chips */}
            <AnimatePresence>
              {counts.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-wrap gap-1.5 overflow-hidden"
                >
                  {[...counts.entries()].map(([proto, count]) => {
                    const active = protoFilter.has(proto);
                    const meta = PROTOCOL_META[proto];
                    return (
                      <button
                        key={proto}
                        onClick={() => {
                          const next = new Set(protoFilter);
                          next.has(proto) ? next.delete(proto) : next.add(proto);
                          setProtoFilter(next);
                        }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 font-mono text-[10.5px] tracking-wide uppercase ring-1 transition-all",
                          active || protoFilter.size === 0
                            ? cn(meta.ring, meta.text)
                            : "bg-white/[0.02] text-slate-600 ring-white/5"
                        )}
                      >
                        {meta.label} · {count}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ------------------------------ OUTPUT ------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5"
          >
            <div className="no-scrollbar -mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "relative shrink-0 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                    format === f.id ? "text-white" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {format === f.id && (
                    <motion.span
                      layoutId="fmt-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="accent-bg absolute inset-0 rounded-xl opacity-90 shadow-lg ring-1 ring-white/15"
                    />
                  )}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{fmt.desc}</div>
                <div className="truncate text-[11px] text-slate-500">{fmt.apps}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={doCopy}
                  className="accent-bg accent-glow group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl px-3 py-2 text-xs font-semibold text-white transition active:scale-95"
                >
                  <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                  {copied ? "Готово" : "Копировать"}
                </button>
                <button
                  onClick={doDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95"
                >
                  <Icon name="download" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Скачать</span>
                </button>
              </div>
            </div>

            <div className="relative h-[240px] overflow-hidden rounded-2xl border border-white/10 bg-black/45 sm:h-[300px]">
              <AnimatePresence mode="wait">
                {output ? (
                  <motion.pre
                    key={format + processed.length}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "h-full w-full overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-slate-300",
                      format === "base64" ? "break-all whitespace-pre-wrap" : "whitespace-pre"
                    )}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
                  >
                    <span className="animate-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-300 ring-1 ring-white/10">
                      <Icon name="code" className="h-6 w-6" />
                    </span>
                    <div className="text-sm font-medium text-slate-400">
                      Здесь появится готовый конфиг
                    </div>
                    <button
                      onClick={() => setInput(sampleInput())}
                      className="text-xs font-semibold text-violet-300 underline-offset-4 hover:underline"
                    >
                      Попробовать на примере →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <AnimatePresence>
              {(format === "clash" || format === "qwdtt") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  {format === "clash" ? (
                    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/10">
                      <Check
                        checked={balancer}
                        onChange={setBalancer}
                        label="Балансер (load-balance группа)"
                      />
                    </div>
                  ) : (
                    <Segmented
                      id="qwdtt-mode"
                      size="sm"
                      value={qwdttMode}
                      onChange={setQwdttMode}
                      options={[
                        { id: "qwdtt", label: "qwdtt:// ссылка" },
                        { id: "json", label: "JSON" },
                        { id: "wdtt", label: "wdtt://" },
                      ]}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-slate-400">
                wvf-{format}.{fmt.ext}
              </span>
              <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-slate-400">
                {sizeKb} КБ
              </span>
              <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-slate-400">
                {output ? output.split("\n").length : 0} строк
              </span>
            </div>
          </motion.div>
        </div>

        {/* ------------------------------ OPTIONS ------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="glass mt-5 flex flex-wrap items-center gap-2 rounded-2xl p-3"
        >
          <span className="mr-1 flex items-center gap-1.5 pl-1 text-xs font-semibold text-slate-300">
            <Icon name="filter" className="h-3.5 w-3.5 text-violet-300" />
            Обработка
          </span>
          <Toggle
            checked={opts.dedupe}
            onChange={(v) => setOpts({ ...opts, dedupe: v })}
            label="Убрать дубли"
          />
          <Toggle
            checked={opts.flags}
            onChange={(v) => setOpts({ ...opts, flags: v })}
            label="Флаги стран"
          />
          <Toggle
            checked={opts.numbering}
            onChange={(v) => setOpts({ ...opts, numbering: v })}
            label="Нумерация"
          />
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/10">
            <span className="text-xs text-slate-400">Префикс</span>
            <input
              value={opts.prefix}
              onChange={(e) => setOpts({ ...opts, prefix: e.target.value })}
              placeholder="WVF"
              className="w-20 bg-transparent text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>
          {protoFilter.size > 0 && (
            <button
              onClick={() => setProtoFilter(new Set())}
              className="ml-auto rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 ring-1 ring-rose-400/25"
            >
              Сбросить фильтр
            </button>
          )}
        </motion.div>

        {/* ------------------------------ NODES ------------------------------ */}
        <AnimatePresence>
          {parsed.nodes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display flex items-center gap-2 text-lg font-bold text-white">
                  <Icon name="server" className="h-4.5 w-4.5 text-cyan-300" />
                  Найденные узлы
                  <span className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-400">
                    {parsed.nodes.length}
                  </span>
                </h3>
                {parsed.nodes.length > 12 && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                  >
                    {showAll ? "Свернуть" : `Показать все (${parsed.nodes.length})`}
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visibleNodes.map((node, i) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      index={i}
                      disabled={excluded.has(node.id)}
                      onToggle={() => {
                        const next = new Set(excluded);
                        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                        setExcluded(next);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ------------------------------ ERRORS ------------------------------ */}
        <AnimatePresence>
          {parsed.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-200">
                <Icon name="x" className="h-4 w-4" />
                Не удалось разобрать {parsed.errors.length} строк(и)
              </div>
              <div className="space-y-1 font-mono text-[11px] text-rose-200/70">
                {parsed.errors.slice(0, 4).map((e, i) => (
                  <div key={i} className="truncate">
                    {e.reason}: {e.line.slice(0, 70)}…
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}

/* ------------------------------- wrapper ------------------------------- */

type ToolMode = "convert" | "base64" | "crypt" | "urldec" | "proxy" | "wl" | "cheburnet" | "autoname";

const TOOL_TABS: { id: ToolMode; label: string }[] = [
  { id: "convert", label: "Конвертация" },
  { id: "autoname", label: "Автоназвания" },
  { id: "base64", label: "Base64" },
  { id: "crypt", label: "Crypt" },
  { id: "urldec", label: "Декрипт URL" },
  { id: "proxy", label: "Proxy" },
  { id: "wl", label: "WL" },
  { id: "cheburnet", label: "Cheburnet" },
];

export default function Converter({
  input,
  setInput,
}: {
  input: string;
  setInput: (v: string) => void;
}) {
  const [tool, setTool] = useState<ToolMode>("convert");

  return (
    <section id="converter" className="relative scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Конвертер"
          title={
            <>
              Вставь <span className="text-gradient">что угодно</span> — забери готовое
            </>
          }
          subtitle="Ссылки, base64-подписка, Xray/Sing-box JSON или Mihomo YAML — конвертация в обе стороны плюс набор сетевых инструментов."
        />

        <div className="mb-6 flex justify-center">
          <div className="no-scrollbar max-w-full overflow-x-auto">
            <Segmented id="tool" value={tool} onChange={setTool} options={TOOL_TABS} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tool}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {tool === "convert" && <ConverterCore input={input} setInput={setInput} />}
            {tool === "autoname" && <AutoNameTool onSend={setInput} />}
            {tool === "base64" && <Base64Tool />}
            {tool === "crypt" && <CryptTool />}
            {tool === "urldec" && <UrlCodecTool />}
            {tool === "proxy" && <ProxyTool />}
            {tool === "wl" && <WlTool />}
            {tool === "cheburnet" && <CheburnetTool />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
