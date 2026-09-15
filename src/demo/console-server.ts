#!/usr/bin/env node
/**
 * Lightweight static server for the Judge Console.
 * Serves ./console, ./duel-report.json, and receipt chain JSON.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n⚖  Court of Markets — Judge Console`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`   APIs: /duel-report.json  ·  /api/receipts`);
  console.log(`   Load duel: pnpm witness duel --fixture  (then refresh)\n`);
});
