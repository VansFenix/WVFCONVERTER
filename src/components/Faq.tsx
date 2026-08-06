import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "../utils/cn";
import { Icon, SectionTitle } from "./ui";

const ITEMS = [
  {
    q: "Мои конфиги куда-то отправляются?",
    a: "Нет. WVFCONVERTER — статичная страница: весь разбор ссылок и сборка конфигов происходит в JavaScript прямо во вкладке браузера. Сетевых запросов с вашими данными нет, поэтому конвертер работает даже без интернета после первой загрузки.",
  },
  {
    q: "Какие протоколы поддерживаются?",
    a: "VLESS (TCP, WS, gRPC, HTTP/2, httpupgrade, TLS, Reality, XTLS-Vision), VMess (в том числе классические base64-ссылки), Trojan, Shadowsocks (SIP002 и legacy base64), Hysteria2 и TUIC v5.",
  },
  {
    q: "Можно вставить ссылку на подписку?",
    a: "Да. Вкладка «Парсер» умеет тянуть подписку по URL через публичный серверный прокси /api/fetch — это решает CORS и позволяет подставить нужный User-Agent и x-hwid, чего браузер сам не умеет. Есть три режима: 🤖 Авто (сервер сам подбирает клиент, читает HTML и deeplink), ⚙️ Свой UA и ∅ Без UA. Содержимое подписки не сохраняется: ответ стримится к вам без записи на диск.",
  },
  {
    q: "Что за 9 слоёв обработки в парсере?",
    a: "После ответа сервера результат прогоняется через цепочку: снятие HTML-обёртки, поиск маркера клиента, UA-фолбэк (Happ → INCY → V2RayTUN → Clash Meta), расшифровка incy://crypt1 и happ://crypt5, base64-декод, основной парсер, regex-фолбэк по всем схемам и финальная попытка base64. На каждом шаге пишется лог с таймстампом — кнопка 🐛 показывает, где именно всё отвалилось.",
  },
  {
    q: "Как расшифровываются happ:// и incy:// ссылки?",
    a: "Happ Crypt5 — через crypto.happ.su либо локальный бинарь на сервере (/api/incy/happ-local), переключатель «Источник»: Авто / API / Local. INCY Crypt1 — это AES-256-GCM, расшифровывается сайдкаром /api/incy/decrypt. Есть и полностью офлайн-режим: свой AES-256-GCM прямо в браузере, вообще без сетевых запросов.",
  },
  {
    q: "Почему при скачивании YouTube решается капча?",
    a: "yt-dlp — тяжёлая операция (CPU, сеть, диск), поэтому перед запуском требуется ALTCHA proof-of-work. Браузер получает задачу из /api/challenge, перебором ищет число, чей SHA-256 с солью совпадает с challenge (обычно 1–3 секунды, виден прогресс), и передаёт токен в /api/dl. Видео склеивается ffmpeg, стримится вам и сразу удаляется.",
  },
  {
    q: "Чем Clash Meta отличается от sing-box в выдаче?",
    a: "Clash Meta — это YAML с proxies, группами select/url-test/fallback, DNS с fake-ip и базовыми правилами. Sing-box — JSON с TUN-инбаундом, selector и urltest, кэшем и Clash API. Xray — классический конфиг ядра с socks/http инбаундами и routing.",
  },
  {
    q: "Почему у некоторых узлов флаг 🏳️?",
    a: "Страна определяется эвристикой по названию узла и домену (например nl-ams-02 → 🇳🇱). Если совпадений нет, ставится нейтральный флаг. Отключить подстановку можно тумблером «Флаги стран».",
  },
  {
    q: "Работает ли это на телефоне?",
    a: "Да. Интерфейс адаптивный: вкладки форматов скроллятся горизонтально, кнопки крупные, поле ввода не ломает вёрстку. Скачивание файла работает во всех современных мобильных браузерах.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle
          eyebrow="Вопросы"
          title={
            <>
              Коротко о <span className="text-gradient">главном</span>
            </>
          }
        />
        <div className="space-y-3">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors duration-300",
                  isOpen
                    ? "border-violet-400/25 bg-violet-500/[0.07]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white sm:text-[15px]">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
                      isOpen
                        ? "bg-violet-500/20 text-violet-200 ring-violet-400/30"
                        : "bg-white/5 text-slate-400 ring-white/10"
                    )}
                  >
                    <Icon name="chevron" className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
