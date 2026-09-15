/**
 * CMC Pro market-floor aggregator for the Judge Console terminal.
 * Parallel Pro calls + short in-memory cache to conserve credits.
 */
import axios, { type AxiosInstance } from "axios";
import { config as loadEnv } from "dotenv";
import { CMC_BASE_URL, KEY_ENDPOINTS, MARKET_FLOOR_ENDPOINTS } from "./endpoints.js";

loadEnv();

const CACHE_TTL_MS = 55_000;

export interface MarketFloorCoin {
  id?: number;
  name: string;
  symbol: string;
  slug?: string;
  cmc_rank?: number | null;
  price_usd?: number | null;
  percent_change_24h?: number | null;
  percent_change_1h?: number | null;
  volume_24h?: number | null;
  market_cap?: number | null;
}

export interface MarketFloorCategory {
  id: string;
  name: string;
  title?: string;
  num_tokens?: number;
  market_cap?: number | null;
  market_cap_change?: number | null;
  volume?: number | null;
  volume_change?: number | null;
  avg_price_change?: number | null;
}

export interface MarketFloorPayload {
  mock: boolean;
  source: "cmc-pro" | "mock";
  fetched_at: string;
  cache_ttl_ms: number;
  endpoints_used: string[];
  global: {
    total_market_cap: number | null;
    total_volume_24h: number | null;
    btc_dominance: number | null;
    eth_dominance: number | null;
    active_cryptocurrencies: number | null;
  };
  fear_greed: {
    value: number | null;
    classification: string | null;
    update_time: string | null;
  };
  altcoin_season: {
    index: number | null;
    marketcap: number | null;
    snapshot_time: string | null;
    yearly_high: number | null;
    yearly_low: number | null;
  };
  gainers: MarketFloorCoin[];
  losers: MarketFloorCoin[];
  trending: MarketFloorCoin[];
  most_visited: MarketFloorCoin[];
  new_listings: MarketFloorCoin[];
  categories: MarketFloorCategory[];
  errors?: Record<string, string>;
}

export interface PricePerformanceSlice {
  period: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  percent_change?: number | null;
  price_change?: number | null;
}

export interface CheckEnrichment {
  price_performance: PricePerformanceSlice[] | null;
  ohlcv_spark: number[] | null;
  enrichment_source: "cmc-pro" | "unavailable";
  enrichment_errors?: Record<string, string>;
}

type CacheEntry<T> = { at: number; value: T };

let floorCache: CacheEntry<MarketFloorPayload> | null = null;
const enrichCache = new Map<string, CacheEntry<CheckEnrichment>>();

function getApiKey(): string | undefined {
  const k = process.env.CMC_API_KEY?.trim();
  return k || undefined;
}

function createHttp(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: CMC_BASE_URL,
    headers: {
      Accept: "application/json",
      "X-CMC_PRO_API_KEY": apiKey,
    },
    timeout: 30_000,
  });
}

function coinFromRaw(raw: Record<string, unknown> | null | undefined): MarketFloorCoin | null {
  if (!raw || typeof raw !== "object") return null;
  const quote = (raw.quote as { USD?: Record<string, number> } | undefined)?.USD;
  const symbol = String(raw.symbol ?? "");
  const name = String(raw.name ?? symbol);
  if (!symbol && !name) return null;
  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    name,
    symbol,
    slug: raw.slug != null ? String(raw.slug) : undefined,
    cmc_rank: (raw.cmc_rank as number | null | undefined) ?? null,
    price_usd: quote?.price ?? null,
    percent_change_24h: quote?.percent_change_24h ?? null,
    percent_change_1h: quote?.percent_change_1h ?? null,
    volume_24h: quote?.volume_24h ?? null,
    market_cap: quote?.market_cap ?? null,
  };
}

function mapCoins(list: unknown, limit = 8): MarketFloorCoin[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => coinFromRaw(item as Record<string, unknown>))
    .filter((c): c is MarketFloorCoin => Boolean(c))
    .slice(0, limit);
}

function parseGainersLosers(data: unknown): { gainers: MarketFloorCoin[]; losers: MarketFloorCoin[] } {
  if (Array.isArray(data)) {
    const coins = mapCoins(data, 8);
    return { gainers: coins, losers: [] };
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    return {
      gainers: mapCoins(obj.gainers ?? obj.top_gainers, 8),
      losers: mapCoins(obj.losers ?? obj.top_losers, 8),
    };
  }
  return { gainers: [], losers: [] };
}

