import { useRef, useState } from "react";
import { generate } from "../../lib/export";
import { DNS_PROVIDERS, dohResolve, ipInfo, isIp } from "../../lib/net";
import { buildUri, parseInput } from "../../lib/parse";
import type { ProxyNode } from "../../lib/types";
import { Btn, Check, CopyBtn, Label, Panel, Result, Segmented, TextArea, TextInput } from "../kit";
import { toast } from "../ui";

const flagOf = (cc?: string) =>
  cc && cc.length === 2
    ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : "🏳️";

/* --------------------------- Автоназвания по стране --------------------------- */

export function AutoNameTool({ onSend }: { onSend?: (text: string) => void }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [dns, setDns] = useState("cloudflare");
  const [format, setFormat] = useState<"uri" | "xray" | "singbox">("uri");
  const [numbering, setNumbering] = useState(true);
  const [append, setAppend] = useState(false);
  const [noResolve, setNoResolve] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    const parsed = parseInput(input);
    if (!parsed.nodes.length) return toast("Не найдено ни одного узла", "err");
    setBusy(true);
    setProgress(0);

    const cache = new Map<string, { cc?: string; country?: string }>();
    const counters = new Map<string, number>();
    const result: ProxyNode[] = [];

    for (let i = 0; i < parsed.nodes.length; i++) {
      const n = parsed.nodes[i];
      let cc: string | undefined;
      let countryName: string | undefined;

      if (!noResolve) {
        const key = n.server;
        if (cache.has(key)) {
          ({ cc, country: countryName } = cache.get(key)!);
        } else {
          try {
            let ip = key;
            if (!isIp(key)) {
              const ans = await dohResolve(key, "A", dns);
              ip = ans.find((a) => isIp(a.data))?.data || "";
            }
            if (ip) {
              const info = await ipInfo(ip);
              cc = info.countryCode;
              countryName = info.country;
            }
          } catch {
            /* fallback to heuristic */
          }
          cache.set(key, { cc, country: countryName });
        }
      }

      const flag = cc ? flagOf(cc) : n.flag || "🏳️";
      const label = cc ? `${flag} ${cc}` : `${flag} ${(n.country || "NA").toUpperCase()}`;
      const base = append ? `${label} · ${n.name}` : label;
      let name = base;
      if (numbering) {
        const c = (counters.get(base) || 0) + 1;
        counters.set(base, c);
        name = `${base} ${c}`;
      }
      const renamed: ProxyNode = { ...n, name, flag, country: cc || n.country };
      renamed.raw = buildUri(renamed);
      result.push(renamed);
      setProgress(Math.round(((i + 1) / parsed.nodes.length) * 100));
    }

    setOut(
      format === "uri"
        ? generate("uri", result)
        : format === "xray"
          ? generate("xray", result)
          : generate("singbox", result)
    );
    setBusy(false);
    toast(`Переименовано узлов: ${result.length}`);
  };

  return (
    <Panel
      title="Автоназвания"
      subtitle="Страна и флаг по IP/домену · URL · JSON · массивы · из файла"
      icon="wand"
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>DNS для доменов</Label>
          <Segmented
            id="an-dns"
            size="sm"
            value={dns}
            onChange={setDns}
            options={DNS_PROVIDERS.slice(0, 5).map((d) => ({ id: d.id, label: d.name }))}
          />
        </div>
        <div>
          <Label>Формат результата</Label>
          <Segmented
            id="an-fmt"
            size="sm"
            value={format}
            onChange={setFormat}
            options={[
              { id: "uri", label: "URL" },
              { id: "xray", label: "Xray" },
              { id: "singbox", label: "Sing-box" },
            ]}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-4">
        <Check checked={numbering} onChange={setNumbering} label="нумеровать повторы" />
        <Check checked={append} onChange={setAppend} label="дописывать к старому имени" />
        <Check checked={noResolve} onChange={setNoResolve} label="без резолва (по имени)" />
      </div>

      <Label>Ввод</Label>
      <TextArea value={input} onChange={setInput} rows={6} placeholder="Ссылки, JSON-конфиг или YAML…" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="accent" icon="wand" loading={busy} onClick={run}>
          Переименовать по стране
        </Btn>
        <Btn icon="upload" onClick={() => fileRef.current?.click()}>
          Файл
        </Btn>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".txt,.json,.yaml,.yml,text/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setInput(String(r.result || ""));
            r.readAsText(f);
          }}
        />
        <Btn variant="danger" icon="trash" onClick={() => { setInput(""); setOut(""); }} />
        {busy && <span className="accent-text text-xs font-mono">{progress}%</span>}
        <span className="ml-auto flex gap-2">
          <CopyBtn text={out} />
          {onSend && (
            <Btn icon="arrow" onClick={() => out && onSend(out)}>
              В «Ввод»
            </Btn>
          )}
        </span>
      </div>

      <div className="mt-3">
        <Label>Результат</Label>
        <Result value={out} rows={7} />
      </div>
    </Panel>
  );
}

