"use client";

import { useRef } from "react";

import { ComicButton } from "@/components/comic/kit";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { gradientStyleFor } from "@/lib/timeline";
import { ui } from "@/lib/i18n";
import type { Image as CatalogImage } from "@/gen/btb/games/v1/games_pb";

type LightboxProps = {
  image: CatalogImage;
  fallbackAlt: string;
  fallbackSeed: number;
  onClose: () => void;
};

export function Lightbox({ image, fallbackAlt, fallbackSeed, onClose }: LightboxProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose);

  return (
    <div
      ref={cardRef}
      className="dv-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.label || ui.detail.galleryLabel}
      onClick={onClose}
      onKeyDown={onTrapKeyDown}
    >
      <ComicButton
        variant="danger"
        ariaLabel={ui.detail.lightboxClose}
        onClick={onClose}
        className="dv-lightbox-close"
      >
        ✕
      </ComicButton>
      {image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="dv-lightbox-img" src={image.url} alt={image.label || fallbackAlt} />
      ) : (
        <div className="dv-lightbox-img" style={gradientStyleFor(fallbackSeed)} />
      )}
      {image.label ? <span className="dv-lightbox-cap font-label">{image.label}</span> : null}
    </div>
  );
}
