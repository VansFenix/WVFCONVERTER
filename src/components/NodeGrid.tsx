import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { buildUri } from "../lib/parse";
import { PROTOCOL_META, type ProxyNode } from "../lib/types";
import { cn } from "../utils/cn";
import { Btn, CopyBtn, KeyVal, Label, TextInput } from "./kit";
import { Icon, toast } from "./ui";

export type SortMode = "orig" | "name" | "country" | "type" | "server";

const SORTS: { id: SortMode; label: string }[] = [
  { id: "orig", label: "исходный" },
  { id: "name", label: "имя" },
  { id: "country", label: "страна" },
  { id: "type", label: "протокол" },
  { id: "server", label: "хост" },
];

export function sortNodes(nodes: ProxyNode[], mode: SortMode): ProxyNode[] {
  if (mode === "orig") return nodes;
  const copy = [...nodes];
  const cmp = (a: string, b: string) => a.localeCompare(b, "ru");
  switch (mode) {
    case "name":
      return copy.sort((a, b) => cmp(a.name, b.name));
    case "country":
      return copy.sort((a, b) => cmp(a.country || a.flag || "", b.country || b.flag || ""));
    case "type":
      return copy.sort((a, b) => cmp(a.type, b.type) || cmp(a.name, b.name));
    case "server":
      return copy.sort((a, b) => cmp(a.server, b.server) || a.port - b.port);
  }
}

/* ------------------------------- node modal ------------------------------- */