/* -------------------------------- Именование ------------------------------- */

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

export function NamingTab({ onSend }: { onSend?: (text: string) => void }) {
  const [links, setLinks] = useState("");
  const [name, setName] = useState("");
  const [numbered, setNumbered] = useState(true);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [rxFind, setRxFind] = useState("");
  const [rxRepl, setRxRepl] = useState("");
  const [stripEmoji, setStripEmoji] = useState(false);
  const [keepFlag, setKeepFlag] = useState(true);
  const [format, setFormat] = useState<"uri" | "clash" | "singbox" | "base64">("uri");
  const [out, setOut] = useState("");

  const apply = () => {
    const parsed = parseInput(links);
    if (!parsed.nodes.length) return toast("Не найдено ни одного ключа", "err");

    let rx: RegExp | null = null;
    if (rxFind.trim()) {
      try {
        rx = new RegExp(rxFind, "gu");
      } catch {
        return toast("Некорректное регулярное выражение", "err");
      }
    }

    const renamed = parsed.nodes.map((n, i) => {
      let label = name.trim() ? name.trim() : n.name;
      if (rx) label = label.replace(rx, rxRepl);
      if (stripEmoji) label = label.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
      if (keepFlag && n.flag && !label.includes(n.flag)) label = `${n.flag} ${label}`;
      if (prefix.trim()) label = `${prefix.trim()} ${label}`;
      if (suffix.trim()) label = `${label} ${suffix.trim()}`;
      if (numbered) label = `${label} ${i + 1}`;
      const node = { ...n, name: label.replace(/\s{2,}/g, " ").trim() };
      node.raw = buildUri(node);
      return node;
    });

    setOut(generate(format, renamed));
    toast(`Переименовано: ${renamed.length}`);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Массовое переименование"
        subtitle="Regex · префикс/суффикс · нумерация · флаги GeoIP · удаление эмодзи"
        icon="wand"
      >
        <Label>URL ключи (по одному на строку)</Label>
        <TextArea value={links} onChange={setLinks} rows={8} placeholder="vless://…&#10;vmess://…&#10;trojan://…" />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Новое название (пусто = оставить)</Label>
            <TextInput value={name} onChange={setName} placeholder="WVF · Node" />
          </div>
          <div className="flex items-end gap-4 pb-2">
            <Check checked={numbered} onChange={setNumbered} label="Нумерация" />
            <Check checked={keepFlag} onChange={setKeepFlag} label="Флаги" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Префикс</Label>
            <TextInput value={prefix} onChange={setPrefix} placeholder="🚀" />
          </div>
          <div>
            <Label>Суффикс</Label>
            <TextInput value={suffix} onChange={setSuffix} placeholder="· premium" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Regex — найти</Label>
            <TextInput value={rxFind} onChange={setRxFind} placeholder="\\s*\\|.*$" mono />
          </div>
          <div>
            <Label>Regex — заменить на</Label>
            <TextInput value={rxRepl} onChange={setRxRepl} placeholder="(пусто)" mono />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Check checked={stripEmoji} onChange={setStripEmoji} label="Удалить эмодзи" />
          <div className="ml-auto">
            <Segmented
              id="rename-fmt"
              size="sm"
              value={format}
              onChange={setFormat}
              options={[
                { id: "uri", label: "URL" },
                { id: "clash", label: "Clash" },
                { id: "singbox", label: "Sing-box" },
                { id: "base64", label: "Base64" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="accent" icon="check" onClick={apply}>
            Применить
          </Btn>
          <CopyBtn text={out} />
          {onSend && (
            <Btn icon="arrow" onClick={() => out && onSend(out)}>
              В «Ввод»
            </Btn>
          )}
          <Btn variant="danger" icon="trash" onClick={() => { setLinks(""); setOut(""); }} />
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Результат" subtitle="Готовые ключи с новыми именами" icon="layers">
          <Result value={out} rows={11} />
        </Panel>
        <AutoNameTool onSend={onSend} />
      </div>
    </div>
  );
}
