import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runDuel } from "../src/demo/duel.js";

describe("reckless vs witness duel", () => {
  it("runs fixture duel and writes report with allow/block counts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cmc-witness-duel-"));
    const outPath = join(dir, "duel-report.json");
    const logPath = join(dir, "receipts.jsonl");
    process.env.CMC_WITNESS_RECEIPT_LOG = logPath;

    try {
      const report = await runDuel({
        mode: "fixture",
        outPath,
        persist: true,
      });
      expect(report.rounds.length).toBeGreaterThanOrEqual(3);
      expect(report.summary.total).toBe(report.rounds.length);
      expect(report.summary.allow + report.summary.caution + report.summary.block).toBe(
        report.summary.total,
      );
      const btc = report.rounds.find((r) => r.proposed === "BTC");
      const rug = report.rounds.find((r) => r.proposed === "RUG");
      expect(btc?.decision).toBe("allow");
      expect(rug?.decision).toBe("block");
      expect(btc?.evidence_endpoints.length).toBeGreaterThanOrEqual(2);

      const raw = await readFile(outPath, "utf8");
      const parsed = JSON.parse(raw);
      expect(parsed.summary.block).toBeGreaterThanOrEqual(1);
    } finally {
      delete process.env.CMC_WITNESS_RECEIPT_LOG;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
