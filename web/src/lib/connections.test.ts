import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { GameSchema, type Game } from "@/gen/btb/games/v1/games_pb";
import { buildConnectionIndex, relatedGames } from "@/lib/connections";

function makeGame(overrides: {
  id: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  franchise?: { name: string; items?: { gameId: string }[] };
}): Game {
  return create(GameSchema, {
    id: overrides.id,
    title: overrides.id,
    genres: overrides.genres ?? [],
    developers: (overrides.developers ?? []).map((name) => ({ name, role: "", photoUrl: "" })),
    publishers: (overrides.publishers ?? []).map((name) => ({ name, role: "", photoUrl: "" })),
    franchise: overrides.franchise
      ? {
          name: overrides.franchise.name,
          items: (overrides.franchise.items ?? []).map((it) => ({ gameId: it.gameId })),
        }
      : undefined,
  });
}

describe("relatedGames (motor de conexiones)", () => {
  it("clasifica la franquicia por encima de un género compartido", () => {
    const target = makeGame({ id: "re-village", genres: ["Terror"], franchise: { name: "Resident Evil" } });
    const sibling = makeGame({ id: "re-4", genres: ["Acción"], franchise: { name: "Resident Evil" } });
    const genreOnly = makeGame({ id: "otro-terror", genres: ["Terror"] });
    const games = [target, sibling, genreOnly];
    const index = buildConnectionIndex(games);

    const related = relatedGames(target, games, index);
    expect(related[0].game.id).toBe("re-4");
    expect(related[0].reasons[0].type).toBe("franchise");
  });

  it("un género común aporta menos peso que uno raro (IDF)", () => {
    const target = makeGame({ id: "t", genres: ["Indie", "Roguelike"] });
    const rare = makeGame({ id: "rare", genres: ["Roguelike"] });
    const common = makeGame({ id: "common", genres: ["Indie"] });
    const filler = Array.from({ length: 8 }, (_, i) => makeGame({ id: `f${i}`, genres: ["Indie"] }));
    const games = [target, rare, common, ...filler];
    const index = buildConnectionIndex(games);

    const related = relatedGames(target, games, index, { minWeight: 0 });
    const rareConn = related.find((c) => c.game.id === "rare");
    const commonConn = related.find((c) => c.game.id === "common");
    expect(rareConn).toBeDefined();
    expect(commonConn).toBeDefined();
    expect(rareConn!.weight).toBeGreaterThan(commonConn!.weight);
  });

  it("reconoce la franquicia por gameId explícito aunque el nombre difiera", () => {
    const target = makeGame({ id: "a", franchise: { name: "Saga X", items: [{ gameId: "b" }] } });
    const linked = makeGame({ id: "b", genres: ["RPG"] });
    const games = [target, linked];
    const index = buildConnectionIndex(games);

    const related = relatedGames(target, games, index);
    expect(related[0].game.id).toBe("b");
    expect(related[0].reasons.some((r) => r.type === "franchise")).toBe(true);
  });

  it("descarta juegos sin ninguna señal compartida", () => {
    const target = makeGame({ id: "t", genres: ["RPG"], developers: ["Estudio A"] });
    const unrelated = makeGame({ id: "u", genres: ["Deportes"], developers: ["Estudio B"] });
    const games = [target, unrelated];
    const index = buildConnectionIndex(games);

    expect(relatedGames(target, games, index)).toHaveLength(0);
  });
});
