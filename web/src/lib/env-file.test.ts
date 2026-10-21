import { describe, expect, it } from "vitest";

import {
  flagsFrom,
  loopbackHealthUrl,
  loopbackOrigin,
  mergeEnvContent,
  parseEnv,
  runtimeHealthUrl,
} from "@/lib/env-file";

describe("parseEnv y flagsFrom", () => {
  it("ignora comentarios y no entrega el texto de las llaves", () => {
    const values = parseEnv("# nota\nTWITCH_CLIENT_ID=abc\nTWITCH_CLIENT_SECRET=\nRAWG_API_KEY=k\n");
    const flags = flagsFrom(values);
    expect(flags.twitchId).toBe(true);
    expect(flags.twitchSecret).toBe(false);
    expect(flags.rawg).toBe(true);
    expect(flags.apiUrl).toBe("http://127.0.0.1:8080");
  });
});

describe("direcciones", () => {
  it("acepta localhost y rechaza otros hosts y credenciales en la URL", () => {
    expect(loopbackOrigin("http://127.0.0.1:8080/healthz")).toEqual({
      ok: true,
      origin: "http://127.0.0.1:8080",
    });
    expect(loopbackOrigin("http://[::1]:8080")).toEqual({ ok: true, origin: "http://[::1]:8080" });
    expect(loopbackOrigin("http://api:8080").ok).toBe(false);
    expect(loopbackOrigin("http://user:pass@127.0.0.1:8080").ok).toBe(false);
    const health = loopbackHealthUrl("http://localhost:9090");
    expect(health.ok && health.url).toBe("http://localhost:9090/healthz");
  });

  it("permite el nombre api solo en la prueba del proceso", () => {
    expect(runtimeHealthUrl("http://api:8080")).toEqual({ ok: true, url: "http://api:8080/healthz" });
    expect(runtimeHealthUrl("http://example.com").ok).toBe(false);
  });
});

describe("mergeEnvContent", () => {
  it("conserva comentarios y claves que no se están cambiando", () => {
    const original = "# cabecera\nPORT=8080\nTWITCH_CLIENT_SECRET=viejo\n";
    const updates = new Map([["TWITCH_CLIENT_ID", "nuevo"]]);
    const merged = mergeEnvContent(original, updates);
    expect(merged).toContain("# cabecera");
    expect(merged).toContain("PORT=8080");
    expect(merged).toContain("TWITCH_CLIENT_SECRET=viejo");
    expect(merged).toContain("TWITCH_CLIENT_ID=nuevo");
  });

  it("rechaza un valor con salto de línea, con # o demasiado largo", () => {
    expect(() => mergeEnvContent("", new Map([["TWITCH_CLIENT_ID", "a\nb"]]))).toThrow("unsafe-value");
    expect(() => mergeEnvContent("", new Map([["TWITCH_CLIENT_ID", "abc#def"]]))).toThrow("unsafe-value");
    expect(() => mergeEnvContent("", new Map([["TWITCH_CLIENT_ID", "a".repeat(513)]]))).toThrow(
      "unsafe-value",
    );
  });
});
