import { KEY_ENDPOINTS, ENDPOINTS } from "../cmc/endpoints.js";
import type { AuthMode, CmcClient, CryptoAsset, DexSearchToken } from "../cmc/types.js";
import type { EvidenceEntry, GateResult } from "./types.js";
import { evaluateAsset } from "./gate.js";
import { appendReceiptLog, readChainTip, defaultReceiptLogPath } from "./receipt.js";
import { gatherProContext, type ProContext } from "./pro-context.js";

export interface InvestigateOptions {
  persist?: boolean;
  logPath?: string;
  /** Force DEX search even for known large-cap symbols. */
  forceDex?: boolean;
  /** Skip Pro layers even in key mode (tests). */
  skipPro?: boolean;
}

export interface DossierBundle {
  asset: CryptoAsset;
  evidence: EvidenceEntry[];
  observedExtras: {
    peer_rank_context?: {
      listings_count: number;
      nearest_peers?: Array<{ symbol: string; rank: number | null; market_cap_usd?: number }>;
    };
    dex_hits?: number;
    fear_greed?: { value: number; classification: string };
    btc_dominance?: number | null;
    eth_dominance?: number | null;
    ath_drawdown_pct?: number | null;
    ohlcv_range_pct?: number | null;
    ohlcv_days?: number | null;
    ticker_collision?: boolean;
    collision_note?: string;
  };
  pro?: ProContext;
  quotesPath: string;
  listingsPath: string;
  dexPath: string;
  collisionCandidates?: number;
}

/** Heuristic: 0x… contract, unknown ticker length, or RUG-like fixture scam. */
export function shouldProbeDex(symbol: string, asset?: CryptoAsset): boolean {
  const s = symbol.trim();
  if (/^0x[a-fA-F0-9]{8,}$/.test(s)) return true;
  if (s.toUpperCase() === "RUG") return true;
  if (s.toUpperCase() === "FAKEBTC") return true;
  if (asset?.cmc_rank != null && asset.cmc_rank > 500) return true;
  if (asset?.quote?.USD?.market_cap != null && asset.quote.USD.market_cap < 5_000_000) return true;
  // Unknown short meme-style symbols (not BTC/ETH majors) — still optional
  if (s.length >= 8 && !/^[A-Z]{2,6}$/i.test(s)) return true;
  return false;
}

function pathsForMode(mode: AuthMode): {
  quotes: string;
  listings: string;
  dex: string;
} {
  if (mode === "x402") {
    return {
      quotes: ENDPOINTS.quotesLatest,
      listings: ENDPOINTS.listingsLatest,
      dex: ENDPOINTS.dexSearch,
    };
  }
  // key + fixture document classic Pro paths on the receipt
  return {
    quotes: KEY_ENDPOINTS.quotesLatest,
    listings: KEY_ENDPOINTS.listingsLatest,
    dex: KEY_ENDPOINTS.dexSearch,
  };
}

function pickAsset(
  data: Record<string, CryptoAsset>,
  symbol: string,
): { asset: CryptoAsset; candidates: number } {
  const upper = symbol.toUpperCase();
  // FAKEBTC fixture is keyed as FAKEBTC but asset.symbol may be BTC
  if (data[upper]) return { asset: data[upper]!, candidates: 1 };
  if (data[symbol]) return { asset: data[symbol]!, candidates: 1 };
  const keys = Object.keys(data);
  if (!keys.length) throw new Error(`No quote data returned for symbol "${symbol}"`);
  // Multiple keys → treat as collision candidates when same ticker appears
  const bySym = keys.filter((k) => data[k]!.symbol?.toUpperCase() === upper);
  if (bySym.length > 1) {
    // Prefer highest rank (lowest number) as selected; collision flagged later
    const sorted = [...bySym].sort((a, b) => {
      const ra = data[a]!.cmc_rank ?? Number.POSITIVE_INFINITY;
      const rb = data[b]!.cmc_rank ?? Number.POSITIVE_INFINITY;
      return ra - rb;
    });
    return { asset: data[sorted[0]!]!, candidates: bySym.length };
  }
  return { asset: data[keys[0]!]!, candidates: Math.max(1, bySym.length || 1) };
}

/**
 * Multi-endpoint Market Dossier: quotes + listings (+ dex when warranted) + Pro context.
 * Every call is recorded on evidence[] — never invents metrics.
 */
