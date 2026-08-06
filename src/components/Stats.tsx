import { motion } from "motion/react";
import { useMemo } from "react";
import { PROTOCOL_META, type ProxyNode } from "../lib/types";
import { cn } from "../utils/cn";
import { Icon } from "./ui";

export default function Stats({ nodes }: { nodes: ProxyNode[] }) {
  const data = useMemo(() => {
    const byProto = new Map<string, number>();
    const byCountry = new Map<string, { flag: string; n: number }>();
    const byNet = new Map<string, number>();
    let tls = 0;
    let reality = 0;
    let insecure = 0;

    nodes.forEach((n) => {
      byProto.set(n.type, (byProto.get(n.type) || 0) + 1);
      const key = n.country || n.flag || "??";
      const cur = byCountry.get(key) || { flag: n.flag || "🏳️", n: 0 };
      byCountry.set(key, { ...cur, n: cur.n + 1 });
      byNet.set(n.network, (byNet.get(n.network) || 0) + 1);
      if (n.security === "tls") tls++;
      if (n.security === "reality") reality++;
      if (n.insecure) insecure++;
    });

    return {
      byProto: [...byProto.entries()].sort((a, b) => b[1] - a[1]),
      byCountry: [...byCountry.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8),
      byNet: [...byNet.entries()].sort((a, b) => b[1] - a[1]),
      tls,
      reality,
      insecure,
      hosts: new Set(nodes.map((n) => n.server)).size,
    };
  }, [nodes]);

  if (!nodes.length) return null;
  const max = Math.max(...data.byProto.map(([, v]) => v), 1);

  const chips = [
    { label: "узлов", value: nodes.length, icon: "layers" },
    { label: "уник. хостов", value: data.hosts, icon: "server" },
    { label: "Reality", value: data.reality, icon: "shield" },
    { label: "TLS", value: data.tls, icon: "lock" },
    { label: "без проверки", value: data.insecure, icon: "eye" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass mt-5 rounded-3xl p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="accent-soft flex h-8 w-8 items-center justify-center rounded-xl border">
          <Icon name="cpu" className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">Сводка по набору</div>
          <div className="text-[11px] text-slate-400">состав, гео и транспорты</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {chips.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
          >
            <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-slate-500 uppercase">
              <Icon name={c.icon} className="h-3 w-3" />
              {c.label}
            </div>
            <div className="font-display accent-text mt-1 text-xl font-bold">{c.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            По протоколам
          </div>
          <div className="space-y-1.5">
            {data.byProto.map(([proto, count], i) => {
              const meta = PROTOCOL_META[proto as keyof typeof PROTOCOL_META];
              return (
                <div key={proto} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 font-mono text-[10.5px] text-slate-400 uppercase">
                    {meta?.label || proto}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / max) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                      className={cn("h-full rounded-full bg-gradient-to-r", meta?.color || "from-slate-500 to-slate-400")}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-[11px] text-slate-300">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Транспорты
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.byNet.map(([net, n]) => (
              <span
                key={net}
                className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10.5px] text-slate-300 uppercase"
              >
                {net} · {n}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            География (топ-8)
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {data.byCountry.map(([code, v], i) => (
              <motion.div
                key={code}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-1.5"
              >
                <span className="flex items-center gap-1.5 text-[11.5px] text-slate-300">
                  <span className="text-base leading-none">{v.flag}</span>
                  {code.length <= 3 ? code : "—"}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{v.n}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
