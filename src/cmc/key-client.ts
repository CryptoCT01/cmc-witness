import axios, { type AxiosInstance } from "axios";
import { CMC_BASE_URL, KEY_ENDPOINTS } from "./endpoints.js";
import type {
  CmcClient,
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

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const { data } = await this.http.get<QuotesLatestResponse>(KEY_ENDPOINTS.quotesLatest, {
      params: { symbol: symbol.toUpperCase(), convert: "USD" },
    });
    return data;
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
