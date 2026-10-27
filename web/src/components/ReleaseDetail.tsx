"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { recordVisited } from "@/lib/use-visited";

import Link from "next/link";

import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import type { GameVideo } from "@/lib/game-videos";
import {
  Badge,
  ComicButton,
  HalftoneImage,
  PowBurst,
  SectionBanner,
  SpeechBubble,
} from "@/components/comic/kit";
import { RarityFrame } from "@/components/detail/RarityFrame";
import { PlatformIcon } from "@/components/detail/PlatformIcon";
import { PcSpecsBlock } from "@/components/detail/PcSpecs";
import { Lightbox } from "@/components/detail/Lightbox";
import { FranchiseCarousel } from "@/components/detail/FranchiseCarousel";
import {
  DEVICE_LABEL,
  KIND_LABELS,
  KIND_TONE,
  POW_BY_TIER,
  SEED_OFFSET_COMPLEMENTARY,
  SEED_OFFSET_DEVELOPERS,
  SEED_OFFSET_FRANCHISE,
  SEED_OFFSET_GALLERY,
  SEED_OFFSET_HERO,
  SEED_OFFSET_PUBLISHERS,
  SEED_OFFSET_VOICE_CAST,
  TIER_LABELS,
  buildDeviceGroups,
  buildMetaChips,
  buildSearchSources,
  buildWhereRows,
  buySearchUrl,
  formatReleaseDate,
  igdbThumbUrl,
  initials,
  seedFromId,
} from "@/components/detail/helpers";
import { deriveRarity, deriveRarityFromHypes } from "@/lib/rarity";
import { formatMxnApprox } from "@/lib/currency";
import { LANE_META, isUpcoming, laneKeyFromEnum, type Connection, type ConnectionReason, type TodayMarker } from "@/lib/timeline";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { useNearViewport } from "@/lib/use-near-viewport";
import { ui } from "@/lib/i18n";
import type { Game } from "@/lib/connect/catalog";
import type { Credit, Image as CatalogImage } from "@/gen/btb/games/v1/games_pb";
import type { Deal } from "@/gen/btb/games/v1/deals_pb";

type ReleaseDetailProps = {
  release: Game;
  related?: Connection[];
  upcoming?: boolean;
  today?: TodayMarker;
  franchiseGames?: Game[];
  deal?: Deal;
  extraVideos?: GameVideo[];
};

const VIDEO_CATEGORY_LABELS: Record<GameVideo["category"], string> = {
  trailer: ui.detail.videoCatTrailer,
  gameplay: ui.detail.videoCatGameplay,
  dev_diary: ui.detail.videoCatDevDiary,
  otro: ui.detail.videoCatOther,
};

const REASON_LABELS: Record<ConnectionReason, string> = {
  franchise: ui.detail.reasonFranchise,
  studio: ui.detail.reasonStudio,
  genre: ui.detail.reasonGenre,
};

