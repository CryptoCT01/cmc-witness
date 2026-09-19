# DoraHacks · Build with CMC — Submission Pack

**Court of Markets — CMC Witness**  
Repo: https://github.com/CryptoCT01/cmc-witness

---

## 1. One-liner + track

**CMC Witness** — pre-trade gate for AI trading agents: pay CMC (x402 or key) → multi-endpoint dossier → `allow | caution | block` → tamper-evident Market Receipts. Pro-smart score (F&G / BTC.D / ATH / OHLCV chips) · Fake BTC collision & rug demos · Propose→Fill theatre · ~18-endpoint Pro floor.

**Track:** AI Agents & Automation · **#BuildwithCMC**

---

## 2. Problem / solution

**Problem.** Agent bots that ape first and ask later size positions on a single ticker string, a stale quote, or a colliding slug. ALLOW is not a long thesis — but without a pre-trade gate, bots treat it like one.

**Solution.** Before size, agents call Witness (`before_you_trade` / `investigate`). Witness gathers CMC quotes + listings (+ conditional DEX), scores evidence only (never invents RSI or synthetic indicators), returns `allow | caution | block`, and appends a chained **Market Receipt**. Reckless proposals (e.g. RUG / low-cap tail) get BLOCK; majors clear ALLOW/CAUTION with receipts judges can replay.

---

## 3. What we built

| Surface | Role |
|---------|------|
| **Own MCP server** (`pnpm mcp`) | Tools: `before_you_trade`, `investigate`, `market_receipt_latest`, `verify_chain`, `quote`, `dex_search` — agents call from Cursor / Claude |
| **x402 pay path** | USDC on Base via `EVM_PRIVATE_KEY` / `X402_PRIVATE_KEY`; preferred when set (~$0.01 / request) |
| **Market Receipts v2** | `evidence[]` · `prev_hash` · `chain_height` · JSONL at `./receipts/market-receipts.jsonl` |
| **Pro-smart gate** | F&G · BTC.D · ATH drawdown · OHLCV range enter the **score** as reason chips when CMC returns them (fixtures stay offline-deterministic) |
| **Pro Market Floor** | ~18 CMC series in Judge Console: global KPIs, F&G, Altcoin Season, top board + logos, gainers/losers, trending, categories, airdrops, BTC/ETH OHLCV |
| **Collision / rug demos** | `/api/demo/collision` (canonical BTC vs FAKEBTC) · `/api/demo/rug` → BLOCK |
| **Propose → Witness → Fill** | `POST /api/demo/order` — simulated agent ticket; FILL allowed or REJECTED by Witness |
| **Pre-trade gate** | `allow \| caution \| block` + score 0–100 + reasons; **ALLOW ≠ long/short** — labeled honestly in UI |

Also: Reckless vs Witness **duel** (`pnpm witness duel --fixture`), offline fixtures for judges, MIT + `.env.example`.

---

## 4. Exact CMC endpoints used

**Base:** `https://pro-api.coinmarketcap.com`

### Gate stack (x402 + key)

| Use | x402 path | Key path |
|-----|-----------|----------|
| Quotes | `/x402/v3/cryptocurrency/quotes/latest` | `/v1/cryptocurrency/quotes/latest` |
| Listings | `/x402/v3/cryptocurrency/listings/latest` | `/v1/cryptocurrency/listings/latest` |
| DEX search | `/x402/v1/dex/search` | `/v1/dex/search` |
| DEX pair quotes | `/x402/v4/dex/pairs/quotes/latest` | `/v4/dex/pairs/quotes/latest` |

### Pro market floor (`GET /api/market-floor`) — ~18 series

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
| BTC / ETH OHLCV charts | `/v2/cryptocurrency/ohlcv/historical?id=1\|1027&time_period=daily&count=30` |
| BTC+ETH cycle highs/lows | `/v2/cryptocurrency/price-performance-stats/latest?id=1,1027` |
| Logos + tags (batch) | `/v2/cryptocurrency/info?id=…` |
| Ongoing airdrops | `/v1/cryptocurrency/airdrops?status=ONGOING&limit=6` |

### Check enrichment (`GET /api/check`)

