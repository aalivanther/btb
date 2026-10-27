import { ui } from "@/lib/i18n";
import type { Tier } from "@/lib/rarity";
import type { Game } from "@/lib/connect/catalog";
import { GameKind } from "@/gen/btb/games/v1/games_pb";
import type { PowTone } from "@/components/comic/kit";

export const TIER_LABELS: Record<Tier, string> = {
  legendary: ui.tiers.legendary,
  epic: ui.tiers.epic,
  rare: ui.tiers.rare,
  common: ui.tiers.common,
};

export const POW_BY_TIER: Record<Tier, PowTone> = {
  legendary: "yellow",
  epic: "magenta",
  rare: "cyan",
  common: "ink",
};

export const KIND_LABELS: Record<GameKind, string> = {
  [GameKind.UNSPECIFIED]: ui.admin.kindGame,
  [GameKind.GAME]: ui.admin.kindGame,
  [GameKind.DLC]: ui.admin.kindDlc,
  [GameKind.EXPANSION]: ui.admin.kindExpansion,
};

export const KIND_TONE: Record<GameKind, PowTone> = {
  [GameKind.UNSPECIFIED]: "ink",
  [GameKind.GAME]: "yellow",
  [GameKind.DLC]: "cyan",
  [GameKind.EXPANSION]: "cyan",
};

export const SEED_OFFSET_HERO = 0;
export const SEED_OFFSET_FRANCHISE = 1;
export const SEED_OFFSET_GALLERY = 3;
export const SEED_OFFSET_COMPLEMENTARY = 7;
export const SEED_OFFSET_DEVELOPERS = 11;
export const SEED_OFFSET_PUBLISHERS = 17;
export const SEED_OFFSET_VOICE_CAST = 23;

export function seedFromId(id: string): number {
  let sum = 0;
  for (let index = 0; index < id.length; index += 1) {
    sum += id.charCodeAt(index);
  }
  return sum;
}

const IGDB_1080P = "https://images.igdb.com/igdb/image/upload/t_1080p/";
const IGDB_THUMB = "https://images.igdb.com/igdb/image/upload/t_720p/";

// igdbThumbUrl cambia una captura t_1080p de IGDB por t_720p para miniaturas de ~134×88 px.
// Las dos variantes encajan la imagen completa sin recortar (las t_screenshot_* y t_logo_med_2x
// recortan a 16:9), así que el encuadre no cambia, y 720p sigue reduciéndose incluso en pantallas
// 3x y con capturas muy panorámicas; variantes más chicas (t_cover_big_2x) ya se ven más suaves
// ahí. El visor a pantalla completa sigue usando la URL original.
export function igdbThumbUrl(url: string): string {
  return url.startsWith(IGDB_1080P) ? IGDB_THUMB + url.slice(IGDB_1080P.length) : url;
}

export function formatReleaseDate(isoDate: string): string {
  if (!isoDate) {
    return "";
  }
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
}

export type SearchSource = {
  sourceLabel: string;
  value: string;
  unit: string;
  tone: PowTone;
  searchUrl: string;
};

const SEARCH_BASE_CRITIC = "https://www.igdb.com/search?type=1&q=";
const SEARCH_BASE_METACRITIC = "https://www.metacritic.com/search/";
const SEARCH_BASE_OPENCRITIC = "https://opencritic.com/search?q=";
const SEARCH_BASE_STEAM = "https://store.steampowered.com/search/?term=";

export function buildSearchSources(release: Game): SearchSource[] {
  const encodedTitle = encodeURIComponent(release.title);
  const sources: SearchSource[] = [];

  const criticScore = release.ratings?.critic ?? 0;
  if (criticScore > 0) {
    sources.push({
      sourceLabel: ui.detail.sourceCritic,
      value: criticScore.toFixed(1),
      unit: "/10",
      tone: "yellow",
      searchUrl: `${SEARCH_BASE_CRITIC}${encodedTitle}`,
    });
  }

  const metacritic = release.ratings?.metacritic ?? "";
  if (metacritic) {
    sources.push({
      sourceLabel: ui.detail.sourceMetacritic,
      value: metacritic,
      unit: "",
      tone: "magenta",
      searchUrl: `${SEARCH_BASE_METACRITIC}${encodedTitle}`,
    });
  }

  const opencritic = release.ratings?.opencritic ?? "";
  if (opencritic) {
    sources.push({
      sourceLabel: ui.detail.sourceOpencritic,
      value: opencritic,
      unit: "",
      tone: "cyan",
      searchUrl: `${SEARCH_BASE_OPENCRITIC}${encodedTitle}`,
    });
  }

  const steam = release.ratings?.steam ?? "";
  if (steam) {
    sources.push({
      sourceLabel: ui.detail.sourceSteam,
      value: steam,
      unit: "",
      tone: "lime",
      searchUrl: `${SEARCH_BASE_STEAM}${encodedTitle}`,
    });
  }

  return sources;
}

