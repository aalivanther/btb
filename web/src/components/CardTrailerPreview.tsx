"use client";

import { useEffect, useState } from "react";

import { buildEmbedUrl } from "@/lib/video-lang";
import { useVideoLang } from "@/lib/use-video-lang";

const INTENT_DELAY_MS = 350;

function canHover(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover)").matches;
}

type CardTrailerPreviewProps = {
  youtubeKey: string;
  active: boolean;
};

export function CardTrailerPreview({ youtubeKey, active }: CardTrailerPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [lang] = useVideoLang();

  useEffect(() => {
    if (!youtubeKey || !active || !canHover()) return;
    const timer = window.setTimeout(() => setMounted(true), INTENT_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setMounted(false);
    };
  }, [active, youtubeKey]);

  if (!youtubeKey || !mounted) return null;

  return (
    <span className="ct-card-preview" aria-hidden="true">
      <iframe
        className="ct-card-preview-frame"
        src={buildEmbedUrl({ youtubeKey, lang, preview: true })}
        title=""
        allow="autoplay; encrypted-media; picture-in-picture"
        tabIndex={-1}
        loading="lazy"
      />
    </span>
  );
}
