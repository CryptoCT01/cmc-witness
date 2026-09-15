# CMC Witness

**Self-funding market-truth agent** for the CoinMarketCap **Build with CMC** hackathon  
Track: **AI Agents & Automation** · Tag: **#BuildwithCMC**

CMC Witness pays for CoinMarketCap data with **x402** (USDC on Base, ~$0.01/call), wraps it in an MCP server **we control**, and exposes a core gate:

```text
before_you_trade(symbol) → { decision, score, reasons[], receipt }
```

`decision` is `allow` | `caution` | `block`. The **Market Receipt** only contains metrics **observed** from CMC — Witness **never invents** RSI, fear/greed, or other synthetic indicators.

---

## Why this exists

Agents that trade or advise need **paid, attributable market truth** — not scraped guesses. x402 removes API-key onboarding friction; our MCP + receipt layer adds auditability judges (and users) can inspect.

| Path | Auth | Cost model |
|------|------|------------|
| **x402 (preferred)** | Wallet signs USDC on Base | ~$0.01 / request |
| **API key fallback** | `CMC_API_KEY` → `X-CMC_PRO_API_KEY` | Plan credits |
| **Fixture / dry-run** | None | Offline demos & CI |

Optional hosted MCP (we still ship our own):  
`https://mcp.coinmarketcap.com/x402/mcp`

---

## Quick start (judge demo — offline)

```bash
git clone https://github.com/CryptoCT01/cmc-witness.git
cd cmc-witness
pnpm install   # or: npm install
pnpm test
pnpm build

# Gate demo (no keys required)
pnpm witness check BTC --fixture
pnpm witness check RUG --fixture

# Contract checklist dump
pnpm witness contract
```

Expected: **BTC → allow**, **RUG → block**, JSON includes `receipt.observed_hash`.

---

## Live modes

```bash
cp .env.example .env
# For x402: fund a Base wallet with USDC, set EVM_PRIVATE_KEY
# For key fallback: set CMC_API_KEY

pnpm witness check BTC --x402
# or
pnpm witness check BTC --key

# MCP stdio server (Cursor / Claude Desktop / agents)
pnpm mcp
```

Example MCP config:

```json
{
  "mcpServers": {
    "cmc-witness": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/cmc-witness",
      "env": {
        "CMC_WITNESS_MODE": "fixture"
      }
    }
  }
}
```

---

## CMC endpoints (documented)

**Base:** `https://pro-api.coinmarketcap.com`

| Use | Method | Path |
|-----|--------|------|
| Quotes | GET | `/x402/v3/cryptocurrency/quotes/latest` |
| Listings | GET | `/x402/v3/cryptocurrency/listings/latest` |
| DEX search | GET | `/x402/v1/dex/search` |
| DEX pair quotes | GET | `/x402/v4/dex/pairs/quotes/latest` |

Key fallback uses classic Pro paths (`/v2/cryptocurrency/quotes/latest`, etc.) with header `X-CMC_PRO_API_KEY`.

---

## Project layout

```text
src/
  cmc/          # x402 client, key client, fixture client, endpoints
  witness/      # gate + Market Receipt + JSONL log
  mcp/          # MCP server tools we own
  cli.ts        # pnpm witness …
fixtures/       # offline BTC / ETH / RUG / listings / dex
tests/          # vitest — gate, receipt, contract paths
```

### MCP tools (ours)

| Tool | Purpose |
|------|---------|
| `before_you_trade` | Gate + receipt |
| `market_receipt_latest` | Last receipt in-process |
| `quote` | Raw quote via our client |
| `dex_search` | DEX keyword search |

Receipts append to `CMC_WITNESS_RECEIPT_LOG` (default `./receipts/market-receipts.jsonl`).

---

## Gate contract

```ts
type GateResult = {
  decision: "allow" | "caution" | "block";
  score: number;          // 0–100
  reasons: string[];
  receipt: MarketReceipt; // observed CMC fields + sha256
};
```

Heuristics (explicit, conservative): market cap, 24h volume, 1h/24h/7d percent moves, market pairs, circulating/total supply ratio, CMC rank. **Only fields present on the CMC payload are stored on the receipt.**

---

## Scripts

| Script | Action |
|--------|--------|
| `pnpm build` | Compile TypeScript → `dist/` |
| `pnpm test` | Offline vitest suite |
| `pnpm witness` | CLI (`check`, `quote`, `listings`, `dex-search`, `contract`) |
| `pnpm mcp` | Stdio MCP server |

---

## #BuildwithCMC checklist

- [x] Uses CMC data (quotes / listings / DEX)
- [x] **x402** pay-per-request path (USDC on Base) — no API key required
- [x] API key fallback via `X-CMC_PRO_API_KEY`
- [x] Own **MCP server** with receipt layer
- [x] Core agent tool: `before_you_trade`
- [x] CLI demo + JSONL Market Receipt log
- [x] Offline fixture mode for judges (no secrets)
- [x] MIT license, `.env.example`, never commit secrets
- [x] Documents CMC x402 endpoints + optional hosted MCP URL

---

## Security

- Never commit `.env` or private keys.
- Prefer a dedicated low-balance Base wallet for x402 micropayments.
- Witness does not execute trades — it only scores and receipts.

## x402 SDK notes

Published `@x402/axios` **v2** exports `wrapAxiosWithPayment` / `wrapAxiosWithPaymentFromConfig` + `ExactEvmScheme` from `@x402/evm`. Some CMC skill snippets mention `createX402AxiosClient` / `toClientEvmSigner`; those names may differ across doc revisions — this repo follows the **npm package exports**.

---

## License

MIT © CryptoCT01
