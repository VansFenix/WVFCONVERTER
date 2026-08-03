/* Network helpers: DoH resolving, IP info, CORS-proxy fetching, RU whitelist subnets */

export const DNS_PROVIDERS: { id: string; name: string; url: string }[] = [
  { id: "astracat", name: "Astracat", url: "https://dns.astracat.dev/dns-query" },
  { id: "google", name: "Google", url: "https://dns.google/resolve" },
  { id: "cloudflare", name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
  { id: "quad9", name: "Quad9", url: "https://dns.quad9.net:5053/dns-query" },
  { id: "yandex", name: "Яндекс", url: "https://common.dot.dns.yandex.net/dns-query" },
  { id: "alibaba", name: "Alibaba", url: "https://dns.alidns.com/resolve" },
  { id: "opendns", name: "OpenDNS", url: "https://doh.opendns.com/dns-query" },
];

export interface DnsAnswer {
  name: string;
  type: number;
  data: string;
}

export async function dohResolve(
  name: string,
  type: "A" | "AAAA" | "CNAME" | "TXT" | "NS" = "A",
  providerId = "cloudflare"
): Promise<DnsAnswer[]> {
  const provider = DNS_PROVIDERS.find((p) => p.id === providerId) || DNS_PROVIDERS[2];
  const url = `${provider.url}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS ${res.status}`);
  const json = await res.json();
  return (json.Answer || []).map((a: DnsAnswer) => ({
    name: a.name,
    type: a.type,
    data: String(a.data).replace(/^"|"$/g, ""),
  }));
}

export interface IpInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  org?: string;
  asn?: string;
  flag?: string;
  latitude?: number;
  longitude?: number;
}

export async function ipInfo(ip?: string): Promise<IpInfo> {
  const res = await fetch(`https://ipwho.is/${ip ? encodeURIComponent(ip) : ""}`);
  const j = await res.json();
  if (j.success === false) throw new Error(j.message || "IP не найден");
  return {
    ip: j.ip,
    country: j.country,
    countryCode: j.country_code,
    city: j.city,
    isp: j.connection?.isp,
    org: j.connection?.org,
    asn: j.connection?.asn ? `AS${j.connection.asn}` : undefined,
    flag: j.flag?.emoji,
    latitude: j.latitude,
    longitude: j.longitude,
  };
}

/* ------------------------------ CORS proxies ------------------------------ */

