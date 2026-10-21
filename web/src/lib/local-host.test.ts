import { describe, expect, it } from "vitest";

import { isLocalHostHeader, isLocalOrigin } from "@/lib/local-host";

describe("isLocalHostHeader", () => {
  it("acepta las formas locales y rechaza un nombre de red", () => {
    expect(isLocalHostHeader("localhost:3000")).toBe(true);
    expect(isLocalHostHeader("127.0.0.1:3000")).toBe(true);
    expect(isLocalHostHeader("[::1]:3000")).toBe(true);
    expect(isLocalHostHeader("::1")).toBe(true);
    expect(isLocalHostHeader("evil.example, localhost")).toBe(false);
    expect(isLocalHostHeader(null)).toBe(false);
  });

  it("no hace caso de X-Forwarded-Host", () => {
    const headers = new Map([
      ["host", "evil.example"],
      ["x-forwarded-host", "localhost"],
    ]);
    expect(isLocalOrigin((name) => headers.get(name) ?? null)).toBe(false);
  });
});
