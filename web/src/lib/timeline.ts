import { type CSSProperties } from "react";

import { Platform, type Game } from "@/gen/btb/games/v1/games_pb";
import { ui } from "@/lib/i18n";

const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

export function formatTodayLabelMx(today: Date): string {
  const day = today.toLocaleDateString("es-MX", {
    timeZone: MEXICO_CITY_TIME_ZONE,
    day: "2-digit",
  });
  const month = today
    .toLocaleDateString("es-MX", { timeZone: MEXICO_CITY_TIME_ZONE, month: "short" })
    .replace(".", "")
    .toUpperCase();
  return `${ui.timeline.nowLabel} · ${day} ${month}`;
}

export type TodayMarker = {
  year: number;
  month: number;
  day: number;
  label: string;
};

const MONTH_SHORT_ES_MX = [
  "",
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

export function resolveDemoToday(envValue: string | undefined): TodayMarker {
  const raw = (envValue ?? "").trim();
  let year: number;
  let month: number;
  let day: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yearText, monthText, dayText] = raw.split("-");
    year = Number(yearText);
    month = Number(monthText);
    day = Number(dayText);
  } else {
    const isoInMexico = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [yearText, monthText, dayText] = isoInMexico.split("-");
    year = Number(yearText);
    month = Number(monthText);
    day = Number(dayText);
  }

  const monthShort = MONTH_SHORT_ES_MX[month] ?? "";
  const label = `${ui.timeline.nowLabel} · ${String(day).padStart(2, "0")} ${monthShort}`;

  return { year, month, day, label };
}

export const MONTHS: Record<number, string> = {
  1: "ENERO",
  2: "FEBRERO",
  3: "MARZO",
  4: "ABRIL",
  5: "MAYO",
  6: "JUNIO",
  7: "JULIO",
  8: "AGOSTO",
  9: "SEPTIEMBRE",
  10: "OCTUBRE",
  11: "NOVIEMBRE",
  12: "DICIEMBRE",
};

export type LaneKey = "playstation" | "xbox" | "nintendo" | "pc";

export type LaneMeta = {
  key: LaneKey;
  label: string;
  accentVar: string;
  platform: Platform;
};

export const LANE_META: Record<LaneKey, LaneMeta> = {
  playstation: {
    key: "playstation",
    label: "PlayStation",
    accentVar: "var(--color-ps)",
    platform: Platform.PLAYSTATION,
  },
  xbox: {
    key: "xbox",
    label: "Xbox",
    accentVar: "var(--color-xbox)",
    platform: Platform.XBOX,
  },
  nintendo: {
    key: "nintendo",
    label: "Nintendo",
    accentVar: "var(--color-nintendo)",
    platform: Platform.NINTENDO,
  },
  pc: {
    key: "pc",
    label: "PC",
    accentVar: "var(--color-pc)",
    platform: Platform.PC,
  },
};

export const LANE_ORDER: readonly LaneKey[] = ["playstation", "xbox", "nintendo", "pc"] as const;

export function laneKeyFromEnum(platform: Platform): LaneKey | null {
  switch (platform) {
    case Platform.PLAYSTATION:
      return "playstation";
    case Platform.XBOX:
      return "xbox";
    case Platform.NINTENDO:
      return "nintendo";
    case Platform.PC:
      return "pc";
    default:
      return null;
  }
}

export type FilterLane = LaneKey;

export const FILTER_LANES: FilterLane[] = ["playstation", "xbox", "nintendo", "pc"];

export type TimelineFilter = {
  lanes: FilterLane[];
  genres: string[];
  query: string;
  monthFrom: number;
  monthTo: number;
};

export const DEFAULT_FILTER: TimelineFilter = {
  lanes: [],
  genres: [],
  query: "",
  monthFrom: 0,
  monthTo: 0,
};

function gameMatchesLane(game: Game, lane: FilterLane): boolean {
  return laneKeyFromEnum(game.platform) === lane;
}

export function matchesFilter(game: Game, filter: TimelineFilter): boolean {
  if (filter.lanes.length > 0 && !filter.lanes.some((lane) => gameMatchesLane(game, lane))) {
    return false;
  }
  if (filter.genres.length > 0 && !filter.genres.some((genre) => game.genres.includes(genre))) {
    return false;
  }
  const query = filter.query.trim().toLowerCase();
  if (query !== "" && !game.title.toLowerCase().includes(query)) {
    return false;
  }
  if (filter.monthFrom > 0 || filter.monthTo > 0) {
    const monthDay = monthDayFromIso(game.releaseDate);
    if (monthDay === null) {
      return false;
    }
    const key = monthDay.year * 100 + monthDay.month;
    if (filter.monthFrom > 0 && key < filter.monthFrom) {
      return false;
    }
    if (filter.monthTo > 0 && key > filter.monthTo) {
      return false;
    }
  }
  return true;
}

export type ConnectionReason = "franchise" | "studio" | "genre";

export type Connection = {
  game: Game;
  reason: ConnectionReason;
};

