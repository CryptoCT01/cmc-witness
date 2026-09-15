import type { AuthMode, CryptoAsset, UsdQuote } from "../cmc/types.js";

export type Decision = "allow" | "caution" | "block";

export interface MarketReceipt {
  id: string;
  schema: "cmc-witness.market-receipt/v1";
  created_at: string;
  symbol: string;
  auth_mode: AuthMode;
  /** Only fields observed from CMC — never invented. */
  observed: {
    name?: string;
    cmc_id?: number;
    cmc_rank?: number | null;
    price_usd?: number;
    market_cap_usd?: number;
    volume_24h_usd?: number;
    percent_change_1h?: number;
    percent_change_24h?: number;
    percent_change_7d?: number;
    percent_change_30d?: number;
    num_market_pairs?: number;
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number | null;
    last_updated?: string;
    source_status_timestamp?: string;
  };
  /** Opaque hash of observed payload for integrity checks. */
  observed_hash: string;
}

export interface GateResult {
  decision: Decision;
  /** 0–100; higher = healthier / safer to trade. */
  score: number;
  reasons: string[];
  receipt: MarketReceipt;
}

export interface GateInput {
  asset: CryptoAsset;
  authMode: AuthMode;
  statusTimestamp?: string;
}

export function extractUsd(asset: CryptoAsset): UsdQuote {
  return asset.quote.USD;
}