function mockFloor(): MarketFloorPayload {
  return {
    mock: true,
    source: "mock",
    fetched_at: new Date().toISOString(),
    cache_ttl_ms: CACHE_TTL_MS,
    endpoints_used: ["MOCK"],
    global: {
      total_market_cap: 2.5e12,
      total_volume_24h: 9.1e10,
      btc_dominance: 54.2,
      eth_dominance: 12.8,
      active_cryptocurrencies: 12000,
    },
    fear_greed: { value: 55, classification: "Neutral", update_time: null },
    altcoin_season: {
      index: 42,
      marketcap: 1.1e12,
      snapshot_time: null,
      yearly_high: 78,
      yearly_low: 14,
    },
    gainers: [
      { name: "Mock Gainer", symbol: "MOCKG", percent_change_24h: 42.5, price_usd: 1.23 },
      { name: "Mock Alpha", symbol: "MOCKA", percent_change_24h: 18.2, price_usd: 0.45 },
    ],
    losers: [
      { name: "Mock Loser", symbol: "MOCKL", percent_change_24h: -22.1, price_usd: 0.08 },
      { name: "Mock Drag", symbol: "MOCKD", percent_change_24h: -11.4, price_usd: 2.1 },
    ],
    trending: [{ name: "Mock Trend", symbol: "MOCKT", percent_change_24h: 5.1, price_usd: 10 }],
    most_visited: [{ name: "Bitcoin", symbol: "BTC", percent_change_24h: 1.2, price_usd: 65000 }],
    new_listings: [{ name: "Mock New", symbol: "MOCKN", percent_change_24h: 8.0, price_usd: 0.01 }],
    categories: [
      {
        id: "mock-defi",
        name: "DeFi",
        title: "DeFi",
        market_cap_change: 2.4,
        avg_price_change: 1.8,
        num_tokens: 120,
      },
    ],
  };
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

async function fetchLiveFloor(apiKey: string): Promise<MarketFloorPayload> {
  const http = createHttp(apiKey);
  const errors: Record<string, string> = {};
  const endpoints_used: string[] = [];

  const [
    globalRes,
    fgRes,
    altRes,
    glRes,
    trendRes,
    visitRes,
    newRes,
    catRes,
    losersRes,
  ] = await Promise.all([
    settled(
      "global",
      http.get(MARKET_FLOOR_ENDPOINTS.globalMetrics).then((r) => {
        endpoints_used.push(MARKET_FLOOR_ENDPOINTS.globalMetrics);
        return r.data;
      }),
      errors,
    ),
    settled(
      "fear_greed",
      http.get(MARKET_FLOOR_ENDPOINTS.fearAndGreed).then((r) => {
        endpoints_used.push(MARKET_FLOOR_ENDPOINTS.fearAndGreed);
        return r.data;
      }),
      errors,
    ),
    settled(
      "altcoin_season",
      http.get(MARKET_FLOOR_ENDPOINTS.altcoinSeason).then((r) => {
        endpoints_used.push(MARKET_FLOOR_ENDPOINTS.altcoinSeason);
        return r.data;
      }),
      errors,
    ),
    settled(
      "gainers_losers",
      http
        .get(MARKET_FLOOR_ENDPOINTS.gainersLosers, {
          params: { limit: 8, time_period: "24h", convert: "USD" },
        })
        .then((r) => {
          endpoints_used.push(MARKET_FLOOR_ENDPOINTS.gainersLosers);
          return r.data;
        }),
      errors,
    ),
    settled(
      "trending",
      http
        .get(MARKET_FLOOR_ENDPOINTS.trendingLatest, { params: { limit: 8 } })
        .then((r) => {
          endpoints_used.push(MARKET_FLOOR_ENDPOINTS.trendingLatest);
          return r.data;
        }),
      errors,
    ),
    settled(
      "most_visited",
      http
        .get(MARKET_FLOOR_ENDPOINTS.mostVisited, { params: { limit: 8 } })
        .then((r) => {
          endpoints_used.push(MARKET_FLOOR_ENDPOINTS.mostVisited);
          return r.data;
        }),
      errors,
    ),
    settled(
      "new_listings",
      http
        .get(MARKET_FLOOR_ENDPOINTS.listingsNew, { params: { limit: 8 } })
        .then((r) => {
          endpoints_used.push(MARKET_FLOOR_ENDPOINTS.listingsNew);
          return r.data;
        }),
      errors,
    ),
    settled(
      "categories",
      http
        .get(MARKET_FLOOR_ENDPOINTS.categories, { params: { limit: 10 } })
        .then((r) => {
          endpoints_used.push(MARKET_FLOOR_ENDPOINTS.categories);
          return r.data;
        }),
      errors,
    ),
    // Losers: listings sorted by 24h % asc (gainers-losers often returns gainers only on this plan)
    settled(
      "losers",
      http
        .get(KEY_ENDPOINTS.listingsLatest, {
          params: {
            limit: 8,
            sort: "percent_change_24h",
            sort_dir: "asc",
            convert: "USD",
          },
        })
        .then((r) => {
          endpoints_used.push(KEY_ENDPOINTS.listingsLatest + "?sort=percent_change_24h&sort_dir=asc");
          return r.data;
        }),
      errors,
    ),
  ]);

  const gData = (globalRes as { data?: Record<string, unknown> } | null)?.data ?? {};
  const gUsd = ((gData.quote as { USD?: Record<string, number> } | undefined)?.USD) ?? {};
  const fgData = (fgRes as { data?: Record<string, unknown> } | null)?.data ?? {};
  const altData = (altRes as { data?: Record<string, unknown> } | null)?.data ?? {};

  const parsedGl = parseGainersLosers((glRes as { data?: unknown } | null)?.data);
  let losers = parsedGl.losers;
  if (!losers.length) {
    losers = mapCoins((losersRes as { data?: unknown } | null)?.data, 8);
  }

  const categoriesRaw = (catRes as { data?: unknown } | null)?.data;
  const categories: MarketFloorCategory[] = Array.isArray(categoriesRaw)
    ? categoriesRaw.slice(0, 10).map((c: Record<string, unknown>) => ({
        id: String(c.id ?? c.name ?? ""),
        name: String(c.name ?? ""),
        title: c.title != null ? String(c.title) : undefined,
        num_tokens: typeof c.num_tokens === "number" ? c.num_tokens : undefined,
        market_cap: (c.market_cap as number | null | undefined) ?? null,
        market_cap_change: (c.market_cap_change as number | null | undefined) ?? null,
        volume: (c.volume as number | null | undefined) ?? null,
        volume_change: (c.volume_change as number | null | undefined) ?? null,
        avg_price_change: (c.avg_price_change as number | null | undefined) ?? null,
      }))
    : [];

  // Prefer categories with useful move signals
  categories.sort((a, b) => Math.abs(b.avg_price_change ?? 0) - Math.abs(a.avg_price_change ?? 0));

  return {
    mock: false,
    source: "cmc-pro",
    fetched_at: new Date().toISOString(),
    cache_ttl_ms: CACHE_TTL_MS,
    endpoints_used: [...new Set(endpoints_used)],
    global: {
      total_market_cap: gUsd.total_market_cap ?? null,
      total_volume_24h: gUsd.total_volume_24h ?? null,
      btc_dominance: (gData.btc_dominance as number | null | undefined) ?? null,
      eth_dominance: (gData.eth_dominance as number | null | undefined) ?? null,
      active_cryptocurrencies:
        (gData.active_cryptocurrencies as number | null | undefined) ?? null,
    },
    fear_greed: {
      value: fgData.value != null ? Number(fgData.value) : null,
      classification:
        fgData.value_classification != null ? String(fgData.value_classification) : null,
      update_time: fgData.update_time != null ? String(fgData.update_time) : null,
    },
    altcoin_season: {
      index: altData.altcoin_index != null ? Number(altData.altcoin_index) : null,
      marketcap: (altData.altcoin_marketcap as number | null | undefined) ?? null,
      snapshot_time: altData.snapshot_time != null ? String(altData.snapshot_time) : null,
      yearly_high: (altData.yearly_high as number | null | undefined) ?? null,
      yearly_low: (altData.yearly_low as number | null | undefined) ?? null,
    },
    gainers: parsedGl.gainers,
    losers,
    trending: mapCoins((trendRes as { data?: unknown } | null)?.data, 8),
    most_visited: mapCoins((visitRes as { data?: unknown } | null)?.data, 8),
    new_listings: mapCoins((newRes as { data?: unknown } | null)?.data, 8),
    categories: categories.slice(0, 8),
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}

/**
 * Aggregated market floor for the console.
 * - Live Pro data when CMC_API_KEY is set (cached ~55s)
 * - 503 when key missing unless allowMock=true (labeled MOCK)
 */
export async function getMarketFloor(opts?: {
  allowMock?: boolean;
  forceRefresh?: boolean;
}): Promise<{ status: number; body: MarketFloorPayload | { error: string; mock?: boolean } }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (opts?.allowMock || process.env.CMC_WITNESS_MARKET_FLOOR_MOCK === "1") {
      return { status: 200, body: mockFloor() };
    }
    return {
      status: 503,
      body: {
        error:
          "CMC_API_KEY missing — market floor requires Pro API. Set CMC_API_KEY in .env (never commit it).",
        mock: false,
      },
    };
  }

  const now = Date.now();
  if (!opts?.forceRefresh && floorCache && now - floorCache.at < CACHE_TTL_MS) {
    return { status: 200, body: floorCache.value };
  }

  const payload = await fetchLiveFloor(apiKey);
  floorCache = { at: now, value: payload };
  return { status: 200, body: payload };
}

