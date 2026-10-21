import { describe, it, expect } from "vitest";

import { usdToMxnAmount, formatMxnApprox } from "@/lib/currency";

describe("usdToMxnAmount", () => {
  it("convierte y redondea al peso entero con la tasa de respaldo (18.5)", () => {
    expect(usdToMxnAmount("10")).toBe(185);
    expect(usdToMxnAmount("14.38")).toBe(266);
  });
  it("devuelve null ante texto no numérico o negativo (para omitir la estimación)", () => {
    expect(usdToMxnAmount("")).toBeNull();
    expect(usdToMxnAmount("gratis")).toBeNull();
    expect(usdToMxnAmount("-5")).toBeNull();
  });
});

describe("formatMxnApprox", () => {
  it("formatea con ≈, símbolo y separador de miles es-MX", () => {
    expect(formatMxnApprox("100")).toBe("≈ $1,850 MXN");
  });
  it("devuelve cadena vacía ante entrada inválida (para no pintar el chip)", () => {
    expect(formatMxnApprox("abc")).toBe("");
  });
});
