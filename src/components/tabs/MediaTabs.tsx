import jsQR from "jsqr";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import {
  YT_HOST_RE,
  buildDownloadUrl,
  getChallenge,
  solveChallenge,
  type Quality,
} from "../../lib/api";
import { Btn, CopyBtn, Label, Panel, Result, Segmented, TextArea, TextInput } from "../kit";
import { toast } from "../ui";

/* ----------------------------------- QR ----------------------------------- */

export function QrTab() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [ec, setEc] = useState<"L" | "M" | "Q" | "H">("M");
  const [dataUrl, setDataUrl] = useState("");
  const [decoded, setDecoded] = useState("");
  const [preview, setPreview] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!text.trim()) {
      setDataUrl("");
      return;
    }
    const id = setTimeout(() => {
      QRCode.toDataURL(text, {
        width: size,
        errorCorrectionLevel: ec,
        margin: 2,
        color: { dark: "#0b0d1c", light: "#ffffff" },
      })
        .then(setDataUrl)
        .catch(() => toast("Слишком длинный текст для QR", "err"));
    }, 250);
    return () => clearTimeout(id);
  }, [text, size, ec]);

  const download = (type: "png" | "jpeg" | "both") => {
    if (!dataUrl) return toast("Сначала введите текст", "err");
    const save = (href: string, ext: string) => {
      const a = document.createElement("a");
      a.href = href;
      a.download = `wvf-qr.${ext}`;
      a.click();
    };
    if (type === "png" || type === "both") save(dataUrl, "png");
    if (type === "jpeg" || type === "both") {
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current!;
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        save(c.toDataURL("image/jpeg", 0.92), "jpg");
      };
      img.src = dataUrl;
    }
    toast("QR сохранён");
  };

  const decodeFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current!;
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      c.width = img.width * scale;
      c.height = img.height * scale;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) {
        setDecoded(code.data);
        toast("QR распознан");
      } else {
        setDecoded("");
        toast("QR-код не найден на изображении", "err");
      }
    };
    img.src = url;
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) decodeFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="QR-код · генератор" subtitle="Ссылки, ключи, любой текст" icon="sparkles">
        <Label>Текст / ссылка / ключ</Label>
        <TextArea value={text} onChange={setText} rows={5} placeholder="vless://… или любой текст" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Размер: {size}px</Label>
            <input
              type="range"
              min={128}
              max={1024}
              step={64}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <Label>Коррекция ошибок</Label>
            <Segmented
              id="qr-ec"
              size="sm"
              value={ec}
              onChange={setEc}
              options={[
                { id: "L", label: "L 7%" },
                { id: "M", label: "M 15%" },
                { id: "Q", label: "Q 25%" },
                { id: "H", label: "H 30%" },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-center rounded-2xl border border-white/10 bg-black/30 p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR" className="h-56 w-56 rounded-xl bg-white p-2 shadow-2xl" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">
              QR появится здесь
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="accent" icon="download" onClick={() => download("png")}>
            PNG
          </Btn>
          <Btn icon="download" onClick={() => download("jpeg")}>
            JPEG
          </Btn>
          <Btn icon="download" onClick={() => download("both")}>
            Оба сразу
          </Btn>
        </div>
      </Panel>

      <Panel title="QR-код · декодер" subtitle="Распознавание из файла или буфера обмена" icon="eye">
        <div className="flex flex-wrap gap-2">
          <Btn variant="accent" icon="upload" onClick={() => fileRef.current?.click()}>
            Выбрать фото
          </Btn>
          <Btn icon="clipboard" onClick={() => toast("Нажмите Ctrl+V — изображение распознается", "info")}>
            Вставить фото
          </Btn>
          <CopyBtn text={decoded} />
          <Btn variant="danger" icon="trash" onClick={() => { setDecoded(""); setPreview(""); }} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && decodeFile(e.target.files[0])}
        />
        <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/25 p-3">
          {preview ? (
            <img src={preview} alt="загруженное" className="max-h-56 rounded-xl" />
          ) : (
            <span className="text-xs text-slate-600">Фото с QR-кодом</span>
          )}
        </div>
        <div className="mt-3">
          <Label>Распознанный текст</Label>
          <Result value={decoded} rows={5} />
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </Panel>
    </div>
  );
}

/* -------------------------------- YouTube -------------------------------- */

