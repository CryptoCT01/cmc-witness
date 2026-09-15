import axios, { type AxiosInstance } from "axios";
import { CMC_BASE_URL, KEY_ENDPOINTS } from "./endpoints.js";
import type {
  CmcClient,
  CryptoAsset,
  DexPairQuoteResponse,
  DexSearchResponse,
  ListingsLatestResponse,
  QuotesLatestResponse,
} from "./types.js";

/**
 * Classic CMC Pro API client using X-CMC_PRO_API_KEY.
 * Used as fallback when x402 wallet is not configured.
 */
export class KeyCmcClient implements CmcClient {
  readonly mode = "key" as const;
  private readonly http: AxiosInstance;

  constructor(apiKey: string, baseURL = CMC_BASE_URL) {
    if (!apiKey) throw new Error("CMC_API_KEY is required for key mode");
    this.http = axios.create({
      baseURL,
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": apiKey,
      },
      timeout: 30_000,
    });
  }

  /** v1 returns Record<symbol, asset>; v2 returns Record<symbol, asset[]>. Normalize to v1 shape. */
  private normalizeQuotes(raw: QuotesLatestResponse | { status: QuotesLatestResponse["status"]; data: Record<string, CryptoAsset | CryptoAsset[]> }): QuotesLatestResponse {
    const data: Record<string, CryptoAsset> = {};
    for (const [sym, val] of Object.entries(raw.data ?? {})) {
      if (Array.isArray(val)) {
        if (val[0]) data[sym] = val[0];
      } else if (val && typeof val === "object") {
        data[sym] = val as CryptoAsset;
      }
    }
    return { status: raw.status, data };
  }

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const { data } = await this.http.get(KEY_ENDPOINTS.quotesLatest, {
      params: { symbol: symbol.toUpperCase(), convert: "USD" },
    });
    return this.normalizeQuotes(data);
  }

  async getListingsLatest(limit = 10): Promise<ListingsLatestResponse> {
    const { data } = await this.http.get<ListingsLatestResponse>(KEY_ENDPOINTS.listingsLatest, {
      params: { limit, convert: "USD" },
    });
    return data;
  }

  async dexSearch(keyword: string): Promise<DexSearchResponse> {
    const { data } = await this.http.get<DexSearchResponse>(KEY_ENDPOINTS.dexSearch, {
      params: { q: keyword },
    });
    return data;
  }

  async getDexPairQuotes(params: Record<string, string>): Promise<DexPairQuoteResponse> {
    const { data } = await this.http.get<DexPairQuoteResponse>(
      KEY_ENDPOINTS.dexPairsQuotesLatest,
      { params },
    );
    return data;
  }
}
