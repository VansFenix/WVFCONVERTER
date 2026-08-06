import { motion } from "motion/react";
import { FORMATS } from "../lib/export";
import { Icon, SectionTitle } from "./ui";

const FEATURES = [
  {
    icon: "shield",
    title: "Конвертация — офлайн",
    text: "Разбор ссылок и генерация конфигов идут в браузере. Сеть используется только там, где иначе нельзя: прокси подписок, крипт-расшифровка и DNS-резолв — по вашей команде.",
    accent: "from-emerald-500/25 to-teal-500/10",
    color: "text-emerald-300",
  },
  {
    icon: "globe",
    title: "Парсер с 9 слоями",
    text: "Серверный прокси обходит CORS, подставляет UA и x-hwid, снимает HTML-обёртки и deeplink, перебирает клиентов Happ / INCY / V2RayTUN / Clash — с пошаговым логом.",
    accent: "from-cyan-500/25 to-blue-500/10",
    color: "text-cyan-300",
  },
  {
    icon: "lock",
    title: "Happ Crypt5 и INCY",
    text: "Расшифровка happ://crypt5 и incy://crypt1 через API, локальный сайдкар или полностью офлайн собственным AES-256-GCM — на ваш выбор.",
    accent: "from-rose-500/25 to-pink-500/10",
    color: "text-rose-300",
  },
  {
    icon: "bolt",
    title: "Мгновенно, без captcha",
    text: "Никаких проверок «я не робот» и очередей. Результат пересчитывается в реальном времени, пока вы печатаете.",
    accent: "from-violet-500/25 to-fuchsia-500/10",
    color: "text-violet-300",
  },
  {
    icon: "layers",
    title: "Конвертация в обе стороны",
    text: "Не только ссылки → конфиг: вставьте Xray/Sing-box JSON или Mihomo YAML — и получите обратно чистые vless/vmess/trojan-ключи.",
    accent: "from-sky-500/25 to-cyan-500/10",
    color: "text-sky-300",
  },
  {
    icon: "server",
    title: "Сетевые инструменты",
    text: "Парсер подписок с HWID и своими заголовками, Cheburnet-резолвер (DNS, ASN, CDN, гео), белые подсети РФ, QR, Base64 и AES-крипт.",
    accent: "from-teal-500/25 to-emerald-500/10",
    color: "text-teal-300",
  },
  {
    icon: "wand",
    title: "Умная обработка",
    text: "Автоудаление дублей, флаги стран по названию и домену, префиксы, нумерация и уникализация имён узлов.",
    accent: "from-amber-500/25 to-orange-500/10",
    color: "text-amber-300",
  },
  {
    icon: "cpu",
    title: "Готовые профили",
    text: "На выходе не голый список, а полноценный конфиг: DNS, fake-ip, sniffer, группы url-test и правила обхода.",
    accent: "from-fuchsia-500/25 to-pink-500/10",
    color: "text-fuchsia-300",
  },
  {
    icon: "globe",
    title: "ПК и телефон",
    text: "Интерфейс одинаково удобен на десктопе и мобильном: крупные тапы, горизонтальные вкладки, drag-and-drop файлов.",
    accent: "from-indigo-500/25 to-blue-500/10",
    color: "text-indigo-300",
  },
];

const STEPS = [
  { n: "01", t: "Вставьте ссылки", d: "Ссылки, список или base64-подписку" },
  { n: "02", t: "Настройте выдачу", d: "Фильтры, дубли, флаги, префиксы" },
  { n: "03", t: "Заберите конфиг", d: "Копируйте или скачайте файл" },
];

export default function Features() {
  return (
    <>
      <section id="features" className="relative scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Возможности"
            title={
              <>
                Всё, что нужно, и <span className="text-gradient">ничего лишнего</span>
              </>
            }
            subtitle="WVFCONVERTER задуман как инструмент, который открываешь на секунду и получаешь результат."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/20"
              >
                <div
                  className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${f.accent} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`}
                />
                <span
                  className={`relative mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 ${f.color} transition-transform duration-500 group-hover:scale-110`}
                >
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-display relative mb-2 text-base font-bold text-white">
                  {f.title}
                </h3>
                <p className="relative text-sm leading-relaxed text-slate-400">{f.text}</p>
              </motion.div>
            ))}
          </div>

          {/* steps */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex items-center gap-4 rounded-3xl border border-white/8 bg-gradient-to-br from-white/[0.05] to-transparent p-5"
              >
                <span className="font-display text-3xl font-bold text-white/12">{s.n}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{s.t}</div>
                  <div className="text-xs text-slate-400">{s.d}</div>
                </div>
                {i < 2 && (
                  <Icon
                    name="arrow"
                    className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-violet-400/40 sm:block"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* formats */}
      <section id="formats" className="relative scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Форматы"
            title={
              <>
                Один вход — <span className="text-gradient">шесть выходов</span>
              </>
            }
            subtitle="Выберите вкладку в конвертере — результат перестроится мгновенно."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((f, i) => (
              <motion.a
                key={f.id}
                href="#converter"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.07 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-400 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.06]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-white">{f.label}</span>
                  <span className="rounded-lg bg-violet-400/10 px-2 py-1 font-mono text-[10px] tracking-widest text-violet-300">
                    {f.short}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{f.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="font-mono text-[11px] text-slate-500">{f.apps}</span>
                  <Icon
                    name="arrow"
                    className="h-4 w-4 text-violet-300 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
