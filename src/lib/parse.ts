import type { ParseResult, Protocol, ProxyNode } from "./types";

/* ---------------- base64 helpers (utf-8 safe) ---------------- */

export function b64decode(input: string): string {
  const s = input.replace(/[\r\n\s]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function b64encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

/* ---------------- country / flag detection ---------------- */

const COUNTRIES: [string, string, RegExp][] = [
  ["US", "🇺🇸", /\b(us|usa|united ?states|america|dallas|miami|seattle|ashburn|new ?york|los ?angeles|сша|америк)\b/i],
  ["DE", "🇩🇪", /\b(de|germany|deutsch|frankfurt|falkenstein|nuremberg|герман)\b/i],
  ["NL", "🇳🇱", /\b(nl|netherlands|holland|amsterdam|нидерл|голланд)\b/i],
  ["GB", "🇬🇧", /\b(uk|gb|england|britain|london|лондон|англи)\b/i],
  ["FR", "🇫🇷", /\b(fr|france|paris|франц)\b/i],
  ["FI", "🇫🇮", /\b(fi|finland|helsinki|финлянд)\b/i],
  ["SE", "🇸🇪", /\b(se|sweden|stockholm|швеци)\b/i],
  ["NO", "🇳🇴", /\b(no|norway|oslo|норвег)\b/i],
  ["RU", "🇷🇺", /\b(ru|russia|moscow|spb|росси|москв|питер)\b/i],
  ["JP", "🇯🇵", /\b(jp|japan|tokyo|osaka|япони)\b/i],
  ["SG", "🇸🇬", /\b(sg|singapore|сингапур)\b/i],
  ["HK", "🇭🇰", /\b(hk|hong ?kong|гонконг)\b/i],
  ["TW", "🇹🇼", /\b(tw|taiwan|тайван)\b/i],
  ["KR", "🇰🇷", /\b(kr|korea|seoul|коре)\b/i],
  ["CN", "🇨🇳", /\b(cn|china|китай)\b/i],
  ["CA", "🇨🇦", /\b(ca|canada|toronto|канад)\b/i],
  ["TR", "🇹🇷", /\b(tr|turkey|turkiye|istanbul|турци)\b/i],
  ["AE", "🇦🇪", /\b(ae|uae|dubai|emirates|оаэ|дубай)\b/i],
  ["PL", "🇵🇱", /\b(pl|poland|warsaw|польш)\b/i],
  ["CH", "🇨🇭", /\b(ch|switzerland|zurich|швейцар)\b/i],
  ["AT", "🇦🇹", /\b(at|austria|vienna|австри)\b/i],
  ["IT", "🇮🇹", /\b(it|italy|milan|итали)\b/i],
  ["ES", "🇪🇸", /\b(es|spain|madrid|испани)\b/i],
  ["CZ", "🇨🇿", /\b(cz|czech|prague|чехи)\b/i],
  ["LV", "🇱🇻", /\b(lv|latvia|riga|латви)\b/i],
  ["LT", "🇱🇹", /\b(lt|lithuania|vilnius|литв)\b/i],
  ["EE", "🇪🇪", /\b(ee|estonia|tallinn|эстон)\b/i],
  ["KZ", "🇰🇿", /\b(kz|kazakh|almaty|казахст)\b/i],
  ["UA", "🇺🇦", /\b(ua|ukraine|kyiv|украин)\b/i],
  ["AM", "🇦🇲", /\b(am|armenia|yerevan|армени)\b/i],
  ["GE", "🇬🇪", /\b(ge|georgia|tbilisi|грузи)\b/i],
  ["IL", "🇮🇱", /\b(il|israel|израил)\b/i],
  ["IN", "🇮🇳", /\b(in|india|mumbai|инди)\b/i],
  ["AU", "🇦🇺", /\b(au|australia|sydney|австрал)\b/i],
  ["BR", "🇧🇷", /\b(br|brazil|sao ?paulo|бразил)\b/i],
  ["RO", "🇷🇴", /\b(ro|romania|bucharest|румын)\b/i],
  ["MD", "🇲🇩", /\b(md|moldova|chisinau|молдов)\b/i],
  ["VN", "🇻🇳", /\b(vn|vietnam|вьетнам)\b/i],
  ["ID", "🇮🇩", /\b(id|indonesia|jakarta|индонез)\b/i],
];

const EMOJI_FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

function detectCountry(name: string, server: string) {
  const existing = name.match(EMOJI_FLAG);
  if (existing) return { flag: existing[0], country: undefined as string | undefined };
  const hay = `${name} ${server}`;
  for (const [code, flag, re] of COUNTRIES) {
    if (re.test(hay)) return { flag, country: code };
  }
  return { flag: "🏳️", country: undefined };
}

/* ---------------- uri splitting ---------------- */

interface UriParts {
  scheme: string;
  userinfo: string;
  host: string;
  port: number;
  params: URLSearchParams;
  name: string;
}

function splitUri(uri: string): UriParts | null {
  const idx = uri.indexOf("://");
  if (idx < 0) return null;
  const scheme = uri.slice(0, idx).toLowerCase();
  let rest = uri.slice(idx + 3);

  let hash = "";
  const hi = rest.indexOf("#");
  if (hi >= 0) {
    hash = rest.slice(hi + 1);
    rest = rest.slice(0, hi);
  }
  let query = "";
  const qi = rest.indexOf("?");
  if (qi >= 0) {
    query = rest.slice(qi + 1);
    rest = rest.slice(0, qi);
  }
  let userinfo = "";
  const ai = rest.lastIndexOf("@");
  if (ai >= 0) {
    userinfo = rest.slice(0, ai);
    rest = rest.slice(ai + 1);
  }
  rest = rest.replace(/\/+$/, "");

  let host = rest;
  let port = 443;
  if (rest.startsWith("[")) {
    const end = rest.indexOf("]");
    host = rest.slice(0, end + 1);
    const tail = rest.slice(end + 1);
    if (tail.startsWith(":")) port = parseInt(tail.slice(1), 10) || 443;
  } else {
    const ci = rest.lastIndexOf(":");
    if (ci > 0) {
      host = rest.slice(0, ci);
      port = parseInt(rest.slice(ci + 1), 10) || 443;
    }
  }

  return {
    scheme,
    userinfo,
    host,
    port,
    params: new URLSearchParams(query),
    name: hash ? safeDecode(hash) : "",
  };
}

let counter = 0;
const uid = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`;

function base(
  type: Protocol,
  p: UriParts,
  raw: string,
  fallbackName: string
): ProxyNode {
  const name = (p.name || fallbackName).trim();
  const { flag, country } = detectCountry(name, p.host);
  return {
    id: uid(),
    type,
    name,
    server: p.host,
    port: p.port,
    network: "tcp",
    security: "none",
    insecure: false,
    flag,
    country,
    raw,
  };
}

function applyStream(node: ProxyNode, q: URLSearchParams) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = q.get(k);
      if (v !== null && v !== "") return v;
    }
    return undefined;
  };

  const net = (get("type", "net", "network") || "tcp").toLowerCase();
  node.network = net === "h2" ? "h2" : net;

  const sec = (get("security") || "").toLowerCase();
  if (sec === "reality") node.security = "reality";
  else if (sec === "tls" || sec === "xtls") node.security = "tls";
  else node.security = "none";

  node.sni = get("sni", "peer", "servername", "host");
  node.fingerprint = get("fp");
  const alpn = get("alpn");
  if (alpn) node.alpn = alpn.split(",").map((a) => a.trim()).filter(Boolean);
  node.publicKey = get("pbk", "public-key");
  node.shortId = get("sid", "short-id");
  node.spiderX = get("spx");
  node.flow = get("flow");
  node.path = get("path", "serviceName");
  node.host = get("host");
  node.serviceName = get("serviceName", "path");
  node.headerType = get("headerType");
  const insecure = get("allowInsecure", "insecure", "skip-cert-verify");
  node.insecure = insecure === "1" || insecure === "true";
  if (node.security === "none" && (node.publicKey || sec === "reality"))
    node.security = "reality";
  return node;
}

/* ---------------- protocol parsers ---------------- */

function parseVmess(uri: string): ProxyNode | null {
  const body = uri.slice("vmess://".length).trim();
  try {
    const json = JSON.parse(b64decode(body));
    const name = String(json.ps || json.remarks || json.add || "VMess");
    const server = String(json.add || "");
    if (!server) return null;
    const { flag, country } = detectCountry(name, server);
    const tls = String(json.tls || "").toLowerCase();
    const node: ProxyNode = {
      id: uid(),
      type: "vmess",
      name,
      server,
      port: parseInt(String(json.port), 10) || 443,
      uuid: String(json.id || ""),
      alterId: parseInt(String(json.aid ?? 0), 10) || 0,
      cipher: String(json.scy || "auto"),
      network: String(json.net || "tcp").toLowerCase(),
      security: tls === "tls" || tls === "xtls" ? "tls" : "none",
      sni: json.sni || json.host || undefined,
      fingerprint: json.fp || undefined,
      alpn: json.alpn
        ? String(json.alpn).split(",").map((s: string) => s.trim()).filter(Boolean)
        : undefined,
      path: json.path || undefined,
      host: json.host || undefined,
      serviceName: json.path || undefined,
      headerType: json.type || undefined,
      insecure: false,
      flag,
      country,
      raw: uri,
    };
    return node;
  } catch {
    const p = splitUri(uri);
    if (!p) return null;
    const node = base("vmess", p, uri, "VMess");
    node.uuid = p.userinfo;
    node.cipher = "auto";
    node.alterId = 0;
    return applyStream(node, p.params);
  }
}

function parseVless(uri: string): ProxyNode | null {
  const p = splitUri(uri);
  if (!p || !p.host) return null;
  const node = base("vless", p, uri, "VLESS");
  node.uuid = safeDecode(p.userinfo);
  return applyStream(node, p.params);
}

function parseTrojan(uri: string): ProxyNode | null {
  const p = splitUri(uri);
  if (!p || !p.host) return null;
  const node = base("trojan", p, uri, "Trojan");
  node.password = safeDecode(p.userinfo);
  applyStream(node, p.params);
  if (node.security === "none") node.security = "tls";
  return node;
}

function parseSS(uri: string): ProxyNode | null {
  let body = uri.slice("ss://".length).trim();
  let name = "";
  const hi = body.indexOf("#");
  if (hi >= 0) {
    name = safeDecode(body.slice(hi + 1));
    body = body.slice(0, hi);
  }
  let query = "";
  const qi = body.indexOf("?");
  if (qi >= 0) {
    query = body.slice(qi + 1);
    body = body.slice(0, qi);
  }
  if (!body.includes("@")) {
    try {
      body = b64decode(body);
    } catch {
      return null;
    }
  }
  const ai = body.lastIndexOf("@");
  if (ai < 0) return null;
  let userinfo = body.slice(0, ai);
  const hostport = body.slice(ai + 1);
  if (!userinfo.includes(":")) {
    try {
      userinfo = b64decode(userinfo);
    } catch {
      /* keep as is */
    }
  }
  const ci = userinfo.indexOf(":");
  const cipher = ci >= 0 ? userinfo.slice(0, ci) : "aes-256-gcm";
  const password = ci >= 0 ? userinfo.slice(ci + 1) : userinfo;

  let server = hostport;
  let port = 443;
  const pi = hostport.lastIndexOf(":");
  if (pi > 0) {
    server = hostport.slice(0, pi);
    port = parseInt(hostport.slice(pi + 1), 10) || 443;
  }
  if (!server) return null;
  const label = (name || server).trim();
  const { flag, country } = detectCountry(label, server);
  const params = new URLSearchParams(query);
  const plugin = params.get("plugin") || undefined;

  return {
    id: uid(),
    type: "ss",
    name: label,
    server,
    port,
    cipher,
    password: safeDecode(password),
    network: "tcp",
    security: "none",
    insecure: false,
    plugin: plugin ? plugin.split(";")[0] : undefined,
    pluginOpts: plugin ? plugin.split(";").slice(1).join(";") : undefined,
    flag,
    country,
    raw: uri,
  };
}

function parseHysteria2(uri: string): ProxyNode | null {
  const p = splitUri(uri);
  if (!p || !p.host) return null;
  const node = base("hysteria2", p, uri, "Hysteria2");
  node.password = safeDecode(p.userinfo);
  node.security = "tls";
  node.sni = p.params.get("sni") || undefined;
  node.obfs = p.params.get("obfs") || undefined;
  node.obfsPassword = p.params.get("obfs-password") || undefined;
  const ins = p.params.get("insecure");
  node.insecure = ins === "1" || ins === "true";
  const alpn = p.params.get("alpn");
  if (alpn) node.alpn = alpn.split(",").map((s) => s.trim());
  return node;
}

function parseTuic(uri: string): ProxyNode | null {
  const p = splitUri(uri);
  if (!p || !p.host) return null;
  const node = base("tuic", p, uri, "TUIC");
  const [uuid, ...rest] = p.userinfo.split(":");
  node.uuid = safeDecode(uuid);
  node.password = safeDecode(rest.join(":"));
  node.security = "tls";
  node.sni = p.params.get("sni") || undefined;
  node.congestion = p.params.get("congestion_control") || "bbr";
  node.udpRelayMode = p.params.get("udp_relay_mode") || "native";
  const ins = p.params.get("allow_insecure") || p.params.get("insecure");
  node.insecure = ins === "1" || ins === "true";
  const alpn = p.params.get("alpn");
  if (alpn) node.alpn = alpn.split(",").map((s) => s.trim());
  return node;
}

/* ---------------- uri builder (node -> link) ---------------- */

export function buildUri(n: ProxyNode): string {
  const tag = `#${encodeURIComponent(n.name)}`;
  const q = new URLSearchParams();
  const add = (k: string, v?: string | boolean) => {
    if (v === undefined || v === "" || v === false) return;
    q.set(k, v === true ? "1" : v);
  };
  const hostport = `${n.server}:${n.port}`;

  if (n.type === "vmess") {
    const json = {
      v: "2",
      ps: n.name,
      add: n.server,
      port: String(n.port),
      id: n.uuid || "",
      aid: String(n.alterId ?? 0),
      scy: n.cipher || "auto",
      net: n.network || "tcp",
      type: n.headerType || "none",
      host: n.host || "",
      path: n.path || "",
      tls: n.security === "none" ? "" : "tls",
      sni: n.sni || "",
      alpn: n.alpn?.join(",") || "",
      fp: n.fingerprint || "",
    };
    return `vmess://${b64encode(JSON.stringify(json))}`;
  }

  if (n.type === "ss") {
    const userinfo = b64encode(`${n.cipher || "aes-256-gcm"}:${n.password || ""}`);
    return `ss://${userinfo}@${hostport}${tag}`;
  }

  if (n.type === "hysteria2") {
    add("sni", n.sni);
    add("insecure", n.insecure);
    add("obfs", n.obfs);
    add("obfs-password", n.obfsPassword);
    if (n.alpn?.length) add("alpn", n.alpn.join(","));
    const qs = q.toString();
    return `hysteria2://${encodeURIComponent(n.password || "")}@${hostport}${qs ? `?${qs}` : ""}${tag}`;
  }

  if (n.type === "tuic") {
    add("sni", n.sni);
    add("congestion_control", n.congestion || "bbr");
    add("udp_relay_mode", n.udpRelayMode || "native");
    if (n.alpn?.length) add("alpn", n.alpn.join(","));
    add("allow_insecure", n.insecure);
    const qs = q.toString();
    return `tuic://${n.uuid}:${encodeURIComponent(n.password || "")}@${hostport}${qs ? `?${qs}` : ""}${tag}`;
  }

  // vless / trojan
  add("type", n.network || "tcp");
  add("security", n.security === "none" ? "none" : n.security);
  add("sni", n.sni);
  add("fp", n.fingerprint);
  if (n.alpn?.length) add("alpn", n.alpn.join(","));
  add("pbk", n.publicKey);
  add("sid", n.shortId);
  add("spx", n.spiderX);
  add("flow", n.flow);
  if (n.network === "ws" || n.network === "httpupgrade" || n.network === "h2") {
    add("path", n.path);
    add("host", n.host);
  }
  if (n.network === "grpc") add("serviceName", n.serviceName || n.path);
  add("allowInsecure", n.insecure);
  const qs = q.toString();
  const cred = n.type === "vless" ? n.uuid : encodeURIComponent(n.password || "");
  return `${n.type}://${cred}@${hostport}${qs ? `?${qs}` : ""}${tag}`;
}

/* ---------------- reverse: JSON / YAML -> nodes ---------------- */

type Any = Record<string, any>;

function finalize(partial: Omit<ProxyNode, "id" | "raw" | "flag" | "country">): ProxyNode {
  const { flag, country } = detectCountry(partial.name, partial.server);
  const node = { ...partial, id: uid(), flag, country, raw: "" } as ProxyNode;
  node.raw = buildUri(node);
  return node;
}

function fromSingbox(o: Any): ProxyNode | null {
  const type = String(o.type || "");
  const tls = o.tls || {};
  const tr = o.transport || {};
  const map: Record<string, Protocol> = {
    vless: "vless",
    vmess: "vmess",
    trojan: "trojan",
    shadowsocks: "ss",
    hysteria2: "hysteria2",
    tuic: "tuic",
  };
  const proto = map[type];
  if (!proto || !o.server) return null;
  const network = tr.type === "http" ? "h2" : tr.type || "tcp";
  return finalize({
    type: proto,
    name: String(o.tag || o.server),
    server: String(o.server),
    port: Number(o.server_port) || 443,
    uuid: o.uuid,
    password: o.password,
    cipher: o.method || o.security,
    alterId: o.alter_id,
    network,
    security: tls.reality?.enabled ? "reality" : tls.enabled ? "tls" : "none",
    sni: tls.server_name,
    fingerprint: tls.utls?.fingerprint,
    alpn: tls.alpn,
    publicKey: tls.reality?.public_key,
    shortId: tls.reality?.short_id,
    flow: o.flow,
    path: tr.path,
    host: Array.isArray(tr.host) ? tr.host[0] : tr.host || tr.headers?.Host,
    serviceName: tr.service_name,
    insecure: !!tls.insecure,
    obfs: o.obfs?.type,
    obfsPassword: o.obfs?.password,
    congestion: o.congestion_control,
    udpRelayMode: o.udp_relay_mode,
  });
}

function fromXray(o: Any): ProxyNode | null {
  const protocol = String(o.protocol || "");
  const s = o.settings || {};
  const ss = o.streamSettings || {};
  const tlsS = ss.tlsSettings || {};
  const reality = ss.realitySettings || {};
  const security = ss.security === "reality" ? "reality" : ss.security === "tls" ? "tls" : "none";
  const common = {
    network: ss.network === "http" ? "h2" : ss.network || "tcp",
    security: security as ProxyNode["security"],
    sni: tlsS.serverName || reality.serverName,
    fingerprint: tlsS.fingerprint || reality.fingerprint,
    alpn: tlsS.alpn,
    publicKey: reality.publicKey,
    shortId: reality.shortId,
    spiderX: reality.spiderX,
    path: ss.wsSettings?.path || ss.httpSettings?.path,
    host:
      ss.wsSettings?.headers?.Host ||
      (Array.isArray(ss.httpSettings?.host) ? ss.httpSettings.host[0] : undefined),
    serviceName: ss.grpcSettings?.serviceName,
    insecure: !!tlsS.allowInsecure,
  };

  if (protocol === "vless" || protocol === "vmess") {
    const v = s.vnext?.[0];
    const user = v?.users?.[0];
    if (!v?.address) return null;
    return finalize({
      type: protocol,
      name: String(o.tag || v.address),
      server: String(v.address),
      port: Number(v.port) || 443,
      uuid: user?.id,
      alterId: user?.alterId,
      cipher: protocol === "vmess" ? user?.security || "auto" : undefined,
      flow: user?.flow,
      ...common,
    });
  }
  if (protocol === "trojan") {
    const srv = s.servers?.[0];
    if (!srv?.address) return null;
    return finalize({
      type: "trojan",
      name: String(o.tag || srv.address),
      server: String(srv.address),
      port: Number(srv.port) || 443,
      password: srv.password,
      ...common,
      security: security === "none" ? "tls" : common.security,
    });
  }
  if (protocol === "shadowsocks") {
    const srv = s.servers?.[0];
    if (!srv?.address) return null;
    return finalize({
      type: "ss",
      name: String(o.tag || srv.address),
      server: String(srv.address),
      port: Number(srv.port) || 443,
      password: srv.password,
      cipher: srv.method,
      network: "tcp",
      security: "none",
      insecure: false,
    });
  }
  return null;
}

function fromClash(o: Any): ProxyNode | null {
  const t = String(o.type || "");
  const map: Record<string, Protocol> = {
    vless: "vless",
    vmess: "vmess",
    trojan: "trojan",
    ss: "ss",
    shadowsocks: "ss",
    hysteria2: "hysteria2",
    tuic: "tuic",
  };
  const proto = map[t];
  if (!proto || !o.server) return null;
  const ws = o["ws-opts"] || {};
  const grpc = o["grpc-opts"] || {};
  const reality = o["reality-opts"] || {};
  const tls = o.tls === true || proto === "trojan" || proto === "hysteria2" || proto === "tuic";
  return finalize({
    type: proto,
    name: String(o.name || o.server),
    server: String(o.server),
    port: Number(o.port) || 443,
    uuid: o.uuid,
    password: o.password,
    cipher: o.cipher,
    alterId: o.alterId,
    network: o.network || "tcp",
    security: reality["public-key"] ? "reality" : tls ? "tls" : "none",
    sni: o.servername || o.sni,
    fingerprint: o["client-fingerprint"],
    alpn: o.alpn,
    publicKey: reality["public-key"],
    shortId: reality["short-id"],
    flow: o.flow,
    path: ws.path,
    host: ws.headers?.Host,
    serviceName: grpc["grpc-service-name"],
    insecure: !!o["skip-cert-verify"],
    obfs: o.obfs,
    obfsPassword: o["obfs-password"],
    congestion: o["congestion-controller"],
    udpRelayMode: o["udp-relay-mode"],
  });
}

export function parseStructured(text: string): ProxyNode[] {
  const trimmed = text.trim();
  const nodes: ProxyNode[] = [];

  // JSON (Xray / sing-box / plain array)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      const list: Any[] = Array.isArray(data)
        ? data
        : data.outbounds || data.proxies || data.nodes || [];
      for (const item of list) {
        const node = item?.protocol ? fromXray(item) : item?.type ? fromSingbox(item) || fromClash(item) : null;
        if (node) nodes.push(node);
      }
      if (nodes.length) return nodes;
    } catch {
      /* not json */
    }
  }

  // Clash / Mihomo YAML — легкий разбор блока proxies:
  if (/^\s*proxies:/m.test(trimmed) || /^\s*-\s*\{?\s*name:/m.test(trimmed)) {
    const lines = trimmed.split(/\r?\n/);
    let inProxies = !/^\s*proxies:/m.test(trimmed);
    let current: Any | null = null;
    let currentIndent = 0;
    const stack: { key: string; obj: Any }[] = [];

    const pushCurrent = () => {
      if (current) {
        const node = fromClash(current);
        if (node) nodes.push(node);
      }
      current = null;
      stack.length = 0;
    };

    const parseVal = (raw: string): any => {
      const v = raw.trim();
      if (!v) return "";
      if (v === "true") return true;
      if (v === "false") return false;
      if (/^-?\d+$/.test(v)) return Number(v);
      if (/^\[.*\]$/.test(v))
        return v
          .slice(1, -1)
          .split(",")
          .map((x) => x.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      return v.replace(/^["']|["']$/g, "");
    };

    for (const line of lines) {
      if (/^\s*proxies:\s*$/.test(line)) {
        inProxies = true;
        continue;
      }
      if (inProxies && /^[a-zA-Z"]/.test(line) && !/^\s*-/.test(line)) {
        pushCurrent();
        inProxies = false;
        continue;
      }
      if (!inProxies) continue;

      const indent = line.match(/^\s*/)![0].length;
      const itemMatch = line.match(/^\s*-\s*(.*)$/);
      if (itemMatch) {
        pushCurrent();
        current = {};
        currentIndent = indent;
        const rest = itemMatch[1].trim();
        if (rest.startsWith("{")) {
          rest
            .replace(/^\{|\}$/g, "")
            .split(/,(?![^[]*\])/)
            .forEach((pair) => {
              const i = pair.indexOf(":");
              if (i > 0) current![pair.slice(0, i).trim()] = parseVal(pair.slice(i + 1));
            });
        } else if (rest) {
          const i = rest.indexOf(":");
          if (i > 0) current[rest.slice(0, i).trim()] = parseVal(rest.slice(i + 1));
        }
        continue;
      }
      if (current && indent > currentIndent) {
        const kv = line.match(/^\s*([\w"'-]+)\s*:\s*(.*)$/);
        if (!kv) continue;
        const key = kv[1].replace(/["']/g, "");
        const value = kv[2].trim();
        while (stack.length && indent <= stack[stack.length - 1].obj.__indent) stack.pop();
        const target = stack.length ? stack[stack.length - 1].obj : current;
        if (value === "") {
          const child: Any = { __indent: indent };
          target[key] = child;
          stack.push({ key, obj: child });
        } else {
          target[key] = parseVal(value);
        }
      }
    }
    pushCurrent();
  }

  return nodes;
}

/* ---------------- main entry ---------------- */

const SCHEMES = /^(vless|vmess|trojan|ss|ssr|hysteria2|hy2|tuic):\/\//i;

export function parseInput(raw: string): ParseResult {
  const nodes: ProxyNode[] = [];
  const errors: { line: string; reason: string }[] = [];
  let text = raw.trim();
  if (!text) return { nodes, errors, total: 0 };

  // структурированный ввод: Xray/Sing-box JSON, Clash/Mihomo YAML
  if (/^[[{]/.test(text) || /^\s*proxies:/m.test(text)) {
    const structured = parseStructured(text);
    if (structured.length) return { nodes: structured, errors, total: structured.length };
  }

  // qwdtt:// контейнер
  const qw = text.match(/^q?wdtt:\/\/([A-Za-z0-9_\-+/=]+)$/i);
  if (qw) {
    try {
      const payload = JSON.parse(b64decode(qw[1]));
      const list = (payload.nodes || []) as Record<string, unknown>[];
      const rebuilt = list
        .map((p) => {
          const partial = {
            type: String(p.t || "vless") as Protocol,
            name: String(p.n || p.s || "node"),
            server: String(p.s || ""),
            port: Number(p.p) || 443,
            uuid: p.id as string | undefined,
            password: p.pw as string | undefined,
            cipher: p.m as string | undefined,
            network: String(p.net || "tcp"),
            security: (p.sec || "none") as ProxyNode["security"],
            sni: p.sni as string | undefined,
            path: p.path as string | undefined,
            host: p.host as string | undefined,
            publicKey: p.pbk as string | undefined,
            shortId: p.sid as string | undefined,
            fingerprint: p.fp as string | undefined,
            flow: p.flow as string | undefined,
            insecure: false,
          };
          if (!partial.server) return null;
          const { flag, country } = detectCountry(partial.name, partial.server);
          const node = { ...partial, id: uid(), flag, country, raw: "" } as ProxyNode;
          node.raw = buildUri(node);
          return node;
        })
        .filter(Boolean) as ProxyNode[];
      if (rebuilt.length) return { nodes: rebuilt, errors, total: rebuilt.length };
    } catch {
      errors.push({ line: text.slice(0, 40), reason: "Повреждённый qWDTT-контейнер" });
    }
  }

  // whole-body base64 subscription
  if (!/:\/\//.test(text) && /^[A-Za-z0-9+/=_\-\s]+$/.test(text) && text.length > 24) {
    try {
      const decoded = b64decode(text);
      if (/:\/\//.test(decoded)) text = decoded;
    } catch {
      /* ignore */
    }
  }

  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let total = 0;
  for (const line of lines) {
    if (!SCHEMES.test(line)) {
      if (line.length > 8) errors.push({ line, reason: "Неизвестный формат строки" });
      continue;
    }
    total++;
    const scheme = line.slice(0, line.indexOf("://")).toLowerCase();
    let node: ProxyNode | null = null;
    try {
      if (scheme === "vmess") node = parseVmess(line);
      else if (scheme === "vless") node = parseVless(line);
      else if (scheme === "trojan") node = parseTrojan(line);
      else if (scheme === "ss") node = parseSS(line);
      else if (scheme === "hysteria2" || scheme === "hy2") node = parseHysteria2(line);
      else if (scheme === "tuic") node = parseTuic(line);
      else errors.push({ line, reason: `Протокол ${scheme} пока не поддерживается` });
    } catch (e) {
      errors.push({ line, reason: (e as Error).message || "Ошибка разбора" });
    }
    if (node) nodes.push(node);
    else if (SCHEMES.test(line) && scheme !== "ssr")
      errors.push({ line, reason: "Не удалось разобрать ссылку" });
  }

  return { nodes, errors, total };
}

/* ---------------- post-processing ---------------- */

export function dedupe(nodes: ProxyNode[]): ProxyNode[] {
  const seen = new Set<string>();
  return nodes.filter((n) => {
    const key = [n.type, n.server, n.port, n.uuid || n.password || "", n.path || ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function uniqueNames(nodes: ProxyNode[]): ProxyNode[] {
  const used = new Map<string, number>();
  return nodes.map((n) => {
    const count = used.get(n.name) || 0;
    used.set(n.name, count + 1);
    return count === 0 ? n : { ...n, name: `${n.name} #${count + 1}` };
  });
}
