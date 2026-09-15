import { describe, expect, it } from "vitest";
import { FixtureCmcClient } from "../src/cmc/fixture-client.js";
import { ENDPOINTS, CMC_BASE_URL, CMC_HOSTED_MCP_URL } from "../src/cmc/endpoints.js";

describe("fixture client + endpoints contract", () => {
  it("loads listings and dex search fixtures", async () => {
    const client = new FixtureCmcClient();
    const listings = await client.getListingsLatest();
    expect(listings.data[0]?.symbol).toBe("BTC");
    const dex = await client.dexSearch("wbtc");
    expect(dex.data.tokens?.[0]?.symbol).toBe("WBTC");
  });

  it("documents required x402 paths", () => {
    expect(CMC_BASE_URL).toBe("https://pro-api.coinmarketcap.com");
    expect(ENDPOINTS.quotesLatest).toBe("/x402/v3/cryptocurrency/quotes/latest");
    expect(ENDPOINTS.listingsLatest).toBe("/x402/v3/cryptocurrency/listings/latest");
    expect(ENDPOINTS.dexSearch).toBe("/x402/v1/dex/search");
    expect(ENDPOINTS.dexPairsQuotesLatest).toBe("/x402/v4/dex/pairs/quotes/latest");
    expect(CMC_HOSTED_MCP_URL).toBe("https://mcp.coinmarketcap.com/x402/mcp");
  });

  it("errors clearly for unknown fixture symbols", async () => {
    const client = new FixtureCmcClient();
    await expect(client.getQuotesLatest("DOGE")).rejects.toThrow(/Fixture mode/);
  });
});
