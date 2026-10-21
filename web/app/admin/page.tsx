import type { JSX } from "react";

import { CATALOG_WINDOW } from "@/lib/catalog-window";
import { deriveRarity, type Tier } from "@/lib/rarity";
import { listGamesSafe, GameKind, type Game } from "@/lib/connect/catalog";
import { LANE_META, laneKeyFromEnum } from "@/lib/timeline";
import { ui } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const TIER_TOKEN_VAR: Record<Tier, string> = {
  legendary: "var(--color-gold)",
  epic: "var(--color-violet)",
  rare: "var(--color-teal)",
  common: "var(--color-text-muted)",
};

const KIND_LABELS: Record<GameKind, string> = {
  [GameKind.UNSPECIFIED]: ui.admin.kindGame,
  [GameKind.GAME]: ui.admin.kindGame,
  [GameKind.DLC]: ui.admin.kindDlc,
  [GameKind.EXPANSION]: ui.admin.kindExpansion,
};

function formatReleaseDateMx(isoDate: string): string {
  if (!isoDate) {
    return ui.admin.dash;
  }
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return ui.admin.dash;
  }
  return parsed.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function kindLabel(game: Game): string {
  return KIND_LABELS[game.kind] ?? KIND_LABELS[GameKind.UNSPECIFIED];
}

function platformLabel(game: Game): string {
  const key = laneKeyFromEnum(game.platform);
  if (key === null) {
    return ui.admin.dash;
  }
  return LANE_META[key].label;
}

function joinOrDash(values: string[]): string {
  if (values.length === 0) {
    return ui.admin.dash;
  }
  return values.join(", ");
}

function textOrDash(value: string): string {
  if (!value) {
    return ui.admin.dash;
  }
  return value;
}

function sortByReleaseDateAsc(left: Game, right: Game): number {
  if (left.releaseDate < right.releaseDate) {
    return -1;
  }
  if (left.releaseDate > right.releaseDate) {
    return 1;
  }
  return 0;
}

function PhaseBadge(): JSX.Element {
  return (
    <span
      className="font-mono ml-2 inline-flex items-center rounded-sm border px-[6px] py-[2px] text-[9px] tracking-[0.08em] whitespace-nowrap text-gold uppercase align-middle"
      title={ui.admin.phaseBadgeTitle}
      style={{
        background: "var(--color-glass)",
        borderColor: "var(--color-gold-deep)",
      }}
    >
      {ui.admin.phaseBadge}
    </span>
  );
}

const HEADER_CELL_CLASS =
  "font-mono px-4 py-3 text-xs tracking-[0.06em] text-text-muted uppercase whitespace-nowrap";

function HeaderCell({
  label,
  phaseBadge = false,
}: {
  label: string;
  phaseBadge?: boolean;
}): JSX.Element {
  return (
    <th scope="col" className={HEADER_CELL_CLASS}>
      {label}
      {phaseBadge ? <PhaseBadge /> : null}
    </th>
  );
}

function AdminHeader(): JSX.Element {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="font-display text-2xl font-medium text-text sm:text-3xl">{ui.admin.title}</h1>
      <p className="max-w-[680px] text-sm leading-relaxed text-text-muted">{ui.admin.intro}</p>
    </header>
  );
}

function AdminStatePanel({ title, hint }: { title: string; hint: string }): JSX.Element {
  return (
    <div
      role="status"
      className="rounded-base border p-6"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <p className="font-display text-lg text-text">{title}</p>
      <p className="mt-2 text-sm text-text-muted">{hint}</p>
    </div>
  );
}

function CriticCell({ game }: { game: Game }): JSX.Element {
  const score = game.ratings?.critic ?? 0;
  const tier = deriveRarity(score);
  const tierLabel = ui.tiers[tier];
  const tierColor = TIER_TOKEN_VAR[tier];
  const scoreText = score.toFixed(1);

  return (
    <div
      className="flex flex-col gap-[2px]"
      role="img"
      aria-label={ui.admin.criticAria(scoreText, tierLabel)}
    >
      <span className="font-mono whitespace-nowrap text-text">
        <span aria-hidden="true">★</span> {scoreText}
      </span>
      <span
        className="font-mono text-[10px] tracking-[0.06em] uppercase"
        style={{ color: tierColor }}
      >
        {tierLabel}
      </span>
    </div>
  );
}

