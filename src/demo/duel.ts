#!/usr/bin/env node
/**
 * Reckless Agent vs Witness — Court of Markets duel demo.
 *
 *   pnpm witness duel --fixture
 *   pnpm duel --fixture
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createCmcClient, type WitnessMode } from "../cmc/client.js";
import { beforeYouTrade } from "../witness/index.js";
import type { Decision, GateResult } from "../witness/types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function decisionStyle(d: Decision): string {
  if (d === "allow") return c("green", "ALLOW");
  if (d === "caution") return c("yellow", "CAUTION");
  return c("red", "BLOCK");
}

function banner(): void {
  console.log(
    c(
      "cyan",
      `
╔══════════════════════════════════════════════════════════╗
║          COURT OF MARKETS — RECKLESS vs WITNESS          ║
║     Build with CMC · AI Agents track · #BuildwithCMC     ║
╚══════════════════════════════════════════════════════════╝
`,
    ),
  );
}

export interface DuelEvidenceRow {
  endpoint: string;
  credit_count?: number;
  status_timestamp?: string;
  used_for?: string;
}

export interface DuelRound {
  index: number;
  proposed: string;
  reckless_line: string;
  decision: Decision;
  score: number;
  reasons: string[];
  receipt_id: string;
  observed_hash: string;
  receipt_hash?: string;
  prev_hash?: string | null;
  chain_height: number;
  evidence_endpoints: string[];
  /** Full dossier evidence rows for Judge Console. */
  evidence: DuelEvidenceRow[];
}

export interface DuelReport {
  title: string;
  created_at: string;
  mode: string;
  rounds: DuelRound[];
  summary: {
    total: number;
    allow: number;
    caution: number;
    block: number;
  };
}

function parseFlags(argv: string[]): { mode?: WitnessMode; out?: string } {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  let mode: WitnessMode | undefined;
  if (flags.has("--fixture") || flags.has("--dry-run")) mode = "fixture";
  else if (flags.has("--x402")) mode = "x402";
  else if (flags.has("--key")) mode = "key";

  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  return { mode, out };
}

async function pickTailSymbol(mode: WitnessMode | undefined): Promise<string | null> {
  try {
    const client = createCmcClient(mode);
    const listings = await client.getListingsLatest(100);
    const tail = [...listings.data].sort(
      (a, b) => (b.cmc_rank ?? 0) - (a.cmc_rank ?? 0),
    );
    const pick = tail[0];
    if (!pick) return null;
    // Avoid re-proposing BTC/ETH
    if (["BTC", "ETH"].includes(pick.symbol.toUpperCase())) return null;
    return pick.symbol.toUpperCase();
  } catch {
    return null;
  }
}

const RECKLESS_LINES: Record<string, string> = {
  BTC: "Reckless Agent: \"BTC is going to the moon — full size, market order!\"",
  ETH: "Reckless Agent: \"ETH ETF flows = free money. Leverage it.\"",
  RUG: "Reckless Agent: \"RUG just 100x'd on CT — ape now, ask later!\"",
  DUST: "Reckless Agent: \"Micro-cap DUST — asymmetric upside, what's the worst?\"",
  TAIL: "Reckless Agent: \"Bottom of the listings = next gem. YOLO.\"",
};

export async function runDuel(opts: {
  mode?: WitnessMode;
  outPath?: string;
  persist?: boolean;
}): Promise<DuelReport> {
  banner();
  const client = createCmcClient(opts.mode);
  console.log(c("dim", `Witness mode: ${client.mode}`));
  console.log(c("dim", "Reckless Agent proposes a sequence. Witness judges each move.\n"));

  const sequence: string[] = ["BTC", "ETH", "RUG"];
  const tail = await pickTailSymbol(opts.mode);
  if (tail && !sequence.includes(tail)) sequence.push(tail);

  const rounds: DuelRound[] = [];
  let allow = 0;
  let caution = 0;
  let block = 0;

  for (let i = 0; i < sequence.length; i++) {
    const symbol = sequence[i]!;
    const line =
      RECKLESS_LINES[symbol] ??
      `Reckless Agent: \"${symbol} looks hot — send it.\"`;

    console.log(c("magenta", `──── Round ${i + 1}/${sequence.length} ────`));
    console.log(c("bold", "PROPOSE"), c("white", symbol));
    console.log(c("dim", line));

    let result: GateResult;
    try {
      result = await beforeYouTrade(client, symbol, {
        persist: opts.persist !== false,
        dossier: true,
      });
    } catch (err) {
      console.log(c("red", `Witness error: ${err instanceof Error ? err.message : err}`));
      continue;
    }

    if (result.decision === "allow") allow++;
    else if (result.decision === "caution") caution++;
    else block++;

    console.log(
      c("bold", "JUDGMENT"),
      decisionStyle(result.decision),
      c("cyan", `score=${result.score}`),
    );
    console.log(
      c("dim", `receipt=${result.receipt.id}  height=${result.receipt.chain_height}`),
    );
    console.log(
      c(
        "dim",
        `evidence: ${(result.receipt.evidence ?? []).map((e) => e.endpoint).join(" · ") || "(none)"}`,
      ),
    );
    for (const r of result.reasons.slice(0, 4)) {
      console.log(`  • ${r}`);
    }
    console.log();

    rounds.push({
      index: i + 1,
      proposed: symbol,
      reckless_line: line,
      decision: result.decision,
      score: result.score,
      reasons: result.reasons,
      receipt_id: result.receipt.id,
      observed_hash: result.receipt.observed_hash,
      receipt_hash: result.receipt.receipt_hash,
      prev_hash: result.receipt.prev_hash,
      chain_height: result.receipt.chain_height,
      evidence_endpoints: (result.receipt.evidence ?? []).map((e) => e.endpoint),
      evidence: (result.receipt.evidence ?? []).map((e) => ({
        endpoint: e.endpoint,
        credit_count: e.credit_count,
        status_timestamp: e.status_timestamp,
        used_for: e.used_for,
      })),
    });
  }

  const report: DuelReport = {
    title: "Court of Markets — Reckless Agent vs Witness",
    created_at: new Date().toISOString(),
    mode: client.mode,
    rounds,
    summary: {
      total: rounds.length,
      allow,
      caution,
      block,
    },
  };

  const outPath = resolve(opts.outPath ?? "./duel-report.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(c("cyan", "══════════ DUEL SUMMARY ══════════"));
  console.log(
    `  ${c("green", `allow=${allow}`)}  ${c("yellow", `caution=${caution}`)}  ${c("red", `block=${block}`)}  total=${rounds.length}`,
  );
  console.log(c("dim", `  wrote ${outPath}`));
  console.log(
    c(
      "dim",
      "  Tip: open Judge Console with `pnpm console` to replay this duel.\n",
    ),
  );

  return report;
}

async function main(): Promise<void> {
  const { mode, out } = parseFlags(process.argv.slice(2));
  await runDuel({ mode, outPath: out });
}

const isDirect =
  process.argv[1]?.includes("duel") ||
  process.argv[1]?.endsWith("demo/duel.ts") ||
  process.argv[1]?.endsWith("demo/duel.js");

if (isDirect) {
  main().catch((err) => {
    console.error("Duel failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