function pickCanonicalAsset(data: Record<string, unknown> | undefined, symbol: string): Record<string, unknown> | null {
  if (!data) return null;
  const entry = data[symbol.toUpperCase()] ?? data[Object.keys(data)[0] ?? ""];
  if (Array.isArray(entry)) return (entry[0] as Record<string, unknown>) ?? null;
  if (entry && typeof entry === "object") return entry as Record<string, unknown>;
  return null;
}

/** Attach price-performance + OHLCV spark for a live check when key is present. */
export async function enrichCheckSymbol(symbol: string): Promise<CheckEnrichment | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  const now = Date.now();
  const cached = enrichCache.get(sym);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  const http = createHttp(apiKey);
  const errors: Record<string, string> = {};

  const [perfRes, ohlcvRes] = await Promise.all([
    settled(
      "price_performance",
      http.get(MARKET_FLOOR_ENDPOINTS.pricePerformance, {
        params: { symbol: sym, time_period: "all_time,24h,7d,30d" },
      }),
      errors,
    ),
    settled(
      "ohlcv",
      http.get(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical, {
        params: {
          symbol: sym,
          convert: "USD",
          time_start: Math.floor(Date.now() / 1000) - 86400 * 14,
          time_end: Math.floor(Date.now() / 1000),
          interval: "daily",
        },
      }),
      errors,
    ),
  ]);

  let price_performance: PricePerformanceSlice[] | null = null;
  const perfData = (perfRes as { data?: { data?: Record<string, unknown> } } | null)?.data?.data
    ?? (perfRes as { data?: Record<string, unknown> } | null)?.data;
  const asset = pickCanonicalAsset(perfData as Record<string, unknown> | undefined, sym);
  const periods = (asset?.periods as Record<string, { quote?: { USD?: Record<string, number> } }>) ?? null;
  if (periods) {
    price_performance = Object.entries(periods).map(([period, p]) => {
      const q = p?.quote?.USD ?? {};
      return {
        period,
        open: q.open ?? null,
        high: q.high ?? null,
        low: q.low ?? null,
        close: q.close ?? null,
        percent_change: q.percent_change ?? null,
        price_change: q.price_change ?? null,
      };
    });
  }

  let ohlcv_spark: number[] | null = null;
  const ohlcvBody = (ohlcvRes as { data?: { data?: unknown } } | null)?.data?.data
    ?? (ohlcvRes as { data?: unknown } | null)?.data;
  let quotes: unknown[] | undefined;
  if (ohlcvBody && typeof ohlcvBody === "object") {
    const body = ohlcvBody as Record<string, unknown>;
    if (Array.isArray(body.quotes)) {
      quotes = body.quotes;
    } else {
      const bySym = body[sym] ?? body[Object.keys(body)[0] ?? ""];
      if (Array.isArray(bySym)) {
        const first = bySym[0] as { quotes?: unknown[] };
        quotes = first?.quotes;
      } else if (bySym && typeof bySym === "object") {
        quotes = (bySym as { quotes?: unknown[] }).quotes;
      }
    }
  }
  if (Array.isArray(quotes) && quotes.length) {
    ohlcv_spark = quotes
      .map((q) => {
        const close = (q as { quote?: { USD?: { close?: number } } })?.quote?.USD?.close;
        return typeof close === "number" ? close : null;
      })
      .filter((n): n is number => n != null);
    if (!ohlcv_spark.length) ohlcv_spark = null;
  }

  const value: CheckEnrichment = {
    price_performance,
    ohlcv_spark,
    enrichment_source: price_performance || ohlcv_spark ? "cmc-pro" : "unavailable",
    ...(Object.keys(errors).length ? { enrichment_errors: errors } : {}),
  };
  enrichCache.set(sym, { at: now, value });
  return value;
}

/** Test helper — clear caches between tests. */
export function _resetMarketFloorCache(): void {
  floorCache = null;
  enrichCache.clear();
}

export { mockFloor, CACHE_TTL_MS };