export type WhereRow = {
  rowKey: "platforms" | "storefronts" | "subscriptions" | "cross";
  label: string;
  dotColor: string;
  chips: string[];
  tone: PowTone;
  linkable: boolean;
};

export function buildWhereRows(release: Game): WhereRow[] {
  const storefronts = release.availability?.storefronts ?? [];
  const subscriptions = release.availability?.subscriptionServices ?? [];
  const rows: WhereRow[] = [];

  if (storefronts.length > 0) {
    rows.push({
      rowKey: "storefronts",
      label: ui.detail.whereStorefronts,
      dotColor: "var(--color-comic-cyan)",
      chips: storefronts,
      tone: "cyan",
      linkable: true,
    });
  }

  if (subscriptions.length > 0) {
    rows.push({
      rowKey: "subscriptions",
      label: ui.detail.whereSubscriptions,
      dotColor: "var(--color-comic-magenta)",
      chips: subscriptions,
      tone: "magenta",
      linkable: true,
    });
  }

  return rows;
}

export type DeviceFamily = "playstation" | "xbox" | "nintendo" | "pc" | "cloud";

export function classifyDevice(name: string): DeviceFamily | null {
  const lower = name.toLowerCase();
  if (/stadia|luna|geforce|cloud|streaming|xcloud/.test(lower)) {
    return "cloud";
  }
  if (/ps5|ps4|ps3|ps2|playstation|vita|psp/.test(lower)) {
    return "playstation";
  }
  if (/xbox|series x|series s|xone|x\|s/.test(lower)) {
    return "xbox";
  }
  if (/switch|nintendo|wii|3ds/.test(lower)) {
    return "nintendo";
  }
  if (/pc|windows|mac|linux|steamos/.test(lower)) {
    return "pc";
  }
  return null;
}

export type DeviceGroup = { family: DeviceFamily; versions: string[] };

export const DEVICE_LABEL: Record<DeviceFamily, string> = {
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  pc: "PC",
  cloud: ui.detail.cloudLabel,
};

export const DEVICE_ORDER: DeviceFamily[] = ["playstation", "xbox", "nintendo", "pc", "cloud"];

export function buildDeviceGroups(release: Game): DeviceGroup[] {
  const platforms = release.availability?.platforms ?? [];
  const subscriptions = release.availability?.subscriptionServices ?? [];
  const byFamily = new Map<DeviceFamily, string[]>();

  for (const platform of platforms) {
    const family = classifyDevice(platform);
    if (family === null) {
      continue;
    }
    const versions = byFamily.get(family) ?? [];
    if (!versions.includes(platform)) {
      versions.push(platform);
    }
    byFamily.set(family, versions);
  }

  const cloudSubs = subscriptions.filter((service) =>
    /ultimate|premium|cloud|geforce|luna|stadia|xcloud/i.test(service),
  );
  if (cloudSubs.length > 0) {
    const versions = byFamily.get("cloud") ?? [];
    for (const service of cloudSubs) {
      if (!versions.includes(service)) {
        versions.push(service);
      }
    }
    byFamily.set("cloud", versions);
  }

  return DEVICE_ORDER.filter((family) => byFamily.has(family)).map((family) => ({
    family,
    versions: byFamily.get(family) ?? [],
  }));
}

export function buySearchUrl(platform: string, title: string): string {
  const query = `comprar ${title} ${platform}`.trim().replace(/\s+/g, " ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function franchiseSearchUrl(title: string, year: string): string {
  const query = year ? `${title} ${year} videojuego` : `${title} videojuego`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export type MetaChip = {
  chipKey: string;
  text: string;
};

export function buildMetaChips(release: Game): MetaChip[] {
  const chips: MetaChip[] = [];

  if (release.ageRating) {
    chips.push({ chipKey: "ageRating", text: `${ui.detail.ageRatingLabel}: ${release.ageRating}` });
  }
  if (release.playtimeEstimate) {
    chips.push({
      chipKey: "playtime",
      text: `${ui.detail.playtimeLabel}: ${release.playtimeEstimate}`,
    });
  }
  if (release.multiplayer) {
    chips.push({ chipKey: "multiplayer", text: ui.detail.multiplayerLabel });
  }
  if (release.earlyAccess) {
    chips.push({ chipKey: "earlyAccess", text: ui.detail.earlyAccessLabel });
  }
  if (release.freeToPlay) {
    chips.push({ chipKey: "freeToPlay", text: ui.detail.freeToPlayLabel });
  }

  return chips;
}
