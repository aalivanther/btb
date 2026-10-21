"use client";

import { useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";

import { Badge, ComicButton, HalftoneImage, RarityFrame } from "@/components/comic/kit";
import { ui } from "@/lib/i18n";
import { parseStoredProfile, useProfile, type RadarRule } from "@/lib/profile-context";
import {
  buildCollectionBadges,
  buildRadarStats,
  buildWishBoard,
  deriveBossTitle,
  exportProfileJson,
  readProfileBackup,
  sortWishEntries,
  type CollectionBadge,
  type WishEntry,
  type WishSortKey,
} from "@/lib/profile-insights";
import { buildRadarHits, type RadarHit } from "@/lib/wishlist-alerts";
import { buildICS, countICSEvents } from "@/lib/ics";
import { LANE_META, LANE_ORDER, type TodayMarker } from "@/lib/timeline";
import { type Game } from "@/lib/connect/catalog";
import { type Tier } from "@/lib/rarity";
import { useVideoLang } from "@/lib/use-video-lang";
import { type VideoLang } from "@/lib/video-lang";
import { useVisited } from "@/lib/use-visited";
import { GraphView } from "@/components/GraphView";
import { useRouter } from "next/navigation";

const AVATARS: { key: string; label: string; path: JSX.Element }[] = [
  {
    key: "control",
    label: "Control",
    path: (
      <path d="M6 9h12a3 3 0 0 1 3 3v3a2 2 0 0 1-3.6 1.2L15 14H9l-2.4 2.2A2 2 0 0 1 3 15v-3a3 3 0 0 1 3-3Zm1.5 3v2M6.5 13h2M16 12.2h.01M18 13.8h.01" />
    ),
  },
  {
    key: "casco",
    label: "Casco",
    path: (
      <path d="M5 13a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2h-1v-5H8v5H7a2 2 0 0 1-2-2v-4Zm3-6.5L12 4l4 2.5" />
    ),
  },
  {
    key: "estrella",
    label: "Estrella",
    path: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.7 6.6 19.6l1.1-6L3.2 9.4l6.1-.8L12 3Z" />,
  },
  {
    key: "gema",
    label: "Gema",
    path: <path d="M7 4h10l4 5-9 11L3 9l4-5Zm-4 5h18M9.5 4 12 9l2.5-5M12 9v11" />,
  },
  {
    key: "corona",
    label: "Corona",
    path: <path d="M4 17h16M4 17 3 7l5 3 4-6 4 6 5-3-1 10" />,
  },
  {
    key: "cohete",
    label: "Cohete",
    path: (
      <path d="M12 3c4 2 5.5 6 5 10l-2.5 2.5h-5L7 13c-.5-4 1-8 5-10Zm0 6h.01M7.5 14.5 5 19l4-1M16.5 14.5 19 19l-4-1" />
    ),
  },
];

function findAvatar(avatarKey: string) {
  return AVATARS.find((avatar) => avatar.key === avatarKey) ?? AVATARS[0];
}

const TIER_LABELS: Record<Tier, string> = {
  legendary: ui.tiers.legendary,
  epic: ui.tiers.epic,
  rare: ui.tiers.rare,
  common: ui.tiers.common,
};

const ALIAS_MAX_LENGTH = 24;
const BIO_MAX_LENGTH = 120;

type ProfileViewProps = {
  catalog: Game[];
  today: TodayMarker;
  genres: string[];
};

export function ProfileView({ catalog, today, genres }: ProfileViewProps): JSX.Element {
  const {
    profile,
    ready,
    setIdentity,
    toggleGenre,
    togglePlatform,
    removeWishlist,
    replaceProfile,
    clearProfile,
    getRadarRule,
    setRadarRule,
    radarRules,
  } = useProfile();

  const [videoLang, setVideoLang] = useVideoLang();

  const [visitedIds] = useVisited();
  const router = useRouter();

  const focusGames = useMemo(() => {
    const wishIds = new Set(profile.wishlist.map((item) => item.id));
    const focusIds = new Set<string>([...visitedIds, ...wishIds]);
    const picked = catalog.filter((game) => focusIds.has(game.id));
    if (picked.length >= 2) return picked;
    return [...catalog].sort((a, b) => b.hypes - a.hypes).slice(0, 6);
  }, [catalog, visitedIds, profile.wishlist]);

  const [sortKey, setSortKey] = useState<WishSortKey>("date");

  const [dataMessage, setDataMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const board = useMemo(
    () => buildWishBoard(profile.wishlist, catalog, today),
    [profile.wishlist, catalog, today],
  );
  const radar = useMemo(() => buildRadarStats(board), [board]);
  const bossTitle = useMemo(() => deriveBossTitle(board), [board]);
  const badges = useMemo(() => buildCollectionBadges(board), [board]);
  const badgesObtained = useMemo(
    () => badges.filter((badge) => badge.obtained).length,
    [badges],
  );
  const radarHits = useMemo(
    () => buildRadarHits(profile.wishlist, radarRules, today),
    [profile.wishlist, radarRules, today],
  );
  const icsCount = useMemo(() => countICSEvents(profile.wishlist), [profile.wishlist]);

  const upcoming = useMemo(() => sortWishEntries(board.upcoming, sortKey), [board, sortKey]);
  const released = useMemo(() => sortWishEntries(board.released, sortKey), [board, sortKey]);

  const onExport = () => {
    const blob = new Blob([exportProfileJson(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const stamp = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    anchor.download = `btb-perfil-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const onExportIcs = () => {
    const blob = new Blob([buildICS(profile.wishlist)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const stamp = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    anchor.download = `btb-estrenos-${stamp}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const onImportFile = (file: File | undefined) => {
    if (file === undefined) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const rawProfile = readProfileBackup(text);
      if (rawProfile === null) {
        setDataMessage({ kind: "error", text: ui.perfil.importError });
        return;
      }
      replaceProfile(parseStoredProfile(rawProfile));
      setDataMessage({ kind: "ok", text: ui.perfil.importOk });
    };
    reader.onerror = () => {
      setDataMessage({ kind: "error", text: ui.perfil.importError });
    };
    reader.readAsText(file);
  };

  const onClear = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearProfile();
    setConfirmingClear(false);
    setDataMessage({ kind: "ok", text: ui.perfil.clearDone });
  };

  if (!ready) {
    return (
      <p className="pp-loading font-comic" role="status">
        {ui.perfil.loading}
      </p>
    );
  }

  const avatar = findAvatar(profile.identity.avatarKey);

  return (
    <div className="pp-page">
      <header className="pp-head">
        <h1 className="pp-title font-display">{ui.perfil.pageTitle.toUpperCase()}</h1>
        <p className="pp-localnote font-comic">{ui.perfil.localNote}</p>
        <nav className="pp-nav font-label" aria-label={ui.perfil.pageTitle}>
          <a href="#boss-card">{ui.perfil.navCard}</a>
          <a href="#voy-a-jugar">{ui.perfil.navWishlist}</a>
          <a href="#mi-radar">{ui.perfil.navRadar}</a>
          <a href="#logros">{ui.radar.achievementsSection}</a>
          <a href="#preferencias">{ui.perfil.navPrefs}</a>
          <a href="#grafo">{ui.perfil.navGraph}</a>
          <a href="#datos">{ui.perfil.navData}</a>
        </nav>
      </header>

      <section id="boss-card" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <h2 className="pp-sect-title font-display">{ui.perfil.cardSection}</h2>
        <div className="pp-card">
          <div className="pp-card-id">
            <span className="pp-avatar pp-avatar-big" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {avatar.path}
              </svg>
            </span>
            <div className="pp-card-meta">
              <p className="pp-card-alias font-display">
                {profile.identity.alias !== "" ? profile.identity.alias : ui.perfil.aliasPlaceholder}
              </p>
              <Badge tone="yellow" className="pp-card-title-badge">
                {bossTitle}
              </Badge>
              <p className="pp-card-count font-label">{ui.perfil.followedCount(radar.total)}</p>
              {profile.identity.bio !== "" ? (
                <p className="pp-card-bio font-comic">{profile.identity.bio}</p>
              ) : null}
            </div>
          </div>

          <div className="pp-card-edit">
            <label className="pp-field">
              <span className="pp-field-label font-label">{ui.perfil.aliasLabel}</span>
              <input
                type="text"
                className="pp-input font-ui"
                value={profile.identity.alias}
                maxLength={ALIAS_MAX_LENGTH}
                placeholder={ui.perfil.aliasPlaceholder}
                onChange={(event) => setIdentity({ alias: event.target.value })}
              />
            </label>
            <label className="pp-field">
              <span className="pp-field-label font-label">{ui.perfil.bioLabel}</span>
              <textarea
                className="pp-input pp-textarea font-ui"
                value={profile.identity.bio}
                maxLength={BIO_MAX_LENGTH}
                rows={2}
                placeholder={ui.perfil.bioPlaceholder}
                onChange={(event) => setIdentity({ bio: event.target.value })}
              />
            </label>
            <div className="pp-field">
              <span className="pp-field-label font-label">{ui.perfil.avatarLabel}</span>
              <div className="pp-avatar-grid" role="group" aria-label={ui.perfil.avatarLabel}>
                {AVATARS.map((option) => {
                  const isOn = option.key === avatar.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={isOn}
                      aria-label={ui.perfil.avatarPickAria(option.label)}
                      className={`pp-avatar pp-avatar-pick${isOn ? " is-on" : ""}`}
                      onClick={() => setIdentity({ avatarKey: option.key })}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {option.path}
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="voy-a-jugar" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <div className="pp-sect-head">
          <h2 className="pp-sect-title font-display">{ui.perfil.wishlistSection}</h2>
          {radar.total > 0 ? (
            <label className="pp-sort font-label">
              {ui.perfil.sortLabel}
              <select
                className="pp-sort-select font-ui"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as WishSortKey)}
              >
                <option value="date">{ui.perfil.sortDate}</option>
                <option value="rarity">{ui.perfil.sortRarity}</option>
                <option value="genre">{ui.perfil.sortGenre}</option>
              </select>
            </label>
          ) : null}
        </div>

        {radar.total === 0 ? (
          <p className="pp-empty font-comic">{ui.perfil.wishlistEmpty}</p>
        ) : (
          <>
            {radarHits.length > 0 ? <RadarHitsBanner hits={radarHits} /> : null}
            {upcoming.length > 0 ? (
              <WishGroup
                title={ui.perfil.upcomingTitle}
                entries={upcoming}
                onRemove={removeWishlist}
                getRadarRule={getRadarRule}
                setRadarRule={setRadarRule}
              />
            ) : null}
            {released.length > 0 ? (
              <WishGroup
                title={ui.perfil.releasedTitle}
                entries={released}
                onRemove={removeWishlist}
                getRadarRule={getRadarRule}
                setRadarRule={setRadarRule}
              />
            ) : null}
          </>
        )}
      </section>

      <section id="mi-radar" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <h2 className="pp-sect-title font-display">{ui.perfil.radarSection}</h2>
        {radar.total === 0 ? (
          <p className="pp-empty font-comic">{ui.perfil.radarEmpty}</p>
        ) : (
          <div className="pp-radar">
            {radar.next !== null ? (
              <div className="pp-radar-next">
                <span className="pp-radar-next-label font-label">{ui.perfil.radarNext}</span>
                <Link
                  href={`/juego/${radar.next.item.id}`}
                  className="pp-radar-next-game font-display"
                >
                  {radar.next.item.title}
                </Link>
                <span className="pp-radar-next-when font-label">
                  {countdownText(radar.next)}
                </span>
              </div>
            ) : null}
            <RadarBars title={ui.perfil.radarGenres} rows={radar.byGenre} />
            <RadarBars title={ui.perfil.radarPlatforms} rows={radar.byPlatform} />
            <RadarBars
              title={ui.perfil.radarTiers}
              rows={radar.byTier.map((row) => ({ label: TIER_LABELS[row.tier], count: row.count }))}
            />
          </div>
        )}
      </section>

      <section id="logros" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <div className="pp-sect-head">
          <h2 className="pp-sect-title font-display">{ui.radar.achievementsSection}</h2>
          {radar.total > 0 ? (
            <span className="pp-ach-count font-label">
              {ui.radar.achievementCount(badgesObtained, badges.length)}
            </span>
          ) : null}
        </div>
        {radar.total === 0 ? (
          <p className="pp-empty font-comic">{ui.radar.achievementsEmpty}</p>
        ) : (
          <ul className="pp-achgrid">
            {badges.map((badge) => (
              <BadgeChip key={badge.id} badge={badge} />
            ))}
          </ul>
        )}
      </section>

      <section id="preferencias" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <h2 className="pp-sect-title font-display">{ui.perfil.prefsSection}</h2>
        <p className="pp-hint font-comic">{ui.perfil.prefsHint}</p>
        <h3 className="pp-sub-title font-label">{ui.perfil.prefsPlatforms}</h3>
        <div className="pp-chips">
          {LANE_ORDER.map((laneKey) => {
            const on = profile.platforms.includes(laneKey);
            return (
              <button
                key={laneKey}
                type="button"
                aria-pressed={on}
                onClick={() => togglePlatform(laneKey)}
                className={`pf-chip ct-lane-${laneKey}${on ? " is-on" : ""}`}
              >
                <span className="pf-chip-dot" aria-hidden="true" />
                {LANE_META[laneKey].label}
              </button>
            );
          })}
        </div>
        <h3 className="pp-sub-title font-label">{ui.perfil.prefsGenres}</h3>
        <div className="pp-chips">
          {genres.length === 0 ? (
            <p className="pp-hint font-comic">{ui.perfil.prefsNoGenres}</p>
          ) : (
            genres.map((genre) => {
              const on = profile.genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleGenre(genre)}
                  className={`pf-chip pf-chip-genre${on ? " is-on" : ""}`}
                >
                  {genre}
                </button>
              );
            })
          )}
        </div>
        <h3 className="pp-sub-title font-label">{ui.perfil.prefsVideoLang}</h3>
        <p className="pp-hint font-comic">{ui.perfil.prefsVideoLangHint}</p>
        <div className="pp-chips" role="group" aria-label={ui.perfil.prefsVideoLang}>
          {(["es", "en"] as VideoLang[]).map((code) => {
            const on = videoLang === code;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => setVideoLang(code)}
                className={`pf-chip pf-chip-genre${on ? " is-on" : ""}`}
              >
                {code === "es" ? ui.perfil.videoLangEs : ui.perfil.videoLangEn}
              </button>
            );
          })}
        </div>
      </section>

      <section id="grafo" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <h2 className="pp-sect-title font-display">{ui.perfil.graphSection}</h2>
        <p className="pp-hint font-comic">{ui.perfil.graphHint}</p>
        {catalog.length > 0 ? (
          <GraphView
            catalog={catalog}
            focusGames={focusGames}
            onOpen={(id) => router.push(`/juego/${id}`)}
          />
        ) : (
          <p className="pp-empty font-comic">{ui.perfil.graphEmpty}</p>
        )}
      </section>

      <section id="datos" className="pp-sect c-panel c-panel-violet c-panel-ht">
        <h2 className="pp-sect-title font-display">{ui.perfil.dataSection}</h2>
        <p className="pp-hint font-comic">{ui.perfil.dataHint}</p>
        <div className="pp-data-actions">
          <ComicButton variant="primary" onClick={onExport} className="pp-data-btn">
            {ui.perfil.exportButton}
          </ComicButton>
          <ComicButton
            variant="primary"
            onClick={onExportIcs}
            className="pp-data-btn"
            disabled={icsCount === 0}
          >
            {ui.radar.icsButton}
          </ComicButton>
          <ComicButton
            variant="cyan"
            onClick={() => importInputRef.current?.click()}
            className="pp-data-btn"
          >
            {ui.perfil.importButton}
          </ComicButton>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="pp-import-input"
            aria-label={ui.perfil.importButton}
            onChange={(event) => {
              onImportFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <ComicButton variant="danger" onClick={onClear} className="pp-data-btn">
            {confirmingClear ? ui.perfil.clearConfirm : ui.perfil.clearButton}
          </ComicButton>
        </div>
        <p className="pp-hint font-comic">
          {icsCount === 0 ? ui.radar.icsEmpty : ui.radar.icsHint}
        </p>
        {dataMessage !== null ? (
          <p
            className={`pp-data-msg font-comic${dataMessage.kind === "error" ? " is-error" : ""}`}
            role={dataMessage.kind === "error" ? "alert" : "status"}
          >
            {dataMessage.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function countdownText(entry: WishEntry): string {
  if (entry.daysUntil === null) {
    return ui.perfil.noDate;
  }
  if (entry.daysUntil === 0) {
    return ui.perfil.outToday;
  }
  if (entry.daysUntil > 0) {
    return ui.perfil.inDays(entry.daysUntil);
  }
  return ui.perfil.availableNow;
}

type WishGroupProps = {
  title: string;
  entries: WishEntry[];
  onRemove: (id: string) => void;
  getRadarRule: (gameId: string) => RadarRule | null;
  setRadarRule: (gameId: string, rule: RadarRule | null) => void;
};

function WishGroup({
  title,
  entries,
  onRemove,
  getRadarRule,
  setRadarRule,
}: WishGroupProps): JSX.Element {
  return (
    <div className="pp-wishgroup">
      <h3 className="pp-sub-title font-label">
        {title}
        <span className="pp-group-count font-display">{entries.length}</span>
      </h3>
      <ul className="pp-wishgrid">
        {entries.map((entry) => (
          <li
            key={entry.item.id}
            className={`pp-wish${entry.item.platform ? ` ct-lane-${entry.item.platform}` : ""}`}
          >
            <Link
              href={`/juego/${entry.item.id}`}
              className="pp-wish-link"
              aria-label={ui.perfil.openGameAria(entry.item.title)}
            >
              <RarityFrame tier={entry.tier} className="pp-wish-frame">
                <HalftoneImage
                  url={entry.game?.coverUrl ?? ""}
                  seed={seedFromId(entry.item.id)}
                  intensity="soft"
                  className="pp-wish-art"
                />
              </RarityFrame>
              <span className="pp-wish-info">
                <span className="pp-wish-title">{entry.item.title}</span>
                <span className="pp-wish-when font-label">{countdownText(entry)}</span>
                {entry.item.platform !== "" ? (
                  <span className="pp-wish-plat font-label">
                    {LANE_META[entry.item.platform].label}
                  </span>
                ) : null}
              </span>
            </Link>
            <RadarControl
              item={entry.item}
              rule={getRadarRule(entry.item.id)}
              onChange={setRadarRule}
            />
            <button
              type="button"
              className="pp-wish-x"
              aria-label={ui.perfil.removeAria(entry.item.title)}
              onClick={() => onRemove(entry.item.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type RadarControlProps = {
  item: WishEntry["item"];
  rule: RadarRule | null;
  onChange: (gameId: string, rule: RadarRule | null) => void;
};

const RADAR_SELECT_OFF = "off";

function RadarControl({ item, rule, onChange }: RadarControlProps): JSX.Element {
  return (
    <label className="pp-wish-radar font-label">
      <span className="pp-wish-radar-label">{ui.radar.ruleLabel}</span>
      <select
        className="pp-wish-radar-select font-ui"
        aria-label={ui.radar.ruleAria(item.title)}
        value={rule ?? RADAR_SELECT_OFF}
        onChange={(event) => {
          const next = event.target.value;
          onChange(item.id, next === RADAR_SELECT_OFF ? null : (next as RadarRule));
        }}
      >
        <option value={RADAR_SELECT_OFF}>{ui.radar.ruleOff}</option>
        <option value="released">{ui.radar.ruleReleased}</option>
        <option value="any">{ui.radar.ruleAny}</option>
      </select>
    </label>
  );
}

type BadgeChipProps = {
  badge: CollectionBadge;
};

function BadgeChip({ badge }: BadgeChipProps): JSX.Element {
  return (
    <li className={`pp-ach${badge.obtained ? " is-on" : " is-locked"}`}>
      <span className="pp-ach-name font-display">{badge.label}</span>
      <span className="pp-ach-state font-label">
        {badge.obtained ? ui.radar.achievementObtained : ui.radar.achievementLocked}
      </span>
      <span className="pp-ach-hint font-comic">{badge.hint}</span>
    </li>
  );
}

type RadarHitsBannerProps = {
  hits: RadarHit[];
};

function RadarHitsBanner({ hits }: RadarHitsBannerProps): JSX.Element {
  return (
    <div className="pp-radar-hits" role="status">
      <h3 className="pp-sub-title font-label">{ui.radar.hitsTitle}</h3>
      <ul className="pp-radar-hitlist">
        {hits.map((hit) => (
          <li key={hit.item.id} className="pp-radar-hit">
            <Link href={`/juego/${hit.item.id}`} className="pp-radar-hit-game font-display">
              {hit.item.title}
            </Link>
            <span className="pp-radar-hit-reasons font-label">
              {hit.reasons
                .map((reason) => (reason === "deal" ? ui.radar.hitDeal : ui.radar.hitReleased))
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      <p className="pp-hint font-comic">{ui.radar.bellNote}</p>
    </div>
  );
}

type RadarBarsProps = {
  title: string;
  rows: { label: string; count: number }[];
};

function RadarBars({ title, rows }: RadarBarsProps): JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }
  const max = rows.reduce((best, row) => Math.max(best, row.count), 1);
  return (
    <div className="pp-radar-block">
      <h3 className="pp-sub-title font-label">{title}</h3>
      <ul className="pp-bars">
        {rows.map((row) => (
          <li key={row.label} className="pp-bar-row">
            <span className="pp-bar-label">{row.label}</span>
            <span className="pp-bar-track" aria-hidden="true">
              <span className="pp-bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className="pp-bar-count font-display">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function seedFromId(id: string): number {
  let sum = 0;
  for (let index = 0; index < id.length; index += 1) {
    sum += id.charCodeAt(index);
  }
  return sum;
}
