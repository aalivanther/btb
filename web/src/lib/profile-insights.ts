import type { Game } from "@/lib/connect/catalog";
import type { Profile, WishItem } from "@/lib/profile-context";
import { deriveRarity, deriveRarityFromHypes, type Tier } from "@/lib/rarity";
import { daysUntilRelease } from "@/lib/wishlist-alerts";
import { laneKeyFromEnum, type LaneKey, type TodayMarker } from "@/lib/timeline";

export type WishEntry = {
  item: WishItem;
  game: Game | null;
  tier: Tier;
  daysUntil: number | null;
  released: boolean;
};

export type WishBoard = {
  upcoming: WishEntry[];
  released: WishEntry[];
};

export function buildWishBoard(
  wishlist: WishItem[],
  catalog: Game[],
  today: TodayMarker,
): WishBoard {
  const gameById = new Map<string, Game>();
  for (const game of catalog) {
    gameById.set(game.id, game);
  }

  const entries: WishEntry[] = wishlist.map((item) => {
    const game = gameById.get(item.id) ?? null;
    const criticScore = game?.ratings?.critic ?? 0;
    const tier: Tier =
      criticScore > 0
        ? deriveRarity(criticScore)
        : game !== null
          ? deriveRarityFromHypes(game.hypes ?? 0)
          : "common";
    const daysUntil = daysUntilRelease(item.releaseDate, today);
    const released = daysUntil !== null && daysUntil <= 0;
    return { item, game, tier, daysUntil, released };
  });

  const upcoming = entries
    .filter((entry) => !entry.released)
    .sort((left, right) => {
      if (left.daysUntil === null && right.daysUntil === null) {
        return left.item.title.localeCompare(right.item.title, "es-MX");
      }
      if (left.daysUntil === null) {
        return 1;
      }
      if (right.daysUntil === null) {
        return -1;
      }
      if (left.daysUntil !== right.daysUntil) {
        return left.daysUntil - right.daysUntil;
      }
      return left.item.title.localeCompare(right.item.title, "es-MX");
    });

  const released = entries
    .filter((entry) => entry.released)
    .sort((left, right) => {
      const leftDays = left.daysUntil ?? Number.NEGATIVE_INFINITY;
      const rightDays = right.daysUntil ?? Number.NEGATIVE_INFINITY;
      if (leftDays !== rightDays) {
        return rightDays - leftDays;
      }
      return left.item.title.localeCompare(right.item.title, "es-MX");
    });

  return { upcoming, released };
}

export type WishSortKey = "date" | "rarity" | "genre";

const TIER_WEIGHT: Record<Tier, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };

export function sortWishEntries(entries: WishEntry[], sortKey: WishSortKey): WishEntry[] {
  if (sortKey === "date") {
    return [...entries];
  }
  if (sortKey === "rarity") {
    return [...entries].sort((left, right) => {
      if (TIER_WEIGHT[left.tier] !== TIER_WEIGHT[right.tier]) {
        return TIER_WEIGHT[left.tier] - TIER_WEIGHT[right.tier];
      }
      return left.item.title.localeCompare(right.item.title, "es-MX");
    });
  }
  return [...entries].sort((left, right) => {
    const leftGenre = left.game?.genres[0] ?? "";
    const rightGenre = right.game?.genres[0] ?? "";
    if (leftGenre === "" && rightGenre !== "") {
      return 1;
    }
    if (leftGenre !== "" && rightGenre === "") {
      return -1;
    }
    if (leftGenre !== rightGenre) {
      return leftGenre.localeCompare(rightGenre, "es-MX");
    }
    return left.item.title.localeCompare(right.item.title, "es-MX");
  });
}

export type RadarCount = {
  label: string;
  count: number;
};

export type RadarStats = {
  total: number;
  byGenre: RadarCount[];
  byPlatform: RadarCount[];
  byTier: { tier: Tier; count: number }[];
  next: WishEntry | null;
};

const RADAR_GENRE_LIMIT = 6;

const PLATFORM_LABELS: Record<LaneKey, string> = {
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  pc: "PC",
};

const PLATFORM_ORDER: readonly LaneKey[] = ["playstation", "xbox", "nintendo", "pc"];

const TIER_ORDER: readonly Tier[] = ["legendary", "epic", "rare", "common"];