function AdminTable({ games }: { games: Game[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="region"
        aria-label={ui.admin.scrollRegionLabel}
        tabIndex={0}
        className="overflow-x-auto rounded-base border"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <table className="w-full border-collapse text-sm">
          <caption className="px-4 pt-4 pb-3 text-left text-xs text-text-subtle">
            {ui.admin.tableCaption}
          </caption>

          <thead>
            <tr className="text-left" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <HeaderCell label={ui.admin.columns.title} />
              <HeaderCell label={ui.admin.columns.kind} />
              <HeaderCell label={ui.admin.columns.platform} />
              <HeaderCell label={ui.admin.columns.date} />
              <HeaderCell label={ui.admin.columns.critic} />
              <HeaderCell label={ui.admin.columns.metacritic} />
              <HeaderCell label={ui.admin.columns.opencritic} />
              <HeaderCell label={ui.admin.columns.platforms} />
              <HeaderCell label={ui.admin.columns.subscriptions} phaseBadge />
              <HeaderCell label={ui.admin.columns.dubLanguages} phaseBadge />
              <HeaderCell label={ui.admin.columns.subLanguages} phaseBadge />
              <HeaderCell label={ui.admin.columns.studios} />
            </tr>
          </thead>

          <tbody>
            {games.map((game) => {
              const platforms = game.availability?.platforms ?? [];
              const subscriptionServices = game.availability?.subscriptionServices ?? [];
              const dubLanguages = game.availability?.dubLanguages ?? [];
              const subLanguages = game.availability?.subLanguages ?? [];
              const metacritic = game.ratings?.metacritic ?? "";
              const opencritic = game.ratings?.opencritic ?? "";

              return (
                <tr
                  key={game.id}
                  className="align-top"
                  style={{ borderTop: "1px solid var(--color-border-soft)" }}
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium text-text">
                    {game.title}
                  </th>
                  <td className="px-4 py-3 whitespace-nowrap text-text-muted">{kindLabel(game)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                    {platformLabel(game)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-text-muted">
                    {formatReleaseDateMx(game.releaseDate)}
                  </td>
                  <td className="px-4 py-3">
                    <CriticCell game={game} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-text-muted">
                    {textOrDash(metacritic)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-text-muted">
                    {textOrDash(opencritic)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{joinOrDash(platforms)}</td>
                  <td className="px-4 py-3 text-text-muted">{joinOrDash(subscriptionServices)}</td>
                  <td className="px-4 py-3 text-text-muted">{joinOrDash(dubLanguages)}</td>
                  <td className="px-4 py-3 text-text-muted">{joinOrDash(subLanguages)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-text-muted">
                    <span role="img" aria-label={ui.admin.studiosCountAria(game.developers.length)}>
                      {game.developers.length}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="max-w-[760px] text-xs leading-relaxed text-text-subtle">{ui.admin.legend}</p>
    </div>
  );
}

export default async function AdminPage(): Promise<JSX.Element> {
  const monthResults = await Promise.all(
    CATALOG_WINDOW.map((slot) => listGamesSafe(slot.year, slot.month)),
  );

  const allMonthsFailed = monthResults.every((result) => result.error !== null);

  const games: Game[] = monthResults.flatMap((result) => result.games).sort(sortByReleaseDateAsc);

  return (
    <main className="font-ui mx-auto flex min-h-screen max-w-[1280px] flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
      <AdminHeader />

      {allMonthsFailed ? (
        <AdminStatePanel title={ui.admin.errorTitle} hint={ui.admin.errorHint} />
      ) : games.length === 0 ? (
        <AdminStatePanel title={ui.admin.emptyTitle} hint={ui.admin.emptyHint} />
      ) : (
        <AdminTable games={games} />
      )}
    </main>
  );
}