export const CORS_PROXIES: { id: string; name: string; build: (u: string) => string }[] = [
  { id: "direct", name: "Прямой запрос", build: (u) => u },
  {
    id: "allorigins",
    name: "allorigins.win",
    build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  },
  { id: "corsproxy", name: "corsproxy.io", build: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  { id: "codetabs", name: "codetabs.com", build: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` },
  { id: "jina", name: "r.jina.ai", build: (u) => `https://r.jina.ai/${u}` },
];

export const USER_AGENTS: { id: string; name: string; ua: string }[] = [
  { id: "happ", name: "Happ", ua: "Happ/2.14.0 (iPhone; iOS 17.5; Scale/3.00)" },
  { id: "v2raytun", name: "v2RayTun", ua: "v2RayTun/3.9.1 (Android 14; SM-S918B)" },
  { id: "clash", name: "Clash Meta", ua: "clash-verge/v2.0.3" },
  { id: "singbox", name: "sing-box", ua: "SFI/1.11.3 (iOS)" },
  { id: "hiddify", name: "Hiddify", ua: "HiddifyNext/2.5.7 (Windows)" },
  { id: "streisand", name: "Streisand", ua: "Streisand/1.6.44 (iOS)" },
  { id: "v2rayng", name: "v2rayNG", ua: "v2rayNG/1.9.16 (Android)" },
  { id: "browser", name: "Chrome", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36" },
];

export type HwidFormat = "uuid" | "hex32" | "mac" | "android" | "ios";

export function generateHwid(format: HwidFormat): string {
  const rnd = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  switch (format) {
    case "uuid":
      return crypto.randomUUID();
    case "hex32":
      return rnd(16);
    case "mac":
      return rnd(6).match(/.{2}/g)!.join(":").toUpperCase();
    case "android":
      return rnd(8);
    case "ios":
      return crypto.randomUUID().toUpperCase();
  }
}

export const HEADER_PRESETS: Record<string, string> = {
  bearer: "Authorization: Bearer <token>",
  cookie: "Cookie: session=<value>",
  apikey: "X-API-Key: <key>",
  picky: [
    "Accept: */*",
    "Accept-Language: en-US,en;q=0.9",
    "Accept-Encoding: gzip, deflate, br",
    "Cache-Control: no-cache",
    "Connection: keep-alive",
  ].join("\n"),
  remnawave: "x-hwid: <hwid>\nx-device-os: android\nx-ver-os: 14\nx-device-model: SM-S918B",
};

export function parseHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const i = line.indexOf(":");
      if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  return out;
}

export function buildCurl(url: string, ua: string, headers: Record<string, string>) {
  const parts = [`curl -L '${url}'`];
  if (ua) parts.push(`  -H 'User-Agent: ${ua}'`);
  Object.entries(headers).forEach(([k, v]) => parts.push(`  -H '${k}: ${v}'`));
  return parts.join(" \\\n");
}

/* --------------------------- RU whitelist subnets -------------------------- */

export interface Subnet {
  cidr: string;
  operator: string;
  kind: "operator" | "hosting" | "cdn";
  note?: string;
}

export const RU_SUBNETS: Subnet[] = [
  { cidr: "178.176.0.0/14", operator: "МТС", kind: "operator", note: "мобильный пул" },
  { cidr: "213.87.0.0/16", operator: "МТС", kind: "operator", note: "мобильный пул" },
  { cidr: "94.25.0.0/16", operator: "МТС", kind: "operator" },
  { cidr: "83.220.224.0/19", operator: "МТС", kind: "operator" },
  { cidr: "217.66.152.0/21", operator: "Мегафон", kind: "operator" },
  { cidr: "83.149.0.0/17", operator: "Мегафон", kind: "operator", note: "мобильный пул" },
  { cidr: "31.173.80.0/20", operator: "Мегафон", kind: "operator" },
  { cidr: "95.66.128.0/17", operator: "Мегафон", kind: "operator" },
  { cidr: "46.42.0.0/16", operator: "Билайн", kind: "operator" },
  { cidr: "85.140.0.0/16", operator: "Билайн", kind: "operator", note: "мобильный пул" },
  { cidr: "213.234.0.0/18", operator: "Билайн", kind: "operator" },
  { cidr: "176.59.0.0/16", operator: "Tele2", kind: "operator", note: "мобильный пул" },
  { cidr: "95.153.128.0/17", operator: "Tele2", kind: "operator" },
  { cidr: "188.162.0.0/16", operator: "Tele2", kind: "operator" },
  { cidr: "212.164.0.0/15", operator: "Ростелеком", kind: "operator" },
  { cidr: "109.191.0.0/16", operator: "Ростелеком", kind: "operator" },
  { cidr: "80.234.0.0/16", operator: "Ростелеком", kind: "operator" },
  { cidr: "77.88.0.0/18", operator: "Яндекс", kind: "hosting", note: "часто в белых списках" },
  { cidr: "5.255.192.0/18", operator: "Яндекс", kind: "hosting" },
  { cidr: "87.250.224.0/19", operator: "Яндекс", kind: "hosting" },
  { cidr: "178.154.128.0/17", operator: "Yandex Cloud", kind: "hosting" },
  { cidr: "51.250.0.0/16", operator: "Yandex Cloud", kind: "hosting" },
  { cidr: "217.20.144.0/20", operator: "VK / Mail.ru", kind: "hosting" },
  { cidr: "95.163.0.0/16", operator: "VK / Mail.ru", kind: "hosting" },
  { cidr: "185.71.76.0/22", operator: "VK Cloud", kind: "hosting" },
  { cidr: "62.84.112.0/20", operator: "Selectel", kind: "hosting" },
  { cidr: "188.93.16.0/20", operator: "Selectel", kind: "hosting" },
  { cidr: "5.101.0.0/18", operator: "Selectel", kind: "hosting" },
  { cidr: "45.153.224.0/22", operator: "Timeweb", kind: "hosting" },
  { cidr: "176.57.208.0/20", operator: "Timeweb", kind: "hosting" },
  { cidr: "194.87.0.0/16", operator: "Beget / Ru-Center", kind: "hosting" },
  { cidr: "104.16.0.0/13", operator: "Cloudflare", kind: "cdn", note: "CDN — часто белый" },
  { cidr: "172.64.0.0/13", operator: "Cloudflare", kind: "cdn" },
  { cidr: "151.101.0.0/16", operator: "Fastly", kind: "cdn" },
  { cidr: "23.32.0.0/11", operator: "Akamai", kind: "cdn" },
  { cidr: "13.32.0.0/15", operator: "AWS CloudFront", kind: "cdn" },
];

function ipToLong(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

export function inSubnet(ip: string, cidr: string): boolean {
  const [net, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipL = ipToLong(ip);
  const netL = ipToLong(net);
  if (ipL === null || netL === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipL & mask) >>> 0 === (netL & mask) >>> 0;
}

export function matchSubnets(ip: string): Subnet[] {
  return RU_SUBNETS.filter((s) => inSubnet(ip, s.cidr));
}

export const isIp = (v: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v.trim());

/* ------------------------------ CDN detection ----------------------------- */

const CDN_PATTERNS: [RegExp, string][] = [
  [/cloudflare|cdn\.cloudflare|\.cf\./i, "Cloudflare"],
  [/fastly/i, "Fastly"],
  [/akamai|edgekey|edgesuite/i, "Akamai"],
  [/cloudfront/i, "AWS CloudFront"],
  [/gcore|gcdn/i, "G-Core Labs"],
  [/bunnycdn|b-cdn/i, "BunnyCDN"],
  [/azureedge|msedge/i, "Azure CDN"],
  [/ngenix/i, "NGENIX"],
  [/cdnvideo/i, "CDNvideo"],
  [/selectel/i, "Selectel CDN"],
];

export function detectCdn(text: string): string | null {
  for (const [re, name] of CDN_PATTERNS) if (re.test(text)) return name;
  return null;
}
