export const DEFAULT_API_URL = "http://127.0.0.1:8080";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type EnvMap = Map<string, string>;

export type UrlCode = "invalid" | "protocol" | "host" | "credentials";

export type SetupFlags = {
  apiUrl: string;
  twitchId: boolean;
  twitchSecret: boolean;
  rawg: boolean;
};

export function parseEnv(content: string): EnvMap {
  const values: EnvMap = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

export function present(values: EnvMap, key: string): boolean {
  return (values.get(key) ?? "").trim().length > 0;
}

export function flagsFrom(values: EnvMap): SetupFlags {
  const checked = loopbackOrigin(values.get("API_BASE_URL") ?? "");
  return {
    apiUrl: checked.ok ? checked.origin : DEFAULT_API_URL,
    twitchId: present(values, "TWITCH_CLIENT_ID"),
    twitchSecret: present(values, "TWITCH_CLIENT_SECRET"),
    rawg: present(values, "RAWG_API_KEY"),
  };
}

export function loopbackOrigin(
  raw: string,
): { ok: true; origin: string } | { ok: false; code: UrlCode } {
  return inspectOrigin(raw, LOOPBACK_HOSTS);
}

export function runtimeHealthUrl(raw: string): { ok: true; url: string } | { ok: false; code: UrlCode } {
  const checked = inspectOrigin(raw, new Set([...LOOPBACK_HOSTS, "api"]));
  if (!checked.ok) {
    return checked;
  }
  return { ok: true, url: `${checked.origin}/healthz` };
}

export function loopbackHealthUrl(raw: string): { ok: true; url: string } | { ok: false; code: UrlCode } {
  const checked = loopbackOrigin(raw);
  if (!checked.ok) {
    return checked;
  }
  return { ok: true, url: `${checked.origin}/healthz` };
}

const MAX_VALUE_LENGTH = 512;

export function mergeEnvContent(original: string, updates: ReadonlyMap<string, string>): string {
  for (const value of updates.values()) {
    if (value.length > MAX_VALUE_LENGTH || /[\r\n\0"#]/.test(value)) {
      throw new Error("unsafe-value");
    }
  }

  const seen = new Set<string>();
  const next = original.split("\n").map((line) => {
    const match = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*)=(.*)$/.exec(line);
    if (match === null) {
      return line;
    }
    const key = match[2];
    const value = updates.get(key);
    if (value === undefined) {
      return line;
    }
    seen.add(key);
    return `${match[1]}${key}${match[3]}=${value}`;
  });

  const missing = [...updates.keys()].filter((key) => !seen.has(key));
  if (missing.length > 0) {
    if (next.length > 0 && next[next.length - 1] !== "") {
      next.push("");
    }
    for (const key of missing) {
      next.push(`${key}=${updates.get(key) ?? ""}`);
    }
  }

  const joined = next.join("\n");
  return joined.endsWith("\n") ? joined : `${joined}\n`;
}

function inspectOrigin(
  raw: string,
  allowed: Set<string>,
): { ok: true; origin: string } | { ok: false; code: UrlCode } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, code: "invalid" };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, code: "invalid" };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, code: "credentials" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "protocol" };
  }
  const hostname =
    url.hostname.startsWith("[") && url.hostname.endsWith("]")
      ? url.hostname.slice(1, -1)
      : url.hostname;
  if (!allowed.has(hostname)) {
    return { ok: false, code: "host" };
  }
  return { ok: true, origin: url.origin };
}
