export { beforeYouTrade, evaluateAsset } from "./gate.js";
export { investigate, gatherDossier, shouldProbeDex } from "./dossier.js";
export {
  createMarketReceipt,
  appendReceiptLog,
  getLatestReceipt,
  rememberReceipt,
  buildObserved,
  hashObserved,
  hashReceiptLink,
  readChainTip,
  verifyReceiptChain,
  defaultReceiptLogPath,
} from "./receipt.js";
export type {
  Decision,
  GateResult,
  MarketReceipt,
  GateInput,
  EvidenceEntry,
  ReceiptSchema,
} from "./types.js";
export type { ChainVerifyResult, ChainTip } from "./receipt.js";
export type { InvestigateOptions, DossierBundle } from "./dossier.js";

export {
  gatherProContext,
  applyProScoring,
  detectCollision,
  CANONICAL_IDS,
} from "./pro-context.js";
export type {
  ProContext,
  ProContextBundle,
  FearGreedCtx,
  PricePerfCtx,
  OhlcvVolCtx,
  CollisionCtx,
} from "./pro-context.js";
