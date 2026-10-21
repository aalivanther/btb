"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ViewMode = "auto" | "movil" | "escritorio";

const STORAGE_KEY = "btb:viewmode:v1";

export const MOBILE_MAX_WIDTH = 900;

type ViewportContextValue = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isMobile: boolean;
  ready: boolean;
};

const ViewportContext = createContext<ViewportContextValue | null>(null);

function readStoredMode(): ViewMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "movil" || raw === "escritorio" || raw === "auto") {
      return raw;
    }
  } catch {}
  return "auto";
}

function resolveIsMobile(mode: ViewMode, narrowViewport: boolean): boolean {
  if (mode === "movil") {
    return true;
  }
  if (mode === "escritorio") {
    return false;
  }
  return narrowViewport;
}

function applyDataView(isMobile: boolean): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.view = isMobile ? "mobile" : "desktop";
  }
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("auto");
  const [narrowViewport, setNarrowViewport] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredMode();
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const onChange = () => setNarrowViewport(mediaQuery.matches);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(stored);
    setNarrowViewport(mediaQuery.matches);
    setReady(true);

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  const isMobile = resolveIsMobile(mode, narrowViewport);

  useEffect(() => {
    if (ready) {
      applyDataView(isMobile);
    }
  }, [isMobile, ready]);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = useMemo<ViewportContextValue>(
    () => ({ mode, setMode, isMobile, ready }),
    [mode, setMode, isMobile, ready],
  );

  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>;
}

export function useViewport(): ViewportContextValue {
  const value = useContext(ViewportContext);
  if (value === null) {
    throw new Error("useViewport debe usarse dentro de <ViewportProvider>");
  }
  return value;
}
