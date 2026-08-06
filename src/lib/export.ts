import { toQwdtt, type QwdttMode } from "./crypt";
import { b64decode, b64encode, buildUri } from "./parse";
import type { ProxyNode } from "./types";

export type OutputFormat =
  | "clash"
  | "singbox"
  | "xray"
  | "base64"
  | "uri"
  | "json"
  | "qwdtt"
  | "selector"
  | "urltest";

export interface GenOptions {
  balancer?: boolean;
  qwdttMode?: QwdttMode;
}

export const FORMATS: {
  id: OutputFormat;
  label: string;
  short: string;
  ext: string;
  desc: string;
  apps: string;
}[] = [
  {
    id: "clash",
    label: "Clash Meta",
    short: "YAML",
    ext: "yaml",
    desc: "Полный конфиг с группами и правилами",
    apps: "Clash Verge · FlClash · Stash",
  },
  {
    id: "singbox",
    label: "Sing-box",
    short: "JSON",
    ext: "json",
    desc: "Современный движок с TUN-режимом",
    apps: "sing-box · Hiddify · Karing",
  },
  {
    id: "xray",
    label: "Xray Core",
    short: "JSON",
    ext: "json",
    desc: "Классический конфиг ядра Xray",
    apps: "Xray · v2rayN · Nekoray",
  },
  {
    id: "base64",
    label: "Подписка",
    short: "BASE64",
    ext: "txt",
    desc: "Base64-подписка для любого клиента",
    apps: "v2rayNG · Streisand · Shadowrocket",
  },
  {
    id: "uri",
    label: "Ссылки",
    short: "TXT",
    ext: "txt",
    desc: "Чистый список ссылок построчно",
    apps: "Любой клиент",
  },
  {
    id: "selector",
    label: "Selector",
    short: "JSON",
    ext: "json",
    desc: "Sing-box outbound типа selector",
    apps: "sing-box · Hiddify",
  },
  {
    id: "urltest",
    label: "URLTest",
    short: "JSON",
    ext: "json",
    desc: "Sing-box outbound с автовыбором по задержке",
    apps: "sing-box · Karing",
  },
  {
    id: "qwdtt",
    label: "qWDTT",
    short: "LINK",
    ext: "txt",
    desc: "Компактный контейнер qwdtt:// / wdtt://",
    apps: "Обмен наборами узлов",
  },
  {
    id: "json",
    label: "WVF JSON",
    short: "JSON",
    ext: "json",
    desc: "Нормализованные данные узлов",
    apps: "Отладка · автоматизация",
  },
];

/* ----------------------------- YAML dumper ----------------------------- */

const isScalar = (v: unknown) => v === null || typeof v !== "object";

function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yaml(value: unknown, ind = 0): string {
  const pad = "  ".repeat(ind);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value
      .map((item) => {
        if (isScalar(item)) return `${pad}- ${yamlScalar(item)}`;
        const body = yaml(item, ind + 1);
        return `${pad}- ${body.slice((ind + 1) * 2)}`;
      })
      .join("\n");
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined
  );
  if (!entries.length) return `${pad}{}`;
  return entries
    .map(([k, v]) => {
      if (isScalar(v)) return `${pad}${k}: ${yamlScalar(v)}`;
      if (Array.isArray(v)) {
        if (!v.length) return `${pad}${k}: []`;
        if (v.every(isScalar)) return `${pad}${k}: [${v.map(yamlScalar).join(", ")}]`;
        return `${pad}${k}:\n${yaml(v, ind + 1)}`;
      }
      return `${pad}${k}:\n${yaml(v, ind + 1)}`;
    })
    .join("\n");
}

const clean = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  ) as T;

/* ----------------------------- Clash Meta ----------------------------- */

