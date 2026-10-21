import type { Metadata } from "next";
import Link from "next/link";

import { ReleaseDetail } from "@/components/ReleaseDetail";
import { Topbar } from "@/components/Topbar";
import { CATALOG_WINDOW } from "@/lib/catalog-window";
import { getGameSafe, listGamesSafe } from "@/lib/connect/catalog";
import seedVideos from "@/data/seed-videos.json";
import type { GameVideo, SeedVideos } from "@/lib/game-videos";
import { findGameDealsSafe } from "@/lib/connect/deals";
import { collectGenres, findConnections, isUpcoming, resolveDemoToday } from "@/lib/timeline";
import { matchDealToTitle } from "@/lib/deal-match";
import { ui } from "@/lib/i18n";

type PageParams = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const { game } = await getGameSafe(id);

  if (!game) {
    return {
      title: ui.detail.notFoundTitle,
    };
  }

  const title = game.title;

  const FALLBACK_DESCRIPTION = "Descubre este lanzamiento en «Be The Boss», tu calendario de videojuegos.";
  const rawSynopsis = game.overview.trim();
  const description =
    rawSynopsis.length > 0
      ? rawSynopsis.length > 160
        ? `${rawSynopsis.slice(0, 157).trimEnd()}…`
        : rawSynopsis
      : FALLBACK_DESCRIPTION;

  const previewImage = game.coverUrl || game.heroImageUrl;
  const images = previewImage ? [previewImage] : undefined;

  return {
    title,
    openGraph: {
      title,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: PageParams) {
  const { id } = await params;

  const { game } = await getGameSafe(id);
  const today = resolveDemoToday(process.env.DEMO_TODAY);

  if (game === null) {
    return (
      <>
        <Topbar genres={[]} today={today} />
        <main className="font-ui mx-auto flex min-h-screen max-w-[680px] flex-col justify-center gap-5 px-6 py-16">
        <BackToHomeLink />
        <h1 className="font-display text-2xl font-medium text-text">{ui.detail.notFoundTitle}</h1>
        <p className="text-sm text-text-muted">{ui.detail.notFoundHint}</p>
        </main>
      </>
    );
  }

  const monthResults = await Promise.all(
    CATALOG_WINDOW.map((slot) => listGamesSafe(slot.year, slot.month)),
  );
  const catalog = monthResults.flatMap((result) => result.games);
  const related = findConnections(game, catalog);

  const franchiseGameIds = new Set(
    (game.franchise?.items ?? [])
      .map((item) => item.gameId)
      .filter((gameId) => gameId !== ""),
  );
  const franchiseGames = catalog.filter((candidate) => franchiseGameIds.has(candidate.id));

  const dealsResult = await findGameDealsSafe([game.title]);
  const deal = matchDealToTitle(dealsResult.deals, game.title);

  const MAX_EXTRA_VIDEOS = 8;
  const allVideos = (seedVideos as SeedVideos)[game.id] ?? [];
  const extraVideos: GameVideo[] = allVideos
    .filter((video) => video.key !== "" && video.key !== game.trailerYoutubeKey)
    .slice(0, MAX_EXTRA_VIDEOS);

  return (
    <>
      <Topbar genres={collectGenres(catalog)} today={today} />
      {game.heroImageUrl ? (
        <div
          className="td-ambient"
          aria-hidden="true"
          style={{ backgroundImage: `url(${game.heroImageUrl})` }}
        />
      ) : null}

      <main className="td-main font-ui relative z-[1] mx-auto flex min-h-screen max-w-[620px] flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <BackToHomeLink />

        <ReleaseDetail
          release={game}
          related={related}
          upcoming={isUpcoming(game, today)}
          today={today}
          franchiseGames={franchiseGames}
          deal={deal}
          extraVideos={extraVideos}
        />
      </main>
    </>
  );
}

function BackToHomeLink() {
  return (
    <Link
      href="/"
      className="font-mono inline-flex w-fit items-center gap-2 text-xs tracking-[0.08em] text-gold no-underline transition-colors hover:text-gold-bright"
    >
      <span aria-hidden="true">‹</span>
      {ui.detail.back}
    </Link>
  );
}
