/**
 * Pro-smart gate context — Fear & Greed, BTC.D, price-performance, OHLCV volatility.
 * Only attaches fields actually observed from CMC. Never invents metrics.
 */
import axios, { type AxiosInstance } from "axios";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CMC_BASE_URL, MARKET_FLOOR_ENDPOINTS } from "../cmc/endpoints.js";
import type { AuthMode, CryptoAsset } from "../cmc/types.js";
import type { EvidenceEntry } from "./types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface FearGreedCtx {
  value: number;
  classification: string;
  update_time?: string | null;
}

export interface PricePerfCtx {
  all_time_high?: number | null;
  all_time_low?: number | null;
  close?: number | null;
  /** Percent below ATH (positive = drawdown from ATH). */
  ath_drawdown_pct?: number | null;
  percent_change_all_time?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  high_7d?: number | null;
  low_7d?: number | null;
}

export interface OhlcvVolCtx {
  days: number;
  high: number;
  low: number;
  /** (high - low) / mid * 100 */
  range_pct: number;
  closes: number[];
}

export interface CollisionCtx {
  candidates: number;
  canonical_id?: number | null;
  selected_id?: number | null;
  is_non_canonical: boolean;
  note: string;
}

export interface ProContext {
  source: "cmc-pro" | "fixture-mock" | "skipped";
  fear_greed?: FearGreedCtx;
  btc_dominance?: number | null;
  eth_dominance?: number | null;
  price_performance?: PricePerfCtx;
  ohlcv_volatility?: OhlcvVolCtx;
  collision?: CollisionCtx;
}

export interface ProContextBundle {
  pro: ProContext;
  evidence: EvidenceEntry[];
}

function createHttp(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: CMC_BASE_URL,
    headers: {
      Accept: "application/json",
      "X-CMC_PRO_API_KEY": apiKey,
    },
    timeout: 25_000,
  });
}

async function settled<T>(
  label: string,
  promise: Promise<T>,
  errors: Record<string, string>,
): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? err.response?.data?.status?.error_message || err.message
        : err instanceof Error
          ? err.message
          : String(err);
    errors[label] = String(message);
    return null;
  }
}

function parseOhlcvCloses(data: unknown): number[] {
  const quotes = (data as { quotes?: unknown[] } | null)?.quotes;
  if (!Array.isArray(quotes)) return [];
  return quotes
    .map((row) => {
      const r = row as { quote?: { USD?: { close?: number } } };
      const v = r.quote?.USD?.close;
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    })
    .filter((n): n is number => n != null);
}

function buildOhlcvVol(closes: number[]): OhlcvVolCtx | undefined {
  if (closes.length < 2) return undefined;
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const mid = (high + low) / 2 || 1;
  const range_pct = ((high - low) / mid) * 100;
  return {
    days: closes.length,
    high,
    low,
    range_pct,
    closes,
  };
}

function parsePricePerf(asset: Record<string, unknown> | null): PricePerfCtx | undefined {
  if (!asset) return undefined;
  const periods = asset.periods as
    | Record<string, { quote?: { USD?: Record<string, unknown> } }>
    | undefined;
  if (!periods) return undefined;
  const all = periods.all_time?.quote?.USD ?? {};
  const d24 = periods["24h"]?.quote?.USD ?? {};
  const d7 = periods["7d"]?.quote?.USD ?? {};
  const ath = typeof all.high === "number" ? all.high : null;
  const atl = typeof all.low === "number" ? all.low : null;
  const close = typeof all.close === "number" ? all.close : null;
  let ath_drawdown_pct: number | null = null;
  if (ath != null && ath > 0 && close != null) {
    ath_drawdown_pct = ((ath - close) / ath) * 100;
  }
  return {
    all_time_high: ath,
    all_time_low: atl,
    close,
    ath_drawdown_pct,
    percent_change_all_time:
      typeof all.percent_change === "number" ? all.percent_change : null,
    high_24h: typeof d24.high === "number" ? d24.high : null,
    low_24h: typeof d24.low === "number" ? d24.low : null,
    high_7d: typeof d7.high === "number" ? d7.high : null,
    low_7d: typeof d7.low === "number" ? d7.low : null,
  };
}

function pickPerfAsset(
  data: Record<string, unknown> | undefined,
  symbol: string,
  cmcId?: number,
): Record<string, unknown> | null {
  if (!data) return null;
  if (cmcId != null && data[String(cmcId)]) {
    const e = data[String(cmcId)];
    if (e && typeof e === "object" && !Array.isArray(e)) return e as Record<string, unknown>;
    if (Array.isArray(e) && e[0]) return e[0] as Record<string, unknown>;
  }
  const upper = symbol.toUpperCase();
  const entry = data[upper] ?? data[Object.keys(data)[0] ?? ""];
  if (Array.isArray(entry)) return (entry[0] as Record<string, unknown>) ?? null;
  if (entry && typeof entry === "object") return entry as Record<string, unknown>;
  return null;
}

