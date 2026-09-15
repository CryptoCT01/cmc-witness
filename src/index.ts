export { createCmcClient } from "./cmc/client.js";
export { FixtureCmcClient } from "./cmc/fixture-client.js";
export { KeyCmcClient } from "./cmc/key-client.js";
export { X402CmcClient } from "./cmc/x402-client.js";
export { CMC_BASE_URL, CMC_HOSTED_MCP_URL, ENDPOINTS, KEY_ENDPOINTS } from "./cmc/endpoints.js";
export type { CmcClient, AuthMode, CryptoAsset, QuotesLatestResponse } from "./cmc/types.js";
export {
  beforeYouTrade,
  evaluateAsset,
  investigate,
  gatherDossier,
  createMarketReceipt,
  appendReceiptLog,
  getLatestReceipt,
  verifyReceiptChain,
  readChainTip,
  hashObserved,
  hashReceiptLink,
} from "./witness/index.js";
export type {
  Decision,
  GateResult,
  MarketReceipt,
  EvidenceEntry,
} from "./witness/index.js";
export { registerWitnessTools } from "./mcp/tools.js";
export { runDuel } from "./demo/duel.js";
export type { DuelReport, DuelRound } from "./demo/duel.js";
