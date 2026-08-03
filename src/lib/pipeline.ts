/**
 * Клиентская пост-обработка ответа подписки — 9 слоёв,
 * повторяющих поведение парсера c.kfwl.lol.
 */
import {
  CLIENT_PROFILES,
  UA_FALLBACK_CHAIN,
  autoParse,
  fetchSubscription,
  happDecrypt,
  incyDecrypt,
  makeHwid,
  type CryptSource,
} from "./api";
import { b64decode, parseInput } from "./parse";

export type LogFn = (msg: string) => void;

export const KEY_RE =
  /(?:vless|vmess|trojan|ss|ssr|hy2|hysteria2?|tuic|wireguard|naive\+?[a-z]*):\/\/\S+/gi;

/* ---------------------------- 1. unwrapHtmlSub ---------------------------- */

export function unwrapHtmlSub(text: string): string {
  if (!/<\s*(html|body|pre|br|div|a\s)/i.test(text)) return text;
  const doc = new DOMParser().parseFromString(text, "text/html");

  // deeplink-кнопки: happ://add-sub/…, clash://install-config?url=…
  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.href);
  const deep = links.find((h) => /^(happ|clash|sing-box|v2rayng|hiddify|streisand|incy):/i.test(h));

  const pre = doc.querySelector("pre")?.textContent?.trim();
  const body = doc.body?.textContent?.replace(/\u00a0/g, " ").trim() || "";
  const best = [pre, body].find((t) => t && KEY_RE.test(t));
  KEY_RE.lastIndex = 0;

  if (best) return best;
  if (deep) return decodeURIComponent(deep);
  return pre || body || text;
}

/* ------------------------------ 2. detectApp ------------------------------ */

export function detectApp(text: string): string | null {
  const markers: [RegExp, string][] = [
    [/happ/i, "happ"],
    [/incy/i, "incy"],
    [/v2raytun/i, "v2raytun"],
    [/v2rayng/i, "v2rayng"],
    [/clash[\s-]?meta|mihomo/i, "clashmeta"],
    [/sing[\s-]?box/i, "singbox"],
    [/nekobox|nekoray/i, "nekobox"],
    [/throne/i, "throne"],
  ];
  for (const [re, id] of markers) if (re.test(text)) return id;
  return null;
}

/* --------------------------- 6. decodeSub (b64) --------------------------- */

export function decodeSub(text: string): string {
  const t = text.trim();
  if (t.includes("://")) return t;
  if (!/^[A-Za-z0-9+/=_\-\s]+$/.test(t) || t.length < 24) return t;
  try {
    const decoded = b64decode(t);
    return decoded.includes("://") ? decoded : t;
  } catch {
    return t;
  }
}

/* ------------------------ JSON-обёртки Happ и др. ------------------------- */

export function unwrapJson(text: string): string {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return t;
  try {
    const data = JSON.parse(t);
    if (typeof data === "string") return data;
    const fields = ["sub", "subscription", "configs", "servers", "data", "proxies", "links"];
    for (const f of fields) {
      const v = (data as Record<string, unknown>)[f];
      if (typeof v === "string" && (v.includes("://") || v.length > 40)) return v;
      if (Array.isArray(v)) {
        const strings = v.filter((x) => typeof x === "string") as string[];
        if (strings.length) return strings.join("\n");
        if (v.length && typeof v[0] === "object") return JSON.stringify(v);
      }
    }
    if (Array.isArray(data) && data.every((x) => typeof x === "string")) return data.join("\n");
    return t;
  } catch {
    return t;
  }
}

/* ------------------------- 4/5. crypt-резолверы --------------------------- */

export async function resolveIncy(text: string, log: LogFn): Promise<string> {
  const m = text.match(/incy:\/\/crypt1\/\S+/i);
  if (!m) return text;
  log(`найден INCY crypt1 — расшифровываю`);
  const plain = await incyDecrypt(m[0]);
  log(`← incy: ${plain.slice(0, 60)}…`);
  return plain;
}

export async function resolveHapp(
  text: string,
  source: CryptSource,
  log: LogFn
): Promise<string> {
  const m = text.match(/happ:\/\/crypt\d?\/\S+/i);
  if (!m) return text;
  log(`найден Happ Crypt — источник: ${source}`);
  const plain = await happDecrypt(m[0], source);
  log(`← happ: ${plain.slice(0, 60)}…`);
  return plain;
}

/* --------------------------- финальные фолбэки ---------------------------- */

export function regexFallback(text: string): string {
  KEY_RE.lastIndex = 0;
  const found = text.match(KEY_RE);
  return found?.length ? found.join("\n") : "";
}

export function base64Fallback(text: string): string {
  try {
    const decoded = b64decode(text.replace(/\s+/g, ""));
    return regexFallback(decoded) || (decoded.includes("://") ? decoded : "");
  } catch {
    return "";
  }
}

/* ----------------------------- главный пайплайн ---------------------------- */

export interface RunOptions {
  mode: "auto" | "custom" | "noua";
  ua?: string;
  hwid?: string;
  headers?: Record<string, string>;
  cryptSource: CryptSource;
  log: LogFn;
}

