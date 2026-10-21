import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { GameSchema, Platform, type Game } from "@/gen/btb/games/v1/games_pb";
import type { Profile, WishItem } from "@/lib/profile-context";
import {
  buildRadarStats,
  buildWishBoard,
  deriveBossTitle,
  exportProfileJson,
  readProfileBackup,
  sortWishEntries,
} from "@/lib/profile-insights";
import type { TodayMarker } from "@/lib/timeline";

const TODAY: TodayMarker = { year: 2026, month: 6, day: 15, label: "HOY · 15 JUN" };

function makeGame(overrides: {
  id: string;
  platform?: Platform;
  genres?: string[];
  critic?: number;
  hypes?: number;
}): Game {
  return create(GameSchema, {
    id: overrides.id,
    platform: overrides.platform ?? Platform.PC,
    genres: overrides.genres ?? [],
    hypes: overrides.hypes ?? 0,
    ratings: overrides.critic !== undefined ? { critic: overrides.critic } : undefined,
  });
}

function makeItem(
  id: string,
  title: string,
  releaseDate: string,
  platform: WishItem["platform"] = "",
): WishItem {
  return { id, title, platform, releaseDate };
}

describe("buildWishBoard (unir wishlist con catálogo y separar próximos / ya disponibles)", () => {
  it("separa por fecha: el estreno de HOY cuenta como YA DISPONIBLE (frontera 0 días)", () => {
    const board = buildWishBoard(
      [makeItem("g1", "Hoy", "2026-06-15"), makeItem("g2", "Mañana", "2026-06-16")],
      [makeGame({ id: "g1" }), makeGame({ id: "g2" })],
      TODAY,
    );
    expect(board.released.map((entry) => entry.item.id)).toEqual(["g1"]);
    expect(board.upcoming.map((entry) => entry.item.id)).toEqual(["g2"]);
  });

  it("deriva la rareza: por nota de crítica si la hay (>0); si no, por anticipación (hypes)", () => {
    const board = buildWishBoard(
      [makeItem("crit", "Con Nota", "2026-06-10"), makeItem("hype", "Esperado", "2026-08-01")],
      [
        makeGame({ id: "crit", critic: 9.0 }),
        makeGame({ id: "hype", hypes: 60 }),
      ],
      TODAY,
    );
    const byId = new Map(
      [...board.upcoming, ...board.released].map((entry) => [entry.item.id, entry]),
    );
    expect(byId.get("crit")?.tier).toBe("legendary");
    expect(byId.get("hype")?.tier).toBe("epic");
  });

  it("usa 'common' cuando la entrada no tiene juego en el catálogo (no se inventa rareza)", () => {
    const board = buildWishBoard([makeItem("ghost", "Fantasma", "2026-09-01")], [], TODAY);
    expect(board.upcoming[0].tier).toBe("common");
    expect(board.upcoming[0].game).toBeNull();
  });

  it("ordena próximos por cercanía y ya disponibles por estreno más reciente primero", () => {
    const board = buildWishBoard(
      [
        makeItem("up-far", "Lejano", "2026-08-01"),
        makeItem("up-near", "Cercano", "2026-06-20"),
        makeItem("rel-old", "Viejo", "2026-05-01"),
        makeItem("rel-new", "Reciente", "2026-06-10"),
      ],
      [
        makeGame({ id: "up-far" }),
        makeGame({ id: "up-near" }),
        makeGame({ id: "rel-old" }),
        makeGame({ id: "rel-new" }),
      ],
      TODAY,
    );
    expect(board.upcoming.map((entry) => entry.item.id)).toEqual(["up-near", "up-far"]);
    expect(board.released.map((entry) => entry.item.id)).toEqual(["rel-new", "rel-old"]);
  });

  it("manda las entradas SIN fecha utilizable al final de 'próximos'", () => {
    const board = buildWishBoard(
      [makeItem("dated", "Con Fecha", "2026-07-01"), makeItem("undated", "Sin Fecha", "")],
      [makeGame({ id: "dated" }), makeGame({ id: "undated" })],
      TODAY,
    );
    expect(board.upcoming.map((entry) => entry.item.id)).toEqual(["dated", "undated"]);
  });
});

describe("sortWishEntries (reordenar el tablero según el criterio de la interfaz)", () => {
  const board = buildWishBoard(
    [
      makeItem("common", "Común", "2026-07-10"),
      makeItem("legend", "Legendario", "2026-07-20"),
      makeItem("epic", "Épico", "2026-07-30"),
    ],
    [
      makeGame({ id: "common", critic: 5.0, genres: ["Terror"] }),
      makeGame({ id: "legend", critic: 9.0, genres: ["Acción"] }),
      makeGame({ id: "epic", critic: 8.0, genres: ["RPG"] }),
    ],
    TODAY,
  );

  it("'date' conserva el orden cronológico que armó buildWishBoard (copia, sin mutar)", () => {
    const sorted = sortWishEntries(board.upcoming, "date");
    expect(sorted.map((entry) => entry.item.id)).toEqual(["common", "legend", "epic"]);
    expect(sorted).not.toBe(board.upcoming);
  });

  it("'rarity' pone las rarezas más altas primero (legendary → epic → common)", () => {
    const sorted = sortWishEntries(board.upcoming, "rarity");
    expect(sorted.map((entry) => entry.item.id)).toEqual(["legend", "epic", "common"]);
  });

  it("'genre' agrupa alfabéticamente por el primer género (es-MX)", () => {
    const sorted = sortWishEntries(board.upcoming, "genre");
    expect(sorted.map((entry) => entry.game?.genres[0])).toEqual(["Acción", "RPG", "Terror"]);
  });
});

