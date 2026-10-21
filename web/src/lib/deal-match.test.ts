import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { DealSchema } from "@/gen/btb/games/v1/deals_pb";
import { matchDealToTitle, normalizeTitle, titlesMatch } from "@/lib/deal-match";

describe("normalizeTitle (normalización para comparar)", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(normalizeTitle("Última Fantasía")).toBe("ultima fantasia");
  });

  it("reemplaza signos (dos puntos, guiones, apóstrofes) y colapsa espacios", () => {
    expect(normalizeTitle("Zelda: Breath — of   the Wild")).toBe("zelda breath of the wild");
    expect(normalizeTitle("Assassin's Creed")).toBe("assassin s creed");
  });

  it("recorta los espacios de los extremos y conserva los dígitos", () => {
    expect(normalizeTitle("  Gothic 1 Remake  ")).toBe("gothic 1 remake");
  });

  it("devuelve cadena vacía cuando el título solo trae signos o espacios", () => {
    expect(normalizeTitle("  ¡¿!?  ")).toBe("");
  });
});

describe("titlesMatch (¿hablan del mismo juego?)", () => {
  it("empareja títulos idénticos", () => {
    expect(titlesMatch("Hollow Knight: Silksong", "Hollow Knight: Silksong")).toBe(true);
  });

  it("empareja ignorando mayúsculas y acentos", () => {
    expect(titlesMatch("PokéMON", "pokemon")).toBe(true);
  });

  it("empareja por inclusión en cualquier sentido (oferta corta vs catálogo largo y viceversa)", () => {
    expect(titlesMatch("Gothic", "Gothic 1 Remake")).toBe(true);
    expect(titlesMatch("Gothic 1 Remake", "Gothic")).toBe(true);
  });

  it("empareja la edición ('Deluxe Edition') con el título base", () => {
    expect(titlesMatch("Elden Ring Deluxe Edition", "Elden Ring")).toBe(true);
  });

  it("empareja el título base con su entrega con subtítulo tras ':'", () => {
    expect(titlesMatch("God of War", "God of War: Ragnarok")).toBe(true);
  });

  it("distingue entregas con números romanos distintos (no hay inclusión entre ellas)", () => {
    expect(titlesMatch("Final Fantasy VII", "Final Fantasy IX")).toBe(false);
    expect(titlesMatch("Final Fantasy", "Final Fantasy VII")).toBe(true);
  });

  it("NO empareja juegos claramente distintos", () => {
    expect(titlesMatch("Silent Hill 2", "Hades II")).toBe(false);
    expect(titlesMatch("Doom", "Animal Crossing")).toBe(false);
  });

  it("NO empareja cuando alguno de los títulos queda vacío tras normalizar", () => {
    expect(titlesMatch("", "Gothic")).toBe(false);
    expect(titlesMatch("Gothic", "   ")).toBe(false);
    expect(titlesMatch("!?", "...")).toBe(false);
  });
});

describe("matchDealToTitle (buscar la oferta de UN título en la lista)", () => {
  const deals = [
    create(DealSchema, { dealId: "d1", title: "Gothic" }),
    create(DealSchema, { dealId: "d2", title: "Elden Ring Deluxe Edition" }),
  ];

  it("devuelve la PRIMERA oferta cuyo título empareja con el buscado", () => {
    expect(matchDealToTitle(deals, "Gothic 1 Remake")?.dealId).toBe("d1");
    expect(matchDealToTitle(deals, "Elden Ring")?.dealId).toBe("d2");
  });

  it("devuelve undefined cuando ninguna oferta corresponde al título", () => {
    expect(matchDealToTitle(deals, "Hollow Knight: Silksong")).toBeUndefined();
  });
});