function clashProxy(n: ProxyNode): Record<string, unknown> {
  const tls = n.security !== "none";
  const common: Record<string, unknown> = {
    name: n.name,
    server: n.server,
    port: n.port,
    udp: true,
  };
  const transport: Record<string, unknown> = {};
  if (n.network === "ws") {
    transport["network"] = "ws";
    transport["ws-opts"] = clean({
      path: n.path || "/",
      headers: n.host ? { Host: n.host } : undefined,
    });
  } else if (n.network === "grpc") {
    transport["network"] = "grpc";
    transport["grpc-opts"] = { "grpc-service-name": n.serviceName || n.path || "" };
  } else if (n.network === "h2") {
    transport["network"] = "h2";
    transport["h2-opts"] = clean({ path: n.path, host: n.host ? [n.host] : undefined });
  } else if (n.network === "httpupgrade") {
    transport["network"] = "httpupgrade";
    transport["ws-opts"] = clean({ path: n.path || "/", headers: n.host ? { Host: n.host } : undefined });
  }

  switch (n.type) {
    case "vless":
      return clean({
        ...common,
        type: "vless",
        uuid: n.uuid,
        flow: n.flow || undefined,
        tls: tls || undefined,
        servername: tls ? n.sni || n.host || n.server : undefined,
        "client-fingerprint": n.fingerprint || "chrome",
        "skip-cert-verify": n.insecure || undefined,
        "reality-opts":
          n.security === "reality"
            ? clean({ "public-key": n.publicKey, "short-id": n.shortId })
            : undefined,
        ...transport,
      });
    case "vmess":
      return clean({
        ...common,
        type: "vmess",
        uuid: n.uuid,
        alterId: n.alterId ?? 0,
        cipher: n.cipher && n.cipher !== "none" ? n.cipher : "auto",
        tls: tls || undefined,
        servername: tls ? n.sni || n.host || n.server : undefined,
        "skip-cert-verify": n.insecure || undefined,
        ...transport,
      });
    case "trojan":
      return clean({
        ...common,
        type: "trojan",
        password: n.password,
        sni: n.sni || n.host || n.server,
        "skip-cert-verify": n.insecure || undefined,
        "client-fingerprint": n.fingerprint || undefined,
        ...transport,
      });
    case "ss":
      return clean({
        ...common,
        type: "ss",
        cipher: n.cipher || "aes-256-gcm",
        password: n.password,
        plugin: n.plugin || undefined,
      });
    case "hysteria2":
      return clean({
        ...common,
        type: "hysteria2",
        password: n.password,
        sni: n.sni || n.server,
        "skip-cert-verify": n.insecure || undefined,
        obfs: n.obfs || undefined,
        "obfs-password": n.obfsPassword || undefined,
        alpn: n.alpn,
      });
    case "tuic":
      return clean({
        ...common,
        type: "tuic",
        uuid: n.uuid,
        password: n.password,
        sni: n.sni || n.server,
        "congestion-controller": n.congestion || "bbr",
        "udp-relay-mode": n.udpRelayMode || "native",
        "skip-cert-verify": n.insecure || undefined,
        alpn: n.alpn || ["h3"],
      });
  }
}

