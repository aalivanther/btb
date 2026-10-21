"use server";

import { headers } from "next/headers";

import {
  DEFAULT_API_URL,
  flagsFrom,
  loopbackHealthUrl,
  loopbackOrigin,
  mergeEnvContent,
  type SetupFlags,
  type UrlCode,
} from "@/lib/env-file";
import { isLocalOrigin } from "@/lib/local-host";
import { readEnvFile, resolveEnvFilePath, writeEnvFile } from "@/lib/local-env";
import { ui } from "@/lib/i18n";

type ProbeResult = {
  ok: boolean;
  message: string;
};

type SaveResult = {
  ok: boolean;
  message: string;
  flags: SetupFlags;
};

const URL_MESSAGE: Record<UrlCode, string> = {
  invalid: ui.config.badUrl,
  protocol: ui.config.badUrl,
  host: ui.config.badUrl,
  credentials: ui.config.badUrl,
};

export async function probeApi(rawUrl: string): Promise<ProbeResult> {
  if (!(await requestIsLocal())) {
    return { ok: false, message: ui.config.notLocal };
  }
  const checked = loopbackHealthUrl(rawUrl);
  if (!checked.ok) {
    return { ok: false, message: URL_MESSAGE[checked.code] };
  }
  const reached = await fetchHealth(checked.url);
  return { ok: reached, message: reached ? ui.config.serverOk : ui.config.serverFail };
}

export async function saveSetup(input: {
  apiUrl: string;
  twitchClientId: string;
  twitchClientSecret: string;
  rawgApiKey: string;
}): Promise<SaveResult> {
  if (!(await requestIsLocal())) {
    return { ok: false, message: ui.config.notLocal, flags: emptyFlags() };
  }

  const updates = new Map<string, string>();
  const apiUrl = input.apiUrl.trim();
  if (apiUrl !== "") {
    const checked = loopbackOrigin(apiUrl);
    if (!checked.ok) {
      return { ok: false, message: URL_MESSAGE[checked.code], flags: currentFlags() };
    }
    updates.set("API_BASE_URL", checked.origin);
  }
  putIfFilled(updates, "TWITCH_CLIENT_ID", input.twitchClientId);
  putIfFilled(updates, "TWITCH_CLIENT_SECRET", input.twitchClientSecret);
  putIfFilled(updates, "RAWG_API_KEY", input.rawgApiKey);

  if (updates.size === 0) {
    return { ok: true, message: ui.config.nothingNew, flags: currentFlags() };
  }

  try {
    const filePath = resolveEnvFilePath();
    const current = readEnvFile(filePath);
    const next = mergeEnvContent(current.content, updates);
    writeEnvFile(filePath, next);
    return { ok: true, message: ui.config.saved, flags: flagsFrom(readEnvFile(filePath).values) };
  } catch (error) {
    if (error instanceof Error && error.message === "unsafe-value") {
      return { ok: false, message: ui.config.badValue, flags: currentFlags() };
    }
    return { ok: false, message: ui.config.saveFailed, flags: currentFlags() };
  }
}

function putIfFilled(updates: Map<string, string>, key: string, raw: string): void {
  const value = raw.trim();
  if (value !== "") {
    updates.set(key, value);
  }
}

function currentFlags(): SetupFlags {
  try {
    return flagsFrom(readEnvFile().values);
  } catch {
    return emptyFlags();
  }
}

function emptyFlags(): SetupFlags {
  return { apiUrl: DEFAULT_API_URL, twitchId: false, twitchSecret: false, rawg: false };
}

async function requestIsLocal(): Promise<boolean> {
  const headerList = await headers();
  return isLocalOrigin((name) => headerList.get(name));
}

async function fetchHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
