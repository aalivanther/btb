import { cache } from "react";
import { fromJson } from "@bufbuild/protobuf";
import { GameSchema } from "@/gen/btb/games/v1/games_pb";
import snapshot from "@/data/demo-catalog.json";
export type { Game } from "@/gen/btb/games/v1/games_pb";
export { GameKind, Platform } from "@/gen/btb/games/v1/games_pb";
export const demoGames = snapshot.games.map((game) => fromJson(GameSchema, game as never));
export const listGamesSafe = cache(async (year: number, month: number) => ({
  games: demoGames.filter((game) => game.releaseDate.startsWith(`${year}-${String(month).padStart(2, "0")}-`)),
  error: null,
}));
export const getGameSafe = cache(async (id: string) => ({ game: demoGames.find((game) => game.id === id) ?? null, error: null }));
