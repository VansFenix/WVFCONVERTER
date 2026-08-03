import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  DNS_PROVIDERS,
  RU_SUBNETS,
  USER_AGENTS,
  detectCdn,
  dohResolve,
  ipInfo,
  isIp,
  matchSubnets,
  type IpInfo,
  type Subnet,
} from "../../lib/net";
import { cn } from "../../utils/cn";
import { Btn, CopyBtn, KeyVal, Label, Panel, Segmented, TextInput } from "../kit";
import { Icon, toast } from "../ui";

/* ---------------------- Proxy — ссылки для подписок ---------------------- */

const PROXY_HOSTS = [
  { id: "cloud", host: "cloud.sayori.cc", note: "основной live-прокси" },
  { id: "s", host: "s.sayori.cc", note: "лёгкий эндпоинт" },
  { id: "happy", host: "happy-decoder.cc/p", note: "Happy Decoder" },
];

const FMTS = [
  { id: "", label: "passthrough", desc: "ответ как есть" },
  { id: "b64", label: "b64", desc: "гарантированно base64" },
  { id: "url", label: "url", desc: "plain-text ссылки" },
  { id: "jsonX", label: "jsonX", desc: "Xray-config JSON" },
  { id: "jsonS", label: "jsonS", desc: "Sing-box config JSON" },
  { id: "yaml", label: "yaml", desc: "Clash / Mihomo YAML" },
];

