<div align="center">

# ⚡ WVFCONVERTER

**Конвертер VPN-конфигов за одно мгновение**

Вставь ссылки `vless://`, `vmess://`, `trojan://` или base64-подписку — получи готовый конфиг
для Clash Meta, sing-box, Xray и любого другого клиента. Без регистрации, без серверов, без captcha.

[🌐 Открыть приложение](https://github.com/VansFenix/WVFCONVERTER) · [✈️ Telegram](https://t.me/wildVF)

![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white&style=for-the-badge)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-38bdf8?logo=tailwindcss&logoColor=white&style=for-the-badge)

</div>

---

## 🚀 Что это

WVFCONVERTER — веб-инструмент, который превращает ссылки VPN-протоколов и подписки в готовые
конфиги для популярных клиентов. **100% кода исполняется в вашем браузере**: ключи, ссылки и
подписки не отправляются на сервер. Сеть используется только там, где без неё нельзя — по вашей команде.

## ✨ Возможности

| | |
|---|---|
| 🔄 **Конвертация офлайн** | Разбор ссылок и генерация конфигов целиком в браузере |
| 🌐 **Парсер с 9 слоями** | CORS-обход, подмена UA и `x-hwid`, снятие HTML-обёрток и deeplink, перебор клиентов Happ / INCY / V2RayTUN / Clash — с пошаговым логом |
| 🔐 **Happ Crypt5 и INCY** | Расшифровка `happ://crypt5` и `incy://crypt1` через API, локальный сайдкар или полностью офлайн — собственный AES-256-GCM |
| ⚡ **Мгновенно, без captcha** | Результат пересчитывается в реальном времени, пока вы печатаете |
| 🔁 **Конвертация в обе стороны** | Ссылки → конфиг и обратно: из Xray/Sing-box JSON или Mihomo YAML снова получаете чистые ключи |
| 🧰 **Сетевые инструменты** | Парсер подписок с HWID и своими заголовками, Cheburnet-резолвер (DNS, ASN, CDN, гео), белые подсети РФ, QR, Base64 и AES-крипт |
| 🪄 **Умная обработка** | Автоудаление дублей, флаги стран по названию и домену, префиксы, нумерация и уникализация имён узлов |
| 🧠 **Готовые профили** | На выходе полноценный конфиг: DNS, fake-ip, sniffer, группы url-test и правила обхода |
| 📱 **ПК и телефон** | Интерфейс одинаково удобен на десктопе и мобильном: drag-and-drop, крупные тапы |

## 🔤 Поддерживаемые протоколы

`VLESS` · `VMess` · `Trojan` · `Shadowsocks` · `Hysteria2` · `TUIC` · `Reality` · `XHTTP` · `WebSocket` · `gRPC`

## 📦 Форматы вывода

| Формат | Расширение | Применение |
|---|---|---|
| **Clash Meta** | `.yaml` | Clash Verge · FlClash · Stash |
| **Sing-box** | `.json` | sing-box · Hiddify · Karing |
| **Xray Core** | `.json` | Xray · v2rayN · Nekoray |
| **Подписка** | `.txt` (base64) | v2rayNG · Streisand · Shadowrocket |
| **Ссылки** | `.txt` | Любой клиент |
| **Selector** | `.json` | Sing-box outbound типа selector |
| **URLTest** | `.json` | Sing-box url-test outbound |
| **qWDTT** | `.json` | Клиенты WVF |
| **WVF JSON** | `.json` | Универсальный внутренний формат |

## 🧭 Дополнительные инструменты

- **Именование** — префиксы, флаги стран, нумерация и уникализация имён узлов
- **Парсер** — загрузка и разбор подписок из любого источника с подменой клиента (UA + HWID)
- **QR** — генерация и чтение QR-кодов для ссылок и подписок
- **Декрипт** — декодирование Base64 / URL-эскейпа, AES-расшифровка
- **YouTube** — загрузка ссылок и подписок с YouTube-каналов
- **Кастомизация** — 20+ акцентных тем и собственные цвета градиента, контраст, IP-статус в шапке

## 🔒 Приватность

- Все данные обрабатываются локально во вкладке браузера
- Внешние запросы — только по вашей команде: DNS-резолв, проверка IP, парсер подписки
- Никаких скрытых бэкендов, телеметрии и сборов данных

## 🛠 Стек

[React 19](https://react.dev) · [Vite 7](https://vitejs.dev) · [TypeScript 5.9](https://www.typescriptlang.org) · [TailwindCSS 4](https://tailwindcss.com) · [Motion](https://motion.dev) · [qrcode](https://www.npmjs.com/package/qrcode) · [jsQR](https://www.npmjs.com/package/jsqr) · [vite-plugin-singlefile](https://www.npmjs.com/package/vite-plugin-singlefile)

## 🚦 Запуск локально

```bash
npm install
npm run dev        # дев-сервер
npm run build      # сборка (один HTML-файл в dist/)
npm run preview    # предпросмотр сборки
```

## 📜 Лицензия

Проект open-source, распространяется «как есть». Предназначен для преобразования подписок,
к которым у вас есть правомерный доступ.

---

<div align="center">

Сделано с ❤️ · [@wildVF](https://t.me/wildVF)

</div>
