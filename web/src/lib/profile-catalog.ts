import type { Game } from "@/lib/connect/catalog";
import type { CollectionItem, Credit, GameRatings } from "@/gen/btb/games/v1/games_pb";

// ProfileGame es la parte de cada juego que usa /perfil (lista, radar, logros y grafo).
// La página manda solo estos campos al navegador en vez del catálogo completo; como los
// componentes del perfil están tipados con este tipo, leer otro campo no compila.
export type ProfileGame = Pick<
  Game,
  | "id"
  | "title"
  | "coverUrl"
  | "hypes"
  | "platform"
  | "genres"
  | "releaseDate"
  | "trailerYoutubeKey"
> & {
  ratings?: Pick<GameRatings, "critic">;
  developers: Pick<Credit, "name">[];
  publishers: Pick<Credit, "name">[];
  franchise?: { name: string; items: Pick<CollectionItem, "gameId">[] };
};

export function toProfileGame(game: Game): ProfileGame {
  return {
    id: game.id,
    title: game.title,
    coverUrl: game.coverUrl,
    hypes: game.hypes,
    platform: game.platform,
    genres: game.genres,
    releaseDate: game.releaseDate,
    trailerYoutubeKey: game.trailerYoutubeKey,
    ratings: game.ratings ? { critic: game.ratings.critic } : undefined,
    developers: game.developers.map(({ name }) => ({ name })),
    publishers: game.publishers.map(({ name }) => ({ name })),
    franchise: game.franchise
      ? {
          name: game.franchise.name,
          items: game.franchise.items
            .filter(({ gameId }) => gameId !== "")
            .map(({ gameId }) => ({ gameId })),
        }
      : undefined,
  };
}
