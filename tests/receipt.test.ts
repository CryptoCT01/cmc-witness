import { describe, expect, it } from "vitest";
import { buildObserved, hashObserved, createMarketReceipt } from "../src/witness/receipt.js";
import type { CryptoAsset } from "../src/cmc/types.js";

const sample: CryptoAsset = {
  id: 1,
  name: "Bitcoin",
  symbol: "BTC",
  slug: "bitcoin",
  cmc_rank: 1,
  num_market_pairs: 100,
  circulating_supply: 19_000_000,
  total_supply: 19_000_000,
  max_supply: 21_000_000,
  quote: {
    USD: {
      price: 100,
      volume_24h: 1_000_000,
      market_cap: 1_900_000_000_000,
      percent_change_24h: 1,
    },
  },
};

describe("Market Receipt", () => {
  it("hashes observed payload stably", () => {
    const a = buildObserved(sample, "t");
    const b = buildObserved(sample, "t");
    expect(hashObserved(a)).toBe(hashObserved(b));
  });

  it("creates receipt with schema and never invents metrics", () => {
    const receipt = createMarketReceipt(sample, "fixture", "2026-09-15T00:00:00.000Z");
    expect(receipt.schema).toBe("cmc-witness.market-receipt/v1");
    expect(receipt.observed.price_usd).toBe(100);
    expect(receipt.observed).not.toHaveProperty("invented_score");
  });
});
