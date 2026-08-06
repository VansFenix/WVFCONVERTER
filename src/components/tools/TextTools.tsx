import { useState } from "react";
import { happDecrypt, happEncrypt, incyDecrypt, incyHealth, type CryptSource } from "../../lib/api";
import { decryptPayload, encryptPayload, type CryptScheme } from "../../lib/crypt";
import { b64decode, b64encode } from "../../lib/parse";
import { Btn, Check, CopyBtn, Label, Panel, Result, Segmented, TextArea, TextInput } from "../kit";
import { toast } from "../ui";

/* --------------------------------- Base64 --------------------------------- */

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);

  const encode = () => {
    if (!input.trim()) return toast("Введите текст", "err");
    let v = b64encode(input);
    if (urlSafe) v = v.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setOut(v);
  };
  const decode = () => {
    try {
      setOut(b64decode(input));
    } catch {
      toast("Это не похоже на base64", "err");
    }
  };

  return (
    <Panel title="Base64" subtitle="Шифрование и расшифровка подписок и любого текста" icon="lock">
      <Label>Ввод</Label>
      <TextArea value={input} onChange={setInput} rows={6} placeholder="Текст, подписка или base64-строка…" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="accent" icon="lock" onClick={encode}>
          Шифровать
        </Btn>
        <Btn icon="code" onClick={decode}>
          Расшифровать
        </Btn>
        <Check checked={urlSafe} onChange={setUrlSafe} label="URL-safe" />
        <span className="ml-auto flex gap-2">
          <CopyBtn text={out} />
          <Btn variant="danger" icon="trash" onClick={() => { setInput(""); setOut(""); }} />
        </span>
      </div>
      <div className="mt-3">
        <Label>Результат</Label>
        <Result value={out} rows={6} />
      </div>
    </Panel>
  );
}

/* ---------------------------- Crypt (Happ / INCY) --------------------------- */

export function CryptTool() {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [pass, setPass] = useState("");
  const [source, setSource] = useState<CryptSource>("auto");
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<string>("");
  const [offline, setOffline] = useState(false);

  const decrypt = async () => {
    const link = input.trim();
    if (!link) return toast("Введите ссылку", "err");
    setBusy(true);
    try {
      if (offline) {
        setOut(await decryptPayload(link, pass));
        return toast("Расшифровано офлайн (AES-256-GCM)");
      }
      if (/incy:\/\/crypt/i.test(link)) {
        setOut(await incyDecrypt(link));
        return toast("INCY crypt1 расшифрован");
      }
      if (/happ:\/\/crypt/i.test(link)) {
        setOut(await happDecrypt(link, source));
        return toast(`Happ Crypt расшифрован (${source})`);
      }
      setOut(await decryptPayload(link, pass));
      toast("Расшифровано локальным AES");
    } catch (e) {
      toast((e as Error).message || "Неверный ключ или формат", "err");
    } finally {
      setBusy(false);
    }
  };

  const encrypt = async (scheme: CryptScheme) => {
    const value = input.trim();
    if (!value) return toast("Введите ссылку", "err");
    setBusy(true);
    try {
      if (scheme === "happ" && !offline) {
        setOut(await happEncrypt(value));
        toast("Зашифровано через crypto.happ.su");
      } else {
        setOut(await encryptPayload(value, pass, scheme));
        toast(`Зашифровано локально в ${scheme.toUpperCase()}`);
      }
    } catch (e) {
      toast((e as Error).message || "Сервис шифрования недоступен", "err");
    } finally {
      setBusy(false);
    }
  };

  const checkHealth = async () => {
    try {
      const h = await incyHealth();
      setHealth(h.ok ? `sidecar ok · ${h.binary || ""} ${h.version || ""}` : "sidecar недоступен");
    } catch {
      setHealth("API не отвечает");
    }
  };

  return (
    <Panel
      title="Crypt — Happ & INCY"
      subtitle="happ://crypt5/ через crypto.happ.su · incy://crypt1/ через сайдкар (AES-256-GCM)"
      icon="shield"
      right={
        <button
          onClick={checkHealth}
          className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-white/10 hover:text-white"
        >
          health
        </button>
      }
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Источник</Label>
          <Segmented
            id="crypt-src"
            size="sm"
            value={source}
            onChange={setSource}
            options={[
              { id: "auto", label: "Авто", hint: "онлайн, при фейле — локальный бинарь" },
              { id: "api", label: "API", hint: "только kfwl.lol/api" },
              { id: "local", label: "Local", hint: "только Rust-сайдкар" },
            ]}
          />
        </div>
        <div>
          <Label>Ключ для офлайн-режима</Label>
          <TextInput value={pass} onChange={setPass} placeholder="пусто = стандартный ключ" mono />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Check checked={offline} onChange={setOffline} label="Офлайн-режим (свой AES, без API)" />
        {health && <span className="accent-text font-mono text-[10.5px]">{health}</span>}
      </div>

      <Label>Ввод</Label>
      <TextArea
        value={input}
        onChange={setInput}
        rows={5}
        placeholder="happ://crypt5/… · incy://crypt1/… · https://sub.example/abc"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="accent" icon="eye" loading={busy} onClick={decrypt}>
          Расшифровать
        </Btn>
        <Btn icon="lock" loading={busy} onClick={() => encrypt("happ")}>
          Зашифровать в Happ
        </Btn>
        <Btn icon="lock" loading={busy} onClick={() => encrypt("incy")}>
          Зашифровать в INCY
        </Btn>
        <span className="ml-auto flex gap-2">
          <CopyBtn text={out} />
          <Btn variant="danger" icon="trash" onClick={() => { setInput(""); setOut(""); }} />
        </span>
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
        Расшифровка Crypt5 идёт через <b>/api/incy/happ-local</b> (локальный бинарь на сервере) или
        онлайн-путь — по выбору «Источника». INCY crypt1 всегда через <b>/api/incy/decrypt</b>.
        Офлайн-режим считает AES-256-GCM целиком в браузере.
      </p>

      <div className="mt-3">
        <Label>Результат</Label>
        <Result value={out} rows={5} />
      </div>
    </Panel>
  );
}

