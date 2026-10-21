import { cache } from "react";

import { Code, ConnectError, createClient } from "@connectrpc/connect";
import type { Client } from "@connectrpc/connect";
import { createServerTransport } from "@/lib/connect/transport";
import { ui } from "@/lib/i18n";
import { GameCatalogService, type Game } from "@/gen/btb/games/v1/games_pb";

export type { Game } from "@/gen/btb/games/v1/games_pb";
export { GameKind, Platform } from "@/gen/btb/games/v1/games_pb";

type GameCatalogClient = Client<typeof GameCatalogService>;

export function getGameCatalogClient(): GameCatalogClient {
  return createClient(GameCatalogService, createServerTransport());
}

export type ListGamesResult = {
  games: Game[];
  error: string | null;
};

export type GetGameResult = {
  game: Game | null;
  error: string | null;
};

function describeError(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}

export const listGamesSafe = cache(async (year: number, month: number): Promise<ListGamesResult> => {
  try {
    const client = getGameCatalogClient();
    const response = await client.listGames({ year, month });

    return {
      games: response.games,
      error: null,
    };
  } catch (cause) {
    console.error(`listGamesSafe failed for ${year}-${month}: ${describeError(cause)}`);
    return {
      games: [],
      error: ui.errors.loadGames,
    };
  }
});

export const getGameSafe = cache(async (id: string): Promise<GetGameResult> => {
  try {
    const client = getGameCatalogClient();
    const response = await client.getGame({ id });

    return {
      game: response.game ?? null,
      error: null,
    };
  } catch (cause) {
    if (cause instanceof ConnectError && cause.code === Code.NotFound) {
      return { game: null, error: null };
    }
    console.error(`getGameSafe failed for id="${id}": ${describeError(cause)}`);
    return {
      game: null,
      error: ui.errors.loadGame,
    };
  }
});