function DealPriceBlock({ deal }: { deal: Deal }) {
  return (
    <div className="dv-deal">
      <div className="dv-deal-head">
        <span className="dv-deal-label font-label">{ui.deals.priceBlockLabel}</span>
        {deal.savingsPercent > 0 ? (
          <span className="dv-deal-off font-display">{ui.deals.priceOff(deal.savingsPercent)}</span>
        ) : null}
      </div>
      <div className="dv-deal-body">
        <span className="dv-deal-prices">
          <span className="dv-deal-sale font-display">{ui.deals.price(deal.salePrice)}</span>
          {deal.normalPrice !== "" && deal.normalPrice !== deal.salePrice ? (
            <span className="dv-deal-normal">{ui.deals.price(deal.normalPrice)}</span>
          ) : null}
          {formatMxnApprox(deal.salePrice) !== "" ? (
            <span className="dv-deal-mxn font-mono">{formatMxnApprox(deal.salePrice)}</span>
          ) : null}
          {deal.storeName !== "" ? (
            <span className="dv-deal-store font-label">{ui.deals.atStore(deal.storeName)}</span>
          ) : null}
        </span>
        <a
          href={deal.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dv-deal-buy font-label"
          aria-label={ui.deals.buyAria(deal.title, deal.storeName, deal.salePrice)}
        >
          {ui.deals.buyAt(deal.storeName)}
          <span aria-hidden="true"> →</span>
        </a>
      </div>
      <p className="dv-deal-avail font-label">
        {ui.deals.availabilityLabel}: {ui.deals.availabilityNoEnd}
      </p>
    </div>
  );
}

export function ReleaseDetail({
  release,
  related = [],
  upcoming = false,
  today,
  franchiseGames = [],
  deal,
  extraVideos = [],
}: ReleaseDetailProps) {
  useEffect(() => {
    recordVisited(release.id);
  }, [release.id]);

  const [lightbox, setLightbox] = useState<CatalogImage | null>(null);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  const [openGame, setOpenGame] = useState<Game | null>(null);

  const closeOpenGame = useCallback(() => {
    setOpenGame(null);
  }, []);

  const franchiseGameById = useMemo<Map<string, Game>>(() => {
    const map = new Map<string, Game>();
    for (const franchiseGame of franchiseGames) {
      map.set(franchiseGame.id, franchiseGame);
    }
    return map;
  }, [franchiseGames]);

  const baseSeed = seedFromId(release.id);

  const galleryRef = useRef<HTMLDivElement | null>(null);
  const galleryNear = useNearViewport(galleryRef);
  const relatedRef = useRef<HTMLDivElement | null>(null);
  const relatedNear = useNearViewport(relatedRef);

  const criticScore = release.ratings?.critic ?? 0;
  const tier =
    criticScore > 0 ? deriveRarity(criticScore) : deriveRarityFromHypes(release.hypes ?? 0);

  const kindLabel = KIND_LABELS[release.kind];

  const laneKey = laneKeyFromEnum(release.platform);
  const accentVar = laneKey ? LANE_META[laneKey].accentVar : "var(--color-comic-yellow)";

  const formattedDate = formatReleaseDate(release.releaseDate);

  const searchSources = useMemo(() => buildSearchSources(release), [release]);
  const whereRows = useMemo(() => buildWhereRows(release), [release]);
  const deviceGroups = useMemo(() => buildDeviceGroups(release), [release]);
  const metaChips = useMemo(() => buildMetaChips(release), [release]);

  const franchiseItems = release.franchise?.items ?? [];
  const hasFranchise = release.franchise !== undefined && franchiseItems.length > 0;

  return (
    <article className="dv-article font-ui">
      <YouTubeEmbed
        youtubeKey={release.trailerYoutubeKey}
        title={release.title}
        framed={tier}
        caption={ui.detail.trailerCaption}
        seed={baseSeed + SEED_OFFSET_HERO}
        posterUrl={release.heroImageUrl}
        overlay={
          <div className="dv-hero-meta" style={{ "--lane": accentVar } as CSSProperties}>
            <span className="dv-hero-accent" aria-hidden="true" />
            <div className="dv-hero-info">
              <div className="dv-hero-badges">
                <Badge tone={KIND_TONE[release.kind]}>{kindLabel}</Badge>
                {criticScore > 0 ? (
                  <PowBurst tone={POW_BY_TIER[tier]} className="dv-hero-pow">
                    {criticScore.toFixed(1)}
                  </PowBurst>
                ) : upcoming ? (
                  <SpeechBubble tone="magenta" tail="left">
                    {ui.detail.upcomingBadge}
                  </SpeechBubble>
                ) : null}
                {criticScore > 0 ? (
                  <span className="dv-hero-tier">{TIER_LABELS[tier]}</span>
                ) : null}
              </div>
              <h2 className="dv-hero-title font-display">{release.title}</h2>
              {formattedDate || release.genres.length > 0 ? (
                <div className="dv-hero-sub">
                  {formattedDate ? <span>{formattedDate}</span> : null}
                  {formattedDate && release.genres.length > 0 ? <Separator /> : null}
                  {release.genres.length > 0 ? <span>{release.genres.join(", ")}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="dv-body">
        {searchSources.length > 0 ? (
          <DetailSection label={ui.detail.referencesLabel}>
            <div className="dv-refs">
              {searchSources.map((source) => (
                <a
                  key={source.sourceLabel}
                  href={source.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ui.detail.searchOnAria(release.title, source.sourceLabel)}
                  className="dv-ref"
                >
                  <PowBurst tone={source.tone} className="dv-ref-pow">
                    {source.value}
                  </PowBurst>
                  <span className="dv-ref-label">
                    {source.sourceLabel}
                    {source.unit ? <small>{source.unit}</small> : null}
                  </span>
                </a>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection label={ui.detail.synopsisLabel}>
          <p className="dv-synopsis">{release.overview ? release.overview : ui.detail.noSynopsis}</p>
        </DetailSection>

        <DetailSection label={ui.detail.galleryLabel}>
          {release.images.length > 0 ? (
            <div ref={galleryRef} className="dv-gal">
              {release.images.map((image, index) => (
                <GalleryItem
                  key={`${image.label}-${index}`}
                  image={image}
                  seed={baseSeed + SEED_OFFSET_GALLERY + index}
                  deferImage={!galleryNear}
                  onOpen={() => setLightbox(image)}
                />
              ))}
            </div>
          ) : (
            <p className="dv-empty">{ui.detail.noGallery}</p>
          )}
        </DetailSection>

        {extraVideos.length > 0 ? (
          <DetailSection label={ui.detail.moreVideosLabel}>
            <div className="dv-videos-grid">
              {extraVideos.map((video, index) => (
                <div key={video.key} className="dv-video-item">
                  <YouTubeEmbed
                    youtubeKey={video.key}
                    title={`${release.title} — ${video.name}`}
                    caption={VIDEO_CATEGORY_LABELS[video.category]}
                    unavailableLabel={ui.detail.complementaryUnavailable}
                    seed={baseSeed + SEED_OFFSET_COMPLEMENTARY + index}
                  />
                  <span className="dv-video-name font-label">{video.name}</span>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : (
          <DetailSection label={ui.detail.complementaryLabel}>
            <YouTubeEmbed
              youtubeKey={release.complementaryYoutubeKey}
              title={release.title}
              caption={ui.detail.complementaryLabel}
              unavailableLabel={ui.detail.complementaryUnavailable}
              seed={baseSeed + SEED_OFFSET_COMPLEMENTARY}
            />
          </DetailSection>
        )}

        <DetailSection label={ui.detail.whereToPlayLabel}>
          {deal !== undefined ? <DealPriceBlock deal={deal} /> : null}

          {deviceGroups.length > 0 ? (
            <div className="dv-devices">
              {deviceGroups.map((group) => (
                <div
                  key={group.family}
                  className={`dv-dev ct-lane-${group.family === "cloud" ? "pc" : group.family}${
                    group.family === "cloud" ? " dv-dev-cloud" : ""
                  }`}
                >
                  <span className="dv-dev-head">
                    <span className="dv-dev-icon" aria-hidden="true">
                      <PlatformIcon family={group.family} />
                    </span>
                    <span className="dv-dev-name font-label">{DEVICE_LABEL[group.family]}</span>
                  </span>
                  <span className="dv-dev-versions">
                    {group.versions.map((version) => (
                      <a
                        key={version}
                        href={buySearchUrl(version, release.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ui.detail.playOnAria(release.title, version)}
                        className="dv-dev-chip dv-dev-chip-link font-label"
                      >
                        {version}
                      </a>
                    ))}
                  </span>
                  {group.family === "pc" && release.pcMinimum ? (
                    <details className="dv-specs">
                      <summary className="dv-specs-sum font-label">{ui.detail.pcSpecsLabel}</summary>
                      <div className="dv-specs-cols">
                        <PcSpecsBlock title={ui.detail.pcSpecsMinimum} spec={release.pcMinimum} />
                        {release.pcRecommended ? (
                          <PcSpecsBlock
                            title={ui.detail.pcSpecsRecommended}
                            spec={release.pcRecommended}
                          />
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="dv-where">
            {whereRows.map((row) => (
              <div key={row.rowKey} className="dv-where-row">
                <span className="dv-where-label">
                  <span
                    aria-hidden="true"
                    className="dv-where-dot"
                    style={{ background: row.dotColor }}
                  />
                  {row.label}
                </span>
                <span className="dv-where-chips">
                  {row.chips.map((chip) =>
                    row.linkable ? (
                      <a
                        key={chip}
                        href={buySearchUrl(chip, release.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ui.detail.playOnAria(release.title, chip)}
                        className="dv-chiplink"
                      >
                        <Badge tone={row.tone}>{chip}</Badge>
                      </a>
                    ) : (
                      <Badge key={chip} tone={row.tone}>
                        {chip}
                      </Badge>
                    ),
                  )}
                </span>
              </div>
            ))}
          </div>
        </DetailSection>

        {metaChips.length > 0 ? (
          <DetailSection label={ui.detail.ageRatingLabel}>
            <div className="dv-chips">
              {metaChips.map((chip) => (
                <Badge key={chip.chipKey} tone="ink">
                  {chip.text}
                </Badge>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {hasFranchise ? (
          <DetailSection label={`${ui.detail.franchiseLabel} · ${release.franchise?.name ?? ""}`}>
            <FranchiseCarousel
              items={franchiseItems}
              baseSeed={baseSeed + SEED_OFFSET_FRANCHISE}
              franchiseGameById={franchiseGameById}
              onOpenGame={setOpenGame}
            />
          </DetailSection>
        ) : null}

        {related.length > 0 ? (
          <DetailSection label={ui.detail.connectionsLabel}>
            <div ref={relatedRef} className="dv-conn">
              {related.map((conn) => {
                const connCritic = conn.game.ratings?.critic ?? 0;
                const connTier =
                  connCritic > 0
                    ? deriveRarity(connCritic)
                    : deriveRarityFromHypes(conn.game.hypes ?? 0);
                return (
                  <button
                    key={conn.game.id}
                    type="button"
                    aria-label={ui.detail.connectionAria(conn.game.title)}
                    className="dv-conn-item"
                    onClick={() => setOpenGame(conn.game)}
                  >
                    <RarityFrame tier={connTier} className="dv-conn-frame">
                      <HalftoneImage
                        url={igdbThumbUrl(conn.game.heroImageUrl)}
                        seed={seedFromId(conn.game.id)}
                        intensity="soft"
                        className="dv-conn-art"
                        deferImage={!relatedNear}
                      />
                      <span className="dv-conn-grad" aria-hidden="true" />
                      <Badge tone="ink" className="dv-conn-reason">
                        {REASON_LABELS[conn.reason]}
                      </Badge>
                    </RarityFrame>
                    <span className="dv-conn-title">{conn.game.title}</span>
                  </button>
                );
              })}
            </div>
          </DetailSection>
        ) : null}

        {release.developers.length > 0 ? (
          <DetailSection label={ui.detail.developersLabel}>
            <PeopleGrid credits={release.developers} seedBase={baseSeed + SEED_OFFSET_DEVELOPERS} />
            {release.voiceCast.length > 0 ? (
              <>
                <p className="dv-voicecast-label font-label">{ui.detail.voiceCastLabel}</p>
                <PeopleGrid
                  credits={release.voiceCast}
                  seedBase={baseSeed + SEED_OFFSET_VOICE_CAST}
                />
              </>
            ) : null}
          </DetailSection>
        ) : null}

        {release.publishers.length > 0 ? (
          <DetailSection label={ui.detail.publishersLabel}>
            <PeopleGrid credits={release.publishers} seedBase={baseSeed + SEED_OFFSET_PUBLISHERS} />
          </DetailSection>
        ) : null}

        {release.primaryLanguage || release.audioLanguages.length > 0 ? (
          <DetailSection label={ui.detail.languagesLabel} last>
            <div className="dv-chips">
              {release.primaryLanguage ? (
                <Badge tone="ink">{ui.detail.languageOriginal(release.primaryLanguage)}</Badge>
              ) : null}
              {release.audioLanguages.map((language) => (
                <Badge key={language} tone="ink">
                  {language}
                </Badge>
              ))}
            </div>
          </DetailSection>
        ) : null}
      </div>

      {lightbox !== null ? (
        <Lightbox
          image={lightbox}
          fallbackAlt={release.title}
          fallbackSeed={baseSeed + SEED_OFFSET_GALLERY}
          onClose={closeLightbox}
        />
      ) : null}

      {openGame !== null ? (
        <GameDetailModal game={openGame} today={today} onClose={closeOpenGame} />
      ) : null}
    </article>
  );
}

type GameDetailModalProps = {
  game: Game;
  today?: TodayMarker;
  onClose: () => void;
};

function GameDetailModal({ game, today, onClose }: GameDetailModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose, { lockScroll: true });

  const upcomingGame = today !== undefined ? isUpcoming(game, today) : false;

  return (
    <div
      className="dv-full-modal"
      role="dialog"
      aria-modal="true"
      aria-label={game.title}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="dv-full-card c-panel c-panel-violet c-panel-ht"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <div className="dv-full-head">
          <Link href={`/juego/${game.id}`} className="dv-full-link font-label">
            {ui.detail.openFullPage}
            <span aria-hidden="true"> →</span>
          </Link>
          <ComicButton
            variant="danger"
            ariaLabel={ui.stage.close}
            onClick={onClose}
            className="dv-full-close"
          >
            ✕
          </ComicButton>
        </div>
        <div className="dv-full-scroll">
          <ReleaseDetail release={game} upcoming={upcomingGame} today={today} />
        </div>
      </div>
    </div>
  );
}

type DetailSectionProps = {
  label: string;
  children: ReactNode;
  last?: boolean;
};

function DetailSection({ label, children, last = false }: DetailSectionProps) {
  return (
    <section className={`dv-sect${last ? " dv-sect-last" : ""}`}>
      <SectionBanner>{label}</SectionBanner>
      <div className="dv-sect-body">{children}</div>
    </section>
  );
}

type GalleryItemProps = {
  image: CatalogImage;
  seed: number;
  deferImage: boolean;
  onOpen: () => void;
};

function GalleryItem({ image, seed, deferImage, onOpen }: GalleryItemProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ui.detail.galleryOpenAria(image.label || ui.detail.galleryLabel)}
      className="dv-gal-item"
    >
      <span className="dv-gal-frame">
        <HalftoneImage
          url={igdbThumbUrl(image.url)}
          seed={seed}
          intensity="soft"
          className="dv-gal-art"
          deferImage={deferImage}
        />
        <span aria-hidden="true" className="dv-gal-zoom">
          ⤢
        </span>
        {image.label ? (
          <Badge tone="ink" className="dv-gal-label">
            {image.label}
          </Badge>
        ) : null}
      </span>
    </button>
  );
}

type PeopleGridProps = {
  credits: Credit[];
  seedBase: number;
};

function PeopleGrid({ credits, seedBase }: PeopleGridProps) {
  return (
    <div className="dv-people">
      {credits.map((credit, index) => (
        <div key={`${credit.name}-${index}`} className="dv-person">
          <span aria-hidden="true" className="dv-person-av">
            <HalftoneImage
              url={credit.photoUrl}
              seed={seedBase + index}
              intensity="soft"
              className="dv-person-art"
            />
            {credit.photoUrl ? null : (
              <span className="dv-person-ini font-display">{initials(credit.name)}</span>
            )}
          </span>
          <div className="dv-person-text">
            <p className="dv-person-name">{credit.name}</p>
            {credit.role ? <p className="dv-person-role">{credit.role}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true" className="dv-sep" />;
}
