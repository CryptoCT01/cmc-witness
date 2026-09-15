# Court of Markets — CMC Witness

**The market-truth judge for AI trading agents.**  
CoinMarketCap **Build with CMC** · Track: **AI Agents & Automation** · **#BuildwithCMC**

Agents that ape first and ask later are reckless. **CMC Witness** is the opposing counsel: it pays for CoinMarketCap data (x402 or API key), builds a multi-endpoint **Market Dossier**, scores `allow | caution | block`, and seals every call into a **tamper-evident receipt chain** judges can replay in the **Judge Console**.

```text
Reckless Agent proposes BTC → ETH → RUG → low-cap tail
         ↓
Witness dossier: quotes + listings + conditional dex/search
         ↓
JUDGMENT + Market Receipt v2 (evidence[] · prev_hash · chain_height)
```

**Why this wows:** not another “AI that reads a quote.” It’s a **courtroom demo** — duel the reckless agent, inspect endpoint evidence, verify the chain, open a dark crypto-native console. Metrics on the **receipt** are **only** what CMC returned for the gate. Witness **never invents** RSI or synthetic indicators. The console market floor shows **CMC’s own** Fear&Greed / Altcoin Season as labeled Pro context — not invented by Witness.

---

## Judge demo in 60 seconds (offline)

```bash
git clone https://github.com/CryptoCT01/cmc-witness.git
cd cmc-witness
pnpm install
pnpm test && pnpm build

# Reckless Agent vs Witness duel
pnpm witness duel --fixture
# → pretty terminal + duel-report.json

# Tamper-evident chain
pnpm witness chain

# Judge Console (open in browser)
pnpm console
# → http://127.0.0.1:4173
```

Expected duel: **BTC → ALLOW**, **ETH → ALLOW/CAUTION**, **RUG → BLOCK**, optional listings-tail micro-cap judged too.

---

## Core tools

| Surface | What it does |
|---------|----------------|
| `before_you_trade(symbol)` | Multi-endpoint dossier + gate + chained receipt |
| `investigate(symbol)` | Same dossier path; force-DEX optional |
| `pnpm witness duel` | Scripted reckless proposals → judgments → `duel-report.json` |
| `pnpm witness chain` | Print / verify `prev_hash` · `chain_height` integrity |
| `pnpm console` / `pnpm demo` | Local Judge Console UI |
| MCP stdio (`pnpm mcp`) | Tools agents can call from Cursor / Claude |

```ts
type GateResult = {
  decision: "allow" | "caution" | "block";
  score: number;          // 0–100
  reasons: string[];
  receipt: MarketReceipt; // v2: evidence[] + chain fields
};
```

---

## Multi-endpoint Market Dossier

One `investigate` / `before_you_trade` run records **every** CMC call on `receipt.evidence[]`:

| Endpoint (key / fixture path) | Role |
|-------------------------------|------|
| `/v1/cryptocurrency/quotes/latest` | Price, mcap, volume, % changes, supply, pairs |
| `/v1/cryptocurrency/listings/latest` | Rank context + peer comparison |
| `/v1/dex/search` | When symbol looks like a **contract** (`0x…`), **RUG**, or **low-cap / high rank** |

x402 mode uses the documented `/x402/v3/...` and `/x402/v1/dex/search` paths; the receipt still lists the exact path used. Each evidence row includes `endpoint`, `credit_count`, `status_timestamp`, and `used_for`. **Never invents metrics.**

---

## Tamper-evident receipt chain (v2)

```text
receipt_n.prev_hash  →  receipt_{n-1}.receipt_hash
receipt_n.chain_height = n
JSONL log: ./receipts/market-receipts.jsonl
```

```bash
pnpm witness chain          # human-readable verify
pnpm witness chain --json   # machine-readable
```

---

## Auth paths

| Path | Auth | Cost model |
|------|------|------------|
| **x402 (preferred)** | `EVM_PRIVATE_KEY` or `X402_PRIVATE_KEY` — USDC on Base | ~$0.01 / request |
| **API key** | `CMC_API_KEY` → `X-CMC_PRO_API_KEY` | Plan credits |
| **Fixture / dry-run** | None | Offline demos & CI |

```bash
cp .env.example .env
# Live key mode (prove a real CMC call):
pnpm witness investigate BTC --key

# x402 when wallet key is set:
pnpm witness check BTC --x402
```

Optional hosted MCP (we still ship our own receipt-layer MCP):  
`https://mcp.coinmarketcap.com/x402/mcp`

### How to prove a real API call

1. Set `CMC_API_KEY` in `.env` (gitignored).
2. Run `pnpm witness investigate BTC --key`.
3. Inspect `receipt.evidence[]` — each row shows the Pro path, `credit_count`, and `status_timestamp` from CMC.
4. Or run `pnpm witness duel --key` and open `pnpm console`.

---

## Judge Console + Pro Market Floor

Fullscreen-ready terminal for hackathon judges — **CMC Pro market floor** (live global KPIs, Fear&Greed, Altcoin Season, gainers/losers, trending, new listings, categories) plus the pre-trade gate, dossier evidence, scrubbable receipt chain, and **Duel Theatre**. Gate sits **in** market context, not alone. Honest labels: **gate ≠ buy**; Pro panels = market context from CMC.

```bash
pnpm witness duel --fixture   # writes duel-report.json (+ receipts JSONL)
pnpm console                  # → http://127.0.0.1:4173
# with CMC_API_KEY in .env → live /api/market-floor
```

**How to open**

