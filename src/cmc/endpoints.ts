/** Documented CMC x402 + Pro API paths. */

export const CMC_BASE_URL = "https://pro-api.coinmarketcap.com";

/** Optional hosted CMC MCP (x402). We still ship our own receipt-layer MCP. */
export const CMC_HOSTED_MCP_URL = "https://mcp.coinmarketcap.com/x402/mcp";

export const ENDPOINTS = {
  quotesLatest: "/x402/v3/cryptocurrency/quotes/latest",
  listingsLatest: "/x402/v3/cryptocurrency/listings/latest",
  dexSearch: "/x402/v1/dex/search",
  dexPairsQuotesLatest: "/x402/v4/dex/pairs/quotes/latest",
} as const;

/** Classic Pro API paths (same resources, key auth). */
export const KEY_ENDPOINTS = {
  quotesLatest: "/v1/cryptocurrency/quotes/latest",
  listingsLatest: "/v1/cryptocurrency/listings/latest",
  // DEX paths vary by plan; x402 paths are preferred when paying per call.
  dexSearch: "/v1/dex/search",
  dexPairsQuotesLatest: "/v4/dex/pairs/quotes/latest",
} as const;

/** Pro market-floor / terminal endpoints (key auth). */
export const MARKET_FLOOR_ENDPOINTS = {
  globalMetrics: "/v1/global-metrics/quotes/latest",
  fearAndGreed: "/v3/fear-and-greed/latest",
  altcoinSeason: "/v1/altcoin-season-index/latest",
  gainersLosers: "/v1/cryptocurrency/trending/gainers-losers",
  trendingLatest: "/v1/cryptocurrency/trending/latest",
  mostVisited: "/v1/cryptocurrency/trending/most-visited",
  listingsNew: "/v1/cryptocurrency/listings/new",
  categories: "/v1/cryptocurrency/categories",
  ohlcvHistorical: "/v2/cryptocurrency/ohlcv/historical",
  ohlcvLatest: "/v2/cryptocurrency/ohlcv/latest",
  pricePerformance: "/v2/cryptocurrency/price-performance-stats/latest",
} as const;