function toClash(nodes: ProxyNode[], balancer = false): string {
  const names = nodes.map((n) => n.name);
  const config = {
    "mixed-port": 7890,
    "allow-lan": false,
    mode: "rule",
    "log-level": "info",
    ipv6: true,
    "unified-delay": true,
    "tcp-concurrent": true,
    "find-process-mode": "strict",
    "global-client-fingerprint": "chrome",
    profile: { "store-selected": true, "store-fake-ip": true },
    sniffer: {
      enable: true,
      sniff: { HTTP: { ports: [80, 8080] }, TLS: { ports: [443, 8443] } },
    },
    dns: {
      enable: true,
      ipv6: true,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "default-nameserver": ["1.1.1.1", "8.8.8.8"],
      nameserver: ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
    },
    proxies: nodes.map(clashProxy),
    "proxy-groups": [
      {
        name: "WVF · Выбор",
        type: "select",
        proxies: [
          "WVF · Авто",
          ...(balancer ? ["WVF · Балансер"] : []),
          "DIRECT",
          ...names,
        ],
      },
      ...(balancer
        ? [
            {
              name: "WVF · Балансер",
              type: "load-balance",
              strategy: "consistent-hashing",
              url: "https://www.gstatic.com/generate_204",
              interval: 300,
              proxies: names,
            },
          ]
        : []),
      {
        name: "WVF · Авто",
        type: "url-test",
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50,
        proxies: names,
      },
      {
        name: "WVF · Резерв",
        type: "fallback",
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
        proxies: names,
      },
    ],
    rules: [
      "GEOIP,LAN,DIRECT,no-resolve",
      "GEOIP,PRIVATE,DIRECT,no-resolve",
      "GEOSITE,category-ads-all,REJECT",
      "GEOSITE,private,DIRECT",
      "GEOSITE,ru,DIRECT",
      "GEOIP,RU,DIRECT",
      "MATCH,WVF · Выбор",
    ],
  };
  return `# Сгенерировано WVFCONVERTER\n# Узлов: ${nodes.length}\n\n${yaml(config)}\n`;
}

/* ----------------------------- sing-box ----------------------------- */

function sbTls(n: ProxyNode) {
  if (n.security === "none") return undefined;
  return clean({
    enabled: true,
    server_name: n.sni || n.host || n.server,
    insecure: n.insecure || undefined,
    alpn: n.alpn,
    utls: { enabled: true, fingerprint: n.fingerprint || "chrome" },
    reality:
      n.security === "reality"
        ? clean({ enabled: true, public_key: n.publicKey, short_id: n.shortId })
        : undefined,
  });
}

function sbTransport(n: ProxyNode) {
  if (n.network === "ws")
    return clean({
      type: "ws",
      path: n.path || "/",
      headers: n.host ? { Host: n.host } : undefined,
      early_data_header_name: "Sec-WebSocket-Protocol",
    });
  if (n.network === "grpc")
    return { type: "grpc", service_name: n.serviceName || n.path || "" };
  if (n.network === "h2" || n.network === "http")
    return clean({ type: "http", path: n.path, host: n.host ? [n.host] : undefined });
  if (n.network === "httpupgrade")
    return clean({ type: "httpupgrade", path: n.path || "/", host: n.host });
  return undefined;
}

function sbOutbound(n: ProxyNode): Record<string, unknown> {
  const common = { tag: n.name, server: n.server, server_port: n.port };
  switch (n.type) {
    case "vless":
      return clean({
        type: "vless",
        ...common,
        uuid: n.uuid,
        flow: n.flow || undefined,
        packet_encoding: "xudp",
        tls: sbTls(n),
        transport: sbTransport(n),
      });
    case "vmess":
      return clean({
        type: "vmess",
        ...common,
        uuid: n.uuid,
        security: n.cipher || "auto",
        alter_id: n.alterId ?? 0,
        tls: sbTls(n),
        transport: sbTransport(n),
      });
    case "trojan":
      return clean({
        type: "trojan",
        ...common,
        password: n.password,
        tls: sbTls(n),
        transport: sbTransport(n),
      });
    case "ss":
      return clean({
        type: "shadowsocks",
        ...common,
        method: n.cipher || "aes-256-gcm",
        password: n.password,
      });
    case "hysteria2":
      return clean({
        type: "hysteria2",
        ...common,
        password: n.password,
        obfs: n.obfs ? { type: n.obfs, password: n.obfsPassword } : undefined,
        tls: sbTls(n),
      });
    case "tuic":
      return clean({
        type: "tuic",
        ...common,
        uuid: n.uuid,
        password: n.password,
        congestion_control: n.congestion || "bbr",
        udp_relay_mode: n.udpRelayMode || "native",
        tls: sbTls(n),
      });
  }
}

