/**
 * CMC Pro market-floor aggregator for the Judge Console terminal.
 * Parallel Pro calls + short in-memory cache to conserve credits.
 */
import axios, { type AxiosInstance } from "axios";
import { config as loadEnv } from "dotenv";
import { CMC_BASE_URL, KEY_ENDPOINTS, MARKET_FLOOR_ENDPOINTS } from "./endpoints.js";

loadEnv();

const CACHE_TTL_MS = 60_000;
const BTC_ID = 1;
const ETH_ID = 1027;

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
  logo?: string | null;
  tags?: string[];
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

export interface SparkPoint {
  t: string | null;
  v: number;
}

export interface CycleStats {
  id: number;
  symbol: string;
  name: string;
  high: number | null;
  high_timestamp: string | null;
  low: number | null;
  low_timestamp: string | null;
  close: number | null;
  percent_change: number | null;
}

export interface AirdropRow {
  id: string;
  status: string;
  project_name: string;
  coin_symbol: string | null;
  coin_name: string | null;
  start_date: string | null;
  end_date: string | null;
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
  fear_greed_history: SparkPoint[];
  altcoin_season: {
    index: number | null;
    marketcap: number | null;
    snapshot_time: string | null;
    yearly_high: number | null;
    yearly_low: number | null;
  };
  altcoin_season_history: SparkPoint[];
  global_mcap_history: SparkPoint[];
  btc_ohlcv: SparkPoint[];
  eth_ohlcv: SparkPoint[];
  top_market_cap: MarketFloorCoin[];
  cycle_stats: CycleStats[];
  airdrops: AirdropRow[];
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

function sparkSeries(n: number, base: number, wobble: number): SparkPoint[] {
  const out: SparkPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(Date.now() - (n - 1 - i) * 86_400_000).toISOString();
    out.push({ t, v: base + Math.sin(i / 2.2) * wobble + (i % 3) * (wobble / 8) });
  }
  return out;
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
    fear_greed_history: sparkSeries(14, 52, 12).map((p, i) => ({ ...p, v: Math.round(40 + i * 1.2) })),
    altcoin_season: {
      index: 42,
      marketcap: 1.1e12,
      snapshot_time: null,
      yearly_high: 78,
      yearly_low: 14,
    },
    altcoin_season_history: sparkSeries(7, 40, 6),
    global_mcap_history: sparkSeries(14, 2.45e12, 4e10),
    btc_ohlcv: sparkSeries(30, 65000, 1800),
    eth_ohlcv: sparkSeries(30, 3400, 120),
    top_market_cap: [
      {
        id: 1,
        name: "Bitcoin",
        symbol: "BTC",
        cmc_rank: 1,
        price_usd: 65000,
        percent_change_24h: 1.2,
        market_cap: 1.28e12,
        logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
        tags: ["mineable", "store-of-value"],
      },
      {
        id: 1027,
        name: "Ethereum",
        symbol: "ETH",
        cmc_rank: 2,
        price_usd: 3400,
        percent_change_24h: 0.8,
        market_cap: 4.1e11,
        logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
        tags: ["pos", "smart-contracts"],
      },
    ],
    cycle_stats: [
      {
        id: 1,
        symbol: "BTC",
        name: "Bitcoin",
        high: 126000,
        high_timestamp: "2025-10-06T00:00:00.000Z",
        low: 0.05,
        low_timestamp: "2010-07-14T00:00:00.000Z",
        close: 65000,
        percent_change: null,
      },
      {
        id: 1027,
        symbol: "ETH",
        name: "Ethereum",
        high: 4900,
        high_timestamp: "2021-11-10T00:00:00.000Z",
        low: 0.4,
        low_timestamp: "2015-10-20T00:00:00.000Z",
        close: 3400,
        percent_change: null,
      },
    ],
    airdrops: [],
    gainers: [
      {
        id: 9991,
        name: "Mock Gainer",
        symbol: "MOCKG",
        percent_change_24h: 42.5,
        price_usd: 1.23,
        logo: null,
      },
      {
        id: 9992,
        name: "Mock Alpha",
        symbol: "MOCKA",
        percent_change_24h: 18.2,
        price_usd: 0.45,
        logo: null,
      },
    ],
    losers: [
      {
        id: 9993,
        name: "Mock Loser",
        symbol: "MOCKL",
        percent_change_24h: -22.1,
        price_usd: 0.08,
        logo: null,
      },
      {
        id: 9994,
        name: "Mock Drag",
        symbol: "MOCKD",
        percent_change_24h: -11.4,
        price_usd: 2.1,
        logo: null,
      },
    ],
    trending: [{ id: 9995, name: "Mock Trend", symbol: "MOCKT", percent_change_24h: 5.1, price_usd: 10 }],
    most_visited: [
      {
        id: 1,
        name: "Bitcoin",
        symbol: "BTC",
        percent_change_24h: 1.2,
        price_usd: 65000,
        logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
      },
    ],
    new_listings: [{ id: 9996, name: "Mock New", symbol: "MOCKN", percent_change_24h: 8.0, price_usd: 0.01 }],
    categories: [
      {
        id: "mock-defi",
        name: "DeFi",
        title: "DeFi",
        market_cap: 8e10,
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

function parseFgHistory(data: unknown): SparkPoint[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const r = row as Record<string, unknown>;
      const v = r.value != null ? Number(r.value) : NaN;
      if (!Number.isFinite(v)) return null;
      let t: string | null = null;
      if (r.timestamp != null) {
        const raw = String(r.timestamp);
        const n = Number(raw);
        t = Number.isFinite(n) && n > 1e9 ? new Date(n * 1000).toISOString() : raw;
      }
      return { t, v };
    })
    .filter((p): p is SparkPoint => Boolean(p))
    .reverse(); // API returns newest-first
}

function parseGlobalMcapHistory(data: unknown): SparkPoint[] {
  const quotes = (data as { quotes?: unknown[] } | null)?.quotes;
  if (!Array.isArray(quotes)) return [];
  return quotes
    .map((row) => {
      const r = row as { timestamp?: string; quote?: { USD?: { total_market_cap?: number } } };
      const v = r.quote?.USD?.total_market_cap;
      if (typeof v !== "number") return null;
      return { t: r.timestamp ?? null, v };
    })
    .filter((p): p is SparkPoint => Boolean(p));
}

function parseOhlcvCloses(data: unknown): SparkPoint[] {
  const quotes = (data as { quotes?: unknown[] } | null)?.quotes;
  if (!Array.isArray(quotes)) return [];
  return quotes
    .map((row) => {
      const r = row as {
        time_close?: string;
        quote?: { USD?: { close?: number; timestamp?: string } };
      };
      const v = r.quote?.USD?.close;
      if (typeof v !== "number") return null;
      return { t: r.quote?.USD?.timestamp ?? r.time_close ?? null, v };
    })
    .filter((p): p is SparkPoint => Boolean(p));
}

function parseAltHistory(data: unknown): SparkPoint[] {
  const points = (data as { points?: unknown[] } | null)?.points;
  if (!Array.isArray(points)) return [];
  return points
    .map((row) => {
      const r = row as { timestamp?: string; altcoin_index?: number };
      if (r.altcoin_index == null || !Number.isFinite(Number(r.altcoin_index))) return null;
      return { t: r.timestamp ?? null, v: Number(r.altcoin_index) };
    })
    .filter((p): p is SparkPoint => Boolean(p));
}

function parseCycleStats(data: unknown): CycleStats[] {
  if (!data || typeof data !== "object") return [];
  const out: CycleStats[] = [];
  for (const [idKey, entry] of Object.entries(data as Record<string, unknown>)) {
    const asset = entry as {
      id?: number;
      name?: string;
      symbol?: string;
      periods?: Record<string, { quote?: { USD?: Record<string, unknown> } }>;
    };
    const usd = asset.periods?.all_time?.quote?.USD ?? {};
    out.push({
      id: typeof asset.id === "number" ? asset.id : Number(idKey),
      symbol: String(asset.symbol ?? ""),
      name: String(asset.name ?? ""),
      high: typeof usd.high === "number" ? usd.high : null,
      high_timestamp: usd.high_timestamp != null ? String(usd.high_timestamp) : null,
      low: typeof usd.low === "number" ? usd.low : null,
      low_timestamp: usd.low_timestamp != null ? String(usd.low_timestamp) : null,
      close: typeof usd.close === "number" ? usd.close : null,
      percent_change: typeof usd.percent_change === "number" ? usd.percent_change : null,
    });
  }
  return out;
}

function parseAirdrops(data: unknown): AirdropRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const r = row as Record<string, unknown>;
      const status = String(r.status ?? "").toUpperCase();
      if (status !== "ONGOING") return null;
      const coin = (r.coin as { symbol?: string; name?: string } | undefined) ?? {};
      return {
        id: String(r.id ?? ""),
        status,
        project_name: String(r.project_name ?? r.name ?? "Airdrop"),
        coin_symbol: coin.symbol != null ? String(coin.symbol) : null,
        coin_name: coin.name != null ? String(coin.name) : null,
        start_date: r.start_date != null ? String(r.start_date) : null,
        end_date: r.end_date != null ? String(r.end_date) : null,
      };
    })
    .filter((a): a is AirdropRow => Boolean(a))
    .slice(0, 6);
}

