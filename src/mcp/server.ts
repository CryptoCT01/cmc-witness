#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCmcClient } from "../cmc/client.js";
import { registerWitnessTools } from "./tools.js";

async function main(): Promise<void> {
  const client = createCmcClient();
  const server = new McpServer({
    name: "cmc-witness",
    version: "0.1.0",
  });

  registerWitnessTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stderr only — stdout is MCP JSON-RPC
  console.error(
    `[cmc-witness mcp] ready (mode=${client.mode}). Tools: before_you_trade, market_receipt_latest, quote, dex_search`,
  );
}

main().catch((err) => {
  console.error("[cmc-witness mcp] fatal:", err);
  process.exit(1);
});
