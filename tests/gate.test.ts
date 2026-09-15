import { describe, expect, it } from "vitest";
import { FixtureCmcClient } from "../src/cmc/fixture-client.js";
import { beforeYouTrade, evaluateAsset } from "../src/witness/gate.js";

describe("before_you_trade gate", () => {
  it("allows BTC from fixtures with high score", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "BTC", { persist: false });
    expect(result.decision).toBe("allow");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.receipt.symbol).toBe("BTC");
    expect(result.receipt.observed.price_usd).toBeTypeOf("number");
    expect(result.receipt.auth_mode).toBe("fixture");
    expect(result.receipt.observed_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks RUG fixture for low liquidity / extreme moves", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "RUG", { persist: false });
    expect(result.decision).toBe("block");
    expect(result.score).toBeLessThan(40);
    expect(result.receipt.observed.market_cap_usd).toBe(12000);
  });

  it("returns ETH caution-or-allow with observed fields only", async () => {
    const client = new FixtureCmcClient();
    const result = await beforeYouTrade(client, "ETH", { persist: false });
    expect(["allow", "caution"]).toContain(result.decision);
    expect(result.receipt.observed.name).toBe("Ethereum");
    // Must not invent fields like rsi / fear_greed
    expect(result.receipt.observed).not.toHaveProperty("rsi");
    expect(JSON.stringify(result)).not.toMatch(/fear.?greed/i);
  });

  it("evaluateAsset shape matches contract", async () => {
    const client = new FixtureCmcClient();
    const quotes = await client.getQuotesLatest("BTC");
    const asset = quotes.data.BTC;
    const result = evaluateAsset({
      asset,
      authMode: "fixture",
      statusTimestamp: quotes.status.timestamp,
    });
    expect(result).toMatchObject({
      decision: expect.stringMatching(/^(allow|caution|block)$/),
      score: expect.any(Number),
      reasons: expect.any(Array),
      receipt: expect.objectContaining({
        schema: "cmc-witness.market-receipt/v1",
      }),
    });
  });
});
