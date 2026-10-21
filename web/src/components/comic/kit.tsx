import type { CSSProperties, JSX, ReactNode } from "react";

import { coverStyleFor } from "@/lib/timeline";
import type { Tier } from "@/lib/rarity";

export type HalftoneIntensity = "strong" | "soft";
export function HalftoneImage({
  url,
  seed,
  intensity = "strong",
  className = "",
}: {
  url: string;
  seed: number;
  intensity?: HalftoneIntensity;
  className?: string;
}): JSX.Element {
  const style = coverStyleFor(url, seed) as CSSProperties;
  const photoClass = url ? (intensity === "soft" ? " is-photo is-soft" : " is-photo") : "";
  return (
    <span aria-hidden="true" className={`c-htimg${photoClass} ${className}`.trim()} style={style}>
      <span className="c-htimg-dots" />
    </span>
  );
}

export function RarityFrame({
  tier,
  children,
  className = "",
}: {
  tier: Tier;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span className={`c-rarity c-rarity-${tier} ${className}`.trim()}>
      <span className="c-rarity-inner">{children}</span>
      <span aria-hidden="true" className="c-rarity-gem" />
    </span>
  );
}

export type PowTone = "yellow" | "magenta" | "cyan" | "lime" | "ink";
export function PowBurst({
  children,
  tone = "yellow",
  className = "",
}: {
  children: ReactNode;
  tone?: PowTone;
  className?: string;
}): JSX.Element {
  return (
    <span className={`c-pow c-pow-${tone} ${className}`.trim()}>
      <span className="c-pow-in">{children}</span>
    </span>
  );
}

export type ButtonVariant = "primary" | "ghost" | "danger" | "cyan";
export function ComicButton({
  children,
  onClick,
  variant = "primary",
  bubble = false,
  type = "button",
  ariaLabel,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  bubble?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`c-btn c-btn-${variant}${bubble ? " c-btn-bubble" : ""} font-display ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export type BubbleTail = "bottom" | "left" | "top" | "none";
export function SpeechBubble({
  children,
  tail = "bottom",
  tone = "yellow",
  className = "",
}: {
  children: ReactNode;
  tail?: BubbleTail;
  tone?: PowTone;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={`c-bubble c-bubble-tail-${tail} c-bubble-${tone} font-display ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export type PanelTone = "dark" | "paper" | "violet";
export function ComicPanel({
  children,
  tone = "dark",
  halftone = false,
  tilt = false,
  className = "",
}: {
  children: ReactNode;
  tone?: PanelTone;
  halftone?: boolean;
  tilt?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`c-panel c-panel-${tone}${halftone ? " c-panel-ht" : ""}${tilt ? " c-panel-tilt" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function SectionBanner({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <h3 className={`c-banner font-display ${className}`.trim()}>
      <span className="c-banner-in">{children}</span>
    </h3>
  );
}

export function Badge({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: PowTone;
  className?: string;
}): JSX.Element {
  return (
    <span className={`c-badge c-badge-${tone} font-label ${className}`.trim()}>{children}</span>
  );
}
