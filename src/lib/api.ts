/**
 * Клиент публичного API c.kfwl.lol (документация: github.com/prominbro/Converter).
 * Все ответы CORS-открытые, поэтому запросы идут прямо из браузера.
 */

export const API_HOSTS = ["https://c.kfwl.lol", "https://kfwl.lol"];

let preferred = 0;

async function call(path: string, init?: RequestInit, timeout = 25000): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < API_HOSTS.length; i++) {
    const host = API_HOSTS[(preferred + i) % API_HOSTS.length];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(host + path, { ...init, signal: ctrl.signal });
      preferred = (preferred + i) % API_HOSTS.length;
      return res;
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    lastError instanceof Error && lastError.name === "AbortError"
      ? "Таймаут запроса к API"
      : "API недоступен (сеть или блокировка)"
  );
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ------------------------- GET /api/fetch — прокси ------------------------- */

export interface FetchSubOptions {
  ua?: string;
  hwid?: string;
  headers?: Record<string, string>;
}

export async function fetchSubscription(
  url: string,
  opts: FetchSubOptions = {}
): Promise<string> {
  const q = new URLSearchParams({ url });
  if (opts.ua) q.set("ua", opts.ua);
  if (opts.hwid) q.set("hwid", opts.hwid);
  if (opts.headers && Object.keys(opts.headers).length)
    q.set("headers", JSON.stringify(opts.headers));

  const res = await call(`/api/fetch?${q.toString()}`);
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try {
      const j = JSON.parse(text);
      detail = j.error || j.detail || detail;
    } catch {
      /* plain text */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return text;
}

export async function selftest(): Promise<Record<string, unknown>> {
  const res = await call("/api/fetch?selftest=1", undefined, 10000);
  return res.json();
}

/* ------------------- POST /api/fetch — шифрование Happ -------------------- */

export async function happEncrypt(url: string): Promise<string> {
  const res = await call("/api/fetch", json({ url }));
  const text = (await res.text()).trim();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 160)}`);
  return text;
}

/* --------------------------- Crypt: happ / incy --------------------------- */

export type CryptSource = "auto" | "api" | "local";

export async function happDecryptLocal(link: string): Promise<string> {
  const res = await call("/api/incy/happ-local", json({ link }));
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Не удалось расшифровать Crypt5");
  return String(data.plain ?? data.url ?? "");
}

export async function incyDecrypt(link: string): Promise<string> {
  const res = await call("/api/incy/decrypt", json({ link }));
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Не удалось расшифровать INCY");
  return String(data.url ?? data.plain ?? "");
}

export async function incyHealth(): Promise<{ ok: boolean; binary?: string; version?: string }> {
  const res = await call("/api/incy/health", undefined, 8000);
  return res.json();
}

/** Расшифровка happ://crypt5/… с учётом выбранного источника. */
export async function happDecrypt(link: string, source: CryptSource): Promise<string> {
  if (source === "local") return happDecryptLocal(link);
  if (source === "api") {
    // онлайн-путь идёт через тот же прокси, но без локального сайдкара
    const res = await call("/api/fetch", json({ url: link }));
    const text = (await res.text()).trim();
    if (!res.ok || !text) throw new Error("API расшифровки недоступен");
    return text;
  }
  try {
    const res = await call("/api/fetch", json({ url: link }));
    const text = (await res.text()).trim();
    if (res.ok && text && !text.startsWith("{")) return text;
    throw new Error("fallback");
  } catch {
    return happDecryptLocal(link);
  }
}

/* --------------------- POST /api/incy/parser/auto ------------------------- */

export interface AutoParseResult {
  ok: boolean;
  content?: string;
  suggested_hwid?: string;
  hwid_format?: string;
  remnawave_stats?: boolean;
  error?: string;
  log?: { t: string; msg: string }[];
}

export async function autoParse(url: string): Promise<AutoParseResult> {
  const res = await call("/api/incy/parser/auto", json({ url }), 40000);
  return res.json();
}

/* ------------------------------ ALTCHA (PoW) ------------------------------ */

export interface Challenge {
  algorithm: string;
  challenge: string;
  maxnumber?: number;
  salt: string;
  signature: string;
}

export async function getChallenge(): Promise<Challenge> {
  const res = await call("/api/challenge", undefined, 15000);
  if (!res.ok) throw new Error("Не удалось получить challenge");
  return res.json();
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Решает proof-of-work: ищет число n, при котором SHA-256(salt+n) === challenge. */
export async function solveChallenge(
  c: Challenge,
  onProgress?: (n: number, max: number) => void
): Promise<string> {
  const max = c.maxnumber ?? 1_000_000;
  const started = performance.now();
  for (let n = 0; n <= max; n++) {
    if (n % 5000 === 0) {
      onProgress?.(n, max);
      await new Promise((r) => setTimeout(r, 0));
    }
    if ((await sha256Hex(c.salt + n)) === c.challenge) {
      const payload = {
        algorithm: c.algorithm,
        challenge: c.challenge,
        number: n,
        salt: c.salt,
        signature: c.signature,
        took: Math.round(performance.now() - started),
      };
      return btoa(JSON.stringify(payload));
    }
  }
  throw new Error("Не удалось решить проверку");
}

/* ------------------------------ YouTube (dl) ------------------------------ */

export type Quality = "max" | "1080" | "720" | "480" | "360";

export function buildDownloadUrl(url: string, q: Quality, altcha: string, token?: string) {
  const params = new URLSearchParams({ url, q, altcha });
  if (token) params.set("t", token);
  return `${API_HOSTS[preferred]}/api/dl?${params.toString()}`;
}

export const YT_HOST_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com)\//i;

/* -------------------------- эмуляция клиентов ----------------------------- */

export type HwidKind = "alnum16" | "uuid" | "hex16" | "none";

export interface ClientProfile {
  id: string;
  name: string;
  ua: string;
  hwid: HwidKind;
  extra?: string;
}

export const CLIENT_PROFILES: ClientProfile[] = [
  { id: "happ", name: "Happ", ua: "Happ/3.24.0/Android", hwid: "alnum16", extra: "x-hwid" },
  { id: "incy", name: "INCY", ua: "INCY/3.2.2/android", hwid: "uuid", extra: "x-hwid" },
  { id: "v2raytun", name: "V2RayTUN", ua: "v2raytun/5.23.74/android", hwid: "uuid" },
  { id: "v2rayng", name: "V2RayNG", ua: "v2rayNG/1.10.7", hwid: "hex16" },
  { id: "clashmeta", name: "Clash Meta", ua: "ClashMetaForAndroid/2.11.7.Meta", hwid: "uuid" },
  { id: "singbox", name: "sing-box", ua: "sing-box/1.11.0", hwid: "uuid" },
  { id: "nekobox", name: "NekoBox", ua: "NekoBox/1.3.7", hwid: "hex16" },
  { id: "throne", name: "Throne", ua: "Throne/1.0.0", hwid: "uuid" },
];

/** Порядок UA-фолбэка, как в оригинальном парсере. */
export const UA_FALLBACK_CHAIN = ["happ", "incy", "v2raytun", "clashmeta"];

export function makeHwid(kind: HwidKind): string {
  const bytes = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  switch (kind) {
    case "uuid":
      return crypto.randomUUID();
    case "hex16":
      return bytes(8);
    case "alnum16": {
      const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => abc[b % abc.length])
        .join("");
    }
    default:
      return "";
  }
}
