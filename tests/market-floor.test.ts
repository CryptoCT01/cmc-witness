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

  it("mockFloor shape is UI-ready", () => {
    const m = mockFloor();
    expect(m.mock).toBe(true);
    expect(m.global.total_market_cap).toBeTypeOf("number");
    expect(m.fear_greed.classification).toBeTruthy();
    expect(m.altcoin_season.index).toBeTypeOf("number");
    expect(m.gainers[0]?.symbol).toBeTruthy();
    expect(m.losers[0]?.symbol).toBeTruthy();
    expect(CACHE_TTL_MS).toBeGreaterThanOrEqual(45_000);
    expect(CACHE_TTL_MS).toBeLessThanOrEqual(60_000);
  });

  it("documents Pro market-floor endpoints", () => {
    expect(MARKET_FLOOR_ENDPOINTS.globalMetrics).toBe("/v1/global-metrics/quotes/latest");
    expect(MARKET_FLOOR_ENDPOINTS.fearAndGreed).toBe("/v3/fear-and-greed/latest");
    expect(MARKET_FLOOR_ENDPOINTS.altcoinSeason).toBe("/v1/altcoin-season-index/latest");
    expect(MARKET_FLOOR_ENDPOINTS.gainersLosers).toContain("gainers-losers");
    expect(MARKET_FLOOR_ENDPOINTS.ohlcvHistorical).toContain("ohlcv/historical");
    expect(MARKET_FLOOR_ENDPOINTS.pricePerformance).toContain("price-performance");
  });
});
