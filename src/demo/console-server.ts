#!/usr/bin/env node
/**
 * Lightweight static server for the CMC Witness Pre-trade Gate console.
 * Serves ./console, ./duel-report.json, receipt chain JSON, /api/market-floor, /api/check, demos.
 */
import { config as loadEnv } from "dotenv";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv();

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const CONSOLE_DIR = join(ROOT, "console");
const PORT = Number(process.env.CMC_WITNESS_CONSOLE_PORT ?? 4173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function safeRead(path: string): Promise<Buffer | null> {
  try {
    await stat(path);
    return await readFile(path);
  } catch {
    return null;
  }
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function loadReceipts(): Promise<unknown[]> {
  const logPath =
    process.env.CMC_WITNESS_RECEIPT_LOG ?? join(ROOT, "receipts", "market-receipts.jsonl");
  const buf = await safeRead(logPath);
  if (!buf) return [];
  return buf
    .toString("utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function runCheck(symbol: string, modeHint?: string | null) {
  const { createCmcClient } = await import("../cmc/client.js");
  const { beforeYouTrade } = await import("../witness/index.js");
  const { enrichCheckSymbol } = await import("../cmc/market-floor.js");

  let mode: "x402" | "key" | "fixture" | "auto" = "auto";
  if (modeHint === "x402" || modeHint === "key" || modeHint === "fixture") {
    mode = modeHint;
  } else if (modeHint === "auto") {
    mode = "auto";
  }

  const client = createCmcClient(mode === "auto" ? undefined : mode);
  const result = await beforeYouTrade(client, symbol, { dossier: true });

  let enrichment = null;
  try {
    enrichment = await enrichCheckSymbol(symbol);
  } catch {
    enrichment = null;
  }

  return {
    decision: result.decision,
    score: result.score,
    reasons: result.reasons,
    reason_chips: result.reason_chips,
    receipt: result.receipt,
    mode: client.mode,
    ...(enrichment
      ? {
          price_performance: enrichment.price_performance,
          ohlcv_spark: enrichment.ohlcv_spark,
          enrichment_source: enrichment.enrichment_source,
          ...(enrichment.enrichment_errors
            ? { enrichment_errors: enrichment.enrichment_errors }
            : {}),
        }
      : {}),
  };
}

/** Floor demos force fixture mode so the contrast is offline-deterministic. */
async function runDemoCheck(symbol: string) {
  return runCheck(symbol, "fixture");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  let path = url.pathname;

  if (path === "/duel-report.json") {
    const buf = await safeRead(join(ROOT, "duel-report.json"));
    if (!buf) {
      json(res, 404, { error: "Run pnpm witness duel --fixture first" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(buf);
    return;
  }

  if (path === "/api/receipts" || path === "/receipts.json") {
    const receipts = await loadReceipts();
    json(res, 200, { receipts, count: receipts.length });
    return;
  }

  if (path === "/api/market-floor") {
    try {
      const { getMarketFloor } = await import("../cmc/market-floor.js");
      const allowMock =
        url.searchParams.get("mock") === "1" ||
        process.env.CMC_WITNESS_MARKET_FLOOR_MOCK === "1";
      const forceRefresh = url.searchParams.get("refresh") === "1";
      const { status, body } = await getMarketFloor({ allowMock, forceRefresh });
      json(res, status, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
    return;
  }

  if (path === "/api/check") {
    const symbol = (url.searchParams.get("symbol") ?? "").trim();
    if (!symbol) {
      json(res, 400, { error: "Missing ?symbol=" });
      return;
    }
    try {
      const mode = url.searchParams.get("mode");
      const result = await runCheck(symbol, mode);
      json(res, 200, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
    return;
  }

  /** One-click: canonical BTC ALLOW vs junk BTC-ticker BLOCK contrast. */
  if (path === "/api/demo/collision") {
    try {
      const [canonical, junk] = await Promise.all([
        runDemoCheck("BTC"),
        runDemoCheck("FAKEBTC"),
      ]);
      json(res, 200, {
        demo: "fake-btc-collision",
        copy: "ALLOW = okay to touch, NOT “go long”. BLOCK = don’t touch.",
        canonical: { label: "Canonical BTC (id 1)", ...canonical },
        junk: { label: "Junk BTC ticker (spoof id)", ...junk },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
    return;
  }

  /** One-click: scammy / low-liq path → BLOCK. */
  if (path === "/api/demo/rug") {
    try {
      const result = await runDemoCheck("RUG");
      json(res, 200, {
        demo: "rug-contract",
        copy: "BLOCK = don’t touch. Low liq / extreme moves / weak DEX.",
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
    return;
  }

  /** Propose → Witness → Fill theatre ticket. */
  if (path === "/api/demo/order" && req.method === "POST") {
    try {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
        side?: string;
        symbol?: string;
        size?: number | string;
        mode?: string;
      };
      const side = String(body.side ?? "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
      const symbol = String(body.symbol ?? "BTC").trim().toUpperCase() || "BTC";
      const size = Number(body.size ?? 1);
      const gate = await runCheck(symbol, body.mode ?? "fixture");
      const fillAllowed = gate.decision === "allow" || gate.decision === "caution";
      json(res, 200, {
        demo: "propose-witness-fill",
        ticket: {
          side,
          symbol,
          size: Number.isFinite(size) ? size : 1,
          proposed_at: new Date().toISOString(),
        },
        gate: {
          decision: gate.decision,
          score: gate.score,
          reasons: gate.reasons,
          reason_chips: gate.reason_chips,
          receipt_id: gate.receipt?.id,
          mode: gate.mode,
        },
        fill: fillAllowed
          ? {
              status: "FILL allowed",
              note:
                gate.decision === "caution"
                  ? "CAUTION — fill permitted with reduced conviction; ALLOW ≠ long/short."
                  : "FILL allowed — Witness cleared touch. ALLOW ≠ go long/short.",
            }
          : {
              status: "REJECTED by Witness",
              note: "BLOCK — do not touch. Order rejected before size.",
            },
        receipt_id: gate.receipt?.id,
        copy: "Bots clear Witness before they size. ALLOW ≠ long/short. BLOCK = don’t touch.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
    return;
  }

  if (path === "/") path = "/index.html";
  const filePath = resolve(join(CONSOLE_DIR, path));
  if (!filePath.startsWith(CONSOLE_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  const buf = await safeRead(filePath);
  if (!buf) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(buf);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n◆  CMC Witness · Pre-trade Gate console`);
  console.log(`   http://127.0.0.1:${PORT}  (also 0.0.0.0)`);
  console.log(
    `   APIs: /api/market-floor · /api/check · /api/demo/collision · /api/demo/rug · POST /api/demo/order`,
  );
  console.log(`   Load duel: pnpm witness duel --fixture  (then refresh)\n`);
});
