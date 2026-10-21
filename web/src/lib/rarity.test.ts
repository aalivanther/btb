import { describe, expect, it } from "vitest";

import { deriveRarity, deriveRarityFromHypes } from "@/lib/rarity";

describe("deriveRarity (rareza por nota de crítica)", () => {
  it("devuelve legendary desde 8.5 (frontera inclusive) hacia arriba", () => {
    expect(deriveRarity(8.5)).toBe("legendary");
    expect(deriveRarity(9.3)).toBe("legendary");
    expect(deriveRarity(10)).toBe("legendary");
  });

  it("devuelve epic entre 7.5 (inclusive) y justo por debajo de 8.5", () => {
    expect(deriveRarity(7.5)).toBe("epic");
    expect(deriveRarity(8.49)).toBe("epic");
    expect(deriveRarity(8.0)).toBe("epic");
  });

  it("devuelve rare entre 6.5 (inclusive) y justo por debajo de 7.5", () => {
    expect(deriveRarity(6.5)).toBe("rare");
    expect(deriveRarity(7.49)).toBe("rare");
    expect(deriveRarity(7.0)).toBe("rare");
  });

  it("devuelve common por debajo de 6.5, incluido 0 (el caso 'sin calificación')", () => {
    expect(deriveRarity(6.49)).toBe("common");
    expect(deriveRarity(3.2)).toBe("common");
    expect(deriveRarity(0)).toBe("common");
  });
});

describe("deriveRarityFromHypes (rareza por anticipación, estrenos sin crítica)", () => {
  it("devuelve legendary desde 150 hypes (frontera inclusive) hacia arriba", () => {
    expect(deriveRarityFromHypes(150)).toBe("legendary");
    expect(deriveRarityFromHypes(1000)).toBe("legendary");
  });

  it("devuelve epic entre 50 (inclusive) y 149 hypes", () => {
    expect(deriveRarityFromHypes(50)).toBe("epic");
    expect(deriveRarityFromHypes(149)).toBe("epic");
  });

  it("devuelve rare entre 20 (inclusive) y 49 hypes", () => {
    expect(deriveRarityFromHypes(20)).toBe("rare");
    expect(deriveRarityFromHypes(49)).toBe("rare");
  });

  it("devuelve common por debajo de 20 hypes, incluido 0 (sin anticipación registrada)", () => {
    expect(deriveRarityFromHypes(19)).toBe("common");
    expect(deriveRarityFromHypes(0)).toBe("common");
  });
});
