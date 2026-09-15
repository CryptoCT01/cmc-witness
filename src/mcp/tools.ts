import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CmcClient } from "../cmc/types.js";
import {
  beforeYouTrade,
  investigate,
  getLatestReceipt,
  verifyReceiptChain,
  defaultReceiptLogPath,
} from "../witness/index.js";

function jsonText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Register Witness MCP tools wrapping our CMC client (receipt layer we control).
 * Tools: before_you_trade, investigate, market_receipt_latest, quote, dex_search, verify_chain
 */
export function registerWitnessTools(server: McpServer, client: CmcClient): void {
  server.registerTool(
    "before_you_trade",
    {
      title: "Before You Trade",
      description:
        "Gate a symbol with allow|caution|block, score, reasons, and a Market Receipt built only from observed CMC metrics (multi-endpoint dossier by default).",
      inputSchema: {
        symbol: z.string().describe("Ticker symbol, e.g. BTC or ETH"),
      },
    },
    async ({ symbol }) => {
      const result = await beforeYouTrade(client, symbol);
      return jsonText(result);
    },
  );

  server.registerTool(
    "investigate",
    {
      title: "Investigate (Market Dossier)",
      description:
        "Multi-endpoint dossier: quotes/latest + listings/latest + conditional dex/search. Records every endpoint on receipt.evidence[].",
      inputSchema: {
        symbol: z.string().describe("Ticker or contract address"),
        force_dex: z
          .boolean()
          .optional()
          .describe("Force DEX search even for large-cap symbols"),
      },
    },
    async ({ symbol, force_dex }) => {
      const result = await investigate(client, symbol, { forceDex: force_dex });
      return jsonText(result);
    },
  );

  server.registerTool(
    "market_receipt_latest",
    {
      title: "Latest Market Receipt",
      description: "Return the most recent Market Receipt produced by this Witness process.",
      inputSchema: {},
    },
    async () => {
      const receipt = getLatestReceipt();
      if (!receipt) {
        return jsonText({
          error: "No receipt yet. Call before_you_trade or investigate first.",
        });
      }
      return jsonText(receipt);
    },
  );

  server.registerTool(
    "verify_chain",
    {
      title: "Verify Receipt Chain",
      description: "Verify tamper-evident prev_hash / chain_height integrity of the JSONL receipt log.",
      inputSchema: {},
    },
    async () => {
      const result = await verifyReceiptChain(defaultReceiptLogPath());
      return jsonText({
        ok: result.ok,
        count: result.count,
        height_max: result.height_max,
        errors: result.errors,
      });
    },
  );

  server.registerTool(
    "quote",
    {
      title: "CMC Quote",
      description: "Fetch latest cryptocurrency quote via Witness CMC client (x402|key|fixture).",
      inputSchema: {
        symbol: z.string().describe("Ticker symbol"),
      },
    },
    async ({ symbol }) => {
      const data = await client.getQuotesLatest(symbol);
      return jsonText({ mode: client.mode, data });
    },
  );

  server.registerTool(
    "dex_search",
    {
      title: "DEX Search",
      description: "Search DEX tokens by keyword via Witness CMC client.",
      inputSchema: {
        keyword: z.string().describe("Name, symbol, or contract fragment"),
      },
    },
    async ({ keyword }) => {
      const data = await client.dexSearch(keyword);
      return jsonText({ mode: client.mode, data });
    },
  );
}
