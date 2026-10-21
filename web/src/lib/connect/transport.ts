import { createConnectTransport } from "@connectrpc/connect-web";
import type { Transport } from "@connectrpc/connect";

const DEFAULT_SERVER_API_BASE_URL = "http://localhost:8080";

const SERVER_RPC_TIMEOUT_MS = 5000;

export function createServerTransport(): Transport {
  const baseUrl = process.env.API_BASE_URL ?? DEFAULT_SERVER_API_BASE_URL;

  return createConnectTransport({
    baseUrl,
    fetch: (input, init) => {
      const timeoutSignal = AbortSignal.timeout(SERVER_RPC_TIMEOUT_MS);
      const signal =
        init?.signal instanceof AbortSignal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
      return fetch(input, { ...init, signal });
    },
  });
}
