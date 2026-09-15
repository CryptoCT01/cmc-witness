#!/usr/bin/env node
/**
 * CMC Witness CLI
 *
 *   pnpm witness check BTC
 *   pnpm witness check RUG --fixture
 *   pnpm witness quote ETH --fixture
 *   pnpm witness listings --fixture
 *   pnpm witness dex-search bnb --fixture
 *   pnpm witness contract
 */
import { createCmcClient, type WitnessMode } from "./cmc/client.js";
import { CMC_BASE_URL, CMC_HOSTED_MCP_URL, ENDPOINTS } from "./cmc/endpoints.js";
import { beforeYouTrade } from "./witness/index.js";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args.filter((a) => !a.startsWith("--"));
  const command = positional[0] ?? "help";
  const rest = positional.slice(1);
  return { command, rest, flags };
}

function resolveMode(flags: Set<string>): WitnessMode | undefined {
  if (flags.has("--fixture") || flags.has("--dry-run")) return "fixture";
  if (flags.has("--x402")) return "x402";
  if (flags.has("--key")) return "key";
  return undefined;
}

async function cmdCheck(symbol: string, flags: Set<string>): Promise<void> {
  const client = createCmcClient(resolveMode(flags));
  const result = await beforeYouTrade(client, symbol);
  console.log(JSON.stringify(result, null, 2));
  console.error(
    `\n→ decision=${result.decision} score=${result.score} mode=${client.mode} receipt=${result.receipt.id}`,
  );
  if (result.decision === "block") process.exitCode = 2;
  else if (result.decision === "caution") process.exitCode = 1;
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
    product: "CMC Witness",
    track: "AI Agents & Automation",
    self_funding: "x402 USDC on Base (~$0.01/call) via @x402/axios + @x402/evm + viem",
    fallback: "CMC_API_KEY → header X-CMC_PRO_API_KEY",
    base_url: CMC_BASE_URL,
    endpoints: ENDPOINTS,
    hosted_mcp_optional: CMC_HOSTED_MCP_URL,
    own_mcp_tools: [
      "before_you_trade",
      "market_receipt_latest",
      "quote",
      "dex_search",
    ],
    gate_shape: "{ decision, score, reasons[], receipt }",
    rules: [
      "Never invent metrics — only observed CMC fields enter the Market Receipt",
      "Never commit secrets (.env is gitignored)",
    ],
  };
  console.log(JSON.stringify(contract, null, 2));
}

function help(): void {
  console.log(`CMC Witness — self-funding market-truth agent

Usage:
  pnpm witness check <SYMBOL> [--fixture|--x402|--key]
  pnpm witness quote <SYMBOL> [--fixture|--x402|--key]
  pnpm witness listings [--fixture|--x402|--key]
  pnpm witness dex-search <KEYWORD> [--fixture|--x402|--key]
  pnpm witness contract
  pnpm mcp

Examples (offline / judge demo):
  pnpm witness check BTC --fixture
  pnpm witness check RUG --fixture
  pnpm witness contract
`);
}

async function main(): Promise<void> {
  const { command, rest, flags } = parseArgs(process.argv);

  switch (command) {
    case "check":
      if (!rest[0]) throw new Error("check requires a SYMBOL");
      await cmdCheck(rest[0], flags);
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