function NodeModal({
  node,
  onClose,
  onRename,
}: {
  node: ProxyNode;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(node.name);
  const [qr, setQr] = useState("");
  const link = useMemo(() => buildUri({ ...node, name }), [node, name]);

  useEffect(() => {
    QRCode.toDataURL(link, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0d1c", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

  const meta = PROTOCOL_META[node.type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 40, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{node.flag}</span>
            <div>
              <div className="font-display text-lg leading-tight font-bold text-white">{name}</div>
              <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase ring-1", meta.ring, meta.text)}>
                {meta.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-white">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Имя узла</Label>
            <div className="flex gap-2">
              <TextInput value={name} onChange={setName} />
              <Btn
                variant="accent"
                icon="check"
                onClick={() => {
                  onRename(node.id, name.trim() || node.name);
                  toast("Имя обновлено");
                  onClose();
                }}
              />
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3">
              <KeyVal k="Сервер" v={`${node.server}:${node.port}`} accent />
              <KeyVal k="Транспорт" v={node.network} />
              <KeyVal k="Безопасность" v={node.security} />
              {node.sni && <KeyVal k="SNI" v={node.sni} />}
              {node.uuid && <KeyVal k="UUID" v={node.uuid} />}
              {node.password && <KeyVal k="Пароль" v={node.password} />}
              {node.cipher && <KeyVal k="Шифр" v={node.cipher} />}
              {node.flow && <KeyVal k="Flow" v={node.flow} />}
              {node.publicKey && <KeyVal k="Public key" v={node.publicKey} />}
              {node.shortId && <KeyVal k="Short ID" v={node.shortId} />}
              {node.path && <KeyVal k="Path" v={node.path} />}
              {node.host && <KeyVal k="Host" v={node.host} />}
              {!!node.alpn?.length && <KeyVal k="ALPN" v={node.alpn.join(", ")} />}
              <KeyVal k="Проверка серт." v={node.insecure ? "отключена" : "включена"} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {qr ? (
              <img src={qr} alt="QR" className="h-44 w-44 rounded-xl bg-white p-2" />
            ) : (
              <div className="h-44 w-44 rounded-xl border border-dashed border-white/15" />
            )}
            <Btn
              icon="download"
              onClick={() => {
                const a = document.createElement("a");
                a.href = qr;
                a.download = `${name.replace(/[^\w\-]+/g, "_")}.png`;
                a.click();
              }}
            >
              PNG
            </Btn>
          </div>
        </div>

        <div className="mt-4">
          <Label>Ссылка</Label>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] break-all text-slate-300">
            {link}
          </div>
          <div className="mt-2 flex gap-2">
            <CopyBtn text={link} label="Копировать ссылку" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------- node card ------------------------------- */

function Card({
  node,
  index,
  disabled,
  onToggle,
  onOpen,
}: {
  node: ProxyNode;
  index: number;
  disabled: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const meta = PROTOCOL_META[node.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4) }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-300",
        disabled
          ? "border-white/5 bg-white/[0.01] opacity-40"
          : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70", meta.color)} />

      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-lg leading-none">{node.flag}</span>
            <span className="truncate text-sm font-semibold text-white">{node.name}</span>
          </div>
          <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider uppercase ring-1", meta.ring, meta.text)}>
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
            <span className="rounded-md bg-fuchsia-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-fuchsia-300">vision</span>
          )}
          {node.insecure && (
            <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-300">insecure</span>
          )}
        </div>
      </button>

      <div className="absolute right-2.5 bottom-2.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onOpen}
          title="Детали и QR"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20"
        >
          <Icon name="eye" className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(buildUri(node));
            toast("Ссылка скопирована");
          }}
          title="Копировать ссылку"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20"
        >
          <Icon name="copy" className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* -------------------------------- the grid -------------------------------- */

export default function NodeGrid({
  nodes,
  excluded,
  setExcluded,
  onRename,
}: {
  nodes: ProxyNode[];
  excluded: Set<string>;
  setExcluded: (s: Set<string>) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("orig");
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<ProxyNode | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? nodes.filter((n) =>
          [n.name, n.server, n.type, n.country, n.sni, String(n.port)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : nodes;
    return sortNodes(list, sort);
  }, [nodes, query, sort]);

  const visible = showAll ? filtered : filtered.slice(0, 12);
  const activeCount = nodes.length - excluded.size;

  const bulk = (kind: "all" | "none" | "invert" | "visible") => {
    if (kind === "all") return setExcluded(new Set());
    if (kind === "none") return setExcluded(new Set(nodes.map((n) => n.id)));
    if (kind === "visible") {
      const keep = new Set(filtered.map((n) => n.id));
      return setExcluded(new Set(nodes.filter((n) => !keep.has(n.id)).map((n) => n.id)));
    }
    const next = new Set<string>();
    nodes.forEach((n) => !excluded.has(n.id) && next.add(n.id));
    setExcluded(next);
  };

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display flex items-center gap-2 text-lg font-bold text-white">
          <Icon name="server" className="accent-text h-4.5 w-4.5" />
          Найденные узлы
          <span className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-400">
            {activeCount} / {nodes.length}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn onClick={() => bulk("all")}>Все</Btn>
          <Btn onClick={() => bulk("none")}>Снять</Btn>
          <Btn onClick={() => bulk("invert")}>Инверт.</Btn>
          {query && <Btn onClick={() => bulk("visible")}>Только найденные</Btn>}
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="eye" className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, хосту, стране, порту…"
            className="field pl-9 placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">сорт.</span>
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-black/25 p-1 ring-1 ring-white/8">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  sort === s.id ? "accent-bg text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-xs text-slate-500">
          Ничего не найдено по запросу «{query}»
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((node, i) => (
              <Card
                key={node.id}
                node={node}
                index={i}
                disabled={excluded.has(node.id)}
                onOpen={() => setActive(node)}
                onToggle={() => {
                  const next = new Set(excluded);
                  next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                  setExcluded(next);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filtered.length > 12 && (
        <div className="mt-3 flex justify-center">
          <Btn onClick={() => setShowAll((v) => !v)} icon="chevron">
            {showAll ? "Свернуть" : `Показать все (${filtered.length})`}
          </Btn>
        </div>
      )}

      <AnimatePresence>
        {active && (
          <NodeModal node={active} onClose={() => setActive(null)} onRename={onRename} />
        )}
      </AnimatePresence>
    </div>
  );
}
