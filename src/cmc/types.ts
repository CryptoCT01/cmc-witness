/** Shared CMC response / quote shapes. Never invent fields — only map observed API data. */

export type AuthMode = "x402" | "key" | "fixture";

export interface CmcStatus {
  timestamp: string;
  error_code: number;
  error_message: string | null;
  elapsed: number;
  credit_count: number;
}

export interface UsdQuote {
  price: number;
  volume_24h: number;
  volume_change_24h?: number;
  percent_change_1h?: number;
  percent_change_24h?: number;
  percent_change_7d?: number;
  percent_change_30d?: number;
  market_cap: number;
  market_cap_dominance?: number;
  fully_diluted_market_cap?: number;
  last_updated?: string;
}

export interface CryptoAsset {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank?: number | null;
  num_market_pairs?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number | null;
  last_updated?: string;
  quote: {
    USD: UsdQuote;
  };
}

export interface QuotesLatestResponse {
  status: CmcStatus;
  data: Record<string, CryptoAsset>;
}

export interface ListingsLatestResponse {
  status: CmcStatus;
  data: CryptoAsset[];
}

export interface DexSearchToken {
  name: string;
  symbol: string;
  address?: string;
  network?: string;
  price_usd?: number;
  liquidity_usd?: number;
  volume_24h_usd?: number;
}

export interface DexSearchResponse {
  status: CmcStatus;
  data: {
    tokens?: DexSearchToken[];
    [key: string]: unknown;
  };
}

export interface DexPairQuoteResponse {
  status: CmcStatus;
  data: unknown;
}

export interface CmcClient {
  readonly mode: AuthMode;
  getQuotesLatest(symbol: string): Promise<QuotesLatestResponse>;
  getListingsLatest(limit?: number): Promise<ListingsLatestResponse>;
  dexSearch(keyword: string): Promise<DexSearchResponse>;
  getDexPairQuotes(params: Record<string, string>): Promise<DexPairQuoteResponse>;
}
