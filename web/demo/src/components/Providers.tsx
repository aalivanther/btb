"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransportProvider } from "@connectrpc/connect-query";
import { createRouterTransport } from "@connectrpc/connect";
import { DealsService } from "@/gen/btb/games/v1/deals_pb";
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [transport] = useState(() => createRouterTransport(({ service }) => {
    service(DealsService, {
      findGameDeals: () => ({ deals: [] }),
      listBestDeals: () => ({ deals: [], stores: [] }),
    });
  }));
  return <TransportProvider transport={transport}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></TransportProvider>;
}
