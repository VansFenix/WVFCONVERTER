import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GlowButton, Icon, Pill } from "./ui";

const PROTOCOLS = ["VLESS", "VMess", "Trojan", "Shadowsocks", "Hysteria2", "TUIC", "Reality", "XHTTP", "WebSocket", "gRPC"];

const YAML_DEMO = [
  { t: "proxies:", c: "text-slate-400" },
  { t: '  - name: "🇳🇱 Amsterdam · Reality"', c: "text-cyan-200" },
  { t: "    type: vless", c: "text-violet-200" },
  { t: '    server: nl-ams-02.wvf.io', c: "text-slate-300" },
  { t: "    port: 443", c: "text-amber-200" },
  { t: "    tls: true", c: "text-emerald-200" },
  { t: "    reality-opts:", c: "text-slate-400" },
  { t: '      public-key: "xN9Q1Kk…"', c: "text-fuchsia-200" },
];

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return { value, ref };
}

function Stat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { value, ref } = useCountUp(target);
  return (
    <div className="text-center sm:text-left">
      <span ref={ref} className="font-display block text-2xl font-bold text-white sm:text-3xl">
        {value.toLocaleString("ru-RU")}
        <span className="text-gradient">{suffix}</span>
      </span>
      <span className="mt-1 block text-xs text-slate-400 sm:text-sm">{label}</span>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 sm:pt-36 sm:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* left */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Pill className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              100% в браузере · ключи никуда не уходят
            </Pill>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-6 text-[2.6rem] leading-[1.05] font-bold tracking-tight text-white sm:text-6xl lg:text-[4.1rem]"
          >
            Конвертер
            <br />
            VPN-конфигов
            <br />
            <span className="text-gradient">за одно мгновение</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Вставь ссылки <span className="text-slate-200">vless://</span>,{" "}
            <span className="text-slate-200">vmess://</span>,{" "}
            <span className="text-slate-200">trojan://</span> или base64-подписку — получи готовый
            конфиг для Clash Meta, sing-box, Xray и любого другого клиента. Без регистрации, без
            серверов, без captcha.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <GlowButton href="#converter" className="w-full sm:w-auto">
              <Icon name="bolt" className="h-4 w-4" />
              Открыть конвертер
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </GlowButton>
            <GlowButton href="#features" variant="ghost" className="w-full sm:w-auto">
              <Icon name="sparkles" className="h-4 w-4 text-violet-300" />
              Как это работает
            </GlowButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6"
          >
            <Stat target={6} suffix="" label="протоколов" />
            <Stat target={6} suffix="" label="форматов вывода" />
            <Stat target={100} suffix="%" label="локально в браузере" />
          </motion.div>
        </div>

        {/* right — animated preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="animate-spin-slow absolute -inset-8 rounded-[3rem] bg-[conic-gradient(from_0deg,rgba(139,92,246,0.25),transparent_35%,rgba(34,211,238,0.25),transparent_70%,rgba(139,92,246,0.25))] blur-2xl" />

          <div className="animate-float glass relative rounded-3xl p-4 shadow-2xl shadow-black/60 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 font-mono text-[11px] tracking-wide text-slate-500">
                wvfconverter · live
              </span>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/40 p-3.5">
              <div className="mb-1.5 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
                Вход
              </div>
              <div className="overflow-hidden font-mono text-[11px] break-all text-slate-300 sm:text-xs">
                <span className="text-violet-300">vless://</span>
                d3f8a1c2-6b7e-4f21@nl-ams-02.wvf.io:443?
                <span className="text-cyan-300">security=reality</span>
                <motion.span
                  className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-violet-400"
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1, times: [0, 0.49, 0.5, 1], ease: "linear" }}
                />
              </div>
            </div>

            <div className="my-3 flex items-center justify-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-500/40" />
              <motion.span
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-900/50"
              >
                <Icon name="arrow" className="h-4 w-4 rotate-90" strokeWidth={2.2} />
              </motion.span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/40" />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/50 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
                  clash-meta.yaml
                </span>
                <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  готово
                </span>
              </div>
              <div className="space-y-1 font-mono text-[10.5px] leading-relaxed sm:text-[11.5px]">
                {YAML_DEMO.map((line, i) => (
                  <motion.div
                    key={line.t}
                    className={line.c}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: [0, 1, 1, 1, 0], x: [-8, 0, 0, 0, -4] }}
                    transition={{
                      duration: 6,
                      times: [0, 0.12, 0.5, 0.85, 1],
                      repeat: Infinity,
                      delay: i * 0.16,
                      ease: "easeInOut",
                    }}
                  >
                    {line.t}
                  </motion.div>
                ))}
              </div>
              <div className="animate-scanline pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-violet-400/8 to-transparent" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
            className="glass absolute -right-2 -bottom-5 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-xl shadow-black/50 sm:-right-6"
          >
            <Icon name="shield" className="h-5 w-5 text-emerald-300" />
            <div className="leading-tight">
              <div className="text-xs font-semibold text-white">Zero-knowledge</div>
              <div className="text-[10px] text-slate-400">данные не покидают вкладку</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* marquee */}
      <div className="relative mx-auto mt-16 max-w-6xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] sm:mt-20">
        <div className="animate-marquee flex w-max gap-3">
          {[...PROTOCOLS, ...PROTOCOLS].map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2 font-mono text-xs tracking-wider text-slate-400 uppercase"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
