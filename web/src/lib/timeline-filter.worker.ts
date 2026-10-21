/// <reference lib="webworker" />

import { groupByMonth, matchesFilter, type MonthGroup, type TimelineFilter } from "@/lib/timeline";
import type { Game } from "@/gen/btb/games/v1/games_pb";

type InitMessage = { type: "init"; games: Game[] };
type FilterMessage = { type: "filter"; filter: TimelineFilter; reqId: number };
type IncomingMessage = InitMessage | FilterMessage;

export type ResultMessage = { type: "result"; reqId: number; groups: MonthGroup[] };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let games: Game[] = [];

ctx.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    games = message.games;
    return;
  }
  if (message.type === "filter") {
    const groups = groupByMonth(games.filter((game) => matchesFilter(game, message.filter)));
    const result: ResultMessage = { type: "result", reqId: message.reqId, groups };
    ctx.postMessage(result);
  }
};
