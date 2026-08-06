import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Converter from "./components/Converter";
import Faq from "./components/Faq";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Header, { TABS, type TabId } from "./components/Header";
import Hero from "./components/Hero";
import Palette, { type Command } from "./components/Palette";
import { pushHistory } from "./lib/history";
import { parseInput } from "./lib/parse";
import { QrTab, YoutubeTab } from "./components/tabs/MediaTabs";
import ParserTab from "./components/tabs/ParserTab";
import { NamingTab } from "./components/tools/NamingTools";
import { UrlCodecTool } from "./components/tools/TextTools";
import { Background, Icon, Toaster } from "./components/ui";

const TERMS = [
  "Собираемые данные. Конвертер работает целиком в браузере: ссылки, ключи и подписки не отправляются на сервер. Внешние запросы выполняются только по вашей команде (DNS-резолв, проверка IP, парсер подписки).",
  "Что видит парсер. При загрузке подписки запрос может идти через публичный CORS-ретранслятор — в этом случае домен источника виден этому сервису. Прямой режим и команда curl полностью локальны.",
  "Исходный код. Приложение статичное и open-friendly: весь код исполняется у вас, никаких скрытых бэкендов и телеметрии.",
  "Законное использование. Сервис предназначен для преобразования форматов подписок, к которым у вас есть правомерный доступ.",
  "Без гарантий. Сервис работает «как есть»: корректность разбора всех источников и совместимость со всеми клиентами не гарантируются.",
  "Согласие и изменения. Условия могут обновляться; продолжение использования означает согласие с актуальной редакцией.",
];

function Consent() {
  const [accepted, setAccepted] = useState(true);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    setAccepted(localStorage.getItem("wvf-terms") === "1");
  }, []);

  const accept = () => {
    localStorage.setItem("wvf-terms", "1");
    setAccepted(true);
    setModal(false);
  };

  return (
    <>
      <AnimatePresence>
        {!accepted && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="glass fixed inset-x-3 bottom-3 z-[90] flex flex-col items-center gap-3 rounded-2xl p-3.5 text-center shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-md sm:flex-row sm:text-left"
          >
            <Icon name="shield" className="accent-text h-5 w-5 shrink-0" />
            <p className="text-[11.5px] leading-relaxed text-slate-300">
              Используя сайт, вы принимаете{" "}
              <button onClick={() => setModal(true)} className="accent-text font-semibold underline-offset-2 hover:underline">
                условия использования
              </button>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setAccepted(true)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/10"
              >
                Отклонить
              </button>
              <button onClick={accept} className="accent-bg rounded-xl px-3 py-2 text-xs font-semibold text-white">
                Принять
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => setModal(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">Условия использования</h3>
                <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white">
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
              <ol className="space-y-3">
                {TERMS.map((t, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-slate-300">
                    <span className="accent-soft flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <button onClick={accept} className="accent-bg mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white">
                Принимаю
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>("converter");
  const [input, setInput] = useState("");

  const send = (text: string) => {
    setInput(text);
    setTab("converter");
    setTimeout(() => document.getElementById("converter")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  // сохраняем удачные вводы в историю (с задержкой, чтобы не писать на каждый символ)
  useEffect(() => {
    const id = setTimeout(() => {
      const n = parseInput(input).nodes.length;
      if (n > 0) pushHistory(input, n, "Импорт");
    }, 1200);
    return () => clearTimeout(id);
  }, [input]);

  const commands: Command[] = [
    ...TABS.map((t) => ({
      id: `tab-${t.id}`,
      label: `Открыть: ${t.label}`,
      hint: "вкладка",
      icon: t.icon,
      run: () => setTab(t.id),
    })),
    {
      id: "paste",
      label: "Вставить из буфера в конвертер",
      hint: "clipboard → ввод",
      icon: "clipboard",
      run: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text.trim()) send(text.trim());
        } catch {
          /* denied */
        }
      },
    },
    {
      id: "clear",
      label: "Очистить ввод",
      hint: "сбросить конвертер",
      icon: "trash",
      run: () => setInput(""),
    },
    {
      id: "top",
      label: "Наверх",
      hint: "прокрутить страницу",
      icon: "arrow",
      run: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      id: "tg",
      label: "Telegram · @wildVF",
      hint: "открыть канал",
      icon: "telegram",
      run: () => window.open("https://t.me/wildVF", "_blank", "noopener"),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip antialiased">
      <Background />
      <Header tab={tab} setTab={setTab} />

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {tab === "converter" ? (
              <>
                <Hero />
                <Converter input={input} setInput={setInput} />
                <Features />
                <Faq />
              </>
            ) : (
              <div className="mx-auto max-w-6xl px-4 pt-28 pb-10 sm:px-6 sm:pt-32">
                <div className="mb-6 flex items-center gap-3">
                  <span className="accent-soft flex h-11 w-11 items-center justify-center rounded-2xl border">
                    <Icon name={TABS.find((t) => t.id === tab)!.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {TABS.find((t) => t.id === tab)!.label}
                    </h1>
                    <p className="text-xs text-slate-400">
                      Всё выполняется локально · WVFCONVERTER
                    </p>
                  </div>
                </div>
                {tab === "naming" && <NamingTab onSend={send} />}
                {tab === "parser" && <ParserTab onSend={send} />}
                {tab === "qr" && <QrTab />}
                {tab === "urldec" && (
                  <div className="max-w-2xl">
                    <UrlCodecTool />
                  </div>
                )}
                {tab === "youtube" && <YoutubeTab />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <Toaster />
      <Consent />
      <Palette commands={commands} onRestore={send} />

      <button
        onClick={() => window.dispatchEvent(new CustomEvent("wvf:palette"))}
        title="Команды (Ctrl+K)"
        className="accent-bg accent-glow fixed right-4 bottom-4 z-[70] flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform active:scale-90 sm:right-6 sm:bottom-6"
      >
        <Icon name="bolt" className="h-5 w-5" />
      </button>
    </div>
  );
}