/** Known major ticker → canonical CMC id. Used for collision checks. */
export const CANONICAL_IDS: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  USDT: 825,
  BNB: 1839,
  SOL: 5426,
  XRP: 52,
};

/**
 * Detect ticker collision: asset claims a major ticker but is not the canonical id,
 * or multiple candidates were seen for the same symbol.
 */
export function detectCollision(
  asset: CryptoAsset,
  opts?: { candidates?: number; allIds?: number[] },
): CollisionCtx | undefined {
  const sym = asset.symbol?.toUpperCase();
  if (!sym) return undefined;
  const canonical = CANONICAL_IDS[sym];
  const candidates = opts?.candidates ?? 1;
  const selected_id = asset.id;

  if (canonical != null && selected_id != null && selected_id !== canonical) {
    return {
      candidates: Math.max(candidates, 2),
      canonical_id: canonical,
      selected_id,
      is_non_canonical: true,
      note: `Ticker collision: ${sym} resolved to cmc_id=${selected_id}, canonical is ${canonical}`,
    };
  }

  if (candidates > 1 && canonical != null) {
    const isCanon = selected_id === canonical;
    return {
      candidates,
      canonical_id: canonical,
      selected_id,
      is_non_canonical: !isCanon,
      note: isCanon
        ? `Ticker ${sym}: ${candidates} listings observed — selected canonical id ${canonical}`
        : `Ticker collision: ${candidates} listings for ${sym}; selected non-canonical id ${selected_id}`,
    };
  }

  // Spoofed name claiming Bitcoin/Ethereum without matching id
  const name = (asset.name ?? "").toLowerCase();
  if (
    (sym === "BTC" || /bitcoin/i.test(name)) &&
    canonical === 1 &&
    selected_id != null &&
    selected_id !== 1
  ) {
    return {
      candidates: Math.max(candidates, 2),
      canonical_id: 1,
      selected_id,
      is_non_canonical: true,
      note: `Name/ticker spoof vs canonical Bitcoin (id 1); got id ${selected_id}`,
    };
  }

  return undefined;
}

