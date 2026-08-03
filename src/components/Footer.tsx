import { motion } from "motion/react";
import { Logo } from "./Header";
import { GlowButton, Icon } from "./ui";

export default function Footer() {
  return (
    <footer className="relative mt-10 px-4 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-600/15 via-white/[0.03] to-cyan-500/10 p-8 text-center sm:p-12"
        >
          <div className="animate-aurora absolute -top-24 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/25 blur-[100px]" />
          <h3 className="font-display relative text-2xl font-bold text-white sm:text-3xl">
            Готовы получить свой конфиг?
          </h3>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
            Одна вкладка, ноль серверов, максимум удобства. Всё бесплатно и без регистрации.
          </p>
          <div className="relative mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <GlowButton href="#converter">
              <Icon name="bolt" className="h-4 w-4" />
              Перейти к конвертеру
            </GlowButton>
            <GlowButton href="https://t.me/wildVF" variant="ghost">
              <Icon name="telegram" className="h-4 w-4" />
              Telegram · @wildVF
            </GlowButton>
          </div>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-white/8 pt-8 sm:flex-row">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <Logo />
            <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500 sm:text-left">
              Инструмент предназначен для законного использования: настройки собственных серверов и
              защиты личного трафика.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <a
              href="https://t.me/wildVF"
              target="_blank"
              rel="noopener noreferrer"
              className="accent-text flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-80"
            >
              <Icon name="telegram" className="h-3.5 w-3.5" />
              @wildVF
            </a>
            <a href="#converter" className="transition-colors hover:text-white">
              Конвертер
            </a>
            <a href="#features" className="transition-colors hover:text-white">
              Возможности
            </a>
            <a href="#formats" className="transition-colors hover:text-white">
              Форматы
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              Вопросы
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-[11px] text-slate-600 sm:flex-row">
          <span>© {new Date().getFullYear()} WVFCONVERTER · работает офлайн</span>
          <span className="flex items-center gap-1.5">
            сделано с <Icon name="heart" className="h-3.5 w-3.5 text-rose-400/70" /> для приватности
          </span>
        </div>
      </div>
    </footer>
  );
}
