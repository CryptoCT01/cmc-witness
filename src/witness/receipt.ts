import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthMode, CryptoAsset } from "../cmc/types.js";
import type { EvidenceEntry, MarketReceipt } from "./types.js";
import { extractUsd } from "./types.js";

export function defaultReceiptLogPath(): string {
  return process.env.CMC_WITNESS_RECEIPT_LOG ?? "./receipts/market-receipts.jsonl";
}

export function buildObserved(
  asset: CryptoAsset,
  statusTimestamp?: string,
  extras?: Partial<MarketReceipt["observed"]>,
) {
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
    ...extras,
  };
}

export function hashObserved(observed: object): string {
  const canonical = JSON.stringify(observed, Object.keys(observed as object).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

export function hashReceiptLink(parts: {
  id: string;
  symbol: string;
  observed_hash: string;
  prev_hash: string | null;
  chain_height: number;
}): string {
  const payload = JSON.stringify({
    id: parts.id,
    symbol: parts.symbol,
    observed_hash: parts.observed_hash,
    prev_hash: parts.prev_hash,
    chain_height: parts.chain_height,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export interface ChainTip {
  prev_hash: string | null;
  chain_height: number;
  last?: MarketReceipt;
}

/** Read last JSONL receipt to continue the tamper-evident chain. */
export async function readChainTip(logPath = defaultReceiptLogPath()): Promise<ChainTip> {
  try {
    await access(logPath);
  } catch {
    return { prev_hash: null, chain_height: 0 };
  }
  const raw = await readFile(logPath, "utf8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { prev_hash: null, chain_height: 0 };

  let last: MarketReceipt | undefined;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      last = JSON.parse(lines[i]!) as MarketReceipt;
      break;
    } catch {
      /* skip corrupt trailing line */
    }
  }
  if (!last) return { prev_hash: null, chain_height: 0 };

  const link =
    last.receipt_hash ??
    last.observed_hash ??
    null;
  const height =
    typeof last.chain_height === "number" ? last.chain_height + 1 : lines.length;

  return { prev_hash: link, chain_height: height, last };
}

export function createMarketReceipt(
  asset: CryptoAsset,
  authMode: AuthMode,
  statusTimestamp?: string,
  opts: {
    evidence?: EvidenceEntry[];
    observedExtras?: Partial<MarketReceipt["observed"]>;
    prev_hash?: string | null;
    chain_height?: number;
  } = {},
): MarketReceipt {
  const observed = buildObserved(asset, statusTimestamp, opts.observedExtras);
  const observed_hash = hashObserved(observed);
  const id = randomUUID();
  const prev_hash = opts.prev_hash ?? null;
  const chain_height = opts.chain_height ?? 0;
  const receipt_hash = hashReceiptLink({
    id,
    symbol: asset.symbol.toUpperCase(),
    observed_hash,
    prev_hash,
    chain_height,
  });

  return {
    id,
    schema: "cmc-witness.market-receipt/v2",
    created_at: new Date().toISOString(),
    symbol: asset.symbol.toUpperCase(),
    auth_mode: authMode,
    observed,
    evidence: opts.evidence ?? [],
    observed_hash,
    prev_hash,
    chain_height,
    receipt_hash,
  };
}

export async function appendReceiptLog(
  receipt: MarketReceipt,
  logPath = defaultReceiptLogPath(),
): Promise<string> {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(receipt)}\n`, "utf8");
  return logPath;
}

export interface ChainVerifyResult {
  ok: boolean;
  count: number;
  height_max: number;
  errors: string[];
  receipts: MarketReceipt[];
}

/** Verify prev_hash / chain_height integrity across the JSONL log. */
export async function verifyReceiptChain(
  logPath = defaultReceiptLogPath(),
): Promise<ChainVerifyResult> {
  const errors: string[] = [];
  const receipts: MarketReceipt[] = [];

  try {
    await access(logPath);
  } catch {
    return { ok: true, count: 0, height_max: -1, errors: [], receipts: [] };
  }

  const raw = await readFile(logPath, "utf8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let expectedPrev: string | null = null;
  let expectedHeight = 0;

  for (let i = 0; i < lines.length; i++) {
    let receipt: MarketReceipt;
    try {
      receipt = JSON.parse(lines[i]!) as MarketReceipt;
    } catch {
      errors.push(`line ${i + 1}: invalid JSON`);
      continue;
    }
    receipts.push(receipt);

    const recomputedObserved = hashObserved(receipt.observed);
    if (receipt.observed_hash !== recomputedObserved) {
      errors.push(
        `line ${i + 1} (${receipt.id}): observed_hash mismatch (tamper?)`,
      );
    }

    if (receipt.receipt_hash) {
      const recomputedLink = hashReceiptLink({
        id: receipt.id,
        symbol: receipt.symbol,
        observed_hash: receipt.observed_hash,
        prev_hash: receipt.prev_hash ?? null,
        chain_height: receipt.chain_height ?? 0,
      });
      if (receipt.receipt_hash !== recomputedLink) {
        errors.push(
          `line ${i + 1} (${receipt.id}): receipt_hash mismatch (tamper?)`,
        );
      }
    }

    // Only enforce chain links for v2 receipts that declare chain fields
    if (receipt.schema === "cmc-witness.market-receipt/v2" || receipt.prev_hash !== undefined) {
      if ((receipt.prev_hash ?? null) !== expectedPrev && expectedPrev !== null) {
        // Allow genesis null even if expectedPrev set when mixing legacy; otherwise check
        if (!(receipt.prev_hash == null && i === 0)) {
          errors.push(
            `line ${i + 1} (${receipt.id}): prev_hash expected ${expectedPrev?.slice(0, 12)}… got ${String(receipt.prev_hash).slice(0, 12)}…`,
          );
        }
      }
      // For sequential v2 chains starting after legacy: if prev declares link, verify
      if (i > 0 && receipt.prev_hash != null) {
        const prev = receipts[receipts.length - 2]!;
        const prevLink = prev.receipt_hash ?? prev.observed_hash;
        if (receipt.prev_hash !== prevLink) {
          errors.push(
            `line ${i + 1} (${receipt.id}): broken chain link to previous receipt`,
          );
        }
      }
      if (
        typeof receipt.chain_height === "number" &&
        i > 0 &&
        typeof receipts[receipts.length - 2]?.chain_height === "number" &&
        receipt.chain_height !== (receipts[receipts.length - 2]!.chain_height as number) + 1
      ) {
        // soft: only error if both have heights and they are not sequential
        const prevH = receipts[receipts.length - 2]!.chain_height as number;
        if (receipt.chain_height !== prevH + 1) {
          errors.push(
            `line ${i + 1} (${receipt.id}): chain_height ${receipt.chain_height} != ${prevH + 1}`,
          );
        }
      }
    }

    expectedPrev = receipt.receipt_hash ?? receipt.observed_hash;
    expectedHeight =
      typeof receipt.chain_height === "number" ? receipt.chain_height + 1 : expectedHeight + 1;
  }

  const height_max =
    receipts.length === 0
      ? -1
      : Math.max(...receipts.map((r) => (typeof r.chain_height === "number" ? r.chain_height : -1)));

  return {
    ok: errors.length === 0,
    count: receipts.length,
    height_max,
    errors,
    receipts,
  };
}

let latestReceipt: MarketReceipt | null = null;

export function rememberReceipt(receipt: MarketReceipt): void {
  latestReceipt = receipt;
}

export function getLatestReceipt(): MarketReceipt | null {
  return latestReceipt;
}