1. Put `CMC_API_KEY` in `.env` (gitignored) for the live Pro floor. Without a key, `/api/market-floor` returns **503** (or labeled **MOCK** if `?mock=1` / `CMC_WITNESS_MARKET_FLOOR_MOCK=1`).
2. Run the fixture duel (offline gate demo).
3. `pnpm console` → open **http://127.0.0.1:4173**.
4. Market strip + panels load from **`GET /api/market-floor`** (in-memory cache ~55s).
5. Run a live check — verdict + dossier; when Pro key is present, **price-performance** + **OHLCV spark** attach.
6. Hit **Theatre** (or Space) for Reckless vs Witness; scrub the receipt chain.

Screenshots: `screenshots/judge-console.png`, `screenshots/judge-console-full.png`, `screenshots/judge-console-splash.png`.

### Console HTTP APIs

| Route | Purpose |
|-------|---------|
| `GET /api/market-floor` | Aggregated Pro market floor JSON (parallel CMC calls, ~55s cache) |
| `GET /api/market-floor?refresh=1` | Bypass cache |
| `GET /api/market-floor?mock=1` | Labeled MOCK sample when no key |
| `GET /api/check?symbol=BTC` | Gate + receipt; attaches `price_performance` + `ohlcv_spark` when key present |
| `GET /api/receipts` | Receipt chain JSONL |
| `GET /duel-report.json` | Latest duel report |

---

## CMC endpoints (documented)

**Base:** `https://pro-api.coinmarketcap.com`

### Gate stack (x402 + key)

| Use | x402 path | Key path |
|-----|-----------|----------|
| Quotes | `/x402/v3/cryptocurrency/quotes/latest` | `/v1/cryptocurrency/quotes/latest` |
| Listings | `/x402/v3/cryptocurrency/listings/latest` | `/v1/cryptocurrency/listings/latest` |
| DEX search | `/x402/v1/dex/search` | `/v1/dex/search` |
| DEX pair quotes | `/x402/v4/dex/pairs/quotes/latest` | `/v4/dex/pairs/quotes/latest` |

### Pro market floor (`GET /api/market-floor`)

Parallel key-auth calls via `src/cmc/market-floor.ts` (credits cached ~55s):

| Panel | Endpoint |
|-------|----------|
| Total mcap / volume / BTC.D / ETH.D | `/v1/global-metrics/quotes/latest` |
| Fear & Greed | `/v3/fear-and-greed/latest` |
| Altcoin Season | `/v1/altcoin-season-index/latest` |
| Gainers | `/v1/cryptocurrency/trending/gainers-losers` |
| Losers | `/v1/cryptocurrency/listings/latest?sort=percent_change_24h&sort_dir=asc` |
| Trending | `/v1/cryptocurrency/trending/latest` |
| Most visited | `/v1/cryptocurrency/trending/most-visited` |
| New listings | `/v1/cryptocurrency/listings/new` |
| Categories | `/v1/cryptocurrency/categories?limit=10` |

### Check enrichment (`GET /api/check`)

When `CMC_API_KEY` is set, also attaches:

| Field | Endpoint |
|-------|----------|
| `price_performance` | `/v2/cryptocurrency/price-performance-stats/latest` |
| `ohlcv_spark` | `/v2/cryptocurrency/ohlcv/historical` (daily closes) |

Skipped on this plan: `content/latest`, `exchange/listings`, `market-pairs`.

---

## Project layout

```text
src/
  cmc/          # x402 · key · fixture · market-floor + endpoints
  witness/      # gate · dossier · Market Receipt v2 · chain verify
  demo/         # duel.ts · console-server.ts (/api/market-floor)
  mcp/          # MCP server we own
  cli.ts
console/        # Judge Console + Pro market floor UI
fixtures/       # BTC / ETH / RUG / listings / dex
tests/
```

### MCP tools (ours)

`before_you_trade` · `investigate` · `market_receipt_latest` · `verify_chain` · `quote` · `dex_search`

---

## Scripts

| Script | Action |
|--------|--------|
| `pnpm build` | Compile TypeScript → `dist/` |
| `pnpm test` | Offline vitest (gate, chain, dossier, duel) |
| `pnpm witness` | CLI (`check`, `investigate`, `chain`, `duel`, …) |
| `pnpm duel` | Alias → reckless vs witness duel |
| `pnpm console` / `pnpm demo` | Judge Console on `:4173` |
| `pnpm mcp` | Stdio MCP server |

---

## #BuildwithCMC checklist

- [x] Uses CMC data (quotes / listings / DEX)
- [x] **Multi-endpoint dossier** with `evidence[]` on every receipt
- [x] **x402** pay-per-request path (USDC on Base) when `EVM_PRIVATE_KEY` / `X402_PRIVATE_KEY` set
- [x] API key fallback via `X-CMC_PRO_API_KEY` — live key mode supported
- [x] Own **MCP server** with receipt + chain layer
- [x] Core agent tool: `before_you_trade` (+ `investigate`)
- [x] Reckless vs Witness **duel** + `duel-report.json`
- [x] Tamper-evident **receipt chain** (`pnpm witness chain`)
- [x] **Judge Console** UI + **Pro market floor** (`/api/market-floor`) for demo video / live judging
- [x] Offline fixture mode for judges (no secrets)
- [x] MIT license, `.env.example`, never commit secrets
- [x] Documents CMC x402 endpoints + optional hosted MCP URL

---

## Security

- Never commit `.env` or private keys.
- Prefer a dedicated low-balance Base wallet for x402 micropayments.
- Witness does not execute trades — it only scores and receipts.

## x402 SDK notes

Published `@x402/axios` **v2** exports `wrapAxiosWithPaymentFromConfig` + `ExactEvmScheme` from `@x402/evm`. Live x402 pay still needs a funded Base wallet key from the user (`EVM_PRIVATE_KEY` or `X402_PRIVATE_KEY`).

---

## License

MIT © CryptoCT01