function studiosOf(game: Game): Set<string> {
  const names = new Set<string>();
  for (const credit of game.developers) {
    if (credit.name.trim() !== "") {
      names.add(credit.name.trim().toLowerCase());
    }
  }
  return names;
}

export function findConnections(game: Game, catalog: Game[], limit = 8): Connection[] {
  const selfId = game.id;
  const seen = new Set<string>([selfId]);
  const out: Connection[] = [];

  const franchiseName = game.franchise?.name?.trim() ?? "";
  const myStudios = studiosOf(game);
  const myGenres = new Set(game.genres);

  if (franchiseName !== "") {
    for (const candidate of catalog) {
      if (seen.has(candidate.id)) {
        continue;
      }
      if ((candidate.franchise?.name?.trim() ?? "") === franchiseName) {
        out.push({ game: candidate, reason: "franchise" });
        seen.add(candidate.id);
      }
    }
  }

  if (myStudios.size > 0) {
    for (const candidate of catalog) {
      if (seen.has(candidate.id)) {
        continue;
      }
      const candStudios = studiosOf(candidate);
      let shares = false;
      for (const name of candStudios) {
        if (myStudios.has(name)) {
          shares = true;
          break;
        }
      }
      if (shares) {
        out.push({ game: candidate, reason: "studio" });
        seen.add(candidate.id);
      }
    }
  }

  const genreCandidates = catalog
    .filter((candidate) => !seen.has(candidate.id))
    .map((candidate) => ({
      candidate,
      overlap: candidate.genres.filter((genre) => myGenres.has(genre)).length,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap);
  for (const entry of genreCandidates) {
    if (out.length >= limit) {
      break;
    }
    out.push({ game: entry.candidate, reason: "genre" });
    seen.add(entry.candidate.id);
  }

  return out.slice(0, limit);
}

export function collectGenres(games: Game[]): string[] {
  const unique = new Set<string>();
  for (const game of games) {
    for (const genre of game.genres) {
      const trimmed = genre.trim();
      if (trimmed.length > 0) {
        unique.add(trimmed);
      }
    }
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right, "es-MX"));
}

const WEEKDAYS_SHORT_ES_MX: readonly string[] = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export function weekdayShortEsMX(releaseDate: string): string {
  if (!releaseDate) {
    return "";
  }
  const parsed = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const sundayBasedDay = parsed.getUTCDay();
  const mondayBasedIndex = (sundayBasedDay + 6) % 7;
  return WEEKDAYS_SHORT_ES_MX[mondayBasedIndex];
}

function monthDayFromIso(releaseDate: string): { year: number; month: number; day: number } | null {
  if (!releaseDate) {
    return null;
  }
  const parsed = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

export function isUpcoming(game: Game, today: TodayMarker): boolean {
  const monthDay = monthDayFromIso(game.releaseDate);
  if (monthDay === null) {
    return false;
  }
  if (monthDay.year !== today.year) {
    return monthDay.year > today.year;
  }
  if (monthDay.month !== today.month) {
    return monthDay.month > today.month;
  }
  return monthDay.day > today.day;
}

function readCritic(game: Game): number {
  return game.ratings?.critic ?? 0;
}

export function pickMonthlyBackdrops(games: Game[], limit: number): Game[] {
  if (limit <= 0) {
    return [];
  }
  const withHero = games.filter((game) => game.heroImageUrl !== "");
  if (withHero.length === 0) {
    return [];
  }
  const monthOf = (game: Game): number => {
    const parsed = Number.parseInt(game.releaseDate.slice(5, 7), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const byCriticDesc = (left: Game, right: Game): number => readCritic(right) - readCritic(left);

  const chosen: Game[] = [];
  const chosenIds = new Set<string>();
  const monthsPresent = Array.from(new Set(withHero.map(monthOf))).sort((left, right) => left - right);
  for (const month of monthsPresent) {
    const best = withHero.filter((game) => monthOf(game) === month).sort(byCriticDesc)[0];
    if (best !== undefined && !chosenIds.has(best.id)) {
      chosen.push(best);
      chosenIds.add(best.id);
    }
    if (chosen.length >= limit) {
      break;
    }
  }
  if (chosen.length < limit) {
    for (const game of [...withHero].sort(byCriticDesc)) {
      if (chosenIds.has(game.id)) {
        continue;
      }
      chosen.push(game);
      chosenIds.add(game.id);
      if (chosen.length >= limit) {
        break;
      }
    }
  }
  return chosen.slice(0, limit);
}

export type LanePackage = {
  laneKey: LaneKey;
  items: Game[];
  count: number;
  maxCritic: string;
  maxHypes: number;
};

export type DayGroup = {
  day: number;
  weekdayShort: string;
  packages: LanePackage[];
};

export type MonthGroup = {
  year: number;
  month: number;
  label: string;
  days: DayGroup[];
};

function sortByCriticDesc(left: Game, right: Game): number {
  return readCritic(right) - readCritic(left);
}

function buildLanePackage(laneKey: LaneKey, items: Game[]): LanePackage {
  const sortedItems = [...items].sort(sortByCriticDesc);
  const bestCritic = sortedItems.length > 0 ? readCritic(sortedItems[0]) : 0;
  const bestHypes = sortedItems.reduce((max, game) => Math.max(max, game.hypes ?? 0), 0);
  return {
    laneKey,
    items: sortedItems,
    count: sortedItems.length,
    maxCritic: bestCritic.toFixed(1),
    maxHypes: bestHypes,
  };
}

export function groupByMonth(games: Game[]): MonthGroup[] {
  const monthMap = new Map<number, Map<number, Map<LaneKey, Game[]>>>();

  for (const game of games) {
    const monthDay = monthDayFromIso(game.releaseDate);
    if (monthDay === null) {
      continue;
    }
    const laneKey = laneKeyFromEnum(game.platform);
    if (laneKey === null) {
      continue;
    }

    const bucket = monthDay.year * 100 + monthDay.month;
    let dayMap = monthMap.get(bucket);
    if (dayMap === undefined) {
      dayMap = new Map<number, Map<LaneKey, Game[]>>();
      monthMap.set(bucket, dayMap);
    }
    let laneMap = dayMap.get(monthDay.day);
    if (laneMap === undefined) {
      laneMap = new Map<LaneKey, Game[]>();
      dayMap.set(monthDay.day, laneMap);
    }
    let laneItems = laneMap.get(laneKey);
    if (laneItems === undefined) {
      laneItems = [];
      laneMap.set(laneKey, laneItems);
    }
    laneItems.push(game);
  }

  const sortedMonths = [...monthMap.keys()].sort((leftMonth, rightMonth) => leftMonth - rightMonth);

  return sortedMonths.map((bucket): MonthGroup => {
    const year = Math.floor(bucket / 100);
    const month = bucket % 100;
    const dayMap = monthMap.get(bucket) as Map<number, Map<LaneKey, Game[]>>;
    const sortedDays = [...dayMap.keys()].sort((leftDay, rightDay) => leftDay - rightDay);

    const days = sortedDays.map((day): DayGroup => {
      const laneMap = dayMap.get(day) as Map<LaneKey, Game[]>;

      const packages: LanePackage[] = [];
      for (const laneKey of LANE_ORDER) {
        const items = laneMap.get(laneKey);
        if (items !== undefined && items.length > 0) {
          packages.push(buildLanePackage(laneKey, items));
        }
      }

      const firstItem = packages.length > 0 ? packages[0].items[0] : undefined;
      const weekdayShort = firstItem !== undefined ? weekdayShortEsMX(firstItem.releaseDate) : "";

      return {
        day,
        weekdayShort,
        packages,
      };
    });

    return {
      year,
      month,
      label: MONTHS[month] ?? "",
      days,
    };
  });
}

const GRADIENT_TRIPLES: readonly (readonly [string, string, string])[] = [
  ["#1d3a5e", "#0d1524", "#3a2150"],
  ["#1f3a18", "#101a0e", "#3a2c0c"],
  ["#3a1320", "#140a16", "#0e2a3e"],
  ["#103a32", "#0a1418", "#2a3410"],
  ["#3a1820", "#120c18", "#0c2c3e"],
  ["#1e2a48", "#0c0f1c", "#3a2812"],
  ["#0e3036", "#0a1216", "#2c1c40"],
  ["#3a2c1a", "#120e0a", "#0a2a2e"],
  ["#241452", "#0c0a18", "#3a1420"],
  ["#103048", "#0a141e", "#28340f"],
  ["#3a2a0e", "#120c08", "#0a2c30"],
  ["#202a52", "#0e1020", "#3a1430"],
  ["#0e2a26", "#0a1414", "#341a3a"],
  ["#2a1838", "#140c1c", "#0c2a2c"],
  ["#341a14", "#160c0a", "#0c1c34"],
  ["#16203a", "#0a0e1a", "#341a2a"],
  ["#1a3420", "#0c160e", "#2a2410"],
] as const;

export function gradientFor(seed: number, opacity = 1): string {
  const length = GRADIENT_TRIPLES.length;
  const index = ((Math.trunc(seed) % length) + length) % length;
  const [start, middle, end] = GRADIENT_TRIPLES[index];
  return `background:linear-gradient(140deg,${start},${middle} 50%,${end});opacity:${opacity}`;
}

export type GradientStyle = {
  background: string;
  opacity: number;
};

export function gradientStyleFor(seed: number, opacity = 1): GradientStyle {
  const length = GRADIENT_TRIPLES.length;
  const index = ((Math.trunc(seed) % length) + length) % length;
  const [start, middle, end] = GRADIENT_TRIPLES[index];
  return {
    background: `linear-gradient(140deg,${start},${middle} 50%,${end})`,
    opacity,
  };
}

export function coverStyleFor(url: string, seed: number, opacity = 1): CSSProperties {
  if (!url) {
    return gradientStyleFor(seed, opacity);
  }
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#0b0d12",
    opacity,
  };
}
