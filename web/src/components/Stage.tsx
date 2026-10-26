"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { ReleaseDetail } from "@/components/ReleaseDetail";
import { deriveRarity, deriveRarityFromHypes, type Tier } from "@/lib/rarity";
import {
  LANE_META,
  MONTHS,
  isUpcoming,
  laneKeyFromEnum,
  type Connection,
  type LaneKey,
  type TodayMarker,
} from "@/lib/timeline";
import { useProfile } from "@/lib/profile-context";
import { ui } from "@/lib/i18n";
import type { Game } from "@/lib/connect/catalog";
import { GameKind } from "@/gen/btb/games/v1/games_pb";
import { type Deal } from "@/gen/btb/games/v1/deals_pb";
import { titlesMatch } from "@/lib/deal-match";
import {
  Badge,
  ComicButton,
  HalftoneImage,
  PowBurst,
  RarityFrame,
  SpeechBubble,
  type PowTone,
} from "@/components/comic/kit";

function dealMatchesShown(deal: Deal | undefined, shownGame: Game | null): boolean {
  return deal !== undefined && shownGame !== null && titlesMatch(deal.title, shownGame.title);
}

const POW_BY_TIER: Record<Tier, PowTone> = {
  legendary: "yellow",
  epic: "magenta",
  rare: "cyan",
  common: "ink",
};

const TIER_LABELS: Record<Tier, string> = {
  legendary: ui.tiers.legendary,
  epic: ui.tiers.epic,
  rare: ui.tiers.rare,
  common: ui.tiers.common,
};

