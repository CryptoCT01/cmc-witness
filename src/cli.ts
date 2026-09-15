#!/usr/bin/env node
/**
 * CMC Witness CLI — Court of Markets
 *
 *   pnpm witness check BTC
 *   pnpm witness investigate RUG --fixture
 *   pnpm witness chain
 *   pnpm witness duel --fixture
 *   pnpm witness quote ETH --fixture
 *   pnpm witness listings --fixture
 *   pnpm witness dex-search bnb --fixture
 *   pnpm witness contract
 */
import { createCmcClient, type WitnessMode } from "./cmc/client.js";
import { CMC_BASE_URL, CMC_HOSTED_MCP_URL, ENDPOINTS, KEY_ENDPOINTS } from "./cmc/endpoints.js";
import {
  beforeYouTrade,
  investigate,
  verifyReceiptChain,
  defaultReceiptLogPath,
} from "./witness/index.js";
import { runDuel } from "./demo/duel.js";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
  const positional = args.filter((a) => !a.startsWith("--"));
  const command = positional[0] ?? "help";
  const rest = positional.slice(1);
  return { command, rest, flags, raw: args };
}

function resolveMode(flags: Set<string>): WitnessMode | undefined {
  if (flags.has("--fixture") || flags.has("--dry-run")) return "fixture";
  if (flags.has("--x402")) return "x402";
  if (flags.has("--key")) return "key";
  return undefined;
}

async function cmdCheck(symbol: string, flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const dossier = !flags.has("--no-dossier");
  const result = await beforeYouTrade(client, symbol, { dossier });
  console.log(JSON.stringify(result, null, 2));
  console.error(
    `\n→ decision=${result.decision} score=${result.score} mode=${client.mode} receipt=${result.receipt.id} height=${result.receipt.chain_height}`,
  );
  if (result.decision === "block") process.exitCode = 2;
  else if (result.decision === "caution") process.exitCode = 1;
}

async function cmdInvestigate(symbol: string, flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const result = await investigate(client, symbol, {
    forceDex: flags.has("--force-dex"),
  });
  console.log(JSON.stringify(result, null, 2));
  console.error(
    `\n→ investigate decision=${result.decision} score=${result.score} evidence=${result.receipt.evidence.length} height=${result.receipt.chain_height}`,
  );
  if (result.decision === "block") process.exitCode = 2;
  else if (result.decision === "caution") process.exitCode = 1;
}

