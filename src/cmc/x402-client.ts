import axios, { type AxiosInstance } from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CMC_BASE_URL, ENDPOINTS } from "./endpoints.js";
import type {
  CmcClient,
  CryptoAsset,
  DexPairQuoteResponse,
  DexSearchResponse,
  ListingsLatestResponse,
  QuotesLatestResponse,
  UsdQuote,
} from "./types.js";

export interface X402ClientOptions {
  /** EVM private key (0x…) for USDC payments on Base. */
  privateKey: `0x${string}`;
  baseURL?: string;
  /** CAIP-2 network id. Base mainnet = eip155:8453 */
  network?: `${string}:${string}`;
  /** Base RPC for signer readContract / toClientEvmSigner. */
  rpcUrl?: string;
}

/** x402 v3 often returns quote as USD object OR as an array of { symbol:"USD", price... }. */
export function normalizeQuoteField(quote: unknown): { USD: UsdQuote } | undefined {
  if (!quote) return undefined;
  if (Array.isArray(quote)) {
    const usd = quote.find((q) => (q as { symbol?: string })?.symbol === "USD") as UsdQuote & {
      symbol?: string;
    };
    if (!usd) return undefined;
    return { USD: usd };
  }
  if (typeof quote === "object" && quote !== null && "USD" in quote) {
    return quote as { USD: UsdQuote };
  }
  return undefined;
}

export function normalizeAsset(raw: CryptoAsset): CryptoAsset {
  const q = normalizeQuoteField(raw.quote);
  return q ? { ...raw, quote: q } : raw;
}

/** Prefer canonical listing when CMC returns many tickers for one symbol (e.g. BTC spam). */
export function pickCanonicalAsset(assets: CryptoAsset[], symbol?: string): CryptoAsset | undefined {
  if (!assets.length) return undefined;
  const sym = symbol?.toUpperCase();
  const filtered = sym ? assets.filter((a) => a.symbol?.toUpperCase() === sym) : assets;
  const pool = filtered.length ? filtered : assets;
  return [...pool].sort((a, b) => {
    const ra = a.cmc_rank ?? Number.POSITIVE_INFINITY;
    const rb = b.cmc_rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return (a.id ?? 0) - (b.id ?? 0);
  })[0];
}

function normalizeQuotesPayload(raw: unknown, requestedSymbol?: string): QuotesLatestResponse {
  const body = raw as {
    status: QuotesLatestResponse["status"];
    data: CryptoAsset[] | Record<string, CryptoAsset | CryptoAsset[]>;
  };
  const data: Record<string, CryptoAsset> = {};

  if (Array.isArray(body.data)) {
    // Group by symbol, pick canonical per symbol; if requestedSymbol set, ensure that key exists.
    const bySym = new Map<string, CryptoAsset[]>();
    for (const asset of body.data) {
      if (!asset?.symbol) continue;
      const s = asset.symbol.toUpperCase();
      const list = bySym.get(s) ?? [];
      list.push(asset);
      bySym.set(s, list);
    }
    for (const [s, list] of bySym) {
      const picked = pickCanonicalAsset(list, s);
      if (picked) data[s] = normalizeAsset(picked);
    }
    if (requestedSymbol && !data[requestedSymbol.toUpperCase()]) {
      const picked = pickCanonicalAsset(body.data, requestedSymbol);
      if (picked) data[requestedSymbol.toUpperCase()] = normalizeAsset(picked);
    }
  } else {
    for (const [sym, val] of Object.entries(body.data ?? {})) {
      if (Array.isArray(val)) {
        const picked = pickCanonicalAsset(val as CryptoAsset[], sym);
        if (picked) data[sym] = normalizeAsset(picked);
      } else if (val && typeof val === "object") {
        data[sym] = normalizeAsset(val as CryptoAsset);
      }
    }
  }
  return { status: body.status, data };
}

/**
 * Pay-per-request CMC client via x402 (~$0.01 USDC on Base per call).
 */
export class X402CmcClient implements CmcClient {
  readonly mode = "x402" as const;
  private readonly http: AxiosInstance;

  constructor(opts: X402ClientOptions) {
    const account = privateKeyToAccount(opts.privateKey);
    const network: `${string}:${string}` = opts.network ?? "eip155:8453";
    const rpcUrl = opts.rpcUrl ?? process.env.BASE_RPC_URL ?? "https://base-rpc.publicnode.com";
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });
    const signer = toClientEvmSigner(account, publicClient);
    const payClient = new x402Client()
      .register(network, new ExactEvmScheme(signer))
      .register("eip155:*", new ExactEvmScheme(signer));

    this.http = wrapAxiosWithPayment(
      axios.create({
        baseURL: opts.baseURL ?? CMC_BASE_URL,
        headers: { Accept: "application/json" },
        timeout: 60_000,
      }),
      payClient,
    );
  }

  async getQuotesLatest(symbol: string): Promise<QuotesLatestResponse> {
    const { data } = await this.http.get(ENDPOINTS.quotesLatest, {
      params: { symbol: symbol.toUpperCase(), convert: "USD" },
    });
    return normalizeQuotesPayload(data, symbol);
  }

  async getListingsLatest(limit = 10): Promise<ListingsLatestResponse> {
    const { data } = await this.http.get(ENDPOINTS.listingsLatest, {
      params: { limit, convert: "USD" },
    });
    // listings may also use array quotes in v3 — normalize each
    const body = data as ListingsLatestResponse;
    return {
      ...body,
      data: Array.isArray(body.data) ? body.data.map((a) => normalizeAsset(a)) : body.data,
    };
  }

  async dexSearch(keyword: string): Promise<DexSearchResponse> {
    const { data } = await this.http.get<DexSearchResponse>(ENDPOINTS.dexSearch, {
      params: { q: keyword },
    });
    return data;
  }

  async getDexPairQuotes(params: Record<string, string>): Promise<DexPairQuoteResponse> {
    const { data } = await this.http.get<DexPairQuoteResponse>(ENDPOINTS.dexPairsQuotesLatest, {
      params,
    });
    return data;
  }
}
