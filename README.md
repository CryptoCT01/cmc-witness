# Court of Markets — CMC Witness

**The market-truth judge for AI trading agents.**  
CoinMarketCap **Build with CMC** · Track: **AI Agents & Automation** · **#BuildwithCMC**

Agents that ape first and ask later are reckless. **CMC Witness** is opposing counsel: pay for CoinMarketCap (x402 or API key) → multi-endpoint **Market Dossier** → `allow | caution | block` → **tamper-evident receipt chain** replayable in the **Judge Console**.

```text
Reckless Agent proposes BTC → ETH → RUG → low-cap tail
         ↓
Witness dossier: quotes + listings + conditional DEX (+ Pro context when keyed)
         ↓
JUDGMENT + Market Receipt v2 (evidence[] · prev_hash · chain_height)
```

**Pro-smart gate:** live key mode folds Fear & Greed, BTC.D, ATH drawdown, and OHLCV range into the score as **reason chips** — never invents metrics. Fixture mode stays offline-deterministic.

**Judge wow (offline):** duel BTC/ETH/RUG → Fake BTC **collision** vs canonical ALLOW → rug/contract **BLOCK** → **Propose → Witness → Fill** order theatre → scrub the chain. **~18 Pro floor series** behind `/api/market-floor`. Witness never invents RSI.

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

Console one-clicks (fixture, no live credits): **Fake BTC collision** · **Rug path** · **Propose → Witness → Fill**.

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

Fullscreen terminal for judges — **~18 CMC Pro series** (global KPIs, F&G + mcap + BTC/ETH OHLCV, top board + logos, gainers/losers, trending, categories, airdrops) plus **Pro-smart gate**, collision/rug demos, **Propose → Witness → Fill**, scrubbable receipt chain, and **Duel Theatre**. Gate sits **in** market context. Honest labels: **ALLOW ≠ long/short**; **BLOCK = don’t touch**.

```bash
pnpm witness duel --fixture   # writes duel-report.json (+ receipts JSONL)
pnpm console                  # → http://127.0.0.1:4173
# with CMC_API_KEY in .env → live /api/market-floor
```

**How to open (offline judges)**

1. `pnpm witness duel --fixture` then `pnpm console` → **http://127.0.0.1:4173**.
2. Without a key, `/api/market-floor` returns **503** (or labeled **MOCK** via `?mock=1` / `CMC_WITNESS_MARKET_FLOOR_MOCK=1`).
3. Hit **Fake BTC** (canonical ALLOW vs junk ticker BLOCK) · **Rug path** · send an order ticket (**Propose → Fill**).
4. Hit **▶ Duel** (or Space) for Reckless vs Witness; scrub the receipt chain.
5. Optional live: set `CMC_API_KEY` → real `/api/market-floor` + Pro enrichment on `/api/check`.

Screenshots: `screenshots/judge-console.png`, `screenshots/judge-console-full.png`, `screenshots/judge-console-splash.png`.

### Console HTTP APIs

| Route | Purpose |
|-------|---------|
| `GET /api/market-floor` | Aggregated Pro market floor (~18 series, ~60s cache) |
| `GET /api/market-floor?refresh=1` | Bypass cache |
| `GET /api/market-floor?mock=1` | Labeled MOCK sample when no key |
| `GET /api/check?symbol=BTC` | Gate + receipt; Pro `price_performance` + `ohlcv_spark` when keyed |
| `GET /api/demo/collision` | Canonical BTC ALLOW vs FAKEBTC junk-ticker BLOCK |
| `GET /api/demo/rug` | RUG / low-liq path → BLOCK |
| `POST /api/demo/order` | Propose → Witness → Fill theatre ticket (`side`/`symbol`/`size`) |
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

### Pro market floor (`GET /api/market-floor`) — ~18 series

Parallel key-auth calls via `src/cmc/market-floor.ts` (credits cached ~60s; logos batch via `/v2/cryptocurrency/info`):

| Panel / series | Endpoint |
|----------------|----------|
| Total mcap / volume / BTC.D / ETH.D | `/v1/global-metrics/quotes/latest` |
| Global mcap spark (14d) | `/v1/global-metrics/quotes/historical?count=14&interval=daily` |
| Fear & Greed | `/v3/fear-and-greed/latest` |
| Fear & Greed history spark | `/v3/fear-and-greed/historical?limit=14` |
| Altcoin Season | `/v1/altcoin-season-index/latest` |
| Altcoin Season history | `/v1/altcoin-season-index/historical?time_period=30d` |
| Gainers | `/v1/cryptocurrency/trending/gainers-losers` |
| Losers | `/v1/cryptocurrency/listings/latest?sort=percent_change_24h&sort_dir=asc` |
| Trending | `/v1/cryptocurrency/trending/latest` |
| Most visited | `/v1/cryptocurrency/trending/most-visited` |
| New listings | `/v1/cryptocurrency/listings/new` |
| Categories by mcap | `/v1/cryptocurrency/categories?limit=10` |
| Top market-cap board | `/v1/cryptocurrency/listings/latest?limit=12&sort=market_cap` |
| BTC / ETH OHLCV charts | `/v2/cryptocurrency/ohlcv/historical?id=1|1027&time_period=daily&count=30` |
| BTC+ETH cycle highs/lows | `/v2/cryptocurrency/price-performance-stats/latest?id=1,1027` |
| Logos + tags (batch) | `/v2/cryptocurrency/info?id=…` |
| Ongoing airdrops | `/v1/cryptocurrency/airdrops?status=ONGOING&limit=6` (ENDED filtered out) |

### Check enrichment (`GET /api/check`)

When `CMC_API_KEY` is set, also attaches:

| Field | Endpoint |
|-------|----------|
| `price_performance` | `/v2/cryptocurrency/price-performance-stats/latest` |
| `ohlcv_spark` | `/v2/cryptocurrency/ohlcv/historical` (daily closes) |

Skipped on this plan (403): `content/*`, community trending, `market-pairs`, exchange quotes.

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
- [x] **Pro-smart gate** (F&G / BTC.D / ATH / OHLCV → reason chips when CMC returns them)
- [x] Fake BTC **collision** + rug demos · **Propose → Witness → Fill** theatre
- [x] Tamper-evident **receipt chain** (`pnpm witness chain`)
- [x] **Judge Console** + **~18-endpoint Pro floor** (`/api/market-floor`) for demo / live judging
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
