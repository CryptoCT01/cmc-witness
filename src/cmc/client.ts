import { config as loadEnv } from "dotenv";
import { FixtureCmcClient } from "./fixture-client.js";
import { KeyCmcClient } from "./key-client.js";
import { X402CmcClient } from "./x402-client.js";
import type { AuthMode, CmcClient } from "./types.js";

loadEnv();

export type WitnessMode = "auto" | AuthMode;

function envMode(): WitnessMode {
  const raw = (process.env.CMC_WITNESS_MODE ?? "auto").toLowerCase();
  if (raw === "x402" || raw === "key" || raw === "fixture" || raw === "auto") {
    return raw;
  }
  return "auto";
}

function normalizePk(pk: string | undefined): `0x${string}` | undefined {
  if (!pk) return undefined;
  const trimmed = pk.trim();
  if (!trimmed) return undefined;
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

/**
 * Resolve CMC client:
 * 1. fixture — offline
 * 2. x402 — EVM_PRIVATE_KEY present
 * 3. key — CMC_API_KEY present
 * auto prefers x402 then key then fixture.
 */
export function createCmcClient(override?: WitnessMode): CmcClient {
  const mode = override ?? envMode();

  if (mode === "fixture") return new FixtureCmcClient();

  const pk = normalizePk(process.env.EVM_PRIVATE_KEY);
  const apiKey = process.env.CMC_API_KEY?.trim();

  if (mode === "x402") {
    if (!pk) throw new Error("CMC_WITNESS_MODE=x402 requires EVM_PRIVATE_KEY");
    return new X402CmcClient({ privateKey: pk });
  }

  if (mode === "key") {
    if (!apiKey) throw new Error("CMC_WITNESS_MODE=key requires CMC_API_KEY");
    return new KeyCmcClient(apiKey);
  }

  // auto
  if (pk) return new X402CmcClient({ privateKey: pk });
  if (apiKey) return new KeyCmcClient(apiKey);
  return new FixtureCmcClient();
}

export type { CmcClient, AuthMode };