const KIND_LABELS: Record<GameKind, string> = {
  [GameKind.UNSPECIFIED]: ui.admin.kindGame,
  [GameKind.GAME]: ui.admin.kindGame,
  [GameKind.DLC]: ui.admin.kindDlc,
  [GameKind.EXPANSION]: ui.admin.kindExpansion,
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function readCritic(game: Game): number {
  return game.ratings?.critic ?? 0;
}

function formatCritic(game: Game): string {
  return readCritic(game).toFixed(1);
}

type StageProps = {
  open: boolean;
  month: number;
  day: number;
  laneKey: LaneKey;
  games: Game[];
  activeGame: Game | null;
  detailExpanded: boolean;
  related: Connection[];
  franchiseGames: Game[];
  deal?: Deal;
  today: TodayMarker;
  seedById: Map<string, number>;
  onSelectCard: (game: Game) => void;
  onOpenDetail: () => void;
  onCollapseDetail: () => void;
  onClose: () => void;
};

export function Stage({
  open,
  month,
  day,
  laneKey,
  games,
  activeGame,
  detailExpanded,
  related,
  franchiseGames,
  deal,
  today,
  seedById,
  onSelectCard,
  onOpenDetail,
  onCollapseDetail,
  onClose,
}: StageProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const activeElement = document.activeElement;
    triggerElementRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    return () => {
      const trigger = triggerElementRef.current;
      if (trigger !== null && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const panel = modalRef.current;
    if (panel === null) {
      return;
    }
    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable !== null) {
      firstFocusable.focus();
    } else {
      panel.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (detailExpanded) {
        onCollapseDetail();
      } else {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, detailExpanded, onCollapseDetail, onClose]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const panel = modalRef.current;
    if (panel === null) {
      return;
    }
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey) {
      if (activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, []);

  if (!open) {
    return null;
  }

  const laneMeta = LANE_META[laneKey];
  const monthLabelLower = (MONTHS[month] ?? "").toLowerCase();
  const catSubtitle = ui.stage.catSubtitle(day, monthLabelLower, games.length);
  const catDialogLabel = ui.stage.catDialogLabel(laneMeta.label, day, monthLabelLower);

  const shownGame = activeGame ?? (games.length > 0 ? games[0] : null);

  return (
    <>
      <div className="sm-scrim" aria-hidden="true" onClick={onClose} />

      <div className="sm-wrap">
        <div
          ref={modalRef}
          className={`sm-modal c-panel c-panel-violet c-panel-ht st-lane-${laneKey}`}
          role="dialog"
          aria-modal="true"
          aria-label={catDialogLabel}
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className="sm-head">
            <div className="sm-head-titles">
              <h2 id={titleId} className="sm-head-title font-display">
                {laneMeta.label}
              </h2>
              <div className="sm-head-sub font-label">{catSubtitle}</div>
            </div>
            <ComicButton
              variant="danger"
              ariaLabel={ui.stage.close}
              onClick={onClose}
              className="sm-close"
            >
              <span aria-hidden="true">✕</span>
            </ComicButton>
          </div>

          <div className="sm-body">
            {games.length > 0 ? (
              <div
                className="sm-rail"
                role="group"
                aria-label={ui.stage.carouselLabel(laneMeta.label)}
              >
                {games.map((game) => (
                  <CarouselCard
                    key={game.id}
                    game={game}
                    seed={seedById.get(game.id) ?? 0}
                    active={shownGame !== null && game.id === shownGame.id}
                    upcoming={isUpcoming(game, today)}
                    onSelect={onSelectCard}
                  />
                ))}
              </div>
            ) : (
              <p className="sm-rail sm-empty" role="status">
                {ui.stage.emptyCategory}
              </p>
            )}

            <div className="sm-pane">
              {shownGame === null ? (
                <p className="sm-empty" role="status">
                  {ui.stage.emptyCategory}
                </p>
              ) : detailExpanded ? (
                <DetailView
                  game={shownGame}
                  related={related}
                  franchiseGames={franchiseGames}
                  deal={dealMatchesShown(deal, shownGame) ? deal : undefined}
                  upcoming={isUpcoming(shownGame, today)}
                  today={today}
                  onBack={onCollapseDetail}
                />
              ) : (
                <PreviewPane
                  game={shownGame}
                  seed={seedById.get(shownGame.id) ?? 0}
                  deal={dealMatchesShown(deal, shownGame) ? deal : undefined}
                  upcoming={isUpcoming(shownGame, today)}
                  onOpenDetail={onOpenDetail}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type CarouselCardProps = {
  game: Game;
  seed: number;
  active: boolean;
  upcoming: boolean;
  onSelect: (game: Game) => void;
};

function CarouselCard({ game, seed, active, upcoming, onSelect }: CarouselCardProps) {
  const released = readCritic(game) > 0;
  const tier = released ? deriveRarity(readCritic(game)) : deriveRarityFromHypes(game.hypes ?? 0);
  const criticText = formatCritic(game);
  const kindLabel = KIND_LABELS[game.kind] ?? KIND_LABELS[GameKind.UNSPECIFIED];
  const firstGenre = game.genres.length > 0 ? game.genres[0] : "";
  const metaText = ui.stage.cardMeta(kindLabel, firstGenre);
  const cardAriaLabel = ui.stage.cardAriaLabel(game.title, kindLabel, criticText);

  const handleClick = useCallback(() => {
    onSelect(game);
  }, [onSelect, game]);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={cardAriaLabel}
      onClick={handleClick}
      className={`sm-vcard${active ? " is-on" : ""}`}
    >
      <RarityFrame tier={tier} className="sm-vcard-frame">
        <HalftoneImage url={game.coverUrl} seed={seed} intensity="soft" className="sm-vcard-art" />
        <span className="sm-vcard-grad" aria-hidden="true" />
        <span className="sm-vcard-ttl font-display">{game.title}</span>
      </RarityFrame>
      {released ? (
        <PowBurst tone={POW_BY_TIER[tier]} className="sm-vcard-pow">
          {criticText}
        </PowBurst>
      ) : null}
      {upcoming ? (
        <SpeechBubble tone="cyan" tail="none" className="sm-vcard-new">
          {ui.stage.upcomingShort}
        </SpeechBubble>
      ) : null}
      <span className="sm-vcard-meta font-comic">{metaText}</span>
    </button>
  );
}

type PreviewPaneProps = {
  game: Game;
  seed: number;
  deal?: Deal;
  upcoming: boolean;
  onOpenDetail: () => void;
};

function PreviewPane({ game, seed, deal, upcoming, onOpenDetail }: PreviewPaneProps) {
  const { isWishlisted, toggleWishlist } = useProfile();
  const saved = isWishlisted(game.id);
  const released = readCritic(game) > 0;
  const tier = released ? deriveRarity(readCritic(game)) : deriveRarityFromHypes(game.hypes ?? 0);
  const tierLabel = TIER_LABELS[tier];
  const criticText = formatCritic(game);
  const kindLabel = KIND_LABELS[game.kind] ?? KIND_LABELS[GameKind.UNSPECIFIED];
  const metacritic = game.ratings?.metacritic ?? "";
  const opencritic = game.ratings?.opencritic ?? "";

  return (
    <div className="sm-preview">
      <RarityFrame tier={tier} className="sm-preview-hero">
        <HalftoneImage url={game.heroImageUrl} seed={seed} intensity="soft" className="sm-preview-art" />
        <span className="sm-preview-grad" aria-hidden="true" />
        <h3 className="sm-preview-title font-display">{game.title}</h3>
        <Badge tone="ink" className="sm-preview-kind">
          {kindLabel}
        </Badge>
      </RarityFrame>
      {released ? (
        <PowBurst tone={POW_BY_TIER[tier]} className="sm-preview-pow">
          {criticText}
        </PowBurst>
      ) : null}
      {upcoming ? (
        <SpeechBubble tone="cyan" tail="left" className="sm-preview-new">
          {ui.stage.upcomingLong}
        </SpeechBubble>
      ) : null}

      <div className="sm-preview-body">
        <div className="sm-preview-tags">
          <Badge tone={POW_BY_TIER[tier]}>{tierLabel}</Badge>
          {game.genres.slice(0, 3).map((genre) => (
            <Badge key={genre} tone="ink">
              {genre}
            </Badge>
          ))}
        </div>
        <div className="sm-preview-tags">
          {readCritic(game) > 0 ? (
            <Badge tone="yellow">
              {ui.detail.sourceCritic} {criticText}
            </Badge>
          ) : null}
          {metacritic ? (
            <Badge tone="cyan">
              {ui.detail.sourceMetacritic} {metacritic}
            </Badge>
          ) : null}
          {opencritic ? (
            <Badge tone="lime">
              {ui.detail.sourceOpencritic} {opencritic}
            </Badge>
          ) : null}
          {deal !== undefined ? (
            <Badge tone="magenta">
              {ui.deals.price(deal.salePrice)}
              {deal.savingsPercent > 0 ? ` · ${ui.deals.priceOff(deal.savingsPercent)}` : ""}
            </Badge>
          ) : null}
        </div>
        <p className="sm-preview-synopsis font-comic">
          {game.overview ? game.overview : ui.detail.noSynopsis}
        </p>
        <div className="sm-preview-actions">
          <ComicButton variant="primary" bubble onClick={onOpenDetail} className="sm-preview-cta">
            {ui.stage.openDetail}
            <span aria-hidden="true"> →</span>
          </ComicButton>
          <ComicButton
            variant={saved ? "cyan" : "ghost"}
            onClick={() =>
              toggleWishlist({
                id: game.id,
                title: game.title,
                platform: laneKeyFromEnum(game.platform) ?? "",
                releaseDate: game.releaseDate,
              })
            }
            ariaLabel={saved ? ui.stage.wishlistRemove : ui.stage.wishlistSave}
            className="sm-preview-wish"
          >
            {saved ? ui.stage.wishlistAdded : ui.stage.wishlistAdd}
          </ComicButton>
        </div>
      </div>
    </div>
  );
}

type DetailViewProps = {
  game: Game;
  related: Connection[];
  franchiseGames: Game[];
  deal?: Deal;
  upcoming: boolean;
  today: TodayMarker;
  onBack: () => void;
};

function DetailView({ game, related, franchiseGames, deal, upcoming, today, onBack }: DetailViewProps) {
  return (
    <div className="sm-detailview">
      <ComicButton variant="cyan" onClick={onBack} className="sm-detailview-back">
        <span aria-hidden="true">‹ </span>
        {ui.stage.back}
      </ComicButton>
      <div className="sm-detailview-scroll">
        <ReleaseDetail
          release={game}
          related={related}
          franchiseGames={franchiseGames}
          deal={deal}
          upcoming={upcoming}
          today={today}
        />
      </div>
    </div>
  );
}
