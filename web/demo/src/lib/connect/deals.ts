import type { Deal, StoreInfo } from "@/gen/btb/games/v1/deals_pb";
export type { Deal, StoreInfo } from "@/gen/btb/games/v1/deals_pb";
export async function findGameDealsSafe(_titles: string[]): Promise<{ deals: Deal[]; error: null }> {
  void _titles;
  return { deals: [], error: null };
}
export async function listBestDealsSafe(_limit: number): Promise<{ deals: Deal[]; stores: StoreInfo[]; error: null }> {
  void _limit;
  return { deals: [], stores: [], error: null };
}
