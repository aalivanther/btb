"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type JSX,
  type ReactNode,
} from "react";

export type Theme = "vivo" | "noir";
const STORAGE_KEY = "btb:theme:v1";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>("vivo");

  useEffect(() => {
    let saved: Theme = "vivo";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "noir" || raw === "vivo") {
        saved = raw;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "vivo" ? "noir" : "vivo");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return value;
}
