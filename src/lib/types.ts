export type Protocol =
  | "vless"
  | "vmess"
  | "trojan"
  | "ss"
  | "hysteria2"
  | "tuic";

export interface ProxyNode {
  id: string;
  type: Protocol;
  name: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  alterId?: number;
  network: string;
  security: "none" | "tls" | "reality";
  sni?: string;
  fingerprint?: string;
  alpn?: string[];
  publicKey?: string;
  shortId?: string;
  spiderX?: string;
  flow?: string;
  path?: string;
  host?: string;
  serviceName?: string;
  headerType?: string;
  insecure: boolean;
  obfs?: string;
  obfsPassword?: string;
  congestion?: string;
  udpRelayMode?: string;
  plugin?: string;
  pluginOpts?: string;
  country?: string;
  flag?: string;
  raw: string;
}

export interface ParseResult {
  nodes: ProxyNode[];
  errors: { line: string; reason: string }[];
  total: number;
}

export const PROTOCOL_META: Record<
  Protocol,
  { label: string; color: string; ring: string; text: string }
> = {
  vless: {
    label: "VLESS",
    color: "from-violet-500 to-fuchsia-500",
    ring: "ring-violet-400/30 bg-violet-400/10",
    text: "text-violet-200",
  },
  vmess: {
    label: "VMess",
    color: "from-sky-500 to-cyan-400",
    ring: "ring-sky-400/30 bg-sky-400/10",
    text: "text-sky-200",
  },
  trojan: {
    label: "Trojan",
    color: "from-rose-500 to-orange-400",
    ring: "ring-rose-400/30 bg-rose-400/10",
    text: "text-rose-200",
  },
  ss: {
    label: "Shadowsocks",
    color: "from-emerald-500 to-teal-400",
    ring: "ring-emerald-400/30 bg-emerald-400/10",
    text: "text-emerald-200",
  },
  hysteria2: {
    label: "Hysteria2",
    color: "from-amber-400 to-yellow-300",
    ring: "ring-amber-400/30 bg-amber-400/10",
    text: "text-amber-200",
  },
  tuic: {
    label: "TUIC",
    color: "from-indigo-500 to-blue-400",
    ring: "ring-indigo-400/30 bg-indigo-400/10",
    text: "text-indigo-200",
  },
};
