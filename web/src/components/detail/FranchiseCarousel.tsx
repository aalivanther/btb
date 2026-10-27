"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Badge, ComicButton, HalftoneImage, PowBurst } from "@/components/comic/kit";
import { RarityFrame } from "@/components/detail/RarityFrame";
import { POW_BY_TIER, franchiseSearchUrl } from "@/components/detail/helpers";
import { deriveRarity } from "@/lib/rarity";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { useNearViewport } from "@/lib/use-near-viewport";
import { ui } from "@/lib/i18n";
import type { Game } from "@/lib/connect/catalog";
import type { CollectionItem } from "@/gen/btb/games/v1/games_pb";

type FranchiseCarouselProps = {
  items: CollectionItem[];
  baseSeed: number;
  franchiseGameById: Map<string, Game>;
  onOpenGame: (game: Game) => void;
};

export function FranchiseCarousel({
  items,
  baseSeed,
  franchiseGameById,
  onOpenGame,
}: FranchiseCarouselProps) {
  const count = items.length;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, moved: false, lastX: 0, velocity: 0 });
  const momentumRef = useRef<number | null>(null);
  const suppressRef = useRef(false);
  const trackNear = useNearViewport(trackRef);

  const wrapScroll = useCallback(() => {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    const third = track.scrollWidth / 3;
    if (third <= 0) {
      return;
    }
    if (track.scrollLeft < third) {
      track.scrollLeft += third;
    } else if (track.scrollLeft >= third * 2) {
      track.scrollLeft -= third;
    }
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    track.scrollLeft = track.scrollWidth / 3;
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    const onScroll = () => wrapScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [wrapScroll]);

  useEffect(() => {
    return () => {
      if (momentumRef.current !== null) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    if (momentumRef.current !== null) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    suppressRef.current = false;
    dragRef.current = { active: true, moved: false, lastX: event.clientX, velocity: 0 };
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const track = trackRef.current;
      if (!drag.active || track === null) {
        return;
      }
      const deltaX = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      drag.velocity = deltaX;
      if (Math.abs(deltaX) > 2) {
        drag.moved = true;
      }
      track.scrollLeft -= deltaX;
      wrapScroll();
    },
    [wrapScroll],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.active) {
      return;
    }
    drag.active = false;
    if (drag.moved) {
      suppressRef.current = true;
    }
    if (!(drag.moved && Math.abs(drag.velocity) > 2)) {
      return;
    }
    let velocity = drag.velocity;
    const step = () => {
      const track = trackRef.current;
      if (track === null) {
        momentumRef.current = null;
        return;
      }
      track.scrollLeft -= velocity;
      wrapScroll();
      velocity *= 0.82;
      momentumRef.current = Math.abs(velocity) > 0.6 ? requestAnimationFrame(step) : null;
    };
    momentumRef.current = requestAnimationFrame(step);
  }, [wrapScroll]);

  const [selected, setSelected] = useState<CollectionItem | null>(null);

  const closeSelected = useCallback(() => {
    setSelected(null);
  }, []);

  const onCardOpen = useCallback(
    (item: CollectionItem) => {
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }
      const catalogGame = item.gameId !== "" ? franchiseGameById.get(item.gameId) : undefined;
      if (catalogGame !== undefined) {
        onOpenGame(catalogGame);
        return;
      }
      setSelected(item);
    },
    [franchiseGameById, onOpenGame],
  );

  const renderCopy = (copyKey: string, isMain: boolean) =>
    items.map((item, index) => {
      const itemTier = deriveRarity(item.rating ?? 0);
      const inCatalog = item.gameId !== "" && franchiseGameById.has(item.gameId);
      return (
        <button
          key={`${copyKey}-${item.title}-${index}`}
          type="button"
          aria-label={ui.detail.franchiseOpenAria(item.title)}
          aria-hidden={isMain ? undefined : true}
          tabIndex={isMain ? 0 : -1}
          className="dv-saga-card"
          onClick={() => onCardOpen(item)}
        >
          <RarityFrame tier={itemTier} className="dv-saga-frame">
            <HalftoneImage
              url={item.posterUrl}
              seed={baseSeed + index}
              intensity="soft"
              className="dv-saga-art"
              deferImage={!trackNear}
            />
            <span className="dv-saga-grad" aria-hidden="true" />
            {item.year ? (
              <Badge tone="ink" className="dv-saga-year">
                {item.year}
              </Badge>
            ) : null}
            {item.extra ? (
              <Badge tone="magenta" className="dv-saga-extra">
                {item.extra}
              </Badge>
            ) : null}
            {inCatalog ? (
              <Badge tone="cyan" className="dv-saga-inbtb">
                {ui.detail.inCatalogBadge}
              </Badge>
            ) : null}
          </RarityFrame>
          <span className="dv-saga-name">{item.title}</span>
        </button>
      );
    });

  return (
    <>
      <div
        ref={trackRef}
        className="dv-saga-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="dv-saga-strip">
          <div className="dv-saga-copy" data-clone aria-hidden="true">
            {renderCopy("a", false)}
          </div>
          <div className="dv-saga-copy">{renderCopy("b", true)}</div>
          <div className="dv-saga-copy" data-clone aria-hidden="true">
            {renderCopy("c", false)}
          </div>
        </div>
      </div>

      {selected !== null ? (
        <FranchiseItemModal item={selected} seed={baseSeed} onClose={closeSelected} />
      ) : null}
    </>
  );
}

type FranchiseItemModalProps = {
  item: CollectionItem;
  seed: number;
  onClose: () => void;
};

function FranchiseItemModal({ item, seed, onClose }: FranchiseItemModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose);

  const heroUrl = item.backdropUrl || item.posterUrl;
  const itemTier = deriveRarity(item.rating ?? 0);
  return (
    <div
      className="dv-saga-modal"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="dv-saga-modal-card c-panel c-panel-violet c-panel-ht"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <ComicButton
          variant="danger"
          className="dv-saga-modal-close"
          onClick={onClose}
          ariaLabel={ui.detail.lightboxClose}
        >
          ✕
        </ComicButton>

        <RarityFrame tier={itemTier} className="dv-saga-modal-hero">
          <HalftoneImage url={heroUrl} seed={seed} intensity="soft" className="dv-saga-modal-art" />
          <span className="dv-saga-modal-grad" aria-hidden="true" />
          {item.rating > 0 ? (
            <PowBurst tone={POW_BY_TIER[itemTier]} className="dv-saga-modal-rating">
              {item.rating.toFixed(1)}
            </PowBurst>
          ) : null}
        </RarityFrame>

        <div className="dv-saga-modal-body">
          <h4 className="dv-saga-modal-title font-display">{item.title}</h4>
          {item.year || item.extra ? (
            <div className="dv-saga-modal-meta font-label">
              {[item.year, item.extra].filter(Boolean).join(" · ")}
            </div>
          ) : null}
          <p className="dv-saga-modal-synopsis">
            {item.overview ? item.overview : ui.detail.noSynopsis}
          </p>
          <a
            href={franchiseSearchUrl(item.title, item.year)}
            target="_blank"
            rel="noopener noreferrer"
            className="dv-saga-modal-search font-label"
          >
            {ui.detail.franchiseSearchAria(item.title)}
            <span aria-hidden="true"> →</span>
          </a>
        </div>
      </div>
    </div>
  );
}
