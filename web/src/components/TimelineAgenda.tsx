"use client";

import { useMemo, type CSSProperties, type JSX } from "react";

import { ui } from "@/lib/i18n";
import { useFilter } from "@/lib/timeline-context";
import { useProfile } from "@/lib/profile-context";
import { deriveRarity, deriveRarityFromHypes } from "@/lib/rarity";
import { MonthMap } from "@/components/MonthMap";
import { PowBurst, RarityFrame, type PowTone } from "@/components/comic/kit";
import { LazyHalftoneImage } from "@/components/LazyHalftoneCover";
import type { Game } from "@/lib/connect/catalog";
import {
  LANE_META,
  MONTHS,
  groupByMonth,
  matchesFilter,
  type DayGroup,
  type LaneKey,
  type LanePackage,
  type MonthGroup,
  type TodayMarker,
} from "@/lib/timeline";

const POW_BY_TIER: Record<string, PowTone> = {
  legendary: "yellow",
  epic: "magenta",
  rare: "cyan",
  common: "ink",
};

function seedFromId(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

type TimelineAgendaProps = {
  games: Game[];
  today: TodayMarker;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
};

export function TimelineAgenda({ games, today, onOpenPackage }: TimelineAgendaProps): JSX.Element {
  const { filter } = useFilter();

  const monthGroups = useMemo<MonthGroup[]>(
    () => groupByMonth(games.filter((game) => matchesFilter(game, filter))),
    [games, filter],
  );

  const hasVisible = monthGroups.some((month) =>
    month.days.some((day) => day.packages.length > 0),
  );

  return (
    <section className="ag-root" aria-label={ui.timeline.headingTitle}>
      <MonthMap />

      {hasVisible ? (
        monthGroups.map((monthGroup) => (
          <AgendaMonth
            key={`${monthGroup.year}-${monthGroup.month}`}
            monthGroup={monthGroup}
            today={today}
            onOpenPackage={onOpenPackage}
          />
        ))
      ) : (
        <div className="ag-empty" role="status">
          <p className="ag-empty-title font-display">{ui.timeline.emptyTitle}</p>
          <p className="ag-empty-hint">{ui.timeline.emptyHint}</p>
        </div>
      )}
    </section>
  );
}

function AgendaMonth({
  monthGroup,
  today,
  onOpenPackage,
}: {
  monthGroup: MonthGroup;
  today: TodayMarker;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
}): JSX.Element | null {
  const daysWithGames = monthGroup.days.filter((day) => day.packages.length > 0);
  if (daysWithGames.length === 0) {
    return null;
  }
  return (
    <div className="ag-month">
      <h2 className="ag-month-head font-display">
        <span className="ag-month-year font-label">{monthGroup.year}</span>
        <span>{MONTHS[monthGroup.month] ?? ""}</span>
      </h2>
      {daysWithGames.map((dayGroup) => (
        <AgendaDay
          key={dayGroup.day}
          month={monthGroup.month}
          dayGroup={dayGroup}
          isToday={
            monthGroup.year === today.year &&
            monthGroup.month === today.month &&
            dayGroup.day === today.day
          }
          onOpenPackage={onOpenPackage}
        />
      ))}
    </div>
  );
}

function AgendaDay({
  month,
  dayGroup,
  isToday,
  onOpenPackage,
}: {
  month: number;
  dayGroup: DayGroup;
  isToday: boolean;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
}): JSX.Element {
  return (
    <div className={`ag-day${isToday ? " ag-day-today" : ""}`}>
      <div className="ag-day-head">
        <span className="ag-day-num font-display">{String(dayGroup.day).padStart(2, "0")}</span>
        <span className="ag-day-dow font-label">{dayGroup.weekdayShort}</span>
        {isToday ? <span className="ag-day-flag font-label">{ui.timeline.nowLabel}</span> : null}
      </div>
      <div className="ag-day-cards">
        {dayGroup.packages.map((lanePackage) => (
          <AgendaCard
            key={lanePackage.laneKey}
            month={month}
            day={dayGroup.day}
            lanePackage={lanePackage}
            onOpenPackage={onOpenPackage}
          />
        ))}
      </div>
    </div>
  );
}

function AgendaCard({
  month,
  day,
  lanePackage,
  onOpenPackage,
}: {
  month: number;
  day: number;
  lanePackage: LanePackage;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
}): JSX.Element {
  const topGame = lanePackage.items[0];
  const critic = Number.parseFloat(lanePackage.maxCritic);
  const released = critic > 0;
  const tier = released ? deriveRarity(critic) : deriveRarityFromHypes(lanePackage.maxHypes);
  const meta = LANE_META[lanePackage.laneKey];
  const seed = seedFromId(topGame?.id ?? `${month}-${day}-${lanePackage.laneKey}`);
  const monthName = (MONTHS[month] ?? "").toLowerCase();

  const { matches, hasPrefs, isWishlisted } = useProfile();
  const forYou =
    hasPrefs && matches(lanePackage.laneKey, lanePackage.items.flatMap((game) => game.genres));
  const wished = lanePackage.items.some((game) => isWishlisted(game.id));

  const cardStyle = { "--lane": meta.accentVar } as CSSProperties;

  return (
    <button
      type="button"
      className={`ag-card ct-lane-${lanePackage.laneKey}${forYou ? " is-foryou" : ""}${wished ? " is-wished" : ""}`}
      style={cardStyle}
      onClick={() => onOpenPackage?.(month, day, lanePackage.laneKey)}
      aria-label={ui.timeline.packageAriaLabel(
        meta.label,
        day,
        monthName,
        lanePackage.count,
        lanePackage.maxCritic,
      )}
    >
      <RarityFrame tier={tier} className="ag-card-cover">
        <LazyHalftoneImage
          url={topGame?.coverUrl ?? ""}
          seed={seed}
          intensity="soft"
          className="ag-card-art"
        />
      </RarityFrame>
      <span className="ag-card-body">
        <span className="ag-card-title font-display">{topGame?.title ?? meta.label}</span>
        <span className="ag-card-foot">
          <span className="ag-card-plat font-label">{meta.label}</span>
          {lanePackage.count > 1 ? (
            <span className="ag-card-more font-label">+{lanePackage.count - 1}</span>
          ) : null}
        </span>
        <span className="ag-card-tags">
          {forYou ? <span className="ag-tag ag-tag-foryou font-label">PARA TI</span> : null}
          {wished ? (
            <span className="ag-tag ag-tag-wished font-label">★ {ui.alerts.wishedBadge}</span>
          ) : null}
        </span>
      </span>
      {released ? (
        <PowBurst tone={POW_BY_TIER[tier]} className="ag-card-pow">
          {lanePackage.maxCritic}
        </PowBurst>
      ) : (
        <span className="ag-card-soon font-label">Próx.</span>
      )}
    </button>
  );
}
