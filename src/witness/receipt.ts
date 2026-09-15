import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthMode, CryptoAsset } from "../cmc/types.js";
import type { MarketReceipt } from "./types.js";
import { extractUsd } from "./types.js";

export function buildObserved(asset: CryptoAsset, statusTimestamp?: string) {
  const usd = extractUsd(asset);
  return {
    name: asset.name,
    cmc_id: asset.id,
    cmc_rank: asset.cmc_rank ?? null,
    price_usd: usd.price,
    market_cap_usd: usd.market_cap,
    volume_24h_usd: usd.volume_24h,
    percent_change_1h: usd.percent_change_1h,
    percent_change_24h: usd.percent_change_24h,
    percent_change_7d: usd.percent_change_7d,
    percent_change_30d: usd.percent_change_30d,
    num_market_pairs: asset.num_market_pairs,
    circulating_supply: asset.circulating_supply,
    total_supply: asset.total_supply,
    max_supply: asset.max_supply ?? null,
    last_updated: usd.last_updated ?? asset.last_updated,
    source_status_timestamp: statusTimestamp,
  };
}

export function hashObserved(observed: object): string {
  const canonical = JSON.stringify(observed, Object.keys(observed as object).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

export function createMarketReceipt(
  asset: CryptoAsset,
  authMode: AuthMode,
  statusTimestamp?: string,
): MarketReceipt {
  const observed = buildObserved(asset, statusTimestamp);
  return {
    id: randomUUID(),
    schema: "cmc-witness.market-receipt/v1",
    created_at: new Date().toISOString(),
    symbol: asset.symbol.toUpperCase(),
    auth_mode: authMode,
    observed,
    observed_hash: hashObserved(observed),
  };
}

export async function appendReceiptLog(
  receipt: MarketReceipt,
  logPath = process.env.CMC_WITNESS_RECEIPT_LOG ?? "./receipts/market-receipts.jsonl",
): Promise<string> {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(receipt)}\n`, "utf8");
  return logPath;
}

let latestReceipt: MarketReceipt | null = null;

export function rememberReceipt(receipt: MarketReceipt): void {
  latestReceipt = receipt;
}

export function getLatestReceipt(): MarketReceipt | null {
  return latestReceipt;
}
