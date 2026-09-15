import type { CmcClient } from "../cmc/types.js";
import {
  createMarketReceipt,
  appendReceiptLog,
  rememberReceipt,
  readChainTip,
  defaultReceiptLogPath,
} from "./receipt.js";
import type { Decision, EvidenceEntry, GateResult, MarketReceipt } from "./types.js";
import { extractUsd } from "./types.js";
import { applyProScoring, type ProContext } from "./pro-context.js";

export interface BeforeYouTradeOptions {
  /** Persist JSONL receipt (default true). */
  persist?: boolean;
  logPath?: string;
  /**
   * Multi-endpoint Market Dossier (quotes + listings + conditional dex + Pro).
   * Default true — Court of Markets enhancement.
   */
  dossier?: boolean;
  forceDex?: boolean;
}

/**
 * Core gate: allow | caution | block from observed CMC metrics only.
 * Heuristics are explicit and conservative — no fabricated indicators.
 */
export function evaluateAsset(input: {
  asset: import("../cmc/types.js").CryptoAsset;
  authMode: import("../cmc/types.js").AuthMode;
  statusTimestamp?: string;
  evidence?: EvidenceEntry[];
  observedExtras?: Partial<MarketReceipt["observed"]>;
  chain?: { prev_hash: string | null; chain_height: number };
  pro?: ProContext;
}): GateResult {
  const { asset, authMode, statusTimestamp } = input;
  const usd = extractUsd(asset);
  const reasons: string[] = [];
  const chips: string[] = [];
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
    chips.push("low mcap");
  } else if (mcap < 1_000_000) {
    score -= 25;
    reasons.push(`Low market cap ($${mcap.toLocaleString()})`);
    chips.push("thin mcap");
  } else if (mcap < 50_000_000) {
    score -= 10;
    reasons.push(`Mid-small market cap ($${mcap.toLocaleString()})`);
  } else {
    reasons.push(`Adequate market cap ($${Math.round(mcap).toLocaleString()})`);
  }

  if (vol < 25_000) {
    score -= 30;
    reasons.push(`Extremely low 24h volume ($${vol.toLocaleString()})`);
    chips.push("low vol");
  } else if (vol < 250_000) {
    score -= 15;
    reasons.push(`Low 24h volume ($${vol.toLocaleString()})`);
    chips.push("thin vol");
  } else {
    reasons.push(`Healthy 24h volume ($${Math.round(vol).toLocaleString()})`);
  }

  // Volatility
  if (ch1h >= 20) {
    score -= 25;
    reasons.push(`Extreme 1h move (${usd.percent_change_1h}%)`);
    chips.push("1h spike");
  } else if (ch1h >= 8) {
    score -= 12;
    reasons.push(`Elevated 1h volatility (${usd.percent_change_1h}%)`);
  }

  if (ch24 >= 40) {
    score -= 25;
    reasons.push(`Extreme 24h move (${usd.percent_change_24h}%)`);
    chips.push("24h spike");
  } else if (ch24 >= 15) {
    score -= 10;
    reasons.push(`Elevated 24h volatility (${usd.percent_change_24h}%)`);
  }

  if (ch7d >= 100) {
    score -= 15;
    reasons.push(`Parabolic / crash 7d move (${usd.percent_change_7d}%)`);
    chips.push("7d parabolic");
  }

  // Market structure
  if (pairs > 0 && pairs < 5) {
    score -= 15;
    reasons.push(`Few market pairs (${pairs})`);
    chips.push(`${pairs} pairs`);
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
      chips.push("unlock risk");
    }
  }

  if (asset.cmc_rank != null && asset.cmc_rank > 0 && asset.cmc_rank <= 50) {
    reasons.push(`High CMC rank (#${asset.cmc_rank})`);
    score = Math.min(100, score + 5);
  } else if (asset.cmc_rank != null && asset.cmc_rank > 2000) {
    score -= 10;
    reasons.push(`Low CMC rank (#${asset.cmc_rank})`);
    chips.push(`rank #${asset.cmc_rank}`);
  }

  // DEX dossier signal (only when observed)
  if (input.observedExtras?.dex_hits === 0) {
    score -= 5;
    reasons.push("No DEX search hits observed for this symbol");
    chips.push("0 DEX hits");
  }

  // Pro-smart layers (only when gathered — never invent)
  score = applyProScoring(score, reasons, chips, input.pro);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let decision: Decision;
  if (score < 40) decision = "block";
  else if (score < 70) decision = "caution";
  else decision = "allow";

  // Hard block on confirmed ticker collision regardless of residual score
  if (input.pro?.collision?.is_non_canonical) {
    decision = "block";
    score = Math.min(score, 25);
  }

  if (decision === "block") {
    reasons.unshift(`Gate decision: BLOCK (score ${score}/100) — do not touch`);
  } else if (decision === "caution") {
    reasons.unshift(`Gate decision: CAUTION (score ${score}/100) — proceed carefully`);
  } else {
    reasons.unshift(
      `Gate decision: ALLOW (score ${score}/100) — okay to touch, NOT a long/short signal`,
    );
  }

  const receipt = createMarketReceipt(asset, authMode, statusTimestamp, {
    evidence: input.evidence ?? [
      {
        endpoint: "(single-quote)",
        status_timestamp: statusTimestamp,
        used_for: "legacy single-endpoint quote path",
        summary: { symbol: asset.symbol },
      },
    ],
    observedExtras: input.observedExtras,
    prev_hash: input.chain?.prev_hash ?? null,
    chain_height: input.chain?.chain_height ?? 0,
  });
  rememberReceipt(receipt);

  return { decision, score, reasons, reason_chips: chips, receipt };
}

/**
 * Core agent tool. By default runs the multi-endpoint Market Dossier
 * (quotes + listings + conditional dex + Pro) and appends a chained v2 receipt.
 */
export async function beforeYouTrade(
  client: CmcClient,
  symbol: string,
  opts: BeforeYouTradeOptions = {},
): Promise<GateResult> {
  const useDossier = opts.dossier !== false;
  if (useDossier) {
    const { investigate } = await import("./dossier.js");
    return investigate(client, symbol, {
      persist: opts.persist,
      logPath: opts.logPath,
      forceDex: opts.forceDex,
    });
  }

  // Legacy single-endpoint path (still available for tests / debugging)
  const quotes = await client.getQuotesLatest(symbol);
  const key = Object.keys(quotes.data)[0];
  if (!key) {
    throw new Error(`No quote data returned for symbol "${symbol}"`);
  }
  const asset = quotes.data[key]!;
  const logPath = opts.logPath ?? defaultReceiptLogPath();
  const tip =
    opts.persist === false ? { prev_hash: null as string | null, chain_height: 0 } : await readChainTip(logPath);

  const result = evaluateAsset({
    asset,
    authMode: client.mode,
    statusTimestamp: quotes.status?.timestamp,
    evidence: [
      {
        endpoint:
          client.mode === "x402"
            ? "/x402/v3/cryptocurrency/quotes/latest"
            : "/v1/cryptocurrency/quotes/latest",
        credit_count: quotes.status?.credit_count,
        status_timestamp: quotes.status?.timestamp,
        used_for: "primary quote (dossier disabled)",
        summary: {
          symbol: asset.symbol,
          price_usd: asset.quote.USD.price,
          market_cap_usd: asset.quote.USD.market_cap,
        },
      },
    ],
    chain: tip,
  });

  if (opts.persist !== false) {
    await appendReceiptLog(result.receipt, logPath);
  }

  return result;
}