| Field | Endpoint |
|-------|----------|
| `price_performance` | `/v2/cryptocurrency/price-performance-stats/latest` |
| `ohlcv_spark` | `/v2/cryptocurrency/ohlcv/historical` |

Optional hosted MCP (we still ship our own receipt-layer MCP): `https://mcp.coinmarketcap.com/x402/mcp`

---

## 5. How to prove a real API call

### API key

1. Set `CMC_API_KEY` in `.env` (gitignored).
2. Run `pnpm witness investigate BTC --key`.
3. Inspect `receipt.evidence[]` — each row shows the Pro path, `credit_count`, and `status_timestamp` from CMC.
4. Or `pnpm witness duel --key` then `pnpm console` → live `/api/market-floor` + gate.

### x402

1. Set `EVM_PRIVATE_KEY` or `X402_PRIVATE_KEY` (funded Base wallet, USDC).
2. Run `pnpm witness check BTC --x402`.
3. Receipt lists the exact `/x402/v3/...` or `/x402/v1/dex/search` path used; payment settles per request.

Fixture mode (`--fixture`) proves the gate + chain offline with no secrets.

---

## 6. Demo script (60–90s video)

| Beat | Time | On screen / VO |
|------|------|----------------|
| Hook | 0–8s | Splash: “pre-trade gate for AI agents” · Track badge · #BuildwithCMC |
| Problem | 8–18s | Reckless agent proposes BTC → ETH → RUG → low-cap tail |
| Duel | 18–32s | `pnpm witness duel --fixture` → BTC ALLOW, ETH ALLOW/CAUTION, RUG BLOCK · `duel-report.json` |
| Collision / rug | 32–45s | Fake BTC collision (ALLOW vs junk BLOCK) · Rug path BLOCK · reason chips |
| Propose→Fill | 45–58s | Order ticket: Propose → Witness → FILL allowed / REJECTED |
| Receipts + floor | 58–78s | Scrub chain (`prev_hash`) · Pro floor (~18 series / MOCK offline) |
| Close | 78–90s | MCP · x402 · repo URL · “ALLOW ≠ long — bots clear Witness before size” |

Screenshots: `screenshots/judge-console.png`, `judge-console-full.png`, `judge-console-splash.png`.

---

## 7. X post draft

```text
AI agents that ape first get wrecked.

CMC Witness is opposing counsel for trading bots:
• Pro-smart gate (F&G / BTC.D / ATH / OHLCV chips — never invents metrics)
• Fake BTC collision + rug demos · Propose→Fill theatre
• Tamper-evident Market Receipts + ~18-endpoint Pro floor
• x402 pay-per-call or CMC API key

Track: AI Agents & Automation
https://github.com/CryptoCT01/cmc-witness

#BuildwithCMC @CoinMarketCap
```

---

## 8. Repo URL

https://github.com/CryptoCT01/cmc-witness

---

## 9. What the API enabled / where it got in the way (honest)

**Enabled**

- Credible multi-endpoint dossiers: quotes, listings, conditional DEX — enough to judge majors vs rug-like / colliding tickers without inventing metrics.
- Pro-smart gate: Fear & Greed, BTC.D, ATH drawdown, OHLCV range feed the **score** (reason chips) when CMC returns them.
- ~18-series Pro Market Floor so the gate sits in live market context; collision + Propose→Fill demos for judges offline.
- x402 path for pay-per-request demos; key path for credit-efficient floor aggregation (~60s cache).
- `status_timestamp` + `credit_count` on evidence rows — judges can verify a real CMC response.

**Got in the way**

- **DEX busy / flaky:** DEX search and pair quotes are plan-sensitive and sometimes slow or empty under load; we treat DEX as conditional evidence, not a hard dependency for every symbol.
- **Content 403:** `content/*`, community trending, `market-pairs`, and exchange quotes return 403 on this plan — skipped; floor stays on endpoints we can actually call.
- **v3 quote arrays:** x402 `/x402/v3/.../quotes/latest` often returns `quote` as an array of `{ symbol, price… }` instead of `{ USD: … }` — we normalize both shapes before the gate.
- **Ticker collisions:** CMC returns many assets for one symbol (e.g. BTC spam listings). We pick the canonical listing by `cmc_rank` / id so the gate does not score a decoy slug.

Witness never executes trades — it only scores and receipts.

---

MIT © CryptoCT01