export function buildRadarStats(board: WishBoard): RadarStats {
  const allEntries = [...board.upcoming, ...board.released];

  const genreCounts = new Map<string, number>();
  for (const entry of allEntries) {
    for (const genre of entry.game?.genres ?? []) {
      const trimmed = genre.trim();
      if (trimmed !== "") {
        genreCounts.set(trimmed, (genreCounts.get(trimmed) ?? 0) + 1);
      }
    }
  }
  const byGenre: RadarCount[] = Array.from(genreCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "es-MX"),
    )
    .slice(0, RADAR_GENRE_LIMIT);

  const platformCounts = new Map<LaneKey, number>();
  for (const entry of allEntries) {
    const lane: LaneKey | null =
      entry.item.platform !== ""
        ? entry.item.platform
        : entry.game !== null
          ? laneKeyFromEnum(entry.game.platform)
          : null;
    if (lane !== null) {
      platformCounts.set(lane, (platformCounts.get(lane) ?? 0) + 1);
    }
  }
  const byPlatform: RadarCount[] = PLATFORM_ORDER.filter((lane) =>
    platformCounts.has(lane),
  ).map((lane) => ({ label: PLATFORM_LABELS[lane], count: platformCounts.get(lane) ?? 0 }));

  const tierCounts = new Map<Tier, number>();
  for (const entry of allEntries) {
    tierCounts.set(entry.tier, (tierCounts.get(entry.tier) ?? 0) + 1);
  }
  const byTier = TIER_ORDER.filter((tier) => tierCounts.has(tier)).map((tier) => ({
    tier,
    count: tierCounts.get(tier) ?? 0,
  }));

  const next = board.upcoming.find((entry) => entry.daysUntil !== null) ?? null;

  return { total: allEntries.length, byGenre, byPlatform, byTier, next };
}

const BOSS_TITLE_MIN_FOLLOWED = 3;

export function deriveBossTitle(board: WishBoard): string {
  const allEntries = [...board.upcoming, ...board.released];
  if (allEntries.length === 0) {
    return "Boss Novato";
  }
  if (allEntries.length < BOSS_TITLE_MIN_FOLLOWED) {
    return "Boss Novato";
  }

  const tierCounts = new Map<Tier, number>();
  for (const entry of allEntries) {
    tierCounts.set(entry.tier, (tierCounts.get(entry.tier) ?? 0) + 1);
  }
  let dominant: Tier = "common";
  let best = -1;
  for (const tier of TIER_ORDER) {
    const count = tierCounts.get(tier) ?? 0;
    if (count > best) {
      best = count;
      dominant = tier;
    }
  }

  const titles: Record<Tier, string> = {
    legendary: "Cazador de Legendarios",
    epic: "Coleccionista Épico",
    rare: "Rastreador de Rarezas",
    common: "Explorador del Catálogo",
  };
  return titles[dominant];
}

export type CollectionBadge = {
  id: string;
  label: string;
  hint: string;
  obtained: boolean;
};

function countDistinctPlatforms(entries: WishEntry[]): number {
  const lanes = new Set<LaneKey>();
  for (const entry of entries) {
    const lane: LaneKey | null =
      entry.item.platform !== ""
        ? entry.item.platform
        : entry.game !== null
          ? laneKeyFromEnum(entry.game.platform)
          : null;
    if (lane !== null) {
      lanes.add(lane);
    }
  }
  return lanes.size;
}

function countDistinctGenres(entries: WishEntry[]): number {
  const genres = new Set<string>();
  for (const entry of entries) {
    for (const genre of entry.game?.genres ?? []) {
      const trimmed = genre.trim();
      if (trimmed !== "") {
        genres.add(trimmed);
      }
    }
  }
  return genres.size;
}

function countLegendaries(entries: WishEntry[]): number {
  return entries.filter((entry) => entry.tier === "legendary").length;
}

export function buildCollectionBadges(board: WishBoard): CollectionBadge[] {
  const allEntries = [...board.upcoming, ...board.released];
  const total = allEntries.length;
  const platforms = countDistinctPlatforms(allEntries);
  const genres = countDistinctGenres(allEntries);
  const legendaries = countLegendaries(allEntries);

  return [
    {
      id: "first-target",
      label: "Primer objetivo",
      hint: "Sigue tu primer juego con «+ Voy a jugar».",
      obtained: total >= 1,
    },
    {
      id: "collector-5",
      label: "Coleccionista",
      hint: "Sigue 5 juegos.",
      obtained: total >= 5,
    },
    {
      id: "curator-10",
      label: "Curador",
      hint: "Sigue 10 juegos.",
      obtained: total >= 10,
    },
    {
      id: "archivist-20",
      label: "Archivista",
      hint: "Sigue 20 juegos.",
      obtained: total >= 20,
    },
    {
      id: "legendary-hunter",
      label: "Aura legendaria",
      hint: "Sigue 3 juegos de rareza legendaria.",
      obtained: legendaries >= 3,
    },
    {
      id: "multiplatform",
      label: "Multiplataforma",
      hint: "Sigue juegos de 3 plataformas distintas.",
      obtained: platforms >= 3,
    },
    {
      id: "all-brands",
      label: "Sin fronteras",
      hint: "Sigue juegos de las 4 plataformas.",
      obtained: platforms >= 4,
    },
    {
      id: "eclectic",
      label: "Ecléctico",
      hint: "Sigue juegos de 5 géneros distintos.",
      obtained: genres >= 5,
    },
  ];
}

export function exportProfileJson(profile: Profile): string {
  return JSON.stringify({ format: "btb-profile", version: 1, profile }, null, 2);
}

export function readProfileBackup(text: string): unknown | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (candidate.format === "btb-profile" && typeof candidate.profile === "object") {
    return candidate.profile;
  }
  if ("wishlist" in candidate || "genres" in candidate || "platforms" in candidate) {
    return candidate;
  }
  return null;
}