async function loadFixturePro(symbol: string): Promise<ProContextBundle | null> {
  const sym = symbol.trim().toUpperCase();
  const tryFiles = [
    `pro-context-${sym.toLowerCase()}.json`,
    "pro-context-default.json",
  ];
  for (const name of tryFiles) {
    try {
      const raw = await readFile(join(ROOT, "fixtures", name), "utf8");
      const parsed = JSON.parse(raw) as {
        pro?: ProContext;
        evidence?: EvidenceEntry[];
      };
      if (!parsed.pro) continue;
      return {
        pro: { ...parsed.pro, source: "fixture-mock" },
        evidence: parsed.evidence ?? [],
      };
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Gather Pro context for scoring.
 * - key mode: live Pro endpoints
 * - fixture mode: optional mock fixtures (deterministic) or skip
 * - x402: skip Pro layers cleanly (x402 paths differ; never invent)
 */
export async function gatherProContext(
  mode: AuthMode,
  symbol: string,
  asset: CryptoAsset,
  opts?: { forceSkip?: boolean; collisionCandidates?: number },
): Promise<ProContextBundle> {
  const evidence: EvidenceEntry[] = [];
  const collision = detectCollision(asset, {
    candidates: opts?.collisionCandidates,
  });

  if (opts?.forceSkip || mode === "x402") {
    const pro: ProContext = {
      source: "skipped",
      ...(collision ? { collision } : {}),
    };
    return { pro, evidence };
  }

  if (mode === "fixture") {
    const mock = await loadFixturePro(symbol);
    if (!mock) {
      return {
        pro: { source: "skipped", ...(collision ? { collision } : {}) },
        evidence,
      };
    }
    const pro: ProContext = {
      ...mock.pro,
      source: "fixture-mock",
      ...(collision ? { collision } : {}),
    };
    return { pro, evidence: [...mock.evidence] };
  }

  // key mode — live Pro
  const apiKey = process.env.CMC_API_KEY?.trim();
  if (!apiKey) {
    return {
      pro: { source: "skipped", ...(collision ? { collision } : {}) },
      evidence,
    };
  }

  const http = createHttp(apiKey);
  const errors: Record<string, string> = {};
  const sym = symbol.trim().toUpperCase();

  const [fgRes, globalRes, perfRes, ohlcvRes] = await Promise.all([
    settled(
      "fear_greed",
      http.get(MARKET_FLOOR_ENDPOINTS.fearAndGreed),
      errors,
    ),
    settled(
      "global_metrics",
      http.get(MARKET_FLOOR_ENDPOINTS.globalMetrics),
      errors,
    ),
    settled(
      "price_performance",
      http.get(MARKET_FLOOR_ENDPOINTS.pricePerformance, {
        params: {
          ...(asset.id != null ? { id: asset.id } : { symbol: sym }),
          time_period: "all_time,24h,7d,30d",
        },
      }),
      errors,
    ),
    settled(
      "ohlcv",
      http.get(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical, {
        params: {
          ...(asset.id != null ? { id: asset.id } : { symbol: sym }),
          convert: "USD",
          time_period: "daily",
          count: 14,
        },
      }),
      errors,
    ),
  ]);

  const pro: ProContext = { source: "cmc-pro", ...(collision ? { collision } : {}) };

  if (fgRes) {
    const fgData =
      (fgRes as { data?: { data?: Record<string, unknown> } }).data?.data ??
      (fgRes as { data?: Record<string, unknown> }).data ??
      {};
    const value = fgData.value != null ? Number(fgData.value) : NaN;
    if (Number.isFinite(value)) {
      pro.fear_greed = {
        value,
        classification:
          fgData.value_classification != null
            ? String(fgData.value_classification)
            : value >= 75
              ? "Extreme Greed"
              : value <= 25
                ? "Extreme Fear"
                : "Neutral",
        update_time: fgData.update_time != null ? String(fgData.update_time) : null,
      };
      evidence.push({
        endpoint: MARKET_FLOOR_ENDPOINTS.fearAndGreed,
        credit_count: (fgRes as { data?: { status?: { credit_count?: number } } }).data
          ?.status?.credit_count,
        status_timestamp: (fgRes as { data?: { status?: { timestamp?: string } } }).data
          ?.status?.timestamp,
        used_for: "Fear & Greed regime caution when extreme",
        summary: { ...pro.fear_greed },
      });
    }
  }

  if (globalRes) {
    const gData =
      (globalRes as { data?: { data?: Record<string, unknown> } }).data?.data ??
      (globalRes as { data?: Record<string, unknown> }).data ??
      {};
    const btcD = gData.btc_dominance != null ? Number(gData.btc_dominance) : null;
    const ethD = gData.eth_dominance != null ? Number(gData.eth_dominance) : null;
    if (btcD != null && Number.isFinite(btcD)) pro.btc_dominance = btcD;
    if (ethD != null && Number.isFinite(ethD)) pro.eth_dominance = ethD;
    evidence.push({
      endpoint: MARKET_FLOOR_ENDPOINTS.globalMetrics,
      credit_count: (globalRes as { data?: { status?: { credit_count?: number } } }).data
        ?.status?.credit_count,
      status_timestamp: (globalRes as { data?: { status?: { timestamp?: string } } }).data
        ?.status?.timestamp,
      used_for: "BTC/ETH dominance regime context",
      summary: {
        btc_dominance: pro.btc_dominance ?? null,
        eth_dominance: pro.eth_dominance ?? null,
      },
    });
  }

  if (perfRes) {
    const perfData =
      (perfRes as { data?: { data?: Record<string, unknown> } }).data?.data ??
      (perfRes as { data?: Record<string, unknown> }).data;
    const assetRow = pickPerfAsset(
      perfData as Record<string, unknown> | undefined,
      sym,
      asset.id,
    );
    const perf = parsePricePerf(assetRow);
    if (perf) {
      pro.price_performance = perf;
      evidence.push({
        endpoint: MARKET_FLOOR_ENDPOINTS.pricePerformance,
        credit_count: (perfRes as { data?: { status?: { credit_count?: number } } }).data
          ?.status?.credit_count,
        status_timestamp: (perfRes as { data?: { status?: { timestamp?: string } } }).data
          ?.status?.timestamp,
        used_for: "ATH distance / cycle drawdown from price-performance stats",
        summary: {
          ath: perf.all_time_high,
          atl: perf.all_time_low,
          close: perf.close,
          ath_drawdown_pct: perf.ath_drawdown_pct,
        },
      });
    }
  }

  if (ohlcvRes) {
    const ohlcvBody =
      (ohlcvRes as { data?: { data?: unknown } }).data?.data ??
      (ohlcvRes as { data?: unknown }).data;
    // CMC may nest by id/symbol
    let closes = parseOhlcvCloses(ohlcvBody);
    if (!closes.length && ohlcvBody && typeof ohlcvBody === "object") {
      const first = Object.values(ohlcvBody as Record<string, unknown>)[0];
      closes = parseOhlcvCloses(first);
    }
    const vol = buildOhlcvVol(closes);
    if (vol) {
      pro.ohlcv_volatility = vol;
      evidence.push({
        endpoint: MARKET_FLOOR_ENDPOINTS.ohlcvHistorical,
        credit_count: (ohlcvRes as { data?: { status?: { credit_count?: number } } }).data
          ?.status?.credit_count,
        status_timestamp: (ohlcvRes as { data?: { status?: { timestamp?: string } } }).data
          ?.status?.timestamp,
        used_for: "Recent OHLCV range / volatility (7–14d)",
        summary: {
          days: vol.days,
          high: vol.high,
          low: vol.low,
          range_pct: Math.round(vol.range_pct * 100) / 100,
        },
      });
    }
  }

  if (Object.keys(errors).length) {
    // Soft: still return whatever we got; errors are not invented metrics
    evidence.push({
      endpoint: "(pro-context)",
      used_for: "Pro context call errors (partial)",
      summary: { errors },
    });
  }

  return { pro, evidence };
}

/**
 * Apply Pro context to score/reasons. Mutates score via return value.
 * Explicit reason chips only — never invents.
 */
export function applyProScoring(
  score: number,
  reasons: string[],
  chips: string[],
  pro?: ProContext,
): number {
  if (!pro || pro.source === "skipped") return score;
  let s = score;

  if (pro.fear_greed) {
    const { value, classification } = pro.fear_greed;
    if (value >= 75) {
      s -= 8;
      reasons.push(
        `Fear & Greed ${value} (${classification}) — extreme greed; size with caution`,
      );
      chips.push(`F&G ${value} greed`);
    } else if (value <= 25) {
      s -= 5;
      reasons.push(
        `Fear & Greed ${value} (${classification}) — extreme fear regime`,
      );
      chips.push(`F&G ${value} fear`);
    } else {
      reasons.push(`Fear & Greed ${value} (${classification})`);
      chips.push(`F&G ${value}`);
    }
  }

  if (pro.btc_dominance != null && Number.isFinite(pro.btc_dominance)) {
    const d = pro.btc_dominance;
    if (d >= 55) {
      reasons.push(`BTC dominance ${d.toFixed(1)}% — BTC-led regime`);
      chips.push(`BTC.D ${d.toFixed(1)}%`);
    } else if (d <= 40) {
      reasons.push(`BTC dominance ${d.toFixed(1)}% — alt-heavy regime`);
      chips.push(`BTC.D ${d.toFixed(1)}% alt`);
    } else {
      reasons.push(`BTC dominance ${d.toFixed(1)}%`);
      chips.push(`BTC.D ${d.toFixed(1)}%`);
    }
  }

  if (pro.price_performance?.ath_drawdown_pct != null) {
    const dd = pro.price_performance.ath_drawdown_pct;
    if (dd >= 70) {
      s -= 12;
      reasons.push(
        `ATH drawdown ${dd.toFixed(1)}% — deep cycle drawdown from CMC price-performance`,
      );
      chips.push(`ATH −${dd.toFixed(0)}%`);
    } else if (dd >= 40) {
      s -= 6;
      reasons.push(`ATH drawdown ${dd.toFixed(1)}% (price-performance)`);
      chips.push(`ATH −${dd.toFixed(0)}%`);
    } else if (dd >= 0) {
      reasons.push(`Distance from ATH ${dd.toFixed(1)}% (price-performance)`);
      chips.push(`ATH −${dd.toFixed(0)}%`);
    }
  }

  if (pro.ohlcv_volatility) {
    const { range_pct, days, high, low } = pro.ohlcv_volatility;
    if (range_pct >= 80) {
      s -= 18;
      reasons.push(
        `Extreme ${days}d OHLCV range ${range_pct.toFixed(1)}% ($${low.toLocaleString()}–$${high.toLocaleString()})`,
      );
      chips.push(`${days}d range ${range_pct.toFixed(0)}%`);
    } else if (range_pct >= 40) {
      s -= 10;
      reasons.push(
        `Elevated ${days}d OHLCV range ${range_pct.toFixed(1)}% ($${low.toLocaleString()}–$${high.toLocaleString()})`,
      );
      chips.push(`${days}d range ${range_pct.toFixed(0)}%`);
    } else {
      reasons.push(
        `${days}d OHLCV range ${range_pct.toFixed(1)}% (observed closes)`,
      );
      chips.push(`${days}d range ${range_pct.toFixed(0)}%`);
    }
  }

  if (pro.collision?.is_non_canonical) {
    s -= 55;
    reasons.push(pro.collision.note);
    chips.push("TICKER COLLISION");
  } else if (pro.collision && pro.collision.candidates > 1) {
    reasons.push(pro.collision.note);
    chips.push(`${pro.collision.candidates}× ticker`);
  }

  return s;
}
