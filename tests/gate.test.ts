import { describe, expect, it } from "vitest";
import { FixtureCmcClient } from "../src/cmc/fixture-client.js";
import { beforeYouTrade, evaluateAsset } from "../src/witness/gate.js";
import { investigate } from "../src/witness/dossier.js";
import { KEY_ENDPOINTS, MARKET_FLOOR_ENDPOINTS } from "../src/cmc/endpoints.js";
import { applyProScoring, detectCollision, type ProContext } from "../src/witness/pro-context.js";

describe("before_you_trade gate", () => {
  it("allows BTC from fixtures with high score", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "BTC", { persist: false });
    expect(result.decision).toBe("allow");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reason_chips).toBeDefined();
    expect(result.receipt.symbol).toBe("BTC");
    expect(result.receipt.observed.price_usd).toBeTypeOf("number");
    expect(result.receipt.auth_mode).toBe("fixture");
    expect(result.receipt.observed_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.schema).toBe("cmc-witness.market-receipt/v2");
  });

  it("blocks RUG fixture for low liquidity / extreme moves", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "RUG", { persist: false });
    expect(result.decision).toBe("block");
    expect(result.score).toBeLessThan(40);
    expect(result.receipt.observed.market_cap_usd).toBe(12000);
  });

  it("returns ETH caution-or-allow with observed fields only (no invented RSI)", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "ETH", { persist: false });
    expect(["allow", "caution"]).toContain(result.decision);
    expect(result.receipt.observed.name).toBe("Ethereum");
    expect(result.receipt.observed).not.toHaveProperty("rsi");
    expect(JSON.stringify(result)).not.toMatch(/\brsi\b/i);
  });

  it("evaluateAsset shape matches contract", async () => {
    const client = new FixtureCmcClient();
    const quotes = await client.getQuotesLatest("BTC");
    const asset = quotes.data.BTC!;
    const result = evaluateAsset({
      asset,
      authMode: "fixture",
      statusTimestamp: quotes.status.timestamp,
      chain: { prev_hash: null, chain_height: 0 },
    });
    expect(result).toMatchObject({
      decision: expect.stringMatching(/^(allow|caution|block)$/),
      score: expect.any(Number),
      reasons: expect.any(Array),
      reason_chips: expect.any(Array),
      receipt: expect.objectContaining({
        schema: "cmc-witness.market-receipt/v2",
      }),
    });
  });
});

describe("investigate dossier evidence", () => {
  it("records quotes + listings + Pro mock evidence for BTC", async () => {
    const client = new FixtureCmcClient();
    const result = await investigate(client, "BTC", { persist: false });
    expect(result.receipt.evidence.length).toBeGreaterThanOrEqual(2);
    const paths = result.receipt.evidence.map((e) => e.endpoint);
    expect(paths).toContain(KEY_ENDPOINTS.quotesLatest);
    expect(paths).toContain(KEY_ENDPOINTS.listingsLatest);
    // Fixture mock Pro context attaches F&G / global / perf / ohlcv
    expect(paths).toContain(MARKET_FLOOR_ENDPOINTS.fearAndGreed);
    expect(paths).toContain(MARKET_FLOOR_ENDPOINTS.globalMetrics);
    for (const e of result.receipt.evidence) {
      expect(e.endpoint).toBeTruthy();
      expect(e.used_for).toBeTruthy();
    }
    expect(result.receipt.observed.peer_rank_context?.listings_count).toBeGreaterThan(0);
    expect(result.receipt.observed.fear_greed?.value).toBe(55);
    expect(result.receipt.observed.btc_dominance).toBe(54.2);
    expect(result.reasons.some((r) => /Dossier endpoints/.test(r))).toBe(true);
    expect(result.reasons.some((r) => /Fear & Greed/.test(r))).toBe(true);
    expect(result.reason_chips.some((c) => /F&G|BTC\.D|range|ATH/i.test(c))).toBe(true);
  });

  it("probes dex for RUG and records dex + Pro evidence", async () => {
    const client = new FixtureCmcClient();
    const result = await investigate(client, "RUG", { persist: false });
    const paths = result.receipt.evidence.map((e) => e.endpoint);
    expect(paths).toContain(KEY_ENDPOINTS.quotesLatest);
    expect(paths).toContain(KEY_ENDPOINTS.listingsLatest);
    expect(paths).toContain(KEY_ENDPOINTS.dexSearch);
    expect(result.receipt.observed.dex_hits).toBe(0);
    expect(result.decision).toBe("block");
    expect(result.receipt.observed.fear_greed?.value).toBe(82);
  });

  it("skips Pro layers cleanly when skipPro=true", async () => {
    const client = new FixtureCmcClient();
    const result = await investigate(client, "BTC", { persist: false, skipPro: true });
    const paths = result.receipt.evidence.map((e) => e.endpoint);
    expect(paths).not.toContain(MARKET_FLOOR_ENDPOINTS.fearAndGreed);
    expect(result.receipt.observed.fear_greed).toBeUndefined();
  });
});

