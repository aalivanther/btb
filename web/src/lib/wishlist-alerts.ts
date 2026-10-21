import type { RadarEntry, WishItem } from "@/lib/profile-context";
import type { TodayMarker } from "@/lib/timeline";

export const SOON_WINDOW_DAYS = 7;

export const OUT_WINDOW_DAYS = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type AlertStage = "today" | "soon" | "out";

export type WishAlert = {
  item: WishItem;
  stage: AlertStage;
  daysUntil: number;
};

export function daysUntilRelease(releaseDate: string, today: TodayMarker): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return null;
  }
  const [yearText, monthText, dayText] = releaseDate.split("-");
  const releaseUtc = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  if (Number.isNaN(releaseUtc) || Number.isNaN(todayUtc)) {
    return null;
  }
  return Math.round((releaseUtc - todayUtc) / MILLISECONDS_PER_DAY);
}

function stageFor(daysUntil: number): AlertStage | null {
  if (daysUntil === 0) {
    return "today";
  }
  if (daysUntil > 0 && daysUntil <= SOON_WINDOW_DAYS) {
    return "soon";
  }
  if (daysUntil < 0 && daysUntil >= -OUT_WINDOW_DAYS) {
    return "out";
  }
  return null;
}

const STAGE_ORDER: Record<AlertStage, number> = { today: 0, soon: 1, out: 2 };

export function buildWishAlerts(wishlist: WishItem[], today: TodayMarker): WishAlert[] {
  const alerts: WishAlert[] = [];
  for (const item of wishlist) {
    const daysUntil = daysUntilRelease(item.releaseDate, today);
    if (daysUntil === null) {
      continue;
    }
    const stage = stageFor(daysUntil);
    if (stage === null) {
      continue;
    }
    alerts.push({ item, stage, daysUntil });
  }
  return alerts.sort((left, right) => {
    if (STAGE_ORDER[left.stage] !== STAGE_ORDER[right.stage]) {
      return STAGE_ORDER[left.stage] - STAGE_ORDER[right.stage];
    }
    if (Math.abs(left.daysUntil) !== Math.abs(right.daysUntil)) {
      return Math.abs(left.daysUntil) - Math.abs(right.daysUntil);
    }
    return left.item.title.localeCompare(right.item.title, "es-MX");
  });
}

export function alertKey(alert: WishAlert): string {
  return `${alert.item.id}@${alert.stage}`;
}

export type RadarDealLike = {
  title: string;
};

export type RadarHitReason = "released" | "deal";

export type RadarHit = {
  item: WishItem;
  rule: RadarEntry["rule"];
  reasons: RadarHitReason[];
  daysUntil: number | null;
  dealCount: number;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function buildRadarHits(
  wishlist: WishItem[],
  rules: RadarEntry[],
  today: TodayMarker,
  deals: RadarDealLike[] = [],
): RadarHit[] {
  const itemById = new Map<string, WishItem>();
  for (const item of wishlist) {
    itemById.set(item.id, item);
  }

  const dealTitles = new Set<string>();
  for (const deal of deals) {
    const normalized = normalizeTitle(deal.title);
    if (normalized !== "") {
      dealTitles.add(normalized);
    }
  }

  const hits: RadarHit[] = [];
  for (const rule of rules) {
    const item = itemById.get(rule.gameId);
    if (item === undefined) {
      continue;
    }
    const daysUntil = daysUntilRelease(item.releaseDate, today);
    const released = daysUntil !== null && daysUntil <= 0;
    const onDeal = rule.rule === "any" && dealTitles.has(normalizeTitle(item.title));

    const reasons: RadarHitReason[] = [];
    if (released) {
      reasons.push("released");
    }
    if (onDeal) {
      reasons.push("deal");
    }
    if (reasons.length === 0) {
      continue;
    }
    hits.push({
      item,
      rule: rule.rule,
      reasons,
      daysUntil,
      dealCount: onDeal ? 1 : 0,
    });
  }

  return hits.sort((left, right) => {
    const leftDist = left.daysUntil === null ? Number.POSITIVE_INFINITY : Math.abs(left.daysUntil);
    const rightDist =
      right.daysUntil === null ? Number.POSITIVE_INFINITY : Math.abs(right.daysUntil);
    if (leftDist !== rightDist) {
      return leftDist - rightDist;
    }
    return left.item.title.localeCompare(right.item.title, "es-MX");
  });
}

export function radarHitKey(hit: RadarHit): string {
  return `${hit.item.id}@${hit.reasons.join("+")}`;
}
