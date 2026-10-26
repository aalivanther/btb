import type { Metadata } from "next";

import { Topbar } from "@/components/Topbar";
import { ProfileView } from "@/components/perfil/ProfileView";
import { CATALOG_WINDOW } from "@/lib/catalog-window";
import { collectGenres, resolveDemoToday } from "@/lib/timeline";
import { listGamesSafe, type Game } from "@/lib/connect/catalog";
import { toProfileGame } from "@/lib/profile-catalog";
import { ui } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${ui.perfil.pageTitle} · ${ui.brand.full}`,
};

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const monthResults = await Promise.all(
    CATALOG_WINDOW.map((slot) => listGamesSafe(slot.year, slot.month)),
  );
  const catalog: Game[] = monthResults.flatMap((result) => result.games);

  const today = resolveDemoToday(process.env.DEMO_TODAY);

  const availableGenres = collectGenres(catalog);

  return (
    <>
      <Topbar genres={availableGenres} today={today} />
      <main className="pp-main font-ui">
        <ProfileView catalog={catalog.map(toProfileGame)} today={today} genres={availableGenres} />
      </main>
    </>
  );
}
