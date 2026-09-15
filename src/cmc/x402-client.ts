import axios, { type AxiosInstance } from "axios";
import { wrapAxiosWithPaymentFromConfig } from "@x402/axios";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { CMC_BASE_URL, ENDPOINTS } from "./endpoints.js";
import type {
  CmcClient,
  DexPairQuoteResponse,
  DexSearchResponse,
  ListingsLatestResponse,
  QuotesLatestResponse,
} from "./types.js";

export interface X402ClientOptions {
  /** EVM private key (0x…) for USDC payments on Base. */
  privateKey: `0x${string}`;
  baseURL?: string;
  /** CAIP-2 network id. Base mainnet = eip155:8453 */
  network?: `${string}:${string}`;
}

/**
 * Pay-per-request CMC client via x402 (~$0.01 USDC on Base per call).
 * No CMC API key required for this path.
 *
 * Uses @x402/axios wrapAxiosWithPaymentFromConfig + ExactEvmScheme (v2 SDK).
 * Note: CMC docs sometimes show createX402AxiosClient / toClientEvmSigner —
 * those aliases are not always exported; this matches the published @x402/axios API.
 */
export class X402CmcClient implements CmcClient {
  readonly mode = "x402" as const;
  private readonly http: AxiosInstance;

  constructor(opts: X402ClientOptions) {
    const account = privateKeyToAccount(opts.privateKey);
    const network: `${string}:${string}` = opts.network ?? "eip155:8453";

    this.http = wrapAxiosWithPaymentFromConfig(
      axios.create({
        baseURL: opts.baseURL ?? CMC_BASE_URL,
        headers: { Accept: "application/json" },
        timeout: 60_000,
      }),
      {
        schemes: [
          {
            network,
            client: new ExactEvmScheme(account),
          },
        ],
      },
    );
  }

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const { data } = await this.http.get<QuotesLatestResponse>(ENDPOINTS.quotesLatest, {
      params: { symbol: symbol.toUpperCase() },
    });
    return data;
  }

  async getListingsLatest(limit = 10): Promise<ListingsLatestResponse> {
    const { data } = await this.http.get<ListingsLatestResponse>(ENDPOINTS.listingsLatest, {
      params: { limit },
    });
    return data;
  }

  async dexSearch(keyword: string): Promise<DexSearchResponse> {
    const { data } = await this.http.get<DexSearchResponse>(ENDPOINTS.dexSearch, {
      params: { q: keyword },
    });
    return data;
  }

  async getDexPairQuotes(params: Record<string, string>): Promise<DexPairQuoteResponse> {
    const { data } = await this.http.get<DexPairQuoteResponse>(ENDPOINTS.dexPairsQuotesLatest, {
      params,
    });
    return data;
  }
}
