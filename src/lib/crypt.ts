import { b64decode, b64encode } from "./parse";
import type { ProxyNode } from "./types";

/* --------------------------- base64url utilities --------------------------- */

export const toB64Url = (s: string) =>
  b64encode(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const fromB64Url = (s: string) => b64decode(s);

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64ToBytes(s: string) {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? "=".repeat(4 - (norm.length % 4)) : "";
  const bin = atob(norm + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/* ------------------------ AES-256-GCM (INCY / Happ) ------------------------ */

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export type CryptScheme = "incy" | "happ";

const PREFIX: Record<CryptScheme, string> = {
  incy: "incy://crypt1/",
  happ: "happ://crypt1/",
};

export async function encryptPayload(
  text: string,
  passphrase: string,
  scheme: CryptScheme
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase || "wvfconverter", salt);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      new TextEncoder().encode(text)
    )
  );
  const blob = new Uint8Array(salt.length + iv.length + cipher.length);
  blob.set(salt, 0);
  blob.set(iv, salt.length);
  blob.set(cipher, salt.length + iv.length);
  return PREFIX[scheme] + bytesToB64(blob);
}

export async function decryptPayload(link: string, passphrase: string): Promise<string> {
  let body = link.trim();
  for (const p of Object.values(PREFIX)) if (body.startsWith(p)) body = body.slice(p.length);
  body = body.replace(/^\w+:\/\/[\w-]*\/?/, (m) => (/crypt/.test(m) ? "" : m));
  const raw = b64ToBytes(body);
  if (raw.length < 30) throw new Error("Слишком короткая полезная нагрузка");
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const data = raw.slice(28);
  const key = await deriveKey(passphrase || "wvfconverter", salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return new TextDecoder().decode(plain);
}

/* --------------------------------- qWDTT --------------------------------- */
/* Компактный контейнер подписки: JSON-массив узлов, упакованный в base64url  */

export interface QwdttPayload {
  v: number;
  gen: string;
  ts: number;
  count: number;
  nodes: {
    t: string;
    n: string;
    s: string;
    p: number;
    id?: string;
    pw?: string;
    net?: string;
    sec?: string;
    sni?: string;
    path?: string;
    host?: string;
    pbk?: string;
    sid?: string;
    fp?: string;
    flow?: string;
    m?: string;
  }[];
}

export function toQwdttPayload(nodes: ProxyNode[]): QwdttPayload {
  return {
    v: 1,
    gen: "WVFCONVERTER",
    ts: Math.floor(Date.now() / 1000),
    count: nodes.length,
    nodes: nodes.map((n) => ({
      t: n.type,
      n: n.name,
      s: n.server,
      p: n.port,
      id: n.uuid,
      pw: n.password,
      net: n.network,
      sec: n.security,
      sni: n.sni,
      path: n.path,
      host: n.host,
      pbk: n.publicKey,
      sid: n.shortId,
      fp: n.fingerprint,
      flow: n.flow,
      m: n.cipher,
    })),
  };
}

export type QwdttMode = "qwdtt" | "json" | "wdtt";

export function toQwdtt(nodes: ProxyNode[], mode: QwdttMode): string {
  const payload = toQwdttPayload(nodes);
  const json = JSON.stringify(payload);
  if (mode === "json") return JSON.stringify(payload, null, 2);
  const prefix = mode === "wdtt" ? "wdtt://" : "qwdtt://";
  return prefix + toB64Url(json);
}

export function fromQwdtt(link: string): QwdttPayload {
  const body = link.trim().replace(/^q?wdtt:\/\//i, "");
  return JSON.parse(fromB64Url(body));
}
