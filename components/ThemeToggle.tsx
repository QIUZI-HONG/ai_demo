"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_LABELS: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const SystemIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const cur = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const stored = (localStorage.getItem("theme") as Theme) || (cur === "dark" ? "dark" : "light");
    setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    } else {
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }

  return (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      {(["light", "dark", "system"] as Theme[]).map((t) => (
        <button
          key={t}
          aria-label={`主题：${THEME_LABELS[t]}`}
          onClick={() => apply(t)}
          className={`magnetic flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            theme === t ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--fg)]"
          }`}
        >
          {t === "light" ? <SunIcon /> : t === "dark" ? <MoonIcon /> : <SystemIcon />}
        </button>
      ))}
    </div>
  );
}