async function cmdChain(flags: Set<string>): Promise<void> {
  const logPath = defaultReceiptLogPath();
  const result = await verifyReceiptChain(logPath);
  if (flags.has("--json")) {
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          count: result.count,
          height_max: result.height_max,
          errors: result.errors,
          log: logPath,
          receipts: result.receipts.map((r) => ({
            id: r.id,
            symbol: r.symbol,
            decision_hint: r.symbol,
            chain_height: r.chain_height,
            prev_hash: r.prev_hash,
            observed_hash: r.observed_hash,
            receipt_hash: r.receipt_hash,
            evidence: r.evidence?.map((e) => e.endpoint),
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Receipt chain: ${logPath}`);
    console.log(`  count=${result.count}  height_max=${result.height_max}  ok=${result.ok}`);
    for (const r of result.receipts) {
      const ev = (r.evidence ?? []).map((e) => e.endpoint).join(", ") || "—";
      console.log(
        `  [#${r.chain_height ?? "?"}] ${r.symbol.padEnd(6)} ${r.id.slice(0, 8)}… hash=${(r.receipt_hash ?? r.observed_hash).slice(0, 12)}… prev=${r.prev_hash ? r.prev_hash.slice(0, 12) + "…" : "genesis"}`,
      );
      console.log(`           evidence: ${ev}`);
    }
    if (result.errors.length) {
      console.error("\nIntegrity errors:");
      for (const e of result.errors) console.error(`  ✗ ${e}`);
      process.exitCode = 1;
    } else {
      console.log("\n✓ Chain integrity OK");
    }
  }
}

async function cmdQuote(symbol: string, flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const data = await client.getQuotesLatest(symbol);
  console.log(JSON.stringify({ mode: client.mode, data }, null, 2));
}

async function cmdListings(flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const data = await client.getListingsLatest(10);
  console.log(JSON.stringify({ mode: client.mode, data }, null, 2));
}

async function cmdDexSearch(keyword: string, flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const data = await client.dexSearch(keyword);
  console.log(JSON.stringify({ mode: client.mode, data }, null, 2));
}

function cmdContract(): void {
  const contract = {
    product: "CMC Witness — Court of Markets",
    track: "AI Agents & Automation",
    self_funding: "x402 USDC on Base (~$0.01/call) via @x402/axios + @x402/evm + viem",
    fallback: "CMC_API_KEY → header X-CMC_PRO_API_KEY",
    base_url: CMC_BASE_URL,
    endpoints: { x402: ENDPOINTS, key: KEY_ENDPOINTS },
    hosted_mcp_optional: CMC_HOSTED_MCP_URL,
    own_mcp_tools: [
      "before_you_trade",
      "investigate",
      "market_receipt_latest",
      "quote",
      "dex_search",
    ],
    gate_shape: "{ decision, score, reasons[], receipt }",
    receipt_schema: "cmc-witness.market-receipt/v2",
    chain: ["prev_hash", "chain_height", "receipt_hash", "evidence[]"],
    rules: [
      "Never invent metrics — only observed CMC fields enter the Market Receipt",
      "Never commit secrets (.env is gitignored)",
      "Multi-endpoint dossier records every path used in evidence[]",
    ],
  };
  console.log(JSON.stringify(contract, null, 2));
}

function help(): void {
  console.log(`CMC Witness — Court of Markets (Build with CMC)

Usage:
  pnpm witness check <SYMBOL> [--fixture|--x402|--key] [--no-dossier]
  pnpm witness investigate <SYMBOL> [--fixture|--x402|--key] [--force-dex]
  pnpm witness chain [--json]
  pnpm witness duel [--fixture|--x402|--key] [--out duel-report.json]
  pnpm witness quote <SYMBOL> [--fixture|--x402|--key]
  pnpm witness listings [--fixture|--x402|--key]
  pnpm witness dex-search <KEYWORD> [--fixture|--x402|--key]
  pnpm witness contract
  pnpm console          # Judge Console UI
  pnpm mcp

Examples (offline / judge demo):
  pnpm witness check BTC --fixture
  pnpm witness investigate RUG --fixture
  pnpm witness duel --fixture
  pnpm witness chain
  pnpm console
`);
}

async function main(): Promise<void> {
  const { command, rest, flags, raw } = parseArgs(process.argv);

  switch (command) {
    case "check":
      if (!rest[0]) throw new Error("check requires a SYMBOL");
      await cmdCheck(rest[0], flags);
      break;
    case "investigate":
      if (!rest[0]) throw new Error("investigate requires a SYMBOL");
      await cmdInvestigate(rest[0], flags);
      break;
    case "chain":
      await cmdChain(flags);
      break;
    case "duel":
      await runDuel({
        mode: resolveMode(flags),
        outPath: raw.includes("--out") ? raw[raw.indexOf("--out") + 1] : undefined,
      });
      break;
    case "quote":
      if (!rest[0]) throw new Error("quote requires a SYMBOL");
      await cmdQuote(rest[0], flags);
      break;
    case "listings":
      await cmdListings(flags);
      break;
    case "dex-search":
      if (!rest[0]) throw new Error("dex-search requires a KEYWORD");
      await cmdDexSearch(rest[0], flags);
      break;
    case "contract":
      cmdContract();
      break;
    case "help":
    case "--help":
    case "-h":
      help();
      break;
    default:
      help();
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