function toSingbox(nodes: ProxyNode[]): string {
  const tags = nodes.map((n) => n.name);
  const config = {
    log: { level: "info", timestamp: true },
    dns: {
      servers: [
        { tag: "remote", address: "https://1.1.1.1/dns-query", detour: "WVF · Выбор" },
        { tag: "local", address: "https://dns.google/dns-query", detour: "direct" },
      ],
      rules: [{ outbound: "any", server: "local" }],
      final: "remote",
      strategy: "prefer_ipv4",
    },
    inbounds: [
      {
        type: "tun",
        tag: "tun-in",
        address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
        auto_route: true,
        strict_route: true,
        stack: "mixed",
        sniff: true,
      },
      { type: "mixed", tag: "mixed-in", listen: "127.0.0.1", listen_port: 2080, sniff: true },
    ],
    outbounds: [
      { type: "selector", tag: "WVF · Выбор", outbounds: ["WVF · Авто", ...tags, "direct"], default: "WVF · Авто" },
      {
        type: "urltest",
        tag: "WVF · Авто",
        outbounds: tags,
        url: "https://www.gstatic.com/generate_204",
        interval: "5m",
        tolerance: 50,
      },
      ...nodes.map(sbOutbound),
      { type: "direct", tag: "direct" },
    ],
    route: {
      rules: [
        { action: "sniff" },
        { protocol: "dns", action: "hijack-dns" },
        { ip_is_private: true, outbound: "direct" },
      ],
      final: "WVF · Выбор",
      auto_detect_interface: true,
    },
    experimental: {
      cache_file: { enabled: true, store_fakeip: false },
      clash_api: { external_controller: "127.0.0.1:9090", default_mode: "rule" },
    },
  };
  return JSON.stringify(config, null, 2);
}

/* ----------------------------- Xray ----------------------------- */

function xrayStream(n: ProxyNode) {
  const s: Record<string, unknown> = { network: n.network || "tcp" };
  if (n.security === "tls") {
    s.security = "tls";
    s.tlsSettings = clean({
      serverName: n.sni || n.host || n.server,
      allowInsecure: n.insecure || undefined,
      fingerprint: n.fingerprint || "chrome",
      alpn: n.alpn,
    });
  } else if (n.security === "reality") {
    s.security = "reality";
    s.realitySettings = clean({
      serverName: n.sni,
      fingerprint: n.fingerprint || "chrome",
      publicKey: n.publicKey,
      shortId: n.shortId,
      spiderX: n.spiderX || "/",
    });
  } else {
    s.security = "none";
  }
  if (n.network === "ws")
    s.wsSettings = clean({ path: n.path || "/", headers: n.host ? { Host: n.host } : undefined });
  if (n.network === "grpc")
    s.grpcSettings = { serviceName: n.serviceName || n.path || "", multiMode: false };
  if (n.network === "h2")
    s.httpSettings = clean({ path: n.path || "/", host: n.host ? [n.host] : undefined });
  if (n.network === "tcp" && n.headerType === "http")
    s.tcpSettings = { header: { type: "http", request: { path: [n.path || "/"] } } };
  return s;
}

function xrayOutbound(n: ProxyNode, tag: string): Record<string, unknown> {
  const streamSettings = xrayStream(n);
  switch (n.type) {
    case "vless":
      return {
        tag,
        protocol: "vless",
        settings: {
          vnext: [
            {
              address: n.server,
              port: n.port,
              users: [clean({ id: n.uuid, encryption: "none", flow: n.flow || undefined, level: 0 })],
            },
          ],
        },
        streamSettings,
      };
    case "vmess":
      return {
        tag,
        protocol: "vmess",
        settings: {
          vnext: [
            {
              address: n.server,
              port: n.port,
              users: [{ id: n.uuid, alterId: n.alterId ?? 0, security: n.cipher || "auto", level: 0 }],
            },
          ],
        },
        streamSettings,
      };
    case "trojan":
      return {
        tag,
        protocol: "trojan",
        settings: { servers: [{ address: n.server, port: n.port, password: n.password, level: 0 }] },
        streamSettings,
      };
    case "ss":
      return {
        tag,
        protocol: "shadowsocks",
        settings: {
          servers: [
            { address: n.server, port: n.port, method: n.cipher || "aes-256-gcm", password: n.password, level: 0 },
          ],
        },
        streamSettings: { network: "tcp", security: "none" },
      };
    default:
      return {
        tag,
        protocol: "freedom",
        settings: {},
        _note: `${n.type} не поддерживается ядром Xray — используйте sing-box`,
      };
  }
}

