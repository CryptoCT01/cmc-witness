import type { AuthMode, CryptoAsset, UsdQuote } from "../cmc/types.js";

export type Decision = "allow" | "caution" | "block";

/** One CMC endpoint invocation recorded on the receipt — never invented metrics. */
export interface EvidenceEntry {
  /** API path, e.g. /v1/cryptocurrency/quotes/latest */
  endpoint: string;
  /** Credits charged by CMC for this call (when present). */
  credit_count?: number;
  /** status.timestamp from the CMC response. */
  status_timestamp?: string;
  /** How this call informed the gate decision. */
  used_for: string;
  /** Compact observed summary (only fields seen on the wire). */
  summary?: Record<string, unknown>;
}

export type ReceiptSchema =
  | "cmc-witness.market-receipt/v1"
  | "cmc-witness.market-receipt/v2";

export interface MarketReceipt {
  id: string;
  schema: ReceiptSchema;
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
    /** Peer context from listings when dossier ran. */
    peer_rank_context?: {
      listings_count: number;
      nearest_peers?: Array<{ symbol: string; rank: number | null; market_cap_usd?: number }>;
    };
    /** DEX hit count when dex/search was invoked. */
    dex_hits?: number;
  };
  /** Per-endpoint evidence trail (v2 dossier). */
  evidence: EvidenceEntry[];
  /** Opaque hash of observed payload for integrity checks. */
  observed_hash: string;
  /**
   * Links to previous receipt's `receipt_hash` (or observed_hash for legacy).
   * null for genesis (chain_height 0).
   */
  prev_hash: string | null;
  /** Monotonic height in the local JSONL receipt chain. */
  chain_height: number;
  /** Hash of chain-critical receipt fields (id, observed_hash, prev_hash, chain_height, symbol). */
  receipt_hash: string;
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
  evidence?: EvidenceEntry[];
  observedExtras?: Partial<MarketReceipt["observed"]>;
  chain?: { prev_hash: string | null; chain_height: number };
}

export function extractUsd(asset: CryptoAsset): UsdQuote {
  return asset.quote.USD;
}
