"use client";

import { useCallback, useSyncExternalStore } from "react";

const VISITED_STORAGE_KEY = "btb.visited";
const VISITED_EVENT = "btb:visited";
const MAX_VISITED = 200;

function readVisited(): string[] {
  try {
    const raw = window.localStorage.getItem(VISITED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

const EMPTY: string[] = [];

export function recordVisited(id: string): void {
  if (typeof window === "undefined" || !id) return;
  const current = readVisited().filter((existing) => existing !== id);
  const next = [id, ...current].slice(0, MAX_VISITED);
  window.localStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(VISITED_EVENT));
}

let cachedRaw = "";
let cachedValue: string[] = EMPTY;
function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(VISITED_STORAGE_KEY) ?? "";
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = readVisited();
  }
  return cachedValue;
}
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(VISITED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VISITED_EVENT, onChange);
  };
}

export function useVisited(): [string[], (id: string) => void] {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const record = useCallback((id: string) => recordVisited(id), []);
  return [ids, record];
}
