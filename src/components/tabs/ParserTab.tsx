import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CLIENT_PROFILES, incyHealth, makeHwid, selftest, type CryptSource, type HwidKind } from "../../lib/api";
import { downloadText } from "../../lib/export";
import { HEADER_PRESETS, buildCurl, parseHeaders } from "../../lib/net";
import { runParser } from "../../lib/pipeline";
import { cn } from "../../utils/cn";
import { Btn, Check, CopyBtn, Label, Panel, Result, Segmented, TextArea, TextInput } from "../kit";
import { Icon, toast } from "../ui";

const HWID_KINDS: { id: HwidKind; label: string }[] = [
  { id: "alnum16", label: "alnum-16" },
  { id: "uuid", label: "UUID v4" },
  { id: "hex16", label: "hex-16" },
  { id: "none", label: "без HWID" },
];

export default function ParserTab({ onSend }: { onSend: (text: string) => void }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"auto" | "custom" | "noua">("auto");
  const [client, setClient] = useState("happ");
  const [customUa, setCustomUa] = useState("");
  const [headers, setHeaders] = useState("");
  const [autoHwid, setAutoHwid] = useState(true);
  const [hwidKind, setHwidKind] = useState<HwidKind>("alnum16");
  const [hwid, setHwid] = useState("");
  const [cryptSource, setCryptSource] = useState<CryptSource>("auto");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState(0);

  const profile = CLIENT_PROFILES.find((p) => p.id === client)!;
  const ua = mode === "noua" ? "" : customUa.trim() || profile.ua;

  const log = (msg: string) =>
    setLogs((l) => [...l, `${new Date().toLocaleTimeString("ru-RU")}.${String(Date.now() % 1000).padStart(3, "0")}  ${msg}`]);

  const effHwid = () => (autoHwid ? hwid || makeHwid(hwidKind) : hwid);

  const headerMap = () => {
    const h = parseHeaders(headers.replace(/<hwid>/g, effHwid()));
    return h;
  };

  const addPreset = (key: keyof typeof HEADER_PRESETS) => {
    const value = HEADER_PRESETS[key].replace(/<hwid>/g, effHwid() || makeHwid(hwidKind));
    setHeaders((h) => (h.trim() ? `${h.trim()}\n${value}` : value));
  };

  const run = async () => {
    const target = url.trim();
    if (!target) return toast("Введите ссылку, крипт-ссылку или текст подписки", "err");
    setBusy(true);
    setLogs([]);
    setResult("");
    setFound(0);
    const useHwid = hwidKind === "none" ? "" : effHwid();
    if (autoHwid && useHwid) setHwid(useHwid);

    try {
      const res = await runParser(target, {
        mode,
        ua: ua || undefined,
        hwid: useHwid || undefined,
        headers: headerMap(),
        cryptSource,
        log,
      });
      setResult(res.content);
      setFound(res.count);
      if (res.suggestedHwid) setHwid(res.suggestedHwid);
      toast(
        res.count ? `Спарсено ключей: ${res.count} (${res.via})` : "Ответ получен, ключей нет",
        res.count ? "ok" : "err"
      );
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const ping = async () => {
    log("→ GET /api/fetch?selftest=1");
    try {
      const st = await selftest();
      log(`← ${JSON.stringify(st)}`);
      const h = await incyHealth();
      log(`← /api/incy/health: ${JSON.stringify(h)}`);
      toast("API живой", "info");
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
      toast("API не отвечает", "err");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Парсер подписки"
        subtitle="Серверный прокси c.kfwl.lol · обход CORS, подмена UA и x-hwid"
        icon="globe"
        right={
          <button
            onClick={ping}
            className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-white/10 hover:text-white"
          >
            selftest
          </button>
        }
      >
        <Label>Ссылка на подписку, happ://crypt5/… или incy://crypt1/…</Label>
        <TextInput value={url} onChange={setUrl} onEnter={run} placeholder="https://sub.example.com/abc" mono />

        <div className="mt-3">
          <Label>Режим парсинга</Label>
          <Segmented
            id="parse-mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: "auto", label: "🤖 Авто", hint: "сервер сам подберёт клиент" },
              { id: "custom", label: "⚙️ Свой UA", hint: "ручной User-Agent и HWID" },
              { id: "noua", label: "∅ Без UA", hint: "запрос без User-Agent" },
            ]}
          />
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">
            {mode === "auto"
              ? "HEAD+GET, поиск маркеров клиента в HTML, deeplink, перебор UA-цепочки Happ → INCY → V2RayTUN → Clash."
              : mode === "custom"
                ? "Прямой /api/fetch с вашими параметрами, без эвристик."
                : "Запрос вообще без User-Agent — для серверов, отбрасывающих браузерные UA."}
          </p>
        </div>

        <AnimatePresence>
          {mode === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <Label>Эмуляция клиента</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CLIENT_PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setClient(p.id);
                        setHwidKind(p.hwid);
                        setCustomUa("");
                        if (autoHwid) setHwid(makeHwid(p.hwid));
                      }}
                      className={cn(
                        "rounded-xl border p-2 text-left transition-all",
                        client === p.id
                          ? "accent-soft"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
                      )}
                    >
                      <div className="text-[11px] font-semibold">
                        {p.name} {p.extra && <span className="opacity-60">✓</span>}
                      </div>
                      <div className="font-mono text-[9px] text-slate-500">{p.hwid}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <Label>User-Agent (пусто = профиль клиента)</Label>
                <TextInput value={customUa} onChange={setCustomUa} placeholder={profile.ua} mono />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3">
          <Label>Доп. заголовки</Label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Btn onClick={() => addPreset("bearer")}>+ Bearer</Btn>
            <Btn onClick={() => addPreset("cookie")}>+ Cookie</Btn>
            <Btn onClick={() => addPreset("apikey")}>+ X-API-Key</Btn>
            <Btn onClick={() => addPreset("picky")}>Для придирчивых</Btn>
            <Btn onClick={() => addPreset("remnawave")}>+ Remnawave HWID</Btn>
            <Btn variant="danger" onClick={() => setHeaders("")}>
              Очистить
            </Btn>
          </div>
          <TextArea value={headers} onChange={setHeaders} rows={3} placeholder="Authorization: Bearer …" />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Формат HWID</Label>
            <Segmented
              id="hwid-kind"
              size="sm"
              value={hwidKind}
              onChange={(v) => {
                setHwidKind(v);
                if (autoHwid) setHwid(makeHwid(v));
              }}
              options={HWID_KINDS}
            />
            <div className="mt-2">
              <Check checked={autoHwid} onChange={setAutoHwid} label="Генерировать HWID случайно" />
            </div>
          </div>
          <div>
            <Label>Свой HWID</Label>
            <div className="flex gap-2">
              <TextInput value={hwid} onChange={setHwid} placeholder="как в Remnawave" mono />
              <Btn icon="wand" onClick={() => setHwid(makeHwid(hwidKind))} />
            </div>
            <div className="mt-2">
              <Label>Источник Crypt</Label>
              <Segmented
                id="crypt-src-parser"
                size="sm"
                value={cryptSource}
                onChange={setCryptSource}
                options={[
                  { id: "auto", label: "Авто" },
                  { id: "api", label: "API" },
                  { id: "local", label: "Local" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="accent" icon="bolt" loading={busy} onClick={run}>
            Спарсить
          </Btn>
          <Btn icon="trash" onClick={() => { setLogs([]); setResult(""); setFound(0); }}>
            🧹
          </Btn>
          <Btn icon="cpu" onClick={() => setShowLogs((v) => !v)}>
            🐛 логи
          </Btn>
          <CopyBtn text={buildCurl(url, ua, { ...headerMap(), ...(hwid ? { "x-hwid": hwid } : {}) })} label="curl" />
          <Btn icon="download" onClick={() => (result ? downloadText("subscription.txt", result) : toast("Пусто", "err"))}>
            Скачать
          </Btn>
          {found > 0 && (
            <Btn variant="accent" icon="arrow" onClick={() => onSend(result)}>
              В конвертер ({found})
            </Btn>
          )}
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel
          title="Результат"
          subtitle={found ? `распознано ключей: ${found}` : "тело ответа после 9 слоёв обработки"}
          icon="layers"
          right={<CopyBtn text={result} />}
        >
          <Result value={result} rows={9} />
        </Panel>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Panel
                title="🐛 Парсер · логи"
                icon="cpu"
                right={
                  <div className="flex gap-1.5">
                    <CopyBtn text={logs.join("\n")} label="copy" />
                    <Btn variant="danger" onClick={() => setLogs([])}>
                      clear
                    </Btn>
                  </div>
                }
              >
                <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[10.5px] leading-relaxed">
                  {logs.length ? (
                    logs.map((l, i) => (
                      <div
                        key={i}
                        className={cn(
                          "whitespace-pre-wrap",
                          l.includes("✓")
                            ? "text-emerald-300/90"
                            : l.includes("✗")
                              ? "text-rose-300/90"
                              : l.includes("⚠")
                                ? "text-amber-300/80"
                                : "text-slate-400"
                        )}
                      >
                        {l}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600">Логи появятся после запуска парсинга…</span>
                  )}
                  {busy && (
                    <div className="accent-text mt-1 flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      работаю…
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-[10.5px] leading-relaxed text-slate-500">
                  <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Если видите «маркеры не найдены» — переключитесь на <b>⚙️ Свой UA</b> и выберите
                    Happ или V2RayNG. «forbidden host» — SSRF-guard: ссылка ведёт на приватный IP.
                    «remnawave_stats» — нужна ссылка-подписка, а не страница статистики.
                  </span>
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