describe("buildRadarStats (distribuciones del radar de /perfil)", () => {
  it("cuenta géneros (mayor a menor), plataformas y rarezas, y elige el próximo estreno con fecha", () => {
    const board = buildWishBoard(
      [
        makeItem("a", "A", "2026-06-20", "playstation"),
        makeItem("b", "B", "2026-07-01", "xbox"),
        makeItem("c", "C", "2026-05-10", "playstation"),
      ],
      [
        makeGame({ id: "a", critic: 9.0, genres: ["Acción", "RPG"] }),
        makeGame({ id: "b", critic: 8.0, genres: ["Acción"] }),
        makeGame({ id: "c", critic: 5.0, genres: ["RPG"] }),
      ],
      TODAY,
    );
    const stats = buildRadarStats(board);

    expect(stats.total).toBe(3);
    expect(stats.byGenre).toEqual([
      { label: "Acción", count: 2 },
      { label: "RPG", count: 2 },
    ]);
    expect(stats.byPlatform).toEqual([
      { label: "PlayStation", count: 2 },
      { label: "Xbox", count: 1 },
    ]);
    expect(stats.byTier).toEqual([
      { tier: "legendary", count: 1 },
      { tier: "epic", count: 1 },
      { tier: "common", count: 1 },
    ]);
    expect(stats.next?.item.id).toBe("a");
  });

  it("usa la lane LÍDER del juego cuando el item no guardó plataforma", () => {
    const board = buildWishBoard(
      [makeItem("a", "A", "2026-07-01", "")],
      [makeGame({ id: "a", platform: Platform.NINTENDO, genres: ["Aventura"] })],
      TODAY,
    );
    const stats = buildRadarStats(board);
    expect(stats.byPlatform).toEqual([{ label: "Nintendo", count: 1 }]);
  });

  it("devuelve un radar vacío y next null cuando no hay juegos seguidos", () => {
    const stats = buildRadarStats({ upcoming: [], released: [] });
    expect(stats.total).toBe(0);
    expect(stats.byGenre).toEqual([]);
    expect(stats.byPlatform).toEqual([]);
    expect(stats.byTier).toEqual([]);
    expect(stats.next).toBeNull();
  });
});

describe("deriveBossTitle (título de la Boss Card según la rareza dominante)", () => {
  it("'Boss Novato' sin juegos o con menos del mínimo (3) seguidos", () => {
    expect(deriveBossTitle({ upcoming: [], released: [] })).toBe("Boss Novato");
    const twoLegendary = buildWishBoard(
      [makeItem("a", "A", "2026-07-01"), makeItem("b", "B", "2026-07-02")],
      [makeGame({ id: "a", critic: 9.5 }), makeGame({ id: "b", critic: 9.5 })],
      TODAY,
    );
    expect(deriveBossTitle(twoLegendary)).toBe("Boss Novato");
  });

  it("con 3+ seguidos elige la rareza con MÁS entradas", () => {
    const board = buildWishBoard(
      [
        makeItem("a", "A", "2026-07-01"),
        makeItem("b", "B", "2026-07-02"),
        makeItem("c", "C", "2026-07-03"),
      ],
      [
        makeGame({ id: "a", critic: 9.5 }),
        makeGame({ id: "b", critic: 9.0 }),
        makeGame({ id: "c", critic: 5.0 }),
      ],
      TODAY,
    );
    expect(deriveBossTitle(board)).toBe("Cazador de Legendarios");
  });

  it("ante empate de conteo, gana la rareza MÁS ALTA", () => {
    const board = buildWishBoard(
      [
        makeItem("a", "A", "2026-07-01"),
        makeItem("b", "B", "2026-07-02"),
        makeItem("c", "C", "2026-07-03"),
        makeItem("d", "D", "2026-07-04"),
      ],
      [
        makeGame({ id: "a", critic: 8.0 }),
        makeGame({ id: "b", critic: 8.0 }),
        makeGame({ id: "c", critic: 7.0 }),
        makeGame({ id: "d", critic: 7.0 }),
      ],
      TODAY,
    );
    expect(deriveBossTitle(board)).toBe("Coleccionista Épico");
  });
});

describe("exportProfileJson / readProfileBackup (respaldo del perfil)", () => {
  const profile: Profile = {
    identity: { alias: "Boss", bio: "", avatarKey: "" },
    genres: ["Acción"],
    platforms: ["pc"],
    wishlist: [makeItem("a", "A", "2026-07-01")],
  };

  it("exporta un JSON con sello de formato y versión, y su perfil intacto", () => {
    const parsed = JSON.parse(exportProfileJson(profile));
    expect(parsed.format).toBe("btb-profile");
    expect(parsed.version).toBe(1);
    expect(parsed.profile).toEqual(profile);
  });

  it("lee de vuelta el respaldo con sobre (ida y vuelta = mismo perfil)", () => {
    const restored = readProfileBackup(exportProfileJson(profile));
    expect(restored).toEqual(profile);
  });

  it("acepta un perfil 'pelado' (sin sobre) si tiene alguna llave conocida", () => {
    expect(readProfileBackup(JSON.stringify({ wishlist: [] }))).toEqual({ wishlist: [] });
  });

  it("devuelve null ante JSON inválido o texto que no luce como perfil", () => {
    expect(readProfileBackup("{ esto no es json")).toBeNull();
    expect(readProfileBackup(JSON.stringify({ cualquier: "cosa" }))).toBeNull();
    expect(readProfileBackup(JSON.stringify("solo un string"))).toBeNull();
  });
});
