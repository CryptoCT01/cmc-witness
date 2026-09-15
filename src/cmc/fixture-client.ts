import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CmcClient,
  DexPairQuoteResponse,
  DexSearchResponse,
  ListingsLatestResponse,
  QuotesLatestResponse,
} from "./types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadJson<T>(name: string): Promise<T> {
  const raw = await readFile(join(ROOT, "fixtures", name), "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Offline client for demos/tests. Serves known fixtures only — never fabricates metrics.
 */
export class FixtureCmcClient implements CmcClient {
  readonly mode = "fixture" as const;

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const sym = symbol.trim().toUpperCase();
    if (sym === "BTC") return loadJson("btc-quote.json");
    if (sym === "ETH") return loadJson("eth-quote.json");
    if (sym === "RUG") return loadJson("scammy-quote.json");
    throw new Error(
      `Fixture mode has no quote for "${sym}". Available: BTC, ETH, RUG. ` +
        `Set CMC_WITNESS_MODE=x402|key or provide live credentials.`,
    );
  }

  async getListingsLatest(_limit = 10): Promise<ListingsLatestResponse> {
    return loadJson("listings-latest.json");
  }

  async dexSearch(_keyword: string): Promise<DexSearchResponse> {
    return loadJson("dex-search.json");
  }

  async getDexPairQuotes(_params: Record<string, string>): Promise<DexPairQuoteResponse> {
    return {
      status: {
        timestamp: new Date().toISOString(),
        error_code: 0,
        error_message: null,
        elapsed: 0,
        credit_count: 0,
      },
      data: { note: "No dex pair fixture; use live x402/key mode for pair quotes." },
    };
  }
}