describe("Pro scoring branches", () => {
  it("penalizes extreme greed and elevated OHLCV range", () => {
    const reasons: string[] = [];
    const chips: string[] = [];
    const pro: ProContext = {
      source: "fixture-mock",
      fear_greed: { value: 85, classification: "Extreme Greed" },
      btc_dominance: 58,
      ohlcv_volatility: {
        days: 14,
        high: 100,
        low: 40,
        range_pct: 85,
        closes: [40, 100],
      },
    };
    const score = applyProScoring(80, reasons, chips, pro);
    expect(score).toBeLessThan(80);
    expect(reasons.some((r) => /extreme greed/i.test(r))).toBe(true);
    expect(reasons.some((r) => /BTC dominance/i.test(r))).toBe(true);
    expect(reasons.some((r) => /OHLCV range/i.test(r))).toBe(true);
    expect(chips).toContain("F&G 85 greed");
    expect(chips.some((c) => /14d range/.test(c))).toBe(true);
  });

  it("penalizes deep ATH drawdown", () => {
    const reasons: string[] = [];
    const chips: string[] = [];
    const pro: ProContext = {
      source: "cmc-pro",
      price_performance: {
        all_time_high: 100,
        close: 20,
        ath_drawdown_pct: 80,
      },
    };
    const score = applyProScoring(70, reasons, chips, pro);
    expect(score).toBeLessThanOrEqual(58);
    expect(chips.some((c) => /ATH/.test(c))).toBe(true);
  });

  it("hard-blocks non-canonical ticker collision via evaluateAsset", async () => {
    const client = new FixtureCmcClient();
    const quotes = await client.getQuotesLatest("FAKEBTC");
    const asset = quotes.data.FAKEBTC!;
    expect(asset.symbol).toBe("BTC");
    expect(asset.id).not.toBe(1);
    const collision = detectCollision(asset);
    expect(collision?.is_non_canonical).toBe(true);

    const result = evaluateAsset({
      asset,
      authMode: "fixture",
      statusTimestamp: quotes.status.timestamp,
      chain: { prev_hash: null, chain_height: 0 },
      pro: {
        source: "fixture-mock",
        collision: collision!,
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason_chips).toContain("TICKER COLLISION");
    expect(result.reasons.some((r) => /collision/i.test(r))).toBe(true);
  });

  it("blocks FAKEBTC end-to-end via before_you_trade", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "FAKEBTC", { persist: false });
    expect(result.decision).toBe("block");
    expect(result.receipt.observed.ticker_collision).toBe(true);
    expect(result.reason_chips).toContain("TICKER COLLISION");
  });

  it("does not invent Pro metrics when Pro skipped", () => {
    const reasons: string[] = [];
    const chips: string[] = [];
    const score = applyProScoring(90, reasons, chips, { source: "skipped" });
    expect(score).toBe(90);
    expect(reasons).toHaveLength(0);
    expect(chips).toHaveLength(0);
  });
});