function toXray(nodes: ProxyNode[]): string {
  const outbounds = nodes.map((n, i) => xrayOutbound(n, i === 0 ? "proxy" : `node-${i}`));
  const config = {
    log: { loglevel: "warning" },
    inbounds: [
      {
        tag: "socks",
        port: 10808,
        listen: "127.0.0.1",
        protocol: "socks",
        settings: { auth: "noauth", udp: true },
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] },
      },
      {
        tag: "http",
        port: 10809,
        listen: "127.0.0.1",
        protocol: "http",
        settings: {},
      },
    ],
    outbounds: [
      ...outbounds,
      { tag: "direct", protocol: "freedom", settings: {} },
      { tag: "block", protocol: "blackhole", settings: { response: { type: "http" } } },
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        { type: "field", ip: ["geoip:private", "geoip:ru"], outboundTag: "direct" },
        { type: "field", domain: ["geosite:category-ads-all"], outboundTag: "block" },
        { type: "field", domain: ["geosite:category-ru"], outboundTag: "direct" },
        { type: "field", network: "tcp,udp", outboundTag: "proxy" },
      ],
    },
  };
  return JSON.stringify(config, null, 2);
}

/* ----------------------------- simple formats ----------------------------- */

function rebuildUri(n: ProxyNode): string {
  if (!n.raw) return buildUri(n);
  if (n.type === "vmess") {
    try {
      const json = JSON.parse(b64decode(n.raw.slice("vmess://".length)));
      json.ps = n.name;
      return `vmess://${b64encode(JSON.stringify(json))}`;
    } catch {
      return n.raw;
    }
  }
  const hi = n.raw.indexOf("#");
  const head = hi >= 0 ? n.raw.slice(0, hi) : n.raw;
  return `${head}#${encodeURIComponent(n.name)}`;
}

export function generate(
  format: OutputFormat,
  nodes: ProxyNode[],
  options: GenOptions = {}
): string {
  if (!nodes.length) return "";
  switch (format) {
    case "qwdtt":
      return toQwdtt(nodes, options.qwdttMode || "qwdtt");
    case "selector":
      return JSON.stringify(
        {
          outbounds: [
            {
              type: "selector",
              tag: "WVF · Выбор",
              outbounds: [...nodes.map((n) => n.name), "direct"],
              default: nodes[0]?.name,
              interrupt_exist_connections: false,
            },
            ...nodes.map(sbOutbound),
          ],
        },
        null,
        2
      );
    case "urltest":
      return JSON.stringify(
        {
          outbounds: [
            {
              type: "urltest",
              tag: "WVF · Авто",
              outbounds: nodes.map((n) => n.name),
              url: "https://www.gstatic.com/generate_204",
              interval: "5m",
              tolerance: 50,
              idle_timeout: "30m",
            },
            ...nodes.map(sbOutbound),
          ],
        },
        null,
        2
      );
    case "clash":
      return toClash(nodes, options.balancer);
    case "singbox":
      return toSingbox(nodes);
    case "xray":
      return toXray(nodes);
    case "uri":
      return nodes.map(rebuildUri).join("\n");
    case "base64":
      return b64encode(nodes.map(rebuildUri).join("\n"));
    case "json":
      return JSON.stringify(
        nodes.map((n) => {
          const { raw, id, ...rest } = n;
          void raw;
          void id;
          return rest;
        }),
        null,
        2
      );
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
