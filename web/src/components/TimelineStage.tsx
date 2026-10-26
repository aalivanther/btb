"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@connectrpc/connect-query";

import { Stage } from "@/components/Stage";
import { Timeline } from "@/components/Timeline";
import { TimelineAgenda } from "@/components/TimelineAgenda";
import { useFilter } from "@/lib/timeline-context";
import { useViewport } from "@/lib/viewport-context";
import {
  findConnections,
  groupByMonth,
  matchesFilter,
  type LaneKey,
  type Connection,
  type TodayMarker,
} from "@/lib/timeline";
import type { Game } from "@/lib/connect/catalog";
import { DealsService, type Deal } from "@/gen/btb/games/v1/deals_pb";
import { matchDealToTitle } from "@/lib/deal-match";

const DEALS_STALE_MS = 10 * 60 * 1000;

type OpenPackage = {
  month: number;
  day: number;
  laneKey: LaneKey;
  games: Game[];
};

type TimelineStageProps = {
  games: Game[];
  today: TodayMarker;
};

export function TimelineStage({ games, today }: TimelineStageProps) {
  const { filter, setActiveBackdrop } = useFilter();

  const [openPackage, setOpenPackage] = useState<OpenPackage | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const { isMobile, ready } = useViewport();
  const useAgenda = ready && isMobile;

  const allGames = games;

  const seedById = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    allGames.forEach((game, index) => {
      map.set(game.id, index);
    });
    return map;
  }, [allGames]);

  const relatedForActive = useMemo<Connection[]>(
    () => (activeGame !== null ? findConnections(activeGame, allGames) : []),
    [activeGame, allGames],
  );

  const franchiseGamesForActive = useMemo<Game[]>(() => {
    if (activeGame === null) {
      return [];
    }
    const referencedIds = new Set(
      (activeGame.franchise?.items ?? [])
        .map((item) => item.gameId)
        .filter((gameId) => gameId !== ""),
    );
    if (referencedIds.size === 0) {
      return [];
    }
    return allGames.filter((candidate) => referencedIds.has(candidate.id));
  }, [activeGame, allGames]);

  const activeDealsQuery = useQuery(
    DealsService.method.findGameDeals,
    { titles: activeGame !== null ? [activeGame.title] : [] },
    {
      enabled: activeGame !== null,
      staleTime: DEALS_STALE_MS,
      refetchOnWindowFocus: false,
    },
  );
  const dealForActive = useMemo<Deal | undefined>(() => {
    if (activeGame === null) {
      return undefined;
    }
    return matchDealToTitle(activeDealsQuery.data?.deals ?? [], activeGame.title);
  }, [activeDealsQuery.data, activeGame]);

  const handleOpenPackage = useCallback(
    (month: number, day: number, laneKey: LaneKey) => {
      const filtered = allGames.filter((game) => matchesFilter(game, filter));
      const monthGroups = groupByMonth(filtered);

      const monthGroup = monthGroups.find((group) => group.month === month);
      const dayGroup = monthGroup?.days.find((group) => group.day === day);
      const lanePackage = dayGroup?.packages.find((group) => group.laneKey === laneKey);

      if (lanePackage === undefined) {
        return;
      }

      setOpenPackage({
        month,
        day,
        laneKey,
        games: lanePackage.items,
      });
      const bestGame = lanePackage.items[0];
      setActiveGame(bestGame ?? null);
      setDetailExpanded(false);
      if (bestGame !== undefined) {
        setActiveBackdrop({ url: bestGame.heroImageUrl, seed: seedById.get(bestGame.id) ?? 0 });
      }
    },
    [allGames, filter, seedById, setActiveBackdrop],
  );

  const handleSelectCard = useCallback(
    (game: Game) => {
      setActiveGame(game);
      setDetailExpanded(false);
      setActiveBackdrop({ url: game.heroImageUrl, seed: seedById.get(game.id) ?? 0 });
    },
    [seedById, setActiveBackdrop],
  );

  const handleOpenDetail = useCallback(() => {
    setDetailExpanded(true);
  }, []);

  const handleCollapseDetail = useCallback(() => {
    setDetailExpanded(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpenPackage(null);
    setActiveGame(null);
    setDetailExpanded(false);
    setActiveBackdrop(null);
  }, [setActiveBackdrop]);

  return (
    <>
      {useAgenda ? (
        <TimelineAgenda games={games} today={today} onOpenPackage={handleOpenPackage} />
      ) : (
        <Timeline games={games} today={today} onOpenPackage={handleOpenPackage} />
      )}

      <Stage
        open={openPackage !== null}
        month={openPackage?.month ?? 0}
        day={openPackage?.day ?? 0}
        laneKey={openPackage?.laneKey ?? "playstation"}
        games={openPackage?.games ?? []}
        activeGame={activeGame}
        detailExpanded={detailExpanded}
        related={relatedForActive}
        franchiseGames={franchiseGamesForActive}
        deal={dealForActive}
        today={today}
        seedById={seedById}
        onSelectCard={handleSelectCard}
        onOpenDetail={handleOpenDetail}
        onCollapseDetail={handleCollapseDetail}
        onClose={handleClose}
      />
    </>
  );
}
