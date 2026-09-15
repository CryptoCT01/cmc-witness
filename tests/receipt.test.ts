import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildObserved,
  hashObserved,
  hashReceiptLink,
  createMarketReceipt,
  appendReceiptLog,
  readChainTip,
  verifyReceiptChain,
} from "../src/witness/receipt.js";
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

  it("creates v2 receipt with schema and never invents metrics", () => {
    const receipt = createMarketReceipt(sample, "fixture", "2026-09-15T00:00:00.000Z", {
      evidence: [
        {
          endpoint: "/v1/cryptocurrency/quotes/latest",
          credit_count: 1,
          status_timestamp: "2026-09-15T00:00:00.000Z",
          used_for: "primary quote",
        },
      ],
      prev_hash: null,
      chain_height: 0,
    });
    expect(receipt.schema).toBe("cmc-witness.market-receipt/v2");
    expect(receipt.observed.price_usd).toBe(100);
    expect(receipt.observed).not.toHaveProperty("invented_score");
    expect(receipt.evidence).toHaveLength(1);
    expect(receipt.evidence[0]?.endpoint).toBe("/v1/cryptocurrency/quotes/latest");
    expect(receipt.prev_hash).toBeNull();
    expect(receipt.chain_height).toBe(0);
    expect(receipt.receipt_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      hashReceiptLink({
        id: receipt.id,
        symbol: receipt.symbol,
        observed_hash: receipt.observed_hash,
        prev_hash: receipt.prev_hash,
        chain_height: receipt.chain_height,
      }),
    ).toBe(receipt.receipt_hash);
  });
});

describe("tamper-evident receipt chain", () => {
  let dir: string;
  let logPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "cmc-witness-chain-"));
    logPath = join(dir, "market-receipts.jsonl");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("links prev_hash and increments chain_height", async () => {
    const tip0 = await readChainTip(logPath);
    expect(tip0.prev_hash).toBeNull();
    expect(tip0.chain_height).toBe(0);

    const r1 = createMarketReceipt(sample, "fixture", "t1", {
      prev_hash: tip0.prev_hash,
      chain_height: tip0.chain_height,
      evidence: [{ endpoint: "/v1/cryptocurrency/quotes/latest", used_for: "q" }],
    });
    await appendReceiptLog(r1, logPath);

    const tip1 = await readChainTip(logPath);
    expect(tip1.prev_hash).toBe(r1.receipt_hash);
    expect(tip1.chain_height).toBe(1);

    const eth: CryptoAsset = { ...sample, symbol: "ETH", name: "Ethereum", id: 1027 };
    const r2 = createMarketReceipt(eth, "fixture", "t2", {
      prev_hash: tip1.prev_hash,
      chain_height: tip1.chain_height,
      evidence: [
        { endpoint: "/v1/cryptocurrency/quotes/latest", used_for: "q" },
        { endpoint: "/v1/cryptocurrency/listings/latest", used_for: "peers" },
      ],
    });
    await appendReceiptLog(r2, logPath);

    expect(r2.prev_hash).toBe(r1.receipt_hash);
    expect(r2.chain_height).toBe(1);

    const verified = await verifyReceiptChain(logPath);
    expect(verified.ok).toBe(true);
    expect(verified.count).toBe(2);
    expect(verified.errors).toEqual([]);
  });

  it("detects tampered observed_hash", async () => {
    const r = createMarketReceipt(sample, "fixture", "t", {
      prev_hash: null,
      chain_height: 0,
    });
    const evil = { ...r, observed_hash: "0".repeat(64) };
    await writeFile(logPath, JSON.stringify(evil) + "\n", "utf8");
    const verified = await verifyReceiptChain(logPath);
    expect(verified.ok).toBe(false);
    expect(verified.errors.some((e) => /observed_hash mismatch/.test(e))).toBe(true);
  });
});
