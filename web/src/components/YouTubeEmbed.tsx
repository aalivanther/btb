"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";

import { gradientStyleFor } from "@/lib/timeline";
import { ui } from "@/lib/i18n";
import type { Tier } from "@/lib/rarity";
import { buildEmbedUrl } from "@/lib/video-lang";
import { useVideoLang } from "@/lib/use-video-lang";

const TIER_FRAME_CLASS: Record<Tier, string> = {
  legendary: "rf-frame rf-t-legendary",
  epic: "rf-frame rf-t-epic",
  rare: "rf-frame rf-t-rare",
  common: "rf-frame rf-t-common",
};

type YouTubeEmbedProps = {
  youtubeKey: string;
  title: string;
  framed?: Tier;
  caption?: string;
  seed?: number;
  unavailableLabel?: string;
  posterUrl?: string;
  overlay?: ReactNode;
};

export function YouTubeEmbed({
  youtubeKey,
  title,
  framed,
  caption,
  seed = 0,
  unavailableLabel = ui.detail.trailerUnavailable,
  posterUrl,
  overlay,
}: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang] = useVideoLang();

  const startPlaying = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const frameClassName = framed !== undefined ? TIER_FRAME_CLASS[framed] : "rf-frame";

  const containerClassName = `${frameClassName} relative aspect-video w-full overflow-hidden${
    overlay ? " rf-hero" : ""
  }`;

  const posterBackgroundStyle: CSSProperties = posterUrl
    ? {
        backgroundImage: `url(${posterUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "saturate(1.07) contrast(1.04)",
      }
    : gradientStyleFor(seed);

  const heroVeil = overlay
    ? "linear-gradient(0deg, rgba(7,8,9,.92), rgba(7,8,9,.25) 52%, rgba(7,8,9,.45))"
    : "linear-gradient(0deg, rgba(7,8,9,.55), transparent 60%)";

  if (!youtubeKey) {
    return (
      <div
        className={containerClassName}
        role="img"
        aria-label={unavailableLabel}
      >
        <div className="absolute inset-0" style={posterBackgroundStyle} aria-hidden="true" />
        <div className="absolute inset-0" aria-hidden="true" style={{ background: heroVeil }} />
        {overlay ? <div className="rf-hero-tex" aria-hidden="true" /> : null}
        <div className="absolute inset-0 z-[1] flex items-center justify-center px-4">
          <span className="font-mono text-center text-[11px] tracking-[0.14em] uppercase text-text-muted">
            {unavailableLabel}
          </span>
        </div>
        {overlay ? <div className="rf-hero-overlay">{overlay}</div> : null}
      </div>
    );
  }

  if (isPlaying) {
    const embedSource = buildEmbedUrl({ youtubeKey, lang, autoplay: true });
    return (
      <div className={containerClassName}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={embedSource}
          title={ui.detail.embedTitle(title)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="absolute inset-0" style={posterBackgroundStyle} aria-hidden="true" />
      <div className="absolute inset-0" aria-hidden="true" style={{ background: heroVeil }} />
      {overlay ? <div className="rf-hero-tex" aria-hidden="true" /> : null}
      <button
        type="button"
        onClick={startPlaying}
        aria-label={ui.detail.playTrailerAria(title)}
        className="rf-play absolute inset-0 z-[1] flex cursor-pointer flex-col items-center justify-center gap-[9px]"
      >
        <span
          aria-hidden="true"
          className="rf-play-circle flex h-[60px] w-[60px] items-center justify-center rounded-full text-lg text-white"
          style={{
            border: "1px solid rgba(255,255,255,.3)",
            background: "rgba(7,8,9,.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          ▶
        </span>
        {caption !== undefined && !overlay ? (
          <span
            aria-hidden="true"
            className="font-mono text-[10px] tracking-[0.16em] uppercase text-text-muted"
          >
            {caption}
          </span>
        ) : null}
      </button>
      {overlay ? <div className="rf-hero-overlay">{overlay}</div> : null}
    </div>
  );
}