function applyLogos(
  coins: MarketFloorCoin[],
  infoMap: Record<string, { logo?: string; tags?: string[] }>,
): MarketFloorCoin[] {
  return coins.map((c) => {
    if (c.id == null) return c;
    const info = infoMap[String(c.id)];
    if (!info) return c;
    return {
      ...c,
      logo: info.logo ?? c.logo ?? null,
      tags: Array.isArray(info.tags) ? info.tags.slice(0, 6) : c.tags,
    };
  });
}

async function fetchLiveFloor(apiKey: string): Promise<MarketFloorPayload> {
  const http = createHttp(apiKey);
  const errors: Record<string, string> = {};
  const endpoints_used: string[] = [];

  const track = <T>(path: string, p: Promise<{ data: T }>): Promise<T> =>
    p.then((r) => {
      endpoints_used.push(path);
      return r.data;
    });

  const [
    globalRes,
    fgRes,
    fgHistRes,
    altRes,
    altHistRes,
    gmHistRes,
    glRes,
    trendRes,
    visitRes,
    newRes,
    catRes,
    losersRes,
    topMcapRes,
    ohlcvBtcRes,
    ohlcvEthRes,
    perfRes,
    airdropsRes,
  ] = await Promise.all([
    settled(
      "global",
      track(MARKET_FLOOR_ENDPOINTS.globalMetrics, http.get(MARKET_FLOOR_ENDPOINTS.globalMetrics)),
      errors,
    ),
    settled(
      "fear_greed",
      track(MARKET_FLOOR_ENDPOINTS.fearAndGreed, http.get(MARKET_FLOOR_ENDPOINTS.fearAndGreed)),
      errors,
    ),
    settled(
      "fear_greed_hist",
      track(
        MARKET_FLOOR_ENDPOINTS.fearAndGreedHistorical + "?limit=14",
        http.get(MARKET_FLOOR_ENDPOINTS.fearAndGreedHistorical, { params: { limit: 14 } }),
      ),
      errors,
    ),
    settled(
      "altcoin_season",
      track(MARKET_FLOOR_ENDPOINTS.altcoinSeason, http.get(MARKET_FLOOR_ENDPOINTS.altcoinSeason)),
      errors,
    ),
    settled(
      "altcoin_season_hist",
      track(
        MARKET_FLOOR_ENDPOINTS.altcoinSeasonHistorical + "?time_period=30d",
        http.get(MARKET_FLOOR_ENDPOINTS.altcoinSeasonHistorical, {
          params: { time_period: "30d" },
        }),
      ),
      errors,
    ),
    settled(
      "global_hist",
      track(
        MARKET_FLOOR_ENDPOINTS.globalMetricsHistorical + "?count=14&interval=daily",
        http.get(MARKET_FLOOR_ENDPOINTS.globalMetricsHistorical, {
          params: { count: 14, interval: "daily" },
        }),
      ),
      errors,
    ),
    settled(
      "gainers_losers",
      track(
        MARKET_FLOOR_ENDPOINTS.gainersLosers,
        http.get(MARKET_FLOOR_ENDPOINTS.gainersLosers, {
          params: { limit: 8, time_period: "24h", convert: "USD" },
        }),
      ),
      errors,
    ),
    settled(
      "trending",
      track(
        MARKET_FLOOR_ENDPOINTS.trendingLatest,
        http.get(MARKET_FLOOR_ENDPOINTS.trendingLatest, { params: { limit: 8 } }),
      ),
      errors,
    ),
    settled(
      "most_visited",
      track(
        MARKET_FLOOR_ENDPOINTS.mostVisited,
        http.get(MARKET_FLOOR_ENDPOINTS.mostVisited, { params: { limit: 8 } }),
      ),
      errors,
    ),
    settled(
      "new_listings",
      track(
        MARKET_FLOOR_ENDPOINTS.listingsNew,
        http.get(MARKET_FLOOR_ENDPOINTS.listingsNew, { params: { limit: 8 } }),
      ),
      errors,
    ),
    settled(
      "categories",
      track(
        MARKET_FLOOR_ENDPOINTS.categories,
        http.get(MARKET_FLOOR_ENDPOINTS.categories, { params: { limit: 10 } }),
      ),
      errors,
    ),
    settled(
      "losers",
      track(
        KEY_ENDPOINTS.listingsLatest + "?sort=percent_change_24h&sort_dir=asc",
        http.get(KEY_ENDPOINTS.listingsLatest, {
          params: {
            limit: 8,
            sort: "percent_change_24h",
            sort_dir: "asc",
            convert: "USD",
          },
        }),
      ),
      errors,
    ),
    settled(
      "top_market_cap",
      track(
        MARKET_FLOOR_ENDPOINTS.listingsLatest + "?limit=12&sort=market_cap",
        http.get(MARKET_FLOOR_ENDPOINTS.listingsLatest, {
          params: { limit: 12, sort: "market_cap", convert: "USD" },
        }),
      ),
      errors,
    ),
    settled(
      "ohlcv_btc",
      track(
        MARKET_FLOOR_ENDPOINTS.ohlcvHistorical + "?id=1&time_period=daily&count=30",
        http.get(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical, {
          params: { id: BTC_ID, time_period: "daily", count: 30 },
        }),
      ),
      errors,
    ),
    settled(
      "ohlcv_eth",
      track(
        MARKET_FLOOR_ENDPOINTS.ohlcvHistorical + "?id=1027&time_period=daily&count=30",
        http.get(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical, {
          params: { id: ETH_ID, time_period: "daily", count: 30 },
        }),
      ),
      errors,
    ),
    settled(
      "price_performance",
      track(
        MARKET_FLOOR_ENDPOINTS.pricePerformance + "?id=1,1027",
        http.get(MARKET_FLOOR_ENDPOINTS.pricePerformance, {
          params: { id: `${BTC_ID},${ETH_ID}` },
        }),
      ),
      errors,
    ),
    settled(
      "airdrops",
      track(
        MARKET_FLOOR_ENDPOINTS.airdrops + "?status=ONGOING&limit=6",
        http.get(MARKET_FLOOR_ENDPOINTS.airdrops, {
          params: { status: "ONGOING", limit: 6 },
        }),
      ),
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

  // Prefer categories with largest market cap (dense board), then move magnitude
  categories.sort((a, b) => {
    const mc = (b.market_cap ?? 0) - (a.market_cap ?? 0);
    if (mc !== 0) return mc;
    return Math.abs(b.avg_price_change ?? 0) - Math.abs(a.avg_price_change ?? 0);
  });

  let gainers = parsedGl.gainers;
  let trending = mapCoins((trendRes as { data?: unknown } | null)?.data, 8);
  let most_visited = mapCoins((visitRes as { data?: unknown } | null)?.data, 8);
  let new_listings = mapCoins((newRes as { data?: unknown } | null)?.data, 8);
  let top_market_cap = mapCoins((topMcapRes as { data?: unknown } | null)?.data, 12);

  const idSet = new Set<number>();
  for (const list of [gainers, losers, trending, most_visited, new_listings, top_market_cap]) {
    for (const c of list) {
      if (typeof c.id === "number") idSet.add(c.id);
    }
  }
  idSet.add(BTC_ID);
  idSet.add(ETH_ID);
  const ids = [...idSet].slice(0, 80);

  let infoMap: Record<string, { logo?: string; tags?: string[] }> = {};
  if (ids.length) {
    const infoRes = await settled(
      "crypto_info",
      track(
        MARKET_FLOOR_ENDPOINTS.cryptoInfo + `?id=${ids.join(",")}`,
        http.get(MARKET_FLOOR_ENDPOINTS.cryptoInfo, { params: { id: ids.join(",") } }),
      ),
      errors,
    );
    const rawInfo =
      (infoRes as { data?: Record<string, { logo?: string; tags?: string[] }> } | null)?.data ?? {};
    infoMap = rawInfo;
  }

  gainers = applyLogos(gainers, infoMap);
  losers = applyLogos(losers, infoMap);
  trending = applyLogos(trending, infoMap);
  most_visited = applyLogos(most_visited, infoMap);
  new_listings = applyLogos(new_listings, infoMap);
  top_market_cap = applyLogos(top_market_cap, infoMap);

  const fear_greed_history = parseFgHistory(
    (fgHistRes as { data?: unknown } | null)?.data ?? fgHistRes,
  );
  const altcoin_season_history = parseAltHistory(
    (altHistRes as { data?: unknown } | null)?.data ?? altHistRes,
  );
  const global_mcap_history = parseGlobalMcapHistory(
    (gmHistRes as { data?: unknown } | null)?.data ?? gmHistRes,
  );
  const btc_ohlcv = parseOhlcvCloses(
    (ohlcvBtcRes as { data?: unknown } | null)?.data ?? ohlcvBtcRes,
  );
  const eth_ohlcv = parseOhlcvCloses(
    (ohlcvEthRes as { data?: unknown } | null)?.data ?? ohlcvEthRes,
  );
  const cycle_stats = parseCycleStats(
    (perfRes as { data?: unknown } | null)?.data ?? perfRes,
  );
  const airdrops = parseAirdrops(
    (airdropsRes as { data?: unknown } | null)?.data ?? airdropsRes,
  );

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
    fear_greed_history,
    altcoin_season: {
      index: altData.altcoin_index != null ? Number(altData.altcoin_index) : null,
      marketcap: (altData.altcoin_marketcap as number | null | undefined) ?? null,
      snapshot_time: altData.snapshot_time != null ? String(altData.snapshot_time) : null,
      yearly_high: (altData.yearly_high as number | null | undefined) ?? null,
      yearly_low: (altData.yearly_low as number | null | undefined) ?? null,
    },
    altcoin_season_history,
    global_mcap_history,
    btc_ohlcv,
    eth_ohlcv,
    top_market_cap,
    cycle_stats,
    airdrops,
    gainers,
    losers,
    trending,
    most_visited,
    new_listings,
    categories: categories.slice(0, 8),
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}

/**
 * Aggregated market floor for the console.
 * - Live Pro data when CMC_API_KEY is set (cached ~60s)
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
          time_period: "daily",
          count: 14,
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
  const points = parseOhlcvCloses(ohlcvBody);
  if (points.length) {
    ohlcv_spark = points.map((p) => p.v);
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
