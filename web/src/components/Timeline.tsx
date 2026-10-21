"use client";

import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { ui } from "@/lib/i18n";
import { useFilter } from "@/lib/timeline-context";
import { useProfile } from "@/lib/profile-context";
import { deriveRarity, deriveRarityFromHypes } from "@/lib/rarity";
import { MonthMap } from "@/components/MonthMap";
import { PowBurst, RarityFrame, type PowTone } from "@/components/comic/kit";
import { CardTrailerPreview } from "@/components/CardTrailerPreview";
import { LazyHalftoneCover } from "@/components/LazyHalftoneCover";
import type { Game } from "@/lib/connect/catalog";
import {
  LANE_META,
  LANE_ORDER,
  MONTHS,
  groupByMonth,
  matchesFilter,
  type DayGroup,
  type LaneKey,
  type LanePackage,
  type MonthGroup,
  type TodayMarker,
} from "@/lib/timeline";

type TimelineProps = {
  games: Game[];
  today: TodayMarker;
  onOpenPackage?: (month: number, day: number, laneKey: LanePackage["laneKey"]) => void;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function seedFromId(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

const POW_BY_TIER: Record<string, PowTone> = {
  legendary: "yellow",
  epic: "magenta",
  rare: "cyan",
  common: "ink",
};

type TimelineWorkerResult = { type: "result"; reqId: number; groups: MonthGroup[] };

export function Timeline({ games, today, onOpenPackage }: TimelineProps): JSX.Element {
  const { filter, registerGoToToday } = useFilter();

  const railRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    lastX: 0,
    velocity: 0,
    pointerId: 0,
  });
  const momentumRef = useRef<number | null>(null);

  const onRailPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    if (momentumRef.current !== null) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      lastX: event.clientX,
      velocity: 0,
      pointerId: event.pointerId,
    };
  }, []);

  const onRailPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag.active || rail === null) {
      return;
    }
    const deltaX = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    drag.velocity = deltaX;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) > 4) {
      drag.moved = true;
      rail.classList.add("is-dragging");
      rail.setPointerCapture(event.pointerId);
    }
    if (drag.moved) {
      rail.scrollLeft -= deltaX;
    }
  }, []);

  const endRailDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag.active || rail === null) {
      return;
    }
    drag.active = false;
    rail.classList.remove("is-dragging");
    if (rail.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
    if (!(drag.moved && Math.abs(drag.velocity) > 2)) {
      return;
    }
    let velocity = drag.velocity;
    const stepInertia = () => {
      const current = railRef.current;
      if (current === null) {
        momentumRef.current = null;
        return;
      }
      current.scrollLeft -= velocity;
      velocity *= 0.9;
      momentumRef.current = Math.abs(velocity) > 0.5 ? requestAnimationFrame(stepInertia) : null;
    };
    momentumRef.current = requestAnimationFrame(stepInertia);
  }, []);

  const onRailClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (rail === null) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        rail.scrollLeft += event.deltaY;
      }
    };
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    return () => {
      if (momentumRef.current !== null) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, []);

  const deferredFilter = useDeferredValue(filter);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>(() =>
    groupByMonth(games.filter((game) => matchesFilter(game, filter))),
  );
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("../lib/timeline-filter.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      workerRef.current = null;
      return;
    }
    worker.onmessage = (event: MessageEvent<TimelineWorkerResult>) => {
      if (event.data?.type === "result" && event.data.reqId === reqIdRef.current) {
        setMonthGroups(event.data.groups);
      }
    };
    worker.onerror = () => {
      workerRef.current = null;
    };
    worker.postMessage({ type: "init", games });
    workerRef.current = worker;
    reqIdRef.current += 1;
    worker.postMessage({ type: "filter", filter: deferredFilter, reqId: reqIdRef.current });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  useEffect(() => {
    const worker = workerRef.current;
    if (worker !== null) {
      reqIdRef.current += 1;
      worker.postMessage({ type: "filter", filter: deferredFilter, reqId: reqIdRef.current });
    } else {
      setMonthGroups(groupByMonth(games.filter((game) => matchesFilter(game, deferredFilter))));
    }
  }, [deferredFilter, games]);

  const hasVisibleGames = monthGroups.some((monthGroup) =>
    monthGroup.days.some((dayGroup) => dayGroup.packages.length > 0),
  );

  const focusAnchor = useMemo(() => {
    let firstDay: { year: number; month: number; day: number } | null = null;
    let lastDay: { year: number; month: number; day: number } | null = null;
    const todayStamp = today.year * 10000 + today.month * 100 + today.day;
    for (const monthGroup of monthGroups) {
      for (const dayGroup of monthGroup.days) {
        if (dayGroup.packages.length === 0) {
          continue;
        }
        const candidate = {
          year: monthGroup.year,
          month: monthGroup.month,
          day: dayGroup.day,
        };
        if (firstDay === null) {
          firstDay = candidate;
        }
        lastDay = candidate;
        const stamp = candidate.year * 10000 + candidate.month * 100 + candidate.day;
        if (stamp >= todayStamp) {
          return candidate;
        }
      }
    }
    return lastDay ?? firstDay;
  }, [monthGroups, today.year, today.month, today.day]);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const scrollAnchorIntoView = useCallback((instant = false) => {
    const target = focusRef.current ?? todayRef.current;
    if (target === null) {
      return;
    }
    target.scrollIntoView({
      behavior: instant || prefersReducedMotion() ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
  }, []);

  const goToTodaySmooth = useCallback(() => scrollAnchorIntoView(false), [scrollAnchorIntoView]);

  useEffect(() => registerGoToToday(goToTodaySmooth), [registerGoToToday, goToTodaySmooth]);

  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    if (didInitialScrollRef.current) {
      return;
    }
    if (focusRef.current === null && todayRef.current === null) {
      return;
    }
    didInitialScrollRef.current = true;
    scrollAnchorIntoView(true);
  }, [monthGroups, scrollAnchorIntoView]);

  return (
    <section className="ct-stage" aria-label={ui.timeline.headingTitle}>
      <TodayFeatured today={today} monthGroups={monthGroups} onOpenPackage={onOpenPackage} />

      <div className="ct-legend" aria-hidden="true">
        {LANE_ORDER.map((laneKey) => (
          <span key={laneKey} className={`ct-legend-tag ct-lane-${laneKey}`}>
            <span className="ct-legend-dot" />
            {LANE_META[laneKey].label}
          </span>
        ))}
      </div>

      <MonthMap />

      <div
        className="ct-rail"
        ref={railRef}
        role="region"
        aria-label={ui.timeline.scrollRegionLabel}
        tabIndex={0}
        onPointerDown={onRailPointerDown}
        onPointerMove={onRailPointerMove}
        onPointerUp={endRailDrag}
        onPointerCancel={endRailDrag}
        onClickCapture={onRailClickCapture}
      >
        {hasVisibleGames ? (
          monthGroups.map((monthGroup) => (
            <ComicMonth
              key={`${monthGroup.year}-${monthGroup.month}`}
              monthGroup={monthGroup}
              today={today}
              todayRef={todayRef}
              focusAnchor={focusAnchor}
              focusRef={focusRef}
              onOpenPackage={onOpenPackage}
            />
          ))
        ) : (
          <div className="ct-empty" role="status">
            <p className="ct-empty-title font-display">{ui.timeline.emptyTitle}</p>
            <p className="ct-empty-hint">{ui.timeline.emptyHint}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function TodayFeatured({
  today,
  monthGroups,
  onOpenPackage,
}: {
  today: TodayMarker;
  monthGroups: MonthGroup[];
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
}): JSX.Element {
  const [minimized, setMinimized] = useState(false);
  const todayPackages = useMemo(() => {
    const monthGroup = monthGroups.find(
      (group) => group.year === today.year && group.month === today.month,
    );
    const dayGroup = monthGroup?.days.find((group) => group.day === today.day);
    return dayGroup?.packages ?? [];
  }, [monthGroups, today.year, today.month, today.day]);

  const empty = todayPackages.length === 0;
  const dateText = today.label.replace(`${ui.timeline.nowLabel} · `, "");

  return (
    <div className={`tf-bar${minimized ? " is-min" : ""}${empty ? " is-empty" : ""}`}>
      <div className="tf-head">
        <span className="tf-label font-display">{ui.timeline.nowLabel}</span>
        <span className="tf-date font-label">{dateText}</span>
        {!empty ? <span className="tf-count font-display">{todayPackages.length}</span> : null}
        <span className="tf-headtext font-comic">
          {empty ? ui.timeline.todayEmpty : ui.timeline.todayHeadline}
        </span>
        {!empty ? (
          <button
            type="button"
            className="tf-toggle font-label"
            aria-expanded={!minimized}
            onClick={() => setMinimized((value) => !value)}
          >
            {minimized ? ui.timeline.todayShow : ui.timeline.todayMinimize}
          </button>
        ) : null}
      </div>
      {!empty && !minimized ? (
        <div className="tf-cards">
          {todayPackages.map((lanePackage) => {
            const game = lanePackage.items[0];
            const meta = LANE_META[lanePackage.laneKey];
            return (
              <button
                key={lanePackage.laneKey}
                type="button"
                className={`tf-card ct-lane-${lanePackage.laneKey}`}
                style={{ "--lane": meta.accentVar } as CSSProperties}
                onClick={() => onOpenPackage?.(today.month, today.day, lanePackage.laneKey)}
              >
                <span className="tf-card-ttl font-display">{game?.title ?? meta.label}</span>
                <span className="tf-card-foot">
                  <span className="tf-card-plat font-label">{meta.label}</span>
                  {lanePackage.count > 1 ? (
                    <span className="tf-card-more font-label">+{lanePackage.count - 1}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type ComicMonthProps = {
  monthGroup: MonthGroup;
  today: TodayMarker;
  todayRef: RefObject<HTMLDivElement | null>;
  focusAnchor: { year: number; month: number; day: number } | null;
  focusRef: RefObject<HTMLDivElement | null>;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
};

function mondayKeyOf(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const mondayBased = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayBased);
  return date.toISOString().slice(0, 10);
}

function ComicMonth({
  monthGroup,
  today,
  todayRef,
  focusAnchor,
  focusRef,
  onOpenPackage,
}: ComicMonthProps): JSX.Element | null {
  const daysWithGames = monthGroup.days.filter((dayGroup) => dayGroup.packages.length > 0);
  if (daysWithGames.length === 0) {
    return null;
  }
  return (
    <div className="ct-month">
      <div className="ct-month-tab" aria-hidden="true">
        <span className="ct-month-year font-label">{monthGroup.year}</span>
        <span className="ct-month-name font-display">{MONTHS[monthGroup.month] ?? ""}</span>
      </div>
      <div className="ct-days">
        {daysWithGames.map((dayGroup, index) => {
          const isToday =
            monthGroup.year === today.year &&
            monthGroup.month === today.month &&
            dayGroup.day === today.day;
          const isAnchor =
            focusAnchor !== null &&
            monthGroup.year === focusAnchor.year &&
            monthGroup.month === focusAnchor.month &&
            dayGroup.day === focusAnchor.day;
          const dayRef = isAnchor ? focusRef : isToday ? todayRef : undefined;
          const weekKey = mondayKeyOf(monthGroup.year, monthGroup.month, dayGroup.day);
          const prevWeekKey =
            index > 0
              ? mondayKeyOf(monthGroup.year, monthGroup.month, daysWithGames[index - 1].day)
              : weekKey;
          const startsNewWeek = index > 0 && weekKey !== prevWeekKey;
          return (
            <Fragment key={dayGroup.day}>
              {startsNewWeek ? (
                <div className="ct-week-sep" aria-hidden="true">
                  <span className="ct-week-sep-line" />
                  <span className="ct-week-sep-label font-label">
                    {ui.timeline.weekOf(dayGroup.day)}
                  </span>
                </div>
              ) : null}
              <ComicDay
                month={monthGroup.month}
                dayGroup={dayGroup}
                isToday={isToday}
                dayRef={dayRef}
                onOpenPackage={onOpenPackage}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

type ComicDayProps = {
  month: number;
  dayGroup: DayGroup;
  isToday: boolean;
  dayRef?: RefObject<HTMLDivElement | null>;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
};

function ComicDay({ month, dayGroup, isToday, dayRef, onOpenPackage }: ComicDayProps): JSX.Element {
  return (
    <div className={`ct-day${isToday ? " ct-day-today" : ""}`} ref={dayRef ?? undefined}>
      <div className="ct-day-head">
        <span className="ct-day-dow font-label">{dayGroup.weekdayShort}</span>
        <span className="ct-day-num font-display">{String(dayGroup.day).padStart(2, "0")}</span>
        {isToday ? <span className="ct-today-flag font-label">{ui.timeline.nowLabel}</span> : null}
      </div>
      <div className="ct-day-stack">
        {dayGroup.packages.map((lanePackage) => (
          <ComicCard
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

type ComicCardProps = {
  month: number;
  day: number;
  lanePackage: LanePackage;
  onOpenPackage?: (month: number, day: number, laneKey: LaneKey) => void;
};

function ComicCard({ month, day, lanePackage, onOpenPackage }: ComicCardProps): JSX.Element {
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

  const [hovering, setHovering] = useState(false);
  const trailerKey = topGame?.trailerYoutubeKey ?? "";

  return (
    <button
      type="button"
      className={`ct-card ct-lane-${lanePackage.laneKey}${forYou ? " is-foryou" : ""}${wished ? " is-wished" : ""}${lanePackage.count > 1 ? " is-stack" : ""}`}
      style={cardStyle}
      onClick={() => onOpenPackage?.(month, day, lanePackage.laneKey)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      aria-label={ui.timeline.packageAriaLabel(
        meta.label,
        day,
        monthName,
        lanePackage.count,
        lanePackage.maxCritic,
      )}
    >
      <RarityFrame tier={tier} className="ct-card-cover">
        <LazyHalftoneCover
          url={topGame?.coverUrl ?? ""}
          seed={seed}
          className="ct-card-coverart"
        />
        <CardTrailerPreview youtubeKey={trailerKey} active={hovering} />
      </RarityFrame>
      <span className="ct-card-body">
        <span className="ct-card-title font-display">{topGame?.title ?? meta.label}</span>
        <span className="ct-card-foot">
          <span className="ct-card-plat font-label">{meta.label}</span>
          {lanePackage.count > 1 ? (
            <span className="ct-card-more font-label">+{lanePackage.count - 1}</span>
          ) : null}
        </span>
      </span>
      {released ? (
        <PowBurst tone={POW_BY_TIER[tier]} className="ct-card-pow">
          {lanePackage.maxCritic}
        </PowBurst>
      ) : (
        <span className="ct-card-soon font-label">{ui.timeline.upcomingShort}</span>
      )}
      {forYou ? (
        <span className="ct-card-foryou font-label" aria-hidden="true">
          {ui.timeline.forYouBadge}
        </span>
      ) : null}
      {wished ? (
        <span className="ct-card-wished font-label" aria-hidden="true">
          ★ {ui.alerts.wishedBadge}
        </span>
      ) : null}
    </button>
  );
}
