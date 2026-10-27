import type { ProfileGame } from "@/lib/profile-catalog";

export type RelationType = "franchise" | "developer" | "publisher" | "genre";

export type ConnectionReason = {
  type: RelationType;
  label: string;
  weight: number;
};

export type Connection = {
  game: ProfileGame;
  weight: number;
  reasons: ConnectionReason[];
};

export type ConnectionIndex = {
  total: number;
  genreFreq: Map<string, number>;
  developerFreq: Map<string, number>;
  publisherFreq: Map<string, number>;
};

const BASE_WEIGHT: Record<RelationType, number> = {
  franchise: 0.9,
  developer: 0.6,
  publisher: 0.35,
  genre: 0.2,
};

function normName(value: string): string {
  return value.trim().toLowerCase();
}

function creditNames(credits: { name: string }[] | undefined): string[] {
  if (!credits) return [];
  return credits.map((credit) => normName(credit.name)).filter((name) => name.length > 0);
}

export function buildConnectionIndex(games: ProfileGame[]): ConnectionIndex {
  const genreFreq = new Map<string, number>();
  const developerFreq = new Map<string, number>();
  const publisherFreq = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const game of games) {
    for (const genre of new Set(game.genres.map(normName))) if (genre) bump(genreFreq, genre);
    for (const dev of new Set(creditNames(game.developers))) bump(developerFreq, dev);
    for (const pub of new Set(creditNames(game.publishers))) bump(publisherFreq, pub);
  }
  return { total: games.length, genreFreq, developerFreq, publisherFreq };
}

function idf(total: number, freq: number): number {
  if (total <= 1) return 1;
  const raw = Math.log(total / (1 + freq)) / Math.log(total);
  return Math.max(0, Math.min(1, raw));
}

function sameFranchise(a: ProfileGame, b: ProfileGame): boolean {
  const an = a.franchise?.name ? normName(a.franchise.name) : "";
  const bn = b.franchise?.name ? normName(b.franchise.name) : "";
  if (an && bn && an === bn) return true;
  if (a.franchise?.items?.some((item) => item.gameId && item.gameId === b.id)) return true;
  if (b.franchise?.items?.some((item) => item.gameId && item.gameId === a.id)) return true;
  return false;
}

export function relatedGames(
  target: ProfileGame,
  games: ProfileGame[],
  index: ConnectionIndex,
  { limit = 12, minWeight = 0.15 }: { limit?: number; minWeight?: number } = {},
): Connection[] {
  const targetGenres = new Set(target.genres.map(normName));
  const targetDevs = new Set(creditNames(target.developers));
  const targetPubs = new Set(creditNames(target.publishers));

  const out: Connection[] = [];
  for (const other of games) {
    if (other.id === target.id) continue;
    const reasons: ConnectionReason[] = [];

    if (sameFranchise(target, other)) {
      reasons.push({
        type: "franchise",
        label: other.franchise?.name || target.franchise?.name || "",
        weight: BASE_WEIGHT.franchise,
      });
    }
    for (const dev of new Set(creditNames(other.developers))) {
      if (targetDevs.has(dev)) {
        reasons.push({
          type: "developer",
          label: dev,
          weight: BASE_WEIGHT.developer * idf(index.total, index.developerFreq.get(dev) ?? 1),
        });
      }
    }
    for (const pub of new Set(creditNames(other.publishers))) {
      if (targetPubs.has(pub)) {
        reasons.push({
          type: "publisher",
          label: pub,
          weight: BASE_WEIGHT.publisher * idf(index.total, index.publisherFreq.get(pub) ?? 1),
        });
      }
    }
    for (const genre of new Set(other.genres.map(normName))) {
      if (genre && targetGenres.has(genre)) {
        reasons.push({
          type: "genre",
          label: genre,
          weight: BASE_WEIGHT.genre * idf(index.total, index.genreFreq.get(genre) ?? 1),
        });
      }
    }

    if (reasons.length === 0) continue;
    const weight = reasons.reduce((sum, reason) => sum + reason.weight, 0);
    if (weight < minWeight) continue;
    out.push({ game: other, weight, reasons });
  }

  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, limit);
}

export type GraphNode = {
  id: string;
  title: string;
  coverUrl: string;
  focus: boolean;
  platform: number;
};

export type GraphLink = {
  source: string;
  target: string;
  weight: number;
  reason: RelationType;
};

export type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

function dominantReason(reasons: ConnectionReason[]): RelationType {
  return reasons.reduce((best, r) => (r.weight > best.weight ? r : best), reasons[0]).type;
}

export function buildGraphData(
  focusGames: ProfileGame[],
  catalog: ProfileGame[],
  index: ConnectionIndex,
  { neighborsPer = 6, minWeight = 0.2 }: { neighborsPer?: number; minWeight?: number } = {},
): GraphData {
  const nodes = new Map<string, GraphNode>();
  const links = new Map<string, GraphLink>();

  const addNode = (game: ProfileGame, focus: boolean) => {
    const existing = nodes.get(game.id);
    if (existing) {
      if (focus) existing.focus = true;
      return;
    }
    nodes.set(game.id, {
      id: game.id,
      title: game.title,
      coverUrl: game.coverUrl,
      focus,
      platform: game.platform as number,
    });
  };

  for (const game of focusGames) addNode(game, true);

  for (const game of focusGames) {
    const related = relatedGames(game, catalog, index, { limit: neighborsPer, minWeight });
    for (const conn of related) {
      addNode(conn.game, false);
      const key = [game.id, conn.game.id].sort().join("__");
      const existing = links.get(key);
      if (!existing || conn.weight > existing.weight) {
        links.set(key, {
          source: game.id,
          target: conn.game.id,
          weight: conn.weight,
          reason: dominantReason(conn.reasons),
        });
      }
    }
  }

  return { nodes: [...nodes.values()], links: [...links.values()] };
}
