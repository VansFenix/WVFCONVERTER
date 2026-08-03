export interface Accent {
  id: string;
  name: string;
  a1: string;
  a2: string;
  a3: string;
  bg: string;
}

export const ACCENTS: Accent[] = [
  { id: "mauve", name: "Black & Mauve", a1: "#8b5cf6", a2: "#c084fc", a3: "#22d3ee", bg: "#141a44" },
  { id: "desert", name: "Desert", a1: "#f59e0b", a2: "#fbbf24", a3: "#fb7185", bg: "#3a2410" },
  { id: "glacier", name: "Glacier", a1: "#38bdf8", a2: "#a5f3fc", a3: "#818cf8", bg: "#0f2c46" },
  { id: "forest", name: "Forest", a1: "#22c55e", a2: "#a3e635", a3: "#14b8a6", bg: "#0f2e22" },
  { id: "cream", name: "Cream purple", a1: "#a78bfa", a2: "#fbcfe8", a3: "#fde68a", bg: "#241a3c" },
  { id: "bubblegum", name: "Bubblegum", a1: "#ec4899", a2: "#f9a8d4", a3: "#60a5fa", bg: "#3a1233" },
  { id: "midnight", name: "Midnight", a1: "#6366f1", a2: "#3b82f6", a3: "#0ea5e9", bg: "#111a3d" },
  { id: "peach", name: "Peach", a1: "#fb923c", a2: "#fda4af", a3: "#fcd34d", bg: "#37201a" },
  { id: "capp", name: "Cappuccino", a1: "#c8a27a", a2: "#e7d3ba", a3: "#8d6e5a", bg: "#2b2018" },
  { id: "wildfire", name: "Wildfire", a1: "#ef4444", a2: "#f97316", a3: "#facc15", bg: "#3b1410" },
  { id: "sunset", name: "Sunset", a1: "#f43f5e", a2: "#fb923c", a3: "#a855f7", bg: "#33132c" },
  { id: "cosmic", name: "Cosmic", a1: "#7c3aed", a2: "#db2777", a3: "#06b6d4", bg: "#1b1140" },
  { id: "acidic", name: "Acidic", a1: "#a3e635", a2: "#22d3ee", a3: "#f0abfc", bg: "#16301a" },
  { id: "oceanic", name: "Oceanic", a1: "#0ea5e9", a2: "#14b8a6", a3: "#6366f1", bg: "#0b2b3a" },
  { id: "mint", name: "Mint", a1: "#2dd4bf", a2: "#86efac", a3: "#60a5fa", bg: "#0d2e2b" },
  { id: "royal", name: "Royal", a1: "#4f46e5", a2: "#9333ea", a3: "#f59e0b", bg: "#191347" },
  { id: "ember", name: "Ember", a1: "#dc2626", a2: "#f59e0b", a3: "#78350f", bg: "#2e1208" },
  { id: "lagoon", name: "Lagoon", a1: "#06b6d4", a2: "#34d399", a3: "#a78bfa", bg: "#0a2b34" },
  { id: "mono", name: "Mono", a1: "#e2e8f0", a2: "#94a3b8", a3: "#64748b", bg: "#1c2230" },
  { id: "darkred", name: "Dark Red", a1: "#991b1b", a2: "#ef4444", a3: "#7f1d1d", bg: "#2b0d0d" },
  { id: "lightred", name: "Light Red", a1: "#f87171", a2: "#fca5a5", a3: "#fb7185", bg: "#38191c" },
  { id: "apple", name: "Green Apple", a1: "#84cc16", a2: "#bef264", a3: "#10b981", bg: "#1c2f11" },
];

export interface ThemeState {
  accent: string;
  custom: { a1: string; a2: string; a3: string } | null;
  contrast: number;
}

export const DEFAULT_THEME: ThemeState = { accent: "mauve", custom: null, contrast: 100 };

export function applyTheme(state: ThemeState) {
  const preset = ACCENTS.find((a) => a.id === state.accent) || ACCENTS[0];
  const c = state.custom ?? { a1: preset.a1, a2: preset.a2, a3: preset.a3 };
  const root = document.documentElement.style;
  root.setProperty("--a1", c.a1);
  root.setProperty("--a2", c.a2);
  root.setProperty("--a3", c.a3);
  root.setProperty("--a-bg", state.custom ? shade(c.a1, -0.72) : preset.bg);
  root.setProperty("--contrast", String(state.contrast / 100));
}

function shade(hex: string, amount: number) {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((x) => x + x).join("") : n;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) * (1 + amount));
  const g = clamp(((num >> 8) & 255) * (1 + amount));
  const b = clamp((num & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem("wvf-theme");
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function saveTheme(state: ThemeState) {
  try {
    localStorage.setItem("wvf-theme", JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
