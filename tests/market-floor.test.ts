import { describe, expect, it, beforeEach } from "vitest";
import {
  getMarketFloor,
  mockFloor,
  _resetMarketFloorCache,
  CACHE_TTL_MS,
} from "../src/cmc/market-floor.js";
import { MARKET_FLOOR_ENDPOINTS } from "../src/cmc/endpoints.js";

describe("market floor", () => {
  beforeEach(() => {
    _resetMarketFloorCache();
  });

  it("returns labeled MOCK when allowMock and no key", async () => {
    const prev = process.env.CMC_API_KEY;
    delete process.env.CMC_API_KEY;
    const { status, body } = await getMarketFloor({ allowMock: true });
    process.env.CMC_API_KEY = prev;
    expect(status).toBe(200);
    expect(body).toMatchObject({ mock: true, source: "mock" });
    if ("gainers" in body) {
      expect(body.gainers.length).toBeGreaterThan(0);
      expect(body.endpoints_used).toContain("MOCK");
      expect(body.fear_greed_history.length).toBeGreaterThan(0);
      expect(body.btc_ohlcv.length).toBeGreaterThan(0);
      expect(body.top_market_cap.length).toBeGreaterThan(0);
    }
  });

  it("returns 503 with message when key missing and mock disallowed", async () => {
    const prev = process.env.CMC_API_KEY;
    const prevMock = process.env.CMC_WITNESS_MARKET_FLOOR_MOCK;
    delete process.env.CMC_API_KEY;
    delete process.env.CMC_WITNESS_MARKET_FLOOR_MOCK;
    const { status, body } = await getMarketFloor({ allowMock: false });
    process.env.CMC_API_KEY = prev;
    if (prevMock !== undefined) process.env.CMC_WITNESS_MARKET_FLOOR_MOCK = prevMock;
    expect(status).toBe(503);
    expect(body).toMatchObject({ error: expect.stringMatching(/CMC_API_KEY/i) });
  });

  it("mockFloor shape is UI-ready with Pro series", () => {
    const m = mockFloor();
    expect(m.mock).toBe(true);
    expect(m.global.total_market_cap).toBeTypeOf("number");
    expect(m.fear_greed.classification).toBeTruthy();
    expect(m.altcoin_season.index).toBeTypeOf("number");
    expect(m.gainers[0]?.symbol).toBeTruthy();
    expect(m.losers[0]?.symbol).toBeTruthy();
    expect(m.fear_greed_history.length).toBeGreaterThanOrEqual(7);
    expect(m.global_mcap_history.length).toBeGreaterThanOrEqual(7);
    expect(m.btc_ohlcv.length).toBeGreaterThanOrEqual(14);
    expect(m.eth_ohlcv.length).toBeGreaterThanOrEqual(14);
    expect(m.top_market_cap[0]?.logo).toBeTruthy();
    expect(m.cycle_stats.length).toBe(2);
    expect(Array.isArray(m.airdrops)).toBe(true);
    expect(CACHE_TTL_MS).toBeGreaterThanOrEqual(45_000);
    expect(CACHE_TTL_MS).toBeLessThanOrEqual(65_000);
  });

  it("documents Pro market-floor endpoints including series", () => {
    expect(MARKET_FLOOR_ENDPOINTS.globalMetrics).toBe("/v1/global-metrics/quotes/latest");
    expect(MARKET_FLOOR_ENDPOINTS.globalMetricsHistorical).toContain("global-metrics/quotes/historical");
    expect(MARKET_FLOOR_ENDPOINTS.fearAndGreed).toBe("/v3/fear-and-greed/latest");
    expect(MARKET_FLOOR_ENDPOINTS.fearAndGreedHistorical).toContain("fear-and-greed/historical");
    expect(MARKET_FLOOR_ENDPOINTS.altcoinSeason).toBe("/v1/altcoin-season-index/latest");
    expect(MARKET_FLOOR_ENDPOINTS.altcoinSeasonHistorical).toContain("altcoin-season-index/historical");
    expect(MARKET_FLOOR_ENDPOINTS.gainersLosers).toContain("gainers-losers");
    expect(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical).toContain("ohlcv/historical");
    expect(MARKET_FLOOR_ENDPOINTS.pricePerformance).toContain("price-performance");
    expect(MARKET_FLOOR_ENDPOINTS.cryptoInfo).toContain("/info");
    expect(MARKET_FLOOR_ENDPOINTS.airdrops).toContain("airdrops");
    expect(MARKET_FLOOR_ENDPOINTS.listingsLatest).toContain("listings/latest");
  });
});
