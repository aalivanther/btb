import { createClient } from "@connectrpc/connect";
import type { Client } from "@connectrpc/connect";

import { createServerTransport } from "@/lib/connect/transport";
import { ui } from "@/lib/i18n";
import { DealsService, type Deal, type StoreInfo } from "@/gen/btb/games/v1/deals_pb";

export type { Deal, StoreInfo } from "@/gen/btb/games/v1/deals_pb";

type DealsClient = Client<typeof DealsService>;

export function getDealsClient(): DealsClient {
  return createClient(DealsService, createServerTransport());
}

export type ListBestDealsResult = {
  deals: Deal[];
  stores: StoreInfo[];
  error: string | null;
};

function describeError(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}

export type FindGameDealsResult = {
  deals: Deal[];
  error: string | null;
};

export async function findGameDealsSafe(titles: string[]): Promise<FindGameDealsResult> {
  if (titles.length === 0) {
    return { deals: [], error: null };
  }
  try {
    const client = getDealsClient();
    const response = await client.findGameDeals({ titles });
    return { deals: response.deals, error: null };
  } catch (cause) {
    console.error(`findGameDealsSafe failed for [${titles.join(", ")}]: ${describeError(cause)}`);
    return { deals: [], error: ui.errors.loadPrice };
  }
}

export async function listBestDealsSafe(limit: number): Promise<ListBestDealsResult> {
  try {
    const client = getDealsClient();
    const response = await client.listBestDeals({ limit });
    return {
      deals: response.deals,
      stores: response.stores,
      error: null,
    };
  } catch (cause) {
    console.error(`listBestDealsSafe failed (limit=${limit}): ${describeError(cause)}`);
    return {
      deals: [],
      stores: [],
      error: ui.errors.loadDeals,
    };
  }
}
