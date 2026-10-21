"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_FILTER, type TimelineFilter } from "@/lib/timeline";

type GoToTodayHandler = () => void;

export type ActiveBackdrop = {
  url: string;
  seed: number;
};

type FilterContextValue = {
  filter: TimelineFilter;
  setFilter: (patch: Partial<TimelineFilter>) => void;
  goToToday: () => void;
  registerGoToToday: (handler: GoToTodayHandler) => () => void;
  activeBackdrop: ActiveBackdrop | null;
  setActiveBackdrop: (next: ActiveBackdrop | null) => void;
};

const FilterContext = createContext<FilterContextValue | null>(null);

type FilterProviderProps = {
  children: ReactNode;
};

export function FilterProvider({ children }: FilterProviderProps) {
  const [filter, setFilterState] = useState<TimelineFilter>(DEFAULT_FILTER);

  const [activeBackdrop, setActiveBackdropState] = useState<ActiveBackdrop | null>(null);

  const goToTodayHandlerRef = useRef<GoToTodayHandler | null>(null);

  const setFilter = useCallback((patch: Partial<TimelineFilter>) => {
    setFilterState((previous) => ({ ...previous, ...patch }));
  }, []);

  const registerGoToToday = useCallback((handler: GoToTodayHandler) => {
    goToTodayHandlerRef.current = handler;
    return () => {
      if (goToTodayHandlerRef.current === handler) {
        goToTodayHandlerRef.current = null;
      }
    };
  }, []);

  const goToToday = useCallback(() => {
    const handler = goToTodayHandlerRef.current;
    if (handler !== null) {
      handler();
    }
  }, []);

  const setActiveBackdrop = useCallback((next: ActiveBackdrop | null) => {
    setActiveBackdropState(next);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      filter,
      setFilter,
      goToToday,
      registerGoToToday,
      activeBackdrop,
      setActiveBackdrop,
    }),
    [filter, setFilter, goToToday, registerGoToToday, activeBackdrop, setActiveBackdrop],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter(): FilterContextValue {
  const value = useContext(FilterContext);
  if (value === null) {
    throw new Error("useFilter must be used inside a FilterProvider.");
  }
  return value;
}
