import { describe, expect, it } from "vitest";
import { FixtureCmcClient } from "../src/cmc/fixture-client.js";
import { beforeYouTrade, evaluateAsset } from "../src/witness/gate.js";
import { investigate } from "../src/witness/dossier.js";
import { KEY_ENDPOINTS } from "../src/cmc/endpoints.js";

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
    expect(result.receipt.schema).toBe("cmc-witness.market-receipt/v2");
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
    expect(result.receipt.observed).not.toHaveProperty("rsi");
    expect(JSON.stringify(result)).not.toMatch(/fear.?greed/i);
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
      receipt: expect.objectContaining({
        schema: "cmc-witness.market-receipt/v2",
      }),
    });
  });
});

describe("investigate dossier evidence", () => {
  it("records quotes + listings on evidence for BTC", async () => {
    const client = new FixtureCmcClient();
    const result = await investigate(client, "BTC", { persist: false });
    expect(result.receipt.evidence.length).toBeGreaterThanOrEqual(2);
    const paths = result.receipt.evidence.map((e) => e.endpoint);
    expect(paths).toContain(KEY_ENDPOINTS.quotesLatest);
    expect(paths).toContain(KEY_ENDPOINTS.listingsLatest);
    for (const e of result.receipt.evidence) {
      expect(e.endpoint).toBeTruthy();
      expect(e.used_for).toBeTruthy();
      expect(e.status_timestamp).toBeTruthy();
    }
    expect(result.receipt.observed.peer_rank_context?.listings_count).toBeGreaterThan(0);
    expect(result.reasons.some((r) => /Dossier endpoints/.test(r))).toBe(true);
  });

  it("probes dex for RUG and records dex evidence", async () => {
    const client = new FixtureCmcClient();
    const result = await investigate(client, "RUG", { persist: false });
    const paths = result.receipt.evidence.map((e) => e.endpoint);
    expect(paths).toContain(KEY_ENDPOINTS.quotesLatest);
    expect(paths).toContain(KEY_ENDPOINTS.listingsLatest);
    expect(paths).toContain(KEY_ENDPOINTS.dexSearch);
    expect(result.receipt.observed.dex_hits).toBe(0);
    expect(result.decision).toBe("block");
  });
});
