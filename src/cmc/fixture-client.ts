import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CmcClient,
  CryptoAsset,
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

function quoteFromListing(asset: CryptoAsset): QuotesLatestResponse {
  return {
    status: {
      timestamp: "2026-09-15T07:00:00.000Z",
      error_code: 0,
      error_message: null,
      elapsed: 5,
      credit_count: 1,
    },
    data: { [asset.symbol.toUpperCase()]: asset },
  };
}

/**
 * Offline client for demos/tests. Serves known fixtures only — never fabricates metrics.
 * Listing-tail symbols (DUST, TAIL, …) reuse the listings fixture rows as quotes.
 */
export class FixtureCmcClient implements CmcClient {
  readonly mode = "fixture" as const;

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const sym = symbol.trim().toUpperCase();
    if (sym === "BTC") return loadJson("btc-quote.json");
    if (sym === "ETH") return loadJson("eth-quote.json");
    if (sym === "RUG") return loadJson("scammy-quote.json");
    if (sym === "FAKEBTC" || sym === "BTCJUNK") return loadJson("fake-btc-quote.json");

    // Contract-looking addresses → treat as unknown/scammy for offline demos
    if (/^0X[A-F0-9]{8,}$/.test(sym)) {
      const rug = await loadJson<QuotesLatestResponse>("scammy-quote.json");
      const asset = rug.data.RUG!;
      return {
        ...rug,
        data: {
          [sym]: {
            ...asset,
            symbol: sym.slice(0, 8),
            name: "Unknown Contract Token",
            slug: "unknown-contract",
          },
        },
      };
    }

    const listings = await loadJson<ListingsLatestResponse>("listings-latest.json");
    const hit = listings.data.find((a) => a.symbol.toUpperCase() === sym);
    if (hit) return quoteFromListing(hit);

    throw new Error(
      `Fixture mode has no quote for "${sym}". Available: BTC, ETH, RUG, FAKEBTC, + listings symbols. ` +
        `Set CMC_WITNESS_MODE=x402|key or provide live credentials.`,
    );
  }

  async getListingsLatest(_limit = 10): Promise<ListingsLatestResponse> {
    return loadJson("listings-latest.json");
  }

  async dexSearch(keyword: string): Promise<DexSearchResponse> {
    const kw = keyword.trim().toLowerCase();
    // RUG / dust / contracts get empty-ish or scam-oriented dex fixture flavor
    if (kw === "rug" || kw === "fakebtc" || kw === "btcjunk" || kw.startsWith("0x") || kw === "dust" || kw === "tail") {
      const base = await loadJson<DexSearchResponse>("dex-search.json");
      return {
        ...base,
        data: {
          tokens:
            kw === "rug" || kw === "fakebtc" || kw === "btcjunk" || kw.startsWith("0x")
              ? []
              : [
                  {
                    name: "Dust Pair",
                    symbol: "DUST",
                    address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                    network: "bsc",
                    price_usd: 0.00042,
                    liquidity_usd: 1200,
                    volume_24h_usd: 800,
                  },
                ],
        },
      };
    }
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
