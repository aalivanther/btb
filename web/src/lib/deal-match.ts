import type { Deal } from "@/gen/btb/games/v1/deals_pb";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === "" || nb === "") {
    return false;
  }
  return na.includes(nb) || nb.includes(na);
}

export function matchDealToTitle(deals: Deal[], title: string): Deal | undefined {
  return deals.find((deal) => titlesMatch(deal.title, title));
}