export interface RunResult {
  content: string;
  count: number;
  suggestedHwid?: string;
  via: string;
}

const countKeys = (text: string) => parseInput(text).nodes.length;

export async function runParser(input: string, o: RunOptions): Promise<RunResult> {
  const { log } = o;
  const raw = input.trim();
  let text = raw;
  let via: string = o.mode;
  let suggestedHwid: string | undefined;

  // Вход может быть не ссылкой, а сразу crypt-строкой или блобом
  const isUrl = /^https?:\/\//i.test(raw);

  if (isUrl) {
    if (o.mode === "auto") {
      log(`→ POST /api/incy/parser/auto · ${raw}`);
      try {
        const res = await autoParse(raw);
        (res.log || []).forEach((l) => log(`  ${l.t ? l.t + " " : ""}${l.msg}`));
        if (res.remnawave_stats)
          log("⚠ это страница статистики Remnawave — нужна ссылка-подписка из кнопки «Подписка»");
        if (res.ok && res.content) {
          text = res.content;
          suggestedHwid = res.suggested_hwid;
          via = "auto";
          log(`✓ сервер вернул ${text.length} симв.`);
        } else {
          log(`⚠ авто-режим не справился: ${res.error || "пусто"} — включаю UA-фолбэк`);
          text = "";
        }
      } catch (e) {
        log(`⚠ ошибка авто-режима: ${(e as Error).message}`);
        text = "";
      }
    } else {
      const ua = o.mode === "noua" ? undefined : o.ua;
      log(`→ GET /api/fetch · ua=${ua || "(нет)"} hwid=${o.hwid || "—"}`);
      text = await fetchSubscription(raw, { ua, hwid: o.hwid, headers: o.headers });
      log(`← получено ${text.length} симв.`);
    }

    // слой 2+3: маркеры клиента и цепочка UA
    if (!text || (!KEY_RE.test(text) && (KEY_RE.lastIndex = 0) === 0)) {
      const marker = text ? detectApp(text) : null;
      const chain = marker ? [marker, ...UA_FALLBACK_CHAIN] : UA_FALLBACK_CHAIN;
      if (text) log(marker ? `detected: маркер ${marker}` : "⚠ маркеры не найдены — UA-фолбэк");

      for (const id of [...new Set(chain)]) {
        const profile = CLIENT_PROFILES.find((p) => p.id === id);
        if (!profile) continue;
        const hwid = o.hwid || makeHwid(profile.hwid);
        log(`→ UA=${profile.ua}, HWID=${hwid} (${profile.hwid})`);
        try {
          const attempt = await fetchSubscription(raw, {
            ua: profile.ua,
            hwid,
            headers: o.headers,
          });
          const cleaned = decodeSub(unwrapJson(unwrapHtmlSub(attempt)));
          const n = countKeys(cleaned);
          log(`← ${profile.id}: ${attempt.length} симв., ключей: ${n}`);
          if (n > 0) {
            text = cleaned;
            via = profile.id;
            suggestedHwid = hwid;
            log(`✓ UA=${profile.id} дал валидную подписку`);
            break;
          }
        } catch (e) {
          log(`  ✗ ${profile.id}: ${(e as Error).message}`);
        }
      }
    }
  } else {
    log("вход не URL — обрабатываю как текст/крипт-ссылку");
  }

  // слой 1: html
  const beforeHtml = text.length;
  text = unwrapHtmlSub(text);
  if (text.length !== beforeHtml) log(`unwrapHtmlSub: ${beforeHtml} → ${text.length} симв.`);

  // json-обёртки
  text = unwrapJson(text);

  // слои 4-5: крипт
  text = await resolveIncy(text, log);
  text = await resolveHapp(text, o.cryptSource, log);

  // если крипт вернул URL подписки — рекурсивно тянем
  if (/^https?:\/\/\S+$/.test(text.trim()) && text.trim() !== raw) {
    log(`крипт вернул URL — тяну подписку: ${text.trim().slice(0, 70)}`);
    try {
      text = await fetchSubscription(text.trim(), { ua: o.ua, hwid: o.hwid, headers: o.headers });
    } catch (e) {
      log(`  ✗ ${(e as Error).message}`);
    }
  }

  // слой 6: base64
  text = decodeSub(text);

  // слой 7: основной парсер
  let count = countKeys(text);
  log(`autoParse: ключей ${count}`);

  // слой 8: regex
  if (!count) {
    const rx = regexFallback(text);
    if (rx) {
      text = rx;
      count = countKeys(text);
      log(`regex-fallback: ключей ${count}`);
    }
  }

  // слой 9: base64 всей строки
  if (!count) {
    const b = base64Fallback(text);
    if (b) {
      text = b;
      count = countKeys(text);
      log(`base64-fallback: ключей ${count}`);
    }
  }

  if (!count) log("✗ все 9 слоёв пройдены вхолостую");
  else log(`✓ парсинг ОК: ${count} ключей`);

  return { content: text.trim(), count, suggestedHwid, via };
}