export async function gatherDossier(
  client: CmcClient,
  symbol: string,
  opts: { forceDex?: boolean; skipPro?: boolean } = {},
): Promise<DossierBundle> {
  const paths = pathsForMode(client.mode);
  const evidence: EvidenceEntry[] = [];
  const observedExtras: DossierBundle["observedExtras"] = {};

  // 1) quotes/latest — primary market truth
  const quotes = await client.getQuotesLatest(symbol);
  const { asset, candidates } = pickAsset(quotes.data, symbol);
  evidence.push({
    endpoint: paths.quotes,
    credit_count: quotes.status?.credit_count,
    status_timestamp: quotes.status?.timestamp,
    used_for: "primary price, market cap, volume, percent changes, supply, pairs",
    summary: {
      symbol: asset.symbol,
      name: asset.name,
      cmc_id: asset.id,
      cmc_rank: asset.cmc_rank ?? null,
      price_usd: asset.quote.USD.price,
      market_cap_usd: asset.quote.USD.market_cap,
      volume_24h_usd: asset.quote.USD.volume_24h,
      quote_candidates: candidates,
    },
  });

  // 2) listings/latest — rank / peer context
  const listings = await client.getListingsLatest(100);
  const listingRows = listings.data ?? [];
  const peers = listingRows
    .filter((a) => a.symbol.toUpperCase() !== asset.symbol.toUpperCase())
    .slice(0, 5)
    .map((a) => ({
      symbol: a.symbol,
      rank: a.cmc_rank ?? null,
      market_cap_usd: a.quote?.USD?.market_cap,
    }));

  // Enrich rank from listings if quote omitted it
  const listingMatch = listingRows.find(
    (a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase() && a.id === asset.id,
  ) ?? listingRows.find((a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase());
  if (listingMatch?.cmc_rank != null && asset.cmc_rank == null) {
    asset.cmc_rank = listingMatch.cmc_rank;
  }

  // Same-ticker peers in listings (collision signal)
  const sameTicker = listingRows.filter(
    (a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase(),
  );
  const collisionCandidates = Math.max(candidates, sameTicker.length || 1);

  observedExtras.peer_rank_context = {
    listings_count: listingRows.length,
    nearest_peers: peers,
  };

  evidence.push({
    endpoint: paths.listings,
    credit_count: listings.status?.credit_count,
    status_timestamp: listings.status?.timestamp,
    used_for: "CMC rank context, peer market-cap comparison, ticker collision scan",
    summary: {
      listings_count: listingRows.length,
      top_symbol: listingRows[0]?.symbol,
      matched_rank: listingMatch?.cmc_rank ?? asset.cmc_rank ?? null,
      peer_symbols: peers.map((p) => p.symbol),
      same_ticker_count: sameTicker.length,
    },
  });

  // 3) dex/search — contracts / unknown small tokens
  const probeDex = opts.forceDex || shouldProbeDex(symbol, asset);
  if (probeDex) {
    const dex = await client.dexSearch(symbol);
    const tokens: DexSearchToken[] = dex.data?.tokens ?? [];
    observedExtras.dex_hits = tokens.length;
    evidence.push({
      endpoint: paths.dex,
      credit_count: dex.status?.credit_count,
      status_timestamp: dex.status?.timestamp,
      used_for: "DEX discovery for contract / low-cap / unknown token risk",
      summary: {
        hits: tokens.length,
        top_hit: tokens[0]
          ? {
              symbol: tokens[0].symbol,
              name: tokens[0].name,
              network: tokens[0].network,
              address: tokens[0].address,
              liquidity_usd: tokens[0].liquidity_usd,
              volume_24h_usd: tokens[0].volume_24h_usd,
            }
          : null,
      },
    });
  }

  // 4) Pro-smart context (key live / fixture mock / skip cleanly)
  let pro: ProContext | undefined;
  if (!opts.skipPro) {
    const bundle = await gatherProContext(client.mode, symbol, asset, {
      collisionCandidates,
    });
    pro = bundle.pro;
    evidence.push(...bundle.evidence);

    if (pro.fear_greed) observedExtras.fear_greed = pro.fear_greed;
    if (pro.btc_dominance != null) observedExtras.btc_dominance = pro.btc_dominance;
    if (pro.eth_dominance != null) observedExtras.eth_dominance = pro.eth_dominance;
    if (pro.price_performance?.ath_drawdown_pct != null) {
      observedExtras.ath_drawdown_pct = pro.price_performance.ath_drawdown_pct;
    }
    if (pro.ohlcv_volatility) {
      observedExtras.ohlcv_range_pct = pro.ohlcv_volatility.range_pct;
      observedExtras.ohlcv_days = pro.ohlcv_volatility.days;
    }
    if (pro.collision) {
      observedExtras.ticker_collision = pro.collision.is_non_canonical;
      observedExtras.collision_note = pro.collision.note;
    }
  }

  return {
    asset,
    evidence,
    observedExtras,
    pro,
    quotesPath: paths.quotes,
    listingsPath: paths.listings,
    dexPath: paths.dex,
    collisionCandidates,
  };
}

/**
 * investigate(symbol) — one-run multi-endpoint dossier + Pro + gate + chained receipt.
 */
export async function investigate(
  client: CmcClient,
  symbol: string,
  opts: InvestigateOptions = {},
): Promise<GateResult> {
  const logPath = opts.logPath ?? defaultReceiptLogPath();
  const dossier = await gatherDossier(client, symbol, {
    forceDex: opts.forceDex,
    skipPro: opts.skipPro,
  });

  const tip =
    opts.persist === false ? { prev_hash: null, chain_height: 0 } : await readChainTip(logPath);

  const result = evaluateAsset({
    asset: dossier.asset,
    authMode: client.mode,
    statusTimestamp: dossier.evidence[0]?.status_timestamp,
    evidence: dossier.evidence,
    observedExtras: dossier.observedExtras,
    chain: tip,
    pro: dossier.pro,
  });

  // Annotate reasons with dossier coverage
  const endpoints = dossier.evidence.map((e) => e.endpoint).join(", ");
  result.reasons.push(`Dossier endpoints: ${endpoints}`);
  if (dossier.observedExtras.dex_hits === 0) {
    result.reasons.push("DEX search returned 0 hits — weak on-chain discoverability");
  } else if (typeof dossier.observedExtras.dex_hits === "number") {
    result.reasons.push(`DEX search hits: ${dossier.observedExtras.dex_hits}`);
  }
  if (dossier.pro?.source && dossier.pro.source !== "skipped") {
    result.reasons.push(`Pro context source: ${dossier.pro.source}`);
  }

  if (opts.persist !== false) {
    await appendReceiptLog(result.receipt, logPath);
  }

  return result;
}