const QUALITIES: { id: Quality; label: string; note: string }[] = [
  { id: "max", label: "Максимум", note: "до 4K · VP9/AV1 — VLC/MPV или телефон" },
  { id: "1080", label: "1080p", note: "H.264 mp4 — играет везде, в т.ч. в Telegram" },
  { id: "720", label: "720p", note: "H.264 — лёгкий вариант" },
  { id: "480", label: "480p", note: "H.264 — быстрое скачивание" },
  { id: "360", label: "360p", note: "минимальный размер" },
];

const videoId = (url: string) => {
  const m = url.match(
    /(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/
  );
  return m?.[1] || null;
};

export function YoutubeTab() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState<Quality>("1080");
  const [stage, setStage] = useState<"idle" | "pow" | "dl">("idle");
  const [powProgress, setPowProgress] = useState(0);
  const id = videoId(url);

  const download = async () => {
    const target = url.trim();
    if (!id || !YT_HOST_RE.test(target.startsWith("http") ? target : `https://${target}`))
      return toast("Поддерживаются только ссылки YouTube", "err");
    setStage("pow");
    setPowProgress(0);
    try {
      const challenge = await getChallenge();
      toast("Решаю проверку ALTCHA…", "info");
      const token = await solveChallenge(challenge, (n, max) =>
        setPowProgress(Math.min(99, Math.round((n / max) * 100)))
      );
      setPowProgress(100);
      setStage("dl");
      const session = Math.random().toString(36).slice(2, 12);
      const href = buildDownloadUrl(target, quality, token, session);
      const a = document.createElement("a");
      a.href = href;
      a.rel = "noopener";
      a.click();
      toast("Загрузка началась — файл стримится напрямую", "ok");
    } catch (e) {
      toast((e as Error).message || "Не удалось скачать", "err");
    } finally {
      setTimeout(() => setStage("idle"), 2500);
    }
  };

  const thumbs = id
    ? [
        { name: "maxresdefault (1280×720)", src: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` },
        { name: "hqdefault (480×360)", src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` },
      ]
    : [];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Скачать видео с YouTube"
        subtitle="Видео не хранится на сервере — отдаётся напрямую и сразу удаляется"
        icon="download"
      >
        <Label>Ссылка на YouTube</Label>
        <TextInput value={url} onChange={setUrl} placeholder="https://youtu.be/dQw4w9WgXcQ" mono />

        <div className="mt-3">
          <Label>Качество</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                  quality === q.id
                    ? "accent-soft"
                    : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="font-semibold">{q.label}</div>
                <div className="text-[10px] text-slate-500">{q.note}</div>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {stage !== "idle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="accent-text font-semibold">
                    {stage === "pow" ? "ALTCHA · proof-of-work" : "Стриминг файла с сервера"}
                  </span>
                  <span className="font-mono text-slate-500">
                    {stage === "pow" ? `${powProgress}%` : "yt-dlp + ffmpeg"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="accent-bg h-full"
                    animate={{ width: stage === "pow" ? `${powProgress}%` : "100%" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="accent" icon="download" loading={stage !== "idle"} onClick={download}>
            Скачать
          </Btn>
          <Btn
            icon="eye"
            onClick={() =>
              id
                ? window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener")
                : toast("Введите ссылку", "err")
            }
          >
            Открыть видео
          </Btn>
          <CopyBtn
            text={id ? `yt-dlp -f "bv*[height<=${quality === "max" ? 2160 : quality}]+ba/b" https://youtu.be/${id}` : ""}
            label="yt-dlp"
          />
          <Btn variant="danger" icon="trash" onClick={() => setUrl("")} />
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-slate-500">
          Скачивание идёт через <b>/api/dl</b>: сервер решает ALTCHA-капчу, тянет ролик через
          <b> yt-dlp</b>, склеивает дорожки <b>ffmpeg</b> и стримит файл напрямую вам — на диске
          ничего не остаётся. Кнопка <b>yt-dlp</b> копирует команду для полностью локальной загрузки.
        </p>
      </Panel>

      <Panel title="Превью" subtitle={id ? `ID: ${id}` : "введите ссылку"} icon="layers">
        {id ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title="preview"
                src={`https://www.youtube-nocookie.com/embed/${id}`}
                allowFullScreen
                className="aspect-video w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {thumbs.map((t) => (
                <a
                  key={t.src}
                  href={t.src}
                  download
                  target="_blank"
                  rel="noopener"
                  className="group overflow-hidden rounded-xl border border-white/10 transition hover:border-white/25"
                >
                  <img src={t.src} alt={t.name} className="w-full transition group-hover:scale-105" />
                  <div className="p-2 text-[10px] text-slate-400">⬇ {t.name}</div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/12 text-xs text-slate-600">
            Здесь появится превью и обложки
          </div>
        )}
      </Panel>
    </div>
  );
}