export function ProxyTool() {
  const [sub, setSub] = useState("");
  const [ua, setUa] = useState("happ");
  const [os, setOs] = useState<"auto" | "android" | "ios">("auto");
  const [fmt, setFmt] = useState("");
  const [host, setHost] = useState("cloud");

  const build = (h: string) => {
    if (!sub.trim()) return "";
    const params = new URLSearchParams();
    params.set("url", sub.trim());
    if (ua) params.set("ua", ua);
    if (os !== "auto") params.set("os", os);
    const path = fmt ? `/${fmt}` : "";
    return `https://${h}${path}?${params.toString()}`;
  };

  const selected = PROXY_HOSTS.find((p) => p.id === host)!;

  return (
    <Panel
      title="Proxy-ссылки для подписок"
      subtitle="Прозрачный live-прокси с подменой User-Agent / HWID / OS и конвертацией формата"
      icon="globe"
    >
      <Label>URL подписки</Label>
      <TextInput value={sub} onChange={setSub} placeholder="https://panel.example.com/sub/abc123" mono />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>User-Agent</Label>
          <Segmented
            id="proxy-ua"
            size="sm"
            value={ua}
            onChange={setUa}
            options={USER_AGENTS.slice(0, 4).map((u) => ({ id: u.id, label: u.name, hint: u.ua }))}
          />
        </div>
        <div>
          <Label>ОС (только Happy Decoder)</Label>
          <Segmented
            id="proxy-os"
            size="sm"
            value={os}
            onChange={setOs}
            options={[
              { id: "auto", label: "Авто" },
              { id: "android", label: "Android" },
              { id: "ios", label: "iOS" },
            ]}
          />
        </div>
      </div>

      <div className="mt-3">
        <Label>Формат конвертации</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {FMTS.map((f) => (
            <button
              key={f.id || "pass"}
              onClick={() => setFmt(f.id)}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all",
                fmt === f.id
                  ? "accent-soft"
                  : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
              )}
            >
              <div className="font-mono text-[11px] font-semibold">{f.label}</div>
              <div className="text-[10px] text-slate-500">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Label>Эндпоинт</Label>
        <Segmented
          id="proxy-host"
          size="sm"
          value={host}
          onChange={setHost}
          options={PROXY_HOSTS.map((p) => ({ id: p.id, label: p.host, hint: p.note }))}
        />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="mb-1 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
          {selected.host} · {selected.note}
        </div>
        <div className="font-mono text-[11.5px] break-all text-slate-200">
          {build(selected.host) || "— укажите URL подписки —"}
        </div>
        <div className="mt-2 flex gap-2">
          <CopyBtn text={build(selected.host)} />
          <Btn
            icon="arrow"
            onClick={() => {
              const u = build(selected.host);
              if (!u) return toast("Сначала введите ссылку", "err");
              window.open(u, "_blank", "noopener");
            }}
          >
            Открыть
          </Btn>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------- WL — подсети РФ --------------------------- */

export function WlTool() {
  const [ip, setIp] = useState("");
  const [matches, setMatches] = useState<Subnet[] | null>(null);
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "operator" | "hosting" | "cdn">("all");

  const check = async () => {
    const v = ip.trim();
    if (!v) return toast("Введите IP", "err");
    setBusy(true);
    setInfo(null);
    try {
      let target = v;
      if (!isIp(v)) {
        const ans = await dohResolve(v.replace(/^https?:\/\//, "").split("/")[0], "A");
        target = ans.find((a) => isIp(a.data))?.data || "";
        if (!target) throw new Error("Домен не резолвится в IPv4");
        setIp(target);
      }
      setMatches(matchSubnets(target));
      try {
        setInfo(await ipInfo(target));
      } catch {
        /* optional */
      }
    } catch (e) {
      toast((e as Error).message, "err");
      setMatches([]);
    } finally {
      setBusy(false);
    }
  };

  const list = RU_SUBNETS.filter((s) => filter === "all" || s.kind === filter);

  return (
    <Panel
      title="WL — подсети операторов РФ"
      subtitle="Рабочие подсети при белом списке у РФ-операторов + определение хостинга"
      icon="server"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput value={ip} onChange={setIp} onEnter={check} placeholder="IP или домен, напр. 178.176.10.5" mono />
        <Btn variant="accent" icon="eye" loading={busy} onClick={check} className="sm:w-36">
          Проверить
        </Btn>
      </div>

      <AnimatePresence>
        {matches && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-3 rounded-2xl border p-3.5",
              matches.length
                ? "border-emerald-400/25 bg-emerald-500/8"
                : "border-white/10 bg-white/[0.02]"
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon
                name={matches.length ? "check" : "x"}
                className={cn("h-4 w-4", matches.length ? "text-emerald-300" : "text-slate-400")}
              />
              <span className={matches.length ? "text-emerald-200" : "text-slate-300"}>
                {matches.length
                  ? `Найдено в белом списке: ${matches.map((m) => m.operator).join(", ")}`
                  : "Совпадений в известных белых подсетях нет"}
              </span>
            </div>
            {matches.map((m) => (
              <div key={m.cidr} className="mt-1.5 font-mono text-[11px] text-slate-300">
                {m.cidr} · {m.operator} {m.note ? `· ${m.note}` : ""}
              </div>
            ))}
            {info && (
              <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                <KeyVal k="IP" v={info.ip} accent />
                <KeyVal k="Хостинг / ISP" v={info.isp || info.org || "—"} />
                <KeyVal k="Локация" v={`${info.flag || ""} ${info.country || "—"}${info.city ? `, ${info.city}` : ""}`} />
                <KeyVal k="ASN" v={info.asn || "—"} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label>Известные белые подсети</Label>
          <Segmented
            id="wl-filter"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "Все" },
              { id: "operator", label: "Операторы" },
              { id: "hosting", label: "Хостинги" },
              { id: "cdn", label: "CDN" },
            ]}
          />
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-2">
          {list.map((s) => (
            <div
              key={s.cidr}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/5"
            >
              <span className="font-mono text-slate-300">{s.cidr}</span>
              <span className="text-slate-500">
                {s.operator}
                {s.note ? ` · ${s.note}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------- Cheburnet ------------------------------- */

export function CheburnetTool() {
  const [target, setTarget] = useState("");
  const [dns, setDns] = useState("cloudflare");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{
    ips: string[];
    cname?: string;
    info?: IpInfo;
    cdn: string | null;
    wl: Subnet[];
    query: string;
  } | null>(null);

  const run = async () => {
    const raw = target.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!raw) return toast("Введите домен или IP", "err");
    setBusy(true);
    try {
      let ips: string[] = [];
      let cname: string | undefined;
      if (isIp(raw)) ips = [raw];
      else {
        const answers = await dohResolve(raw, "A", dns);
        ips = answers.filter((a) => isIp(a.data)).map((a) => a.data);
        cname = answers.find((a) => !isIp(a.data))?.data;
        if (!ips.length) {
          const c = await dohResolve(raw, "CNAME", dns);
          cname = c[0]?.data;
        }
      }
      let info: IpInfo | undefined;
      if (ips[0]) {
        try {
          info = await ipInfo(ips[0]);
        } catch {
          /* optional */
        }
      }
      const cdn = detectCdn(`${cname || ""} ${info?.isp || ""} ${info?.org || ""} ${raw}`);
      setRes({ ips, cname, info, cdn, wl: ips[0] ? matchSubnets(ips[0]) : [], query: raw });
      toast("Резолв выполнен", "info");
    } catch (e) {
      toast((e as Error).message || "Ошибка DNS-запроса", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Cheburnet"
      subtitle="Резолвер доменов и IP · блокировки РКН/CDN · ASN · хостинг · гео · белый список"
      icon="globe"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput value={target} onChange={setTarget} onEnter={run} placeholder="example.com или 1.2.3.4" mono />
        <Btn variant="accent" icon="eye" loading={busy} onClick={run} className="sm:w-36">
          Проверить
        </Btn>
      </div>

      <div className="mt-3">
        <Label>DNS-резолвер</Label>
        <Segmented
          id="cheb-dns"
          size="sm"
          value={dns}
          onChange={setDns}
          options={DNS_PROVIDERS.map((d) => ({ id: d.id, label: d.name }))}
        />
      </div>

      <AnimatePresence>
        {res && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <div className="mb-2 text-xs font-semibold text-white">Сетевые данные</div>
              <KeyVal k="Запрос" v={res.query} accent />
              <KeyVal k="IP-адреса" v={res.ips.join(", ") || "—"} />
              <KeyVal k="CNAME" v={res.cname || "—"} />
              <KeyVal k="Хостинг / ISP" v={res.info?.isp || res.info?.org || "—"} />
              <KeyVal
                k="Локация"
                v={`${res.info?.flag || ""} ${res.info?.country || "—"}${res.info?.city ? `, ${res.info.city}` : ""}`}
              />
              <KeyVal k="ASN" v={res.info?.asn || "—"} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <div className="mb-2 text-xs font-semibold text-white">Нахождение в списках</div>
              <KeyVal
                k="Реестр РКН"
                v={
                  res.info?.countryCode === "RU"
                    ? "хост в РФ — проверьте вручную"
                    : "прямой проверки нет"
                }
              />
              <KeyVal k="CDN" v={res.cdn || "не обнаружен"} accent={!!res.cdn} />
              <KeyVal
                k="Белый список"
                v={res.wl.length ? `✓ ${res.wl.map((w) => w.operator).join(", ")}` : "не найден"}
                accent={!!res.wl.length}
              />
              <KeyVal k="Гео-страна" v={res.info?.countryCode || "—"} />
              <div className="mt-2 flex gap-2">
                <CopyBtn text={JSON.stringify(res, null, 2)} label="Копировать JSON" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
