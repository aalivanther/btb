import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ConfigPanel } from "@/components/ConfigPanel";
import { Topbar } from "@/components/Topbar";
import { CATALOG_WINDOW } from "@/lib/catalog-window";
import { listGamesSafe } from "@/lib/connect/catalog";
import { listBestDealsSafe } from "@/lib/connect/deals";
import { flagsFrom, runtimeHealthUrl } from "@/lib/env-file";
import { ui } from "@/lib/i18n";
import { readEnvFile } from "@/lib/local-env";
import { isLocalOrigin } from "@/lib/local-host";
import { resolveDemoToday } from "@/lib/timeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: `${ui.config.title} · ${ui.brand.full}`,
  robots: { index: false, follow: false },
};

export default async function ConfigPage() {
  const headerList = await headers();
  if (!isLocalOrigin((name) => headerList.get(name))) {
    notFound();
  }

  const today = resolveDemoToday(process.env.DEMO_TODAY);
  const flags = readFlags();
  const runtimeUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8080";
  const [reachable, monthResults, deals] = await Promise.all([
    probeRuntime(runtimeUrl),
    Promise.all(CATALOG_WINDOW.map((slot) => listGamesSafe(slot.year, slot.month))),
    listBestDealsSafe(1),
  ]);

  return (
    <>
      <Topbar genres={[]} today={today} />
      <main className="cfg-main font-ui">
        <div className="cfg-page">
          <h1 className="font-display text-3xl text-text">{ui.config.title}</h1>
          <p className="cfg-lead">{ui.config.intro}</p>
          <ConfigPanel
            flags={flags}
            runtime={{
              url: runtimeUrl,
              reachable,
              gameCount: monthResults.reduce((count, result) => count + result.games.length, 0),
              catalogOk: monthResults.some((result) => result.error === null),
              dealsOk: deals.error === null,
              months: CATALOG_WINDOW.map((slot, index) => ({
                year: slot.year,
                month: slot.month,
                count: monthResults[index]?.games.length ?? 0,
                ok: monthResults[index]?.error === null,
              })),
            }}
          />
        </div>
      </main>
    </>
  );
}

function readFlags() {
  try {
    return flagsFrom(readEnvFile().values);
  } catch {
    return flagsFrom(new Map());
  }
}

async function probeRuntime(rawUrl: string): Promise<boolean> {
  const checked = runtimeHealthUrl(rawUrl);
  if (!checked.ok) {
    return false;
  }
  try {
    const response = await fetch(checked.url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
