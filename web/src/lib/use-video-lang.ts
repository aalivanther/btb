"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  DEFAULT_VIDEO_LANG,
  VIDEO_LANG_EVENT,
  VIDEO_LANG_STORAGE_KEY,
  type VideoLang,
} from "@/lib/video-lang";

function readStoredLang(): VideoLang {
  const raw = window.localStorage.getItem(VIDEO_LANG_STORAGE_KEY);
  return raw === "en" || raw === "es" ? raw : DEFAULT_VIDEO_LANG;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(VIDEO_LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VIDEO_LANG_EVENT, onChange);
  };
}

export function useVideoLang(): [VideoLang, (next: VideoLang) => void] {
  const lang = useSyncExternalStore(subscribe, readStoredLang, () => DEFAULT_VIDEO_LANG);

  const update = useCallback((next: VideoLang) => {
    window.localStorage.setItem(VIDEO_LANG_STORAGE_KEY, next);
    window.dispatchEvent(new Event(VIDEO_LANG_EVENT));
  }, []);

  return [lang, update];
}