/* ------------------------------- URL decrypt ------------------------------- */

export function UrlCodecTool() {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [plusAsSpace, setPlusAsSpace] = useState(true);

  const decode = () => {
    try {
      const src = plusAsSpace ? input.replace(/\+/g, " ") : input;
      setOut(decodeURIComponent(src));
    } catch {
      toast("Некорректные %-последовательности", "err");
    }
  };
  const encode = () => setOut(encodeURIComponent(input));
  const pretty = () => {
    try {
      setOut(JSON.stringify(JSON.parse(input.trim()), null, 2));
      toast("JSON отформатирован");
    } catch {
      toast("Это не валидный JSON", "err");
    }
  };
  const minify = () => {
    try {
      setOut(JSON.stringify(JSON.parse(input.trim())));
      toast("JSON сжат");
    } catch {
      toast("Это не валидный JSON", "err");
    }
  };

  return (
    <Panel
      title="Декрипт URL"
      subtitle="Раскодировать %-последовательности, напр. %3A → :"
      icon="code"
    >
      <Label>Ввод</Label>
      <TextArea value={input} onChange={setInput} rows={5} placeholder="vless%3A%2F%2F… или обычный текст" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn variant="accent" icon="code" onClick={decode}>
          Декодировать
        </Btn>
        <Btn icon="code" onClick={encode}>
          Кодировать
        </Btn>
        <Btn icon="layers" onClick={pretty}>
          JSON pretty
        </Btn>
        <Btn icon="layers" onClick={minify}>
          JSON minify
        </Btn>
        <Check checked={plusAsSpace} onChange={setPlusAsSpace} label="+ как пробел" />
        <span className="ml-auto flex gap-2">
          <CopyBtn text={out} />
          <Btn variant="danger" icon="trash" onClick={() => { setInput(""); setOut(""); }} />
        </span>
      </div>
      <div className="mt-3">
        <Label>Результат</Label>
        <Result value={out} rows={5} />
      </div>
    </Panel>
  );
}
