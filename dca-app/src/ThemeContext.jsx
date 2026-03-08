import { createContext, useContext, useState, useEffect, useMemo } from "react";

/* ══════════════════════════════════════════════
   DARK & LIGHT COLOR PALETTES
   Carefully designed for readability, contrast,
   and visual harmony in both modes
   ══════════════════════════════════════════════ */

const darkColors = {
  // Backgrounds — matched to admin console (#0b1120)
  bg:   "transparent",
  sf:   "#0f172a",
  sf2:  "#1a2340",
  sf3:  "#1e293b",
  // Borders
  bd:   "#1e293b",
  bd2:  "#334155",
  // Accent & semantic
  acc:  "#3b82f6",
  accH: "#60a5fa",
  grn:  "#22c55e",
  grnH: "#4ade80",
  red:  "#ef4444",
  redH: "#f87171",
  amb:  "#eab308",
  ambH: "#facc15",
  pur:  "#8b5cf6",
  purH: "#a78bfa",
  cyn:  "#06b6d4",
  cynH: "#22d3ee",
  pnk:  "#f472b6",
  // Text
  t1:   "#e8ecf4",
  t2:   "#8b97ad",
  t3:   "#475569",
  // Input
  inp:  "#0b1120",
  // Overlay
  ov:   "rgba(0,0,0,0.5)",
  // Shadow
  sh:   "0 2px 8px rgba(0,0,0,0.3)",
  sh2:  "0 8px 24px rgba(0,0,0,0.25)",
  // Chart tooltip
  ttBg: "#0f172a",
  // Gradient overlay for cards
  grd:  "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 50%)",
};

const lightColors = {
  // Backgrounds — warm whites & soft grays
  bg:   "#f7f8fb",
  sf:   "#ffffff",
  sf2:  "#f0f2f7",
  sf3:  "#e8ebf0",
  // Borders
  bd:   "#d8dde6",
  bd2:  "#c4cbd8",
  // Accent & semantic — slightly deeper in light mode for contrast
  acc:  "#2563eb",
  accH: "#1d4ed8",
  grn:  "#16a34a",
  grnH: "#15803d",
  red:  "#dc2626",
  redH: "#b91c1c",
  amb:  "#ca8a04",
  ambH: "#a16207",
  pur:  "#7c3aed",
  purH: "#6d28d9",
  cyn:  "#0891b2",
  cynH: "#0e7490",
  pnk:  "#ec4899",
  // Text — dark text on light backgrounds
  t1:   "#111827",
  t2:   "#4b5563",
  t3:   "#9ca3af",
  // Input
  inp:  "#f3f4f6",
  // Overlay
  ov:   "rgba(0,0,0,0.15)",
  // Shadow
  sh:   "0 1px 3px rgba(0,0,0,0.08)",
  sh2:  "0 4px 12px rgba(0,0,0,0.06)",
  // Chart tooltip
  ttBg: "#ffffff",
  // Gradient overlay for cards
  grd:  "linear-gradient(135deg, rgba(37,99,235,0.03) 0%, transparent 50%)",
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem("dca-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    // Default to system preference
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });

  // Listen for theme sync from parent (admin console iframe host)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'theme-sync') {
        const t = e.data.theme === 'light' ? 'light' : 'dark';
        setMode(t);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("dca-theme", mode); } catch {}
    document.documentElement.setAttribute("data-theme", mode);
    // Set meta theme-color for mobile browser chrome
    const meta = document.querySelector('meta[name="theme-color"]') || document.createElement("meta");
    meta.name = "theme-color";
    meta.content = mode === "dark" ? "#06080e" : "#f7f8fb";
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [mode]);

  const toggle = () => setMode(m => m === "dark" ? "light" : "dark");

  const cs = useMemo(() => ({
    ...(mode === "dark" ? darkColors : lightColors),
    f: "'IBM Plex Sans',system-ui,-apple-system,sans-serif",
    m: "'IBM Plex Mono',ui-monospace,monospace",
    isDark: mode === "dark",
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ cs, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default ThemeContext;
