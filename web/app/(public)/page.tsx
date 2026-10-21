import Link from "next/link";

import { Topbar } from "@/components/Topbar";
import { TimelineStage } from "@/components/TimelineStage";
import { DealsShowcase } from "@/components/DealsShowcase";
import { GlobalBackground } from "@/components/GlobalBackground";
import { CATALOG_WINDOW } from "@/lib/catalog-window";
import { collectGenres, pickMonthlyBackdrops, resolveDemoToday } from "@/lib/timeline";
import { listGamesSafe, type Game } from "@/lib/connect/catalog";
import { listBestDealsSafe } from "@/lib/connect/deals";
import { titlesMatch } from "@/lib/deal-match";
import { ui } from "@/lib/i18n";

const DEALS_LIMIT = 12;

const GLOBAL_BACKGROUND_COUNT = 6;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [monthResults, dealsResult] = await Promise.all([
    Promise.all(CATALOG_WINDOW.map((slot) => listGamesSafe(slot.year, slot.month))),
    listBestDealsSafe(DEALS_LIMIT),
  ]);

  const today = resolveDemoToday(process.env.DEMO_TODAY);

  const allMonthsFailed = monthResults.every((result) => result.error !== null);

  if (allMonthsFailed) {
    return (
      <>
        <Topbar genres={[]} today={today} />
        <main className="font-ui px-4 py-10 sm:px-10 sm:py-16">
          <section className="mx-auto max-w-[1100px]">
            <div
              role="alert"
              className="rounded-base border p-6"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="font-display text-lg text-text">{ui.home.errorTitle}</p>
              <p className="mt-2 text-sm text-text-muted">{ui.home.errorRetryHint}</p>
              <Link
                href="/"
                className="font-mono mt-4 inline-flex w-fit rounded-sm border border-gold-deep px-4 py-2 text-xs tracking-[0.08em] text-gold uppercase no-underline transition-colors hover:text-gold-bright"
                style={{ background: "var(--color-glass)" }}
              >
                {ui.home.errorRetry}
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const allGames: Game[] = monthResults.flatMap((result) => result.games);
  const seedByIndex = new Map<string, number>();
  allGames.forEach((game, index) => {
    seedByIndex.set(game.id, index);
  });

  const topGames = pickMonthlyBackdrops(allGames, GLOBAL_BACKGROUND_COUNT);

  const availableGenres = collectGenres(allGames);

  const gameIdByDealId: Record<string, string> = {};
  for (const deal of dealsResult.deals) {
    const match = allGames.find((game) => titlesMatch(deal.title, game.title));
    if (match !== undefined) {
      gameIdByDealId[deal.dealId] = match.id;
    }
  }

  return (
    <>
      <GlobalBackground
        games={topGames}
        seeds={topGames.map((game) => seedByIndex.get(game.id) ?? 0)}
      />
      <Topbar genres={availableGenres} today={today} />
      <main className="tlx-main font-ui">
        <TimelineStage games={allGames} today={today} />
      </main>
      <DealsShowcase
        deals={dealsResult.deals}
        stores={dealsResult.stores}
        error={dealsResult.error}
        gameIdByDealId={gameIdByDealId}
      />
    </>
  );
}
