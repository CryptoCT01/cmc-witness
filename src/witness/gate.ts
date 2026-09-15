import type { CmcClient } from "../cmc/types.js";
import { createMarketReceipt, appendReceiptLog, rememberReceipt } from "./receipt.js";
import type { Decision, GateResult } from "./types.js";
import { extractUsd } from "./types.js";

export interface BeforeYouTradeOptions {
  /** Persist JSONL receipt (default true). */
  persist?: boolean;
  logPath?: string;
}

/**
 * Core gate: allow | caution | block from observed CMC metrics only.
 * Heuristics are explicit and conservative — no fabricated indicators.
 */
export function evaluateAsset(input: {
  asset: import("../cmc/types.js").CryptoAsset;
  authMode: import("../cmc/types.js").AuthMode;
  statusTimestamp?: string;
}): GateResult {
  const { asset, authMode, statusTimestamp } = input;
  const usd = extractUsd(asset);
  const reasons: string[] = [];
  let score = 100;

  const mcap = usd.market_cap ?? 0;
  const vol = usd.volume_24h ?? 0;
  const ch1h = Math.abs(usd.percent_change_1h ?? 0);
  const ch24 = Math.abs(usd.percent_change_24h ?? 0);
  const ch7d = Math.abs(usd.percent_change_7d ?? 0);
  const pairs = asset.num_market_pairs ?? 0;
  const circ = asset.circulating_supply ?? 0;
  const total = asset.total_supply ?? 0;

  // Liquidity / size
  if (mcap < 50_000) {
    score -= 45;
    reasons.push(`Very low market cap ($${mcap.toLocaleString()}) — illiquid / high rug risk`);
  } else if (mcap < 1_000_000) {
    score -= 25;
    reasons.push(`Low market cap ($${mcap.toLocaleString()})`);
  } else if (mcap < 50_000_000) {
    score -= 10;
    reasons.push(`Mid-small market cap ($${mcap.toLocaleString()})`);
  } else {
    reasons.push(`Adequate market cap ($${Math.round(mcap).toLocaleString()})`);
  }

  if (vol < 25_000) {
    score -= 30;
    reasons.push(`Extremely low 24h volume ($${vol.toLocaleString()})`);
  } else if (vol < 250_000) {
    score -= 15;
    reasons.push(`Low 24h volume ($${vol.toLocaleString()})`);
  } else {
    reasons.push(`Healthy 24h volume ($${Math.round(vol).toLocaleString()})`);
  }

  // Volatility
  if (ch1h >= 20) {
    score -= 25;
    reasons.push(`Extreme 1h move (${usd.percent_change_1h}%)`);
  } else if (ch1h >= 8) {
    score -= 12;
    reasons.push(`Elevated 1h volatility (${usd.percent_change_1h}%)`);
  }

  if (ch24 >= 40) {
    score -= 25;
    reasons.push(`Extreme 24h move (${usd.percent_change_24h}%)`);
  } else if (ch24 >= 15) {
    score -= 10;
    reasons.push(`Elevated 24h volatility (${usd.percent_change_24h}%)`);
  }

  if (ch7d >= 100) {
    score -= 15;
    reasons.push(`Parabolic / crash 7d move (${usd.percent_change_7d}%)`);
  }

  // Market structure
  if (pairs > 0 && pairs < 5) {
    score -= 15;
    reasons.push(`Few market pairs (${pairs})`);
  } else if (pairs >= 50) {
    reasons.push(`Broad venue coverage (${pairs} market pairs)`);
  }

  if (total > 0 && circ > 0) {
    const unlocked = circ / total;
    if (unlocked < 0.05) {
      score -= 20;
      reasons.push(
        `Tiny circulating / total supply ratio (${(unlocked * 100).toFixed(2)}%) — unlock risk`,
      );
    }
  }

  if (asset.cmc_rank != null && asset.cmc_rank > 0 && asset.cmc_rank <= 50) {
    reasons.push(`High CMC rank (#${asset.cmc_rank})`);
    score = Math.min(100, score + 5);
  } else if (asset.cmc_rank != null && asset.cmc_rank > 2000) {
    score -= 10;
    reasons.push(`Low CMC rank (#${asset.cmc_rank})`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let decision: Decision;
  if (score < 40) decision = "block";
  else if (score < 70) decision = "caution";
  else decision = "allow";

  if (decision === "block") {
    reasons.unshift(`Gate decision: BLOCK (score ${score}/100)`);
  } else if (decision === "caution") {
    reasons.unshift(`Gate decision: CAUTION (score ${score}/100)`);
  } else {
    reasons.unshift(`Gate decision: ALLOW (score ${score}/100)`);
  }

  const receipt = createMarketReceipt(asset, authMode, statusTimestamp);
  rememberReceipt(receipt);

  return { decision, score, reasons, receipt };
}

export async function beforeYouTrade(
  client: CmcClient,
  symbol: string,
  opts: BeforeYouTradeOptions = {},
): Promise<GateResult> {
  const quotes = await client.getQuotesLatest(symbol);
  const key = Object.keys(quotes.data)[0];
  if (!key) {
    throw new Error(`No quote data returned for symbol "${symbol}"`);
  }
  const asset = quotes.data[key];
  const result = evaluateAsset({
    asset,
    authMode: client.mode,
    statusTimestamp: quotes.status?.timestamp,
  });

  if (opts.persist !== false) {
    await appendReceiptLog(result.receipt, opts.logPath);
  }

  return result;
}
