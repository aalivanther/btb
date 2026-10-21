import { describe, expect, it } from "vitest";

import type { WishItem } from "@/lib/profile-context";
import type { TodayMarker } from "@/lib/timeline";
import {
  OUT_WINDOW_DAYS,
  SOON_WINDOW_DAYS,
  alertKey,
  buildWishAlerts,
  daysUntilRelease,
} from "@/lib/wishlist-alerts";

const TODAY: TodayMarker = { year: 2026, month: 6, day: 15, label: "HOY · 15 JUN" };

function makeItem(id: string, title: string, releaseDate: string): WishItem {
  return { id, title, platform: "", releaseDate };
}

describe("daysUntilRelease (distancia en días entre HOY y el estreno)", () => {
  it("devuelve 0 cuando el estreno es exactamente HOY", () => {
    expect(daysUntilRelease("2026-06-15", TODAY)).toBe(0);
  });

  it("devuelve días POSITIVOS para fechas futuras (mañana = 1, en una semana = 7)", () => {
    expect(daysUntilRelease("2026-06-16", TODAY)).toBe(1);
    expect(daysUntilRelease("2026-06-22", TODAY)).toBe(7);
  });

  it("devuelve días NEGATIVOS para fechas pasadas (ayer = -1, hace 30 días = -30)", () => {
    expect(daysUntilRelease("2026-06-14", TODAY)).toBe(-1);
    expect(daysUntilRelease("2026-05-16", TODAY)).toBe(-30);
  });

  it("cruza meses y años sin perderse (la resta es en UTC, no por componentes)", () => {
    expect(daysUntilRelease("2026-07-01", TODAY)).toBe(16);
    expect(daysUntilRelease("2027-01-15", TODAY)).toBe(214);
  });

  it("devuelve null ante fechas vacías o mal formadas (sin inventar una fecha)", () => {
    expect(daysUntilRelease("", TODAY)).toBeNull();
    expect(daysUntilRelease("15/06/2026", TODAY)).toBeNull();
    expect(daysUntilRelease("2026-6-15", TODAY)).toBeNull();
    expect(daysUntilRelease("no es fecha", TODAY)).toBeNull();
  });
});

describe("buildWishAlerts (clasificación por etapas y ventanas)", () => {
  it("clasifica como 'today' el estreno de HOY (frontera 0 días)", () => {
    const alerts = buildWishAlerts([makeItem("g1", "Sale Hoy", "2026-06-15")], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].stage).toBe("today");
    expect(alerts[0].daysUntil).toBe(0);
  });

  it("clasifica como 'soon' desde 1 hasta 7 días (ambas fronteras dentro)", () => {
    const tomorrow = buildWishAlerts([makeItem("g1", "Mañana", "2026-06-16")], TODAY);
    expect(tomorrow[0].stage).toBe("soon");
    const seventh = buildWishAlerts([makeItem("g2", "Séptimo Día", "2026-06-22")], TODAY);
    expect(seventh[0].stage).toBe("soon");
    expect(seventh[0].daysUntil).toBe(SOON_WINDOW_DAYS);
  });

  it("NO avisa de estrenos a 8+ días (justo fuera de la ventana 'soon')", () => {
    expect(buildWishAlerts([makeItem("g1", "Octavo Día", "2026-06-23")], TODAY)).toHaveLength(0);
  });

  it("clasifica como 'out' lo salido entre ayer (-1) y hace 30 días (ambas fronteras dentro)", () => {
    const yesterday = buildWishAlerts([makeItem("g1", "Ayer", "2026-06-14")], TODAY);
    expect(yesterday[0].stage).toBe("out");
    expect(yesterday[0].daysUntil).toBe(-1);
    const monthAgo = buildWishAlerts([makeItem("g2", "Hace Un Mes", "2026-05-16")], TODAY);
    expect(monthAgo[0].stage).toBe("out");
    expect(monthAgo[0].daysUntil).toBe(-OUT_WINDOW_DAYS);
  });

  it("NO avisa de lo salido hace 31+ días (justo fuera de la ventana 'out')", () => {
    expect(buildWishAlerts([makeItem("g1", "Hace 31 Días", "2026-05-15")], TODAY)).toHaveLength(0);
  });

  it("trata un estreno de OTRO AÑO como futuro lejano (sin aviso), no como 'ya salió'", () => {
    expect(buildWishAlerts([makeItem("g1", "Del 2027", "2027-01-15")], TODAY)).toHaveLength(0);
  });

  it("descarta sin romper los items con fecha vacía o corrupta", () => {
    const alerts = buildWishAlerts(
      [makeItem("g1", "Sin Fecha", ""), makeItem("g2", "Corrupto", "pronto")],
      TODAY,
    );
    expect(alerts).toHaveLength(0);
  });

  it("ordena por urgencia (hoy → pronto → ya salió) y por cercanía dentro de cada etapa", () => {
    const alerts = buildWishAlerts(
      [
        makeItem("out-far", "Salió Lejos", "2026-05-26"),
        makeItem("soon-far", "Pronto Lejos", "2026-06-20"),
        makeItem("today", "Es Hoy", "2026-06-15"),
        makeItem("soon-near", "Pronto Cerca", "2026-06-17"),
        makeItem("out-near", "Salió Cerca", "2026-06-13"),
      ],
      TODAY,
    );
    expect(alerts.map((alert) => alert.item.id)).toEqual([
      "today",
      "soon-near",
      "soon-far",
      "out-near",
      "out-far",
    ]);
  });

  it("desempata por título (es-MX) cuando etapa y distancia coinciden", () => {
    const alerts = buildWishAlerts(
      [
        makeItem("z", "Zelda", "2026-06-17"),
        makeItem("a", "Astro Bot", "2026-06-17"),
      ],
      TODAY,
    );
    expect(alerts.map((alert) => alert.item.title)).toEqual(["Astro Bot", "Zelda"]);
  });
});

describe("alertKey (llave estable para marcar avisos como vistos)", () => {
  it("combina id del juego y etapa: cambiar de etapa produce una llave NUEVA", () => {
    const item = makeItem("g1", "Juego", "2026-06-15");
    const asToday = alertKey({ item, stage: "today", daysUntil: 0 });
    const asSoon = alertKey({ item, stage: "soon", daysUntil: 3 });
    expect(asToday).toBe("g1@today");
    expect(asSoon).toBe("g1@soon");
    expect(asToday).not.toBe(asSoon);
  });
});
