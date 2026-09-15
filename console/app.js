/** CMC Witness · Pre-trade Gate + Pro Market Floor — viewport-locked floor */

const els = {
  splash: document.getElementById("splash"),
  floor: document.getElementById("floor"),
  enterBtn: document.getElementById("enterBtn"),
  feed: document.getElementById("feed"),
  evidenceBody: document.getElementById("evidenceBody"),
  reasonsList: document.getElementById("reasonsList"),
  chainTrack: document.getElementById("chainTrack"),
  chainFocus: document.getElementById("chainFocus"),
  chainScrub: document.getElementById("chainScrub"),
  chainHint: document.getElementById("chainHint"),
  kpiAllow: document.getElementById("kpiAllow"),
  kpiCaution: document.getElementById("kpiCaution"),
  kpiBlock: document.getElementById("kpiBlock"),
  kpiReceipts: document.getElementById("kpiReceipts"),
  kpiLast: document.getElementById("kpiLast"),
  usdcNoteBox: document.getElementById("usdcNoteBox"),
  reportMeta: document.getElementById("reportMeta"),
  floorMeta: document.getElementById("floorMeta"),
  modePill: document.getElementById("modePill"),
  sessMode: document.getElementById("sessMode"),
  sessFloor: document.getElementById("sessFloor"),
  fileInput: document.getElementById("fileInput"),
  reloadBtn: document.getElementById("reloadBtn"),
  refreshFloorBtn: document.getElementById("refreshFloorBtn"),
  theatreBtn: document.getElementById("theatreBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  stepper: document.getElementById("stepper"),
  verdictBlock: document.getElementById("verdictBlock"),
  verdictWord: document.getElementById("verdictWord"),
  verdictSub: document.getElementById("verdictSub"),
  scoreValue: document.getElementById("scoreValue"),
  caseIdx: document.getElementById("caseIdx"),
  caseSymbol: document.getElementById("caseSymbol"),
  recklessLine: document.getElementById("recklessLine"),
  proposeBubble: document.getElementById("proposeBubble"),
  judgeBubble: document.getElementById("judgeBubble"),
  duelStage: document.getElementById("duelStage"),
  gateForm: document.getElementById("gateForm"),
  symInput: document.getElementById("symInput"),
  runGateBtn: document.getElementById("runGateBtn"),
  gateHint: document.getElementById("gateHint"),
  clk: document.getElementById("clk"),
  toast: document.getElementById("toast"),
  floorBanner: document.getElementById("floorBanner"),
  bannerText: document.getElementById("bannerText"),
  heroMcap: document.getElementById("heroMcap"),
  heroVol: document.getElementById("heroVol"),
  heroBtcD: document.getElementById("heroBtcD"),
  heroEthD: document.getElementById("heroEthD"),
  mkFgVal: document.getElementById("mkFgVal"),
  mkFgClass: document.getElementById("mkFgClass"),
  mkFgSub: document.getElementById("mkFgSub"),
  fgRing: document.getElementById("fgRing"),
  fgChip: document.getElementById("fgChip"),
  fgSpark: document.getElementById("fgSpark"),
  mkAlt: document.getElementById("mkAlt"),
  mkAltSub: document.getElementById("mkAltSub"),
  altSpark: document.getElementById("altSpark"),
  mcapSpark: document.getElementById("mcapSpark"),
  mcapChip: document.getElementById("mcapChip"),
  btcSpark: document.getElementById("btcSpark"),
  btcChip: document.getElementById("btcChip"),
  btcCycle: document.getElementById("btcCycle"),
  ethSpark: document.getElementById("ethSpark"),
  ethChip: document.getElementById("ethChip"),
  ethCycle: document.getElementById("ethCycle"),
  topMcapBody: document.getElementById("topMcapBody"),
  gainersBody: document.getElementById("gainersBody"),
  losersBody: document.getElementById("losersBody"),
  trendingList: document.getElementById("trendingList"),
  visitedList: document.getElementById("visitedList"),
  newStrip: document.getElementById("newStrip"),
  catList: document.getElementById("catList"),
  airRow: document.getElementById("airRow"),
  airStrip: document.getElementById("airStrip"),
  enrichBlock: document.getElementById("enrichBlock"),
  perfGrid: document.getElementById("perfGrid"),
  sparkSvg: document.getElementById("sparkSvg"),
  drawer: document.getElementById("drawer"),
  drawerScrim: document.getElementById("drawerScrim"),
  drawerClose: document.getElementById("drawerClose"),
  drawerKicker: document.getElementById("drawerKicker"),
  drawerTitle: document.getElementById("drawerTitle"),
  drawerBody: document.getElementById("drawerBody"),
  modal: document.getElementById("modal"),
  modalScrim: document.getElementById("modalScrim"),
  modalClose: document.getElementById("modalClose"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  openChainBtn: document.getElementById("openChainBtn"),
  openDuelBtn: document.getElementById("openDuelBtn"),
  chainChipVal: document.getElementById("chainChipVal"),
  duelChipVal: document.getElementById("duelChipVal"),
  duelMount: document.getElementById("duelMount"),
  allowHelpBtn: document.getElementById("allowHelpBtn"),
  reasonChips: document.getElementById("reasonChips"),
  contrastBlock: document.getElementById("contrastBlock"),
  contrastAllowWord: document.getElementById("contrastAllowWord"),
  contrastAllowSub: document.getElementById("contrastAllowSub"),
  contrastBlockWord: document.getElementById("contrastBlockWord"),
  contrastBlockSub: document.getElementById("contrastBlockSub"),
  demoCollisionBtn: document.getElementById("demoCollisionBtn"),
  demoRugBtn: document.getElementById("demoRugBtn"),
  gateDemoCollision: document.getElementById("gateDemoCollision"),
  gateDemoRug: document.getElementById("gateDemoRug"),
  orderForm: document.getElementById("orderForm"),
  orderSym: document.getElementById("orderSym"),
  orderSize: document.getElementById("orderSize"),
  orderSubmit: document.getElementById("orderSubmit"),
  sideToggle: document.getElementById("sideToggle"),
  hudSteps: document.getElementById("hudSteps"),
  fillBlock: document.getElementById("fillBlock"),
  fillKicker: document.getElementById("fillKicker"),
  fillWord: document.getElementById("fillWord"),
  fillSub: document.getElementById("fillSub"),
  fillReceipt: document.getElementById("fillReceipt"),
};

const state = {
  report: null,
  receiptsById: new Map(),
  receipts: [],
  index: 0,
  theatre: false,
  theatreTimer: null,
  liveResult: null,
  marketFloor: null,
  drawerMode: null,
};

const HELP = {
  "help-gate": {
    title: "Live gate",
    body: `<p>Type a ticker (<b>BTC</b>) or contract. The gate scores CMC evidence — including Pro Fear&amp;Greed, BTC.D, ATH drawdown, OHLCV range when available — and returns <b>ALLOW / CAUTION / BLOCK</b>.</p><p><b>ALLOW = okay to touch, NOT “go long.”</b> Demo buttons: Fake BTC collision · Rug / contract.</p>`,
  },
  "help-dossier": {
    title: "Propose → Witness → Fill",
    body: `<p>Simulated agent order ticket. Agent proposes BUY/SELL · Witness runs <code>before_you_trade</code> · result is <b>FILL allowed</b> or <b>REJECTED by Witness</b> with a receipt id.</p><p>Every evidence row is a real CMC endpoint call. Never invents RSI.</p>`,
  },
  allow: {
    title: "What is ALLOW?",
    body: `<p><b>Bots clear Witness before they size.</b> ALLOW ≠ long/short. BLOCK = don’t touch.</p>
<p><b>ALLOW</b> — okay to touch (liquid / identifiable enough). Not a buy signal.</p>
<p><b>CAUTION</b> — thin books, regime stress, or incomplete identity — size carefully.</p>
<p><b>BLOCK</b> — rug-like / collision / dangerous — do not touch.</p>
<p>Pro chips (F&amp;G, BTC.D, ATH, OHLCV range) enter the score only when CMC returned them.</p>`,
  },
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortHash(h, n = 12) {
  if (!h) return "—";
  const s = String(h);
  return s.length <= n * 2 ? s : `${s.slice(0, n)}…${s.slice(-6)}`;
}

function tickNumber(el, to) {
  if (!el) return;
  const target = Math.round(Number(to) || 0);
  el.textContent = String(target);
  el.dataset.value = String(target);
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function fmtUsd(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `$${v.toFixed(digits)}`;
  if (abs >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toPrecision(3)}`;
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctClass(n) {
  if (n == null || Number.isNaN(Number(n))) return "";
  return Number(n) >= 0 ? "up" : "dn";
}

function sparkValues(series) {
  if (!Array.isArray(series) || !series.length) return [];
  return series.map((p) => (typeof p === "number" ? p : Number(p?.v))).filter((n) => Number.isFinite(n));
}

function renderSpark(svg, series, { strokeUp = "#3dff9c", strokeDn = "#ff5d6c", fill = true } = {}) {
  if (!svg) return;
  const vals = sparkValues(series);
  if (vals.length < 2) {
    svg.innerHTML = "";
    return null;
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const h = Number(svg.viewBox?.baseVal?.height || 40);
  const w = 200;
  const pad = 3;
  const pts = vals
    .map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * w;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = vals[vals.length - 1] >= vals[0];
  const stroke = up ? strokeUp : strokeDn;
  const fillCol = up ? "rgba(61,255,156,.12)" : "rgba(255,93,108,.12)";
  svg.innerHTML = `
    <polyline fill="none" stroke="${stroke}" stroke-width="1.7" points="${pts}" />
    ${fill ? `<polyline fill="${fillCol}" stroke="none" points="0,${h} ${pts} ${w},${h}" />` : ""}
  `;
  return { up, first: vals[0], last: vals[vals.length - 1], changePct: ((vals[vals.length - 1] - vals[0]) / (vals[0] || 1)) * 100 };
}

function logoHtml(c) {
  if (c?.logo) {
    return `<img class="coin-logo" src="${escapeHtml(c.logo)}" alt="" loading="lazy" width="16" height="16" />`;
  }
  const letter = String(c?.symbol || "?").slice(0, 1);
  return `<span class="coin-logo ph">${escapeHtml(letter)}</span>`;
}

function assetCell(c) {
  return `<div class="asset-cell">${logoHtml(c)}<div class="asset-meta"><span class="sym">${escapeHtml(c.symbol)}</span><span class="nm">${escapeHtml(c.name || "")}</span></div></div>`;
}

function openDrawer({ kicker, title, bodyHtml, mode }) {
  state.drawerMode = mode || null;
  els.drawerKicker.textContent = kicker || "Detail";
  els.drawerTitle.textContent = title || "—";
  els.drawerBody.innerHTML = "";
  if (typeof bodyHtml === "string") els.drawerBody.innerHTML = bodyHtml;
  else if (bodyHtml instanceof Node) els.drawerBody.appendChild(bodyHtml);
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  els.drawerScrim.hidden = false;
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
  els.drawerScrim.hidden = true;
  if (els.duelMount && !document.getElementById("duelMount")) {
    document.body.appendChild(els.duelMount);
  }
  if (els.duelMount) els.duelMount.hidden = true;
  state.drawerMode = null;
}

function openModal({ title, bodyHtml }) {
  els.modalTitle.textContent = title || "Help";
  els.modalBody.innerHTML = bodyHtml || "";
  els.modal.hidden = false;
  els.modal.setAttribute("aria-hidden", "false");
  els.modalScrim.hidden = false;
}

function closeModal() {
  els.modal.hidden = true;
  els.modal.setAttribute("aria-hidden", "true");
  els.modalScrim.hidden = true;
}

function enterFloor() {
  els.splash.classList.add("go");
  els.floor.classList.add("on");
  try { sessionStorage.setItem("cmc_witness_entered", "1"); } catch { /* */ }
}

function maybeAutoEnter() {
  const params = new URLSearchParams(location.search);
  if (params.get("floor") === "1" || params.get("enter") === "1" || params.get("skipSplash") === "1") {
    enterFloor();
    return;
  }
  try { if (sessionStorage.getItem("cmc_witness_entered") === "1") enterFloor(); } catch { /* */ }
}

function evidenceForRound(round) {
  if (Array.isArray(round?.evidence) && round.evidence.length) return round.evidence;
  const receipt = state.receiptsById.get(round?.receipt_id);
  if (receipt?.evidence?.length) return receipt.evidence;
  return (round?.evidence_endpoints ?? []).map((endpoint) => ({ endpoint }));
}

function receiptForRound(round) {
  return state.receiptsById.get(round?.receipt_id) ?? null;
}

function renderSummary(report) {
  const s = report.summary ?? {};
  tickNumber(els.kpiAllow, s.allow ?? 0);
  tickNumber(els.kpiCaution, s.caution ?? 0);
  tickNumber(els.kpiBlock, s.block ?? 0);
  tickNumber(els.kpiReceipts, state.receipts.length || s.total || (report.rounds ?? []).length);
  const mode = String(report.mode ?? "fixture").toUpperCase();
  els.modePill.innerHTML = `● <b>${escapeHtml(mode)}</b>`;
  els.sessMode.textContent = `Mode · ${mode.toLowerCase()}`;
  els.usdcNoteBox.hidden = mode !== "X402";
  els.reportMeta.textContent = `${report.title ?? "Duel"} · ${s.total ?? (report.rounds ?? []).length} rounds · ${state.receipts.length} receipts`;
  const n = (report.rounds ?? []).length;
  els.chainChipVal.textContent = `${n} linked · open →`;
  els.duelChipVal.textContent = n ? `${n} rounds · theatre →` : "Reckless vs Witness →";
}

function renderStepper(report) {
  const rounds = report.rounds ?? [];
  els.stepper.innerHTML = "";
  rounds.forEach((r, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `dot ${r.decision || ""}${i === state.index ? " active" : ""}`;
    b.title = `${r.proposed} · ${String(r.decision || "").toUpperCase()}`;
    b.addEventListener("click", () => selectRound(i, { animate: true }));
    els.stepper.appendChild(b);
  });
}

function renderFeed(report) {
  const rounds = report.rounds ?? [];
  els.feed.innerHTML = "";
  if (!rounds.length) {
    els.feed.innerHTML = `<div class="empty-note">No rounds yet. Run <code>pnpm witness duel --fixture</code>.</div>`;
    return;
  }
  rounds.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = `round${i === state.index ? " active" : ""}`;
    div.innerHTML = `
      <span class="idx">#${r.index ?? i + 1}</span>
      <div>
        <div class="sym">${escapeHtml(r.proposed)}</div>
        <div class="meta">score ${r.score} · h${r.chain_height ?? "?"}</div>
      </div>
      <span class="badge ${r.decision}">${escapeHtml(String(r.decision || "?").toUpperCase())}</span>
    `;
    div.addEventListener("click", () => selectRound(i, { animate: true }));
    els.feed.appendChild(div);
  });
}

function renderTheatre(round, { animate } = {}) {
  const reckless = els.duelStage.querySelector(".reckless-actor");
  const witness = els.duelStage.querySelector(".witness-actor");
  els.proposeBubble.classList.remove("show");
  els.judgeBubble.classList.remove("show");
  reckless.classList.remove("hot");
  witness.className = "actor witness-actor";
  els.proposeBubble.textContent = round?.reckless_line || "—";
  const dec = String(round?.decision || "—").toUpperCase();
  els.judgeBubble.innerHTML = round
    ? `${escapeHtml(dec)} <span style="color:var(--fg3);font-size:0.85em">· ${round.score}/100</span>`
    : "—";
  const show = () => {
    els.proposeBubble.classList.add("show");
    reckless.classList.add("hot");
    setTimeout(() => {
      els.judgeBubble.classList.add("show");
      witness.classList.add("hot", round?.decision || "");
    }, animate ? 280 : 0);
  };
  if (animate) setTimeout(show, 40);
  else show();
}

function hideEnrichment() {
  els.enrichBlock.hidden = true;
  els.perfGrid.innerHTML = "";
  els.sparkSvg.innerHTML = "";
}

function renderEnrichment(data) {
  const perf = data?.price_performance;
  const spark = data?.ohlcv_spark;
  if ((!perf || !perf.length) && (!spark || !spark.length)) {
    hideEnrichment();
    return;
  }
  els.enrichBlock.hidden = false;
  const order = ["24h", "7d", "30d", "all_time"];
  const sorted = [...(perf ?? [])].sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
  els.perfGrid.innerHTML = sorted
    .map((p) => {
      const cls = pctClass(p.percent_change);
      return `<div class="perf-cell">
        <div class="pl">${escapeHtml(p.period)}</div>
        <div class="pv ${cls}">${escapeHtml(fmtPct(p.percent_change))}</div>
      </div>`;
    })
    .join("");
  if (spark?.length) renderSpark(els.sparkSvg, spark.map((v) => ({ v })), { fill: true });
  else els.sparkSvg.innerHTML = "";
}

function chipClass(label) {
  const s = String(label || "").toLowerCase();
  if (/collision|block|rug|low mcap|low vol|spike|parabolic|0 dex/.test(s)) return "bad";
  if (/greed|fear|caution|thin|ath|range|unlock|rank/.test(s)) return "warn";
  if (/allow|pairs|healthy/.test(s)) return "ok";
  return "";
}

function renderReasonChips(chips) {
  if (!els.reasonChips) return;
  const list = chips ?? [];
  if (!list.length) {
    els.reasonChips.innerHTML = "";
    return;
  }
  els.reasonChips.innerHTML = list
    .map((c) => `<span class="rchip ${chipClass(c)}">${escapeHtml(c)}</span>`)
    .join("");
}

function hideContrast() {
  if (els.contrastBlock) els.contrastBlock.hidden = true;
}

function showContrast(payload) {
  if (!els.contrastBlock) return;
  const a = payload.canonical ?? {};
  const j = payload.junk ?? {};
  els.contrastAllowWord.textContent = String(a.decision || "—").toUpperCase();
  els.contrastAllowSub.textContent = `${a.label || "Canonical"} · score ${a.score ?? "—"}`;
  els.contrastBlockWord.textContent = String(j.decision || "—").toUpperCase();
  els.contrastBlockSub.textContent = `${j.label || "Junk"} · score ${j.score ?? "—"}`;
  els.contrastBlock.hidden = false;
}

function applyVerdictView({ decision, score, symbol, sub, caseIdx, recklessLine, reasons, evidence, enrichment, reason_chips, keepContrast }) {
  const d = decision || "";
  els.verdictBlock.dataset.decision = d;
  els.verdictWord.textContent = d ? String(d).toUpperCase() : "STANDBY";
  els.verdictSub.textContent = sub || "Awaiting symbol or duel round";
  els.scoreValue.textContent = score == null || score === "" ? "—" : String(score);
  els.caseSymbol.textContent = symbol || "—";
  if (els.caseIdx && caseIdx) els.caseIdx.textContent = caseIdx;
  els.recklessLine.textContent = recklessLine || "Load a duel report or run the gate.";
  els.kpiLast.textContent = d ? String(d).toUpperCase() : "—";
  els.kpiLast.style.color =
    d === "allow" ? "var(--green)" : d === "caution" ? "var(--amber)" : d === "block" ? "var(--red)" : "var(--cyan)";

  const rs = reasons ?? [];
  els.reasonsList.innerHTML = rs.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  renderReasonChips(reason_chips);
  if (!keepContrast) hideContrast();

  const rows = evidence ?? [];
  if (!rows.length) {
    els.evidenceBody.innerHTML = `<tr><td colspan="3" class="empty">No evidence yet.</td></tr>`;
  } else {
    els.evidenceBody.innerHTML = rows
      .map(
        (e) => `<tr>
        <td>${escapeHtml(e.endpoint)}</td>
        <td>${escapeHtml(e.credit_count ?? "—")}</td>
        <td style="font-family:var(--ui);color:var(--fg2)">${escapeHtml(e.used_for ?? e.status_timestamp ?? "—")}</td>
      </tr>`,
      )
      .join("");
  }
  if (enrichment) renderEnrichment(enrichment);
  else hideEnrichment();
}

function renderVerdict(round) {
  if (!round) {
    applyVerdictView({});
    return;
  }
  applyVerdictView({
    decision: round.decision,
    score: round.score ?? 0,
    symbol: round.proposed,
    sub: `Pre-trade gate for ${round.proposed} · height ${round.chain_height ?? "—"}`,
    caseIdx: `ROUND ${round.index ?? state.index + 1}`,
    recklessLine: round.reckless_line || "",
    reasons: round.reasons ?? [],
    reason_chips: round.reason_chips ?? [],
    evidence: evidenceForRound(round),
  });
}

function chainRowsFromReport(report) {
  const rounds = report.rounds ?? [];
  return rounds.map((r, i) => {
    const receipt = receiptForRound(r);
    return {
      index: i,
      symbol: r.proposed,
      decision: r.decision,
      score: r.score,
      chain_height: r.chain_height ?? i,
      observed_hash: r.observed_hash,
      receipt_hash: r.receipt_hash ?? receipt?.receipt_hash,
      prev_hash: r.prev_hash ?? receipt?.prev_hash ?? null,
      receipt_id: r.receipt_id,
    };
  });
}

function renderChain(report) {
  const nodes = chainRowsFromReport(report);
  if (!nodes.length) {
    els.chainTrack.innerHTML = `<div class="empty-note">Chain appears after a duel report.</div>`;
    els.chainFocus.textContent = "No chain data.";
    els.chainScrub.max = "0";
    if (els.chainHint) els.chainHint.textContent = "prev_hash trail · scrub to inspect";
    return;
  }
  els.chainScrub.max = String(nodes.length - 1);
  els.chainScrub.value = String(state.index);
  if (els.chainHint) els.chainHint.textContent = `${nodes.length} linked blocks · integrity via prev_hash → receipt_hash`;
  els.chainTrack.innerHTML = nodes
    .map((n, i) => {
      const prev = n.prev_hash == null ? "genesis" : shortHash(n.prev_hash);
      return `<div class="chain-node${i === state.index ? " active" : ""}" data-i="${i}">
        <div class="h">HEIGHT ${escapeHtml(n.chain_height)}</div>
        <div class="sym">${escapeHtml(n.symbol)} · ${escapeHtml(String(n.decision || "").toUpperCase())}</div>
        <div class="hash">obs ${escapeHtml(shortHash(n.observed_hash))}</div>
        <div class="link">prev ${escapeHtml(prev)}</div>
      </div>`;
    })
    .join("");
  els.chainTrack.querySelectorAll(".chain-node").forEach((node) => {
    node.addEventListener("click", () => {
      selectRound(Number(node.dataset.i), { animate: true });
      openReceiptDrawer(Number(node.dataset.i));
    });
  });
  updateChainFocus(nodes[state.index]);
}

function updateChainFocus(node) {
  if (!node) {
    els.chainFocus.textContent = "Select a block.";
    return;
  }
  const prev = node.prev_hash == null ? "null (genesis)" : node.prev_hash;
  const rh = node.receipt_hash ?? "—";
  els.chainFocus.innerHTML = `
    <strong>${escapeHtml(node.symbol)}</strong>
    · height ${escapeHtml(node.chain_height)}
    · ${escapeHtml(String(node.decision || "").toUpperCase())} (${escapeHtml(node.score)})
    <br/>prev_hash <span style="color:var(--cyan)">${escapeHtml(prev)}</span>
    <br/>receipt_hash <span style="color:var(--gold)">${escapeHtml(rh)}</span>
    <br/>observed_hash ${escapeHtml(node.observed_hash || "—")}
  `;
}

function selectRound(i, { animate = false } = {}) {
  const report = state.report;
  if (!report?.rounds?.length) return;
  state.liveResult = null;
  state.index = Math.max(0, Math.min(report.rounds.length - 1, i));
  const round = report.rounds[state.index];
  renderVerdict(round);
  renderTheatre(round, { animate });
  renderFeed(report);
  renderStepper(report);
  renderChain(report);
  els.chainScrub.value = String(state.index);
  const active = els.chainTrack.querySelector(".chain-node.active");
  if (active) {
    const track = els.chainTrack;
    const left = active.offsetLeft - (track.clientWidth - active.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }
  els.prevBtn.disabled = state.index === 0;
  els.nextBtn.disabled = state.index >= report.rounds.length - 1;
}

function stopTheatre() {
  state.theatre = false;
  els.theatreBtn.classList.remove("active");
  els.theatreBtn.textContent = "▶ Duel";
  if (state.theatreTimer) {
    clearInterval(state.theatreTimer);
    state.theatreTimer = null;
  }
}

function startTheatre() {
  if (!state.report?.rounds?.length) return;
  openDuelDrawer();
  state.theatre = true;
  els.theatreBtn.classList.add("active");
  els.theatreBtn.textContent = "■ Stop";
  selectRound(0, { animate: true });
  state.theatreTimer = setInterval(() => {
    if (!state.report?.rounds?.length) return stopTheatre();
    if (state.index >= state.report.rounds.length - 1) {
      stopTheatre();
      return;
    }
    selectRound(state.index + 1, { animate: true });
  }, 2600);
}

function loadReport(report) {
  stopTheatre();
  state.report = report;
  state.index = 0;
  state.liveResult = null;
  for (const r of report.rounds ?? []) {
    if ((!r.evidence || !r.evidence.length) && state.receiptsById.has(r.receipt_id)) {
      const rec = state.receiptsById.get(r.receipt_id);
      r.evidence = rec.evidence;
      r.prev_hash = r.prev_hash ?? rec.prev_hash;
      r.receipt_hash = r.receipt_hash ?? rec.receipt_hash;
    }
  }
  if (!report.summary && report.rounds) {
    const summary = { allow: 0, caution: 0, block: 0, total: report.rounds.length };
    for (const r of report.rounds) {
      if (r.decision === "allow") summary.allow++;
      else if (r.decision === "caution") summary.caution++;
      else if (r.decision === "block") summary.block++;
    }
    report.summary = summary;
  }
  renderSummary(report);
  selectRound(0, { animate: true });
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || `HTTP ${res.status}`);
    err.body = data;
    throw err;
  }
  return data;
}

async function loadReceipts() {
  try {
    const data = await fetchJson("/api/receipts");
    const list = data.receipts ?? data ?? [];
    state.receipts = Array.isArray(list) ? list : [];
    state.receiptsById = new Map(state.receipts.map((r) => [r.id, r]));
  } catch {
    state.receipts = [];
    state.receiptsById = new Map();
  }
}

function coinRows(list, { withRank = false } = {}) {
  if (!list?.length) return `<tr><td colspan="${withRank ? 5 : 3}" class="empty">No data</td></tr>`;
  return list
    .map((c) => {
      const pct = c.percent_change_24h;
      const rank = c.cmc_rank != null ? c.cmc_rank : "—";
      if (withRank) {
        return `<tr class="pick" data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(pct ?? "")}">
          <td>${escapeHtml(rank)}</td>
          <td>${assetCell(c)}</td>
          <td>${escapeHtml(fmtUsd(c.price_usd))}</td>
          <td class="${pctClass(pct)}">${escapeHtml(fmtPct(pct))}</td>
          <td>${escapeHtml(fmtUsd(c.market_cap))}</td>
        </tr>`;
      }
      return `<tr class="pick" data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(pct ?? "")}">
        <td>${assetCell(c)}</td>
        <td>${escapeHtml(fmtUsd(c.price_usd))}</td>
        <td class="${pctClass(pct)}">${escapeHtml(fmtPct(pct))}</td>
      </tr>`;
    })
    .join("");
}

function coinListItems(list) {
  if (!list?.length) return `<li class="empty">No data</li>`;
  return list
    .map((c) => {
      const pct = c.percent_change_24h;
      return `<li data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(pct ?? "")}">
        <span class="n">${logoHtml(c)}${escapeHtml(c.symbol)}<span class="nm">${escapeHtml(c.name || "")}</span></span>
        <span class="${pctClass(pct)}">${escapeHtml(fmtPct(pct))}</span>
      </li>`;
    })
    .join("");
}

function openCoinDrawer(el) {
  const sym = el.getAttribute("data-sym");
  if (!sym) return;
  const name = el.getAttribute("data-name") || "";
  const price = el.getAttribute("data-price");
  const pct = el.getAttribute("data-pct");
  openDrawer({
    kicker: "Asset · CMC Pro",
    title: sym,
    mode: "coin",
    bodyHtml: `
      <div class="drawer-kv">
        <div class="cg"><div class="cg-l">Name</div><div class="cg-v" style="font-size:13px">${escapeHtml(name || "—")}</div></div>
        <div class="cg"><div class="cg-l">Price</div><div class="cg-v">${escapeHtml(fmtUsd(price === "" ? null : Number(price)))}</div></div>
        <div class="cg"><div class="cg-l">24h</div><div class="cg-v ${pctClass(pct === "" ? null : Number(pct))}">${escapeHtml(fmtPct(pct === "" ? null : Number(pct)))}</div></div>
        <div class="cg"><div class="cg-l">Action</div><div class="cg-v" style="font-size:12px;color:var(--cyan)">Run gate</div></div>
      </div>
      <p style="margin-top:4px">Click <b>Run gate</b> to clear this symbol through Witness before any sizing bot acts.</p>
      <button type="button" class="run-btn" id="drawerRunGate" style="width:100%;margin-top:8px">Run gate · ${escapeHtml(sym)}</button>
    `,
  });
  document.getElementById("drawerRunGate")?.addEventListener("click", () => {
    els.symInput.value = sym;
    closeDrawer();
    runLiveGate(sym);
  });
}

function bindPick(root) {
  root?.querySelectorAll("[data-sym]").forEach((el) => {
    el.addEventListener("click", () => openCoinDrawer(el));
  });
}

function mountDuelIntoDrawer() {
  els.duelMount.hidden = false;
  els.drawerBody.innerHTML = "";
  els.drawerBody.appendChild(els.duelMount);
}

function openDuelDrawer() {
  openDrawer({ kicker: "Agent duel", title: "Propose vs Witness", mode: "duel", bodyHtml: "" });
  mountDuelIntoDrawer();
}

function openChainDrawer() {
  openDrawer({ kicker: "Receipt chain", title: "prev_hash trail", mode: "chain", bodyHtml: "" });
  mountDuelIntoDrawer();
  els.chainTrack?.scrollIntoView({ block: "nearest" });
}

function openReceiptDrawer(i) {
  const report = state.report;
  const round = report?.rounds?.[i];
  if (!round) return;
  const nodes = chainRowsFromReport(report);
  const node = nodes[i];
  openDrawer({
    kicker: `Height ${node?.chain_height ?? i}`,
    title: String(round.proposed || "Receipt"),
    mode: "receipt",
    bodyHtml: `
      <div class="drawer-kv">
        <div class="cg"><div class="cg-l">Decision</div><div class="cg-v" style="color:var(--${round.decision === "allow" ? "green" : round.decision === "block" ? "red" : "amber"})">${escapeHtml(String(round.decision || "").toUpperCase())}</div></div>
        <div class="cg"><div class="cg-l">Score</div><div class="cg-v">${escapeHtml(round.score)}</div></div>
      </div>
      <p>${escapeHtml(round.reckless_line || "")}</p>
      <p style="font-family:var(--mono);font-size:10px;word-break:break-all">
        prev_hash <span style="color:var(--cyan)">${escapeHtml(node?.prev_hash ?? "genesis")}</span><br/>
        receipt_hash <span style="color:var(--gold)">${escapeHtml(node?.receipt_hash ?? "—")}</span>
      </p>
      <button type="button" class="act-mini gold" id="drawerShowDuel">Open duel theatre</button>
    `,
  });
  document.getElementById("drawerShowDuel")?.addEventListener("click", () => {
    selectRound(i, { animate: true });
    openDuelDrawer();
  });
}

function cycleLine(stats, symbol) {
  const row = (stats ?? []).find((s) => String(s.symbol).toUpperCase() === symbol);
  if (!row) return "ATH — · ATL —";
  return `ATH ${fmtUsd(row.high)} · ATL ${fmtUsd(row.low)}`;
}

function renderMarketFloor(floor) {
  state.marketFloor = floor;
  if (!floor || floor.error) {
    els.floorBanner.className = "mock-banner err";
    els.bannerText.textContent =
      floor?.error || "Market floor unavailable — set CMC_API_KEY in .env (never commit it).";
    els.sessFloor.textContent = "Floor · offline";
    els.floorMeta.textContent = "Floor · 503 / no key";
    return;
  }

  const mock = Boolean(floor.mock);
  els.floorBanner.className = `mock-banner ${mock ? "mock" : "live"}`;
  els.bannerText.textContent = mock
    ? "MOCK MARKET FLOOR — labeled sample (no CMC_API_KEY)"
    : `LIVE CMC PRO · ${floor.endpoints_used?.length ?? 0} endpoints · ~${Math.round((floor.cache_ttl_ms ?? 60000) / 1000)}s cache · ${floor.fetched_at ?? ""}`;
  els.sessFloor.textContent = mock ? "Floor · MOCK" : "Floor · CMC Pro";
  els.floorMeta.textContent = `${floor.source} · ${floor.endpoints_used?.length ?? 0} endpoints · ${floor.fetched_at ?? ""}`;

  const g = floor.global ?? {};
  els.heroMcap.textContent = fmtUsd(g.total_market_cap);
  els.heroVol.textContent = fmtUsd(g.total_volume_24h);
  els.heroBtcD.textContent = g.btc_dominance != null ? `${Number(g.btc_dominance).toFixed(1)}%` : "—";
  els.heroEthD.textContent = g.eth_dominance != null ? `${Number(g.eth_dominance).toFixed(2)}%` : "—";

  const fg = floor.fear_greed ?? {};
  const fgVal = fg.value != null ? Number(fg.value) : null;
  els.mkFgVal.textContent = fgVal != null ? String(fgVal) : "—";
  els.mkFgClass.textContent = fg.classification || "—";
  els.mkFgSub.textContent = fg.update_time ? String(fg.update_time).slice(0, 19) : "CMC v3 index";
  if (fgVal != null) els.fgRing.style.setProperty("--fg", String(fgVal));
  els.fgChip.textContent = fgVal != null ? String(fgVal) : "—";

  const alt = floor.altcoin_season ?? {};
  els.mkAlt.textContent = alt.index != null ? String(alt.index) : "—";
  els.mkAltSub.textContent =
    alt.yearly_high != null
      ? `yr high ${alt.yearly_high} · low ${alt.yearly_low ?? "—"}`
      : "index · CMC";

  const fgSpark = renderSpark(els.fgSpark, floor.fear_greed_history, { strokeUp: "#e8b84a", strokeDn: "#ff5d6c" });
  if (fgSpark) els.fgChip.textContent = `${fgVal ?? "—"} · ${fgSpark.changePct >= 0 ? "+" : ""}${fgSpark.changePct.toFixed(0)}`;

  renderSpark(els.altSpark, floor.altcoin_season_history, { strokeUp: "#3ee8f0", strokeDn: "#ff5d6c" });

  const mcapSpark = renderSpark(els.mcapSpark, floor.global_mcap_history, { strokeUp: "#e8b84a", strokeDn: "#ff5d6c" });
  els.mcapChip.textContent = mcapSpark ? fmtPct(mcapSpark.changePct) : "—";
  if (mcapSpark) els.mcapChip.style.color = mcapSpark.up ? "var(--green)" : "var(--red)";

  const btcSpark = renderSpark(els.btcSpark, floor.btc_ohlcv);
  els.btcChip.textContent = btcSpark ? fmtUsd(btcSpark.last, 0) : "—";
  els.btcCycle.textContent = cycleLine(floor.cycle_stats, "BTC");

  const ethSpark = renderSpark(els.ethSpark, floor.eth_ohlcv, { strokeUp: "#3ee8f0", strokeDn: "#ff5d6c" });
  els.ethChip.textContent = ethSpark ? fmtUsd(ethSpark.last, 0) : "—";
  els.ethCycle.textContent = cycleLine(floor.cycle_stats, "ETH");

  els.topMcapBody.innerHTML = coinRows(floor.top_market_cap, { withRank: true });
  els.gainersBody.innerHTML = coinRows(floor.gainers);
  els.losersBody.innerHTML = coinRows(floor.losers);
  els.trendingList.innerHTML = coinListItems(floor.trending);
  els.visitedList.innerHTML = coinListItems(floor.most_visited);

  const news = floor.new_listings ?? [];
  els.newStrip.innerHTML = news.length
    ? news
        .map(
          (c) =>
            `<button type="button" class="new-chip" data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(c.percent_change_24h ?? "")}">${logoHtml(c)}<b>${escapeHtml(c.symbol)}</b><span>${escapeHtml(fmtPct(c.percent_change_24h))}</span></button>`,
        )
        .join("")
    : `<span class="empty">No new listings</span>`;

  const cats = floor.categories ?? [];
  els.catList.innerHTML = cats.length
    ? cats
        .map((c) => {
          const ch = c.avg_price_change ?? c.market_cap_change;
          return `<li data-cat="${escapeHtml(c.name)}">
            <span class="n">${escapeHtml(c.name)} <span class="nm">${escapeHtml(fmtUsd(c.market_cap))}</span></span>
            <span class="${pctClass(ch)}">${escapeHtml(fmtPct(ch))}</span>
          </li>`;
        })
        .join("")
    : `<li class="empty">No categories</li>`;

  els.catList.querySelectorAll("[data-cat]").forEach((el) => {
    el.addEventListener("click", () => {
      openModal({
        title: el.getAttribute("data-cat") || "Category",
        bodyHtml: `<p>CMC category by market cap from the Pro floor. Sector context beside the gate — not a sizing instruction.</p>`,
      });
    });
  });

  const airs = floor.airdrops ?? [];
  if (airs.length) {
    els.airRow.hidden = false;
    els.airStrip.innerHTML = airs
      .map(
        (a) =>
          `<div class="air-chip"><b>${escapeHtml(a.coin_symbol || "—")}</b> · ${escapeHtml(a.project_name)}</div>`,
      )
      .join("");
  } else {
    els.airRow.hidden = true;
    els.airStrip.innerHTML = "";
  }

  bindPick(els.topMcapBody);
  bindPick(els.gainersBody);
  bindPick(els.losersBody);
  bindPick(els.trendingList);
  bindPick(els.visitedList);
  bindPick(els.newStrip);
}

async function loadMarketFloor({ refresh = false } = {}) {
  try {
    const q = refresh ? "?refresh=1" : "";
    const data = await fetchJson(`/api/market-floor${q}`);
    renderMarketFloor(data);
  } catch (err) {
    renderMarketFloor(err.body || { error: err.message });
  }
}

async function tryFetchDefault() {
  await loadReceipts();
  const candidates = ["/duel-report.json", "./duel-report.json"];
  for (const url of candidates) {
    try {
      const data = await fetchJson(url);
      loadReport(data);
      return;
    } catch { /* next */ }
  }
  els.reportMeta.textContent = "No duel-report.json — run: pnpm witness duel --fixture";
  renderVerdict(null);
}

async function runLiveGate(symbol) {
  const sym = String(symbol || "").trim();
  if (!sym) {
    toast("Enter a symbol or contract");
    return;
  }
  els.runGateBtn.disabled = true;
  els.gateHint.textContent = `Running gate for ${sym}…`;
  try {
    const data = await fetchJson(`/api/check?symbol=${encodeURIComponent(sym)}`);
    state.liveResult = data;
    const decision = data.decision;
    const receipt = data.receipt ?? {};
    applyVerdictView({
      decision,
      score: data.score,
      symbol: receipt.symbol || sym,
      sub: `Live · ${data.mode ?? receipt.auth_mode ?? "?"} · h${receipt.chain_height ?? "—"} · ALLOW ≠ long`,
      caseIdx: "LIVE CHECK",
      recklessLine: `Agent proposed ${sym} — Witness scored from CMC evidence (Pro when available).`,
      reasons: data.reasons ?? [],
      reason_chips: data.reason_chips ?? [],
      evidence: receipt.evidence ?? [],
      enrichment: {
        price_performance: data.price_performance,
        ohlcv_spark: data.ohlcv_spark,
      },
    });
    if (data.mode) {
      const mode = String(data.mode).toUpperCase();
      els.modePill.innerHTML = `● <b>${escapeHtml(mode)}</b>`;
      els.sessMode.textContent = `Mode · ${mode.toLowerCase()}`;
      els.usdcNoteBox.hidden = mode !== "X402";
    }
    await loadReceipts();
    tickNumber(els.kpiReceipts, state.receipts.length);
    toast(`${String(decision).toUpperCase()} · ${sym} · score ${data.score}`);
    els.gateHint.innerHTML = `Live <code>/api/check</code>${data.enrichment_source === "cmc-pro" ? " + Pro OHLCV" : ""}.`;
  } catch (err) {
    const rounds = state.report?.rounds ?? [];
    const idx = rounds.findIndex((r) => String(r.proposed).toUpperCase() === sym.toUpperCase());
    if (idx >= 0) {
      selectRound(idx, { animate: true });
      toast(`No live API — showing duel round for ${sym}`);
      els.gateHint.innerHTML = `Live unavailable. Showing fixture. CLI: <code>pnpm witness check ${escapeHtml(sym)} --fixture</code>`;
    } else {
      toast(`Gate unavailable — CLI: pnpm witness check ${sym} --fixture`);
      els.gateHint.innerHTML = `Could not reach <code>/api/check</code> (${escapeHtml(err.message)}).`;
    }
  } finally {
    els.runGateBtn.disabled = false;
  }
}

document.querySelectorAll("[data-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-modal");
    const h = HELP[key];
    if (h) openModal(h);
  });
});
els.allowHelpBtn?.addEventListener("click", () => openModal(HELP.allow));
els.openChainBtn?.addEventListener("click", openChainDrawer);
els.openDuelBtn?.addEventListener("click", openDuelDrawer);
els.drawerClose?.addEventListener("click", closeDrawer);
els.drawerScrim?.addEventListener("click", closeDrawer);
els.modalClose?.addEventListener("click", closeModal);
els.modalScrim?.addEventListener("click", closeModal);
els.enterBtn.addEventListener("click", enterFloor);

els.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadReport(JSON.parse(text));
  toast(`Loaded ${file.name}`);
});

els.reloadBtn.addEventListener("click", () => {
  tryFetchDefault();
  loadMarketFloor();
});
els.refreshFloorBtn.addEventListener("click", () => loadMarketFloor({ refresh: true }));
els.prevBtn.addEventListener("click", () => selectRound(state.index - 1, { animate: true }));
els.nextBtn.addEventListener("click", () => selectRound(state.index + 1, { animate: true }));
els.theatreBtn.addEventListener("click", () => {
  if (state.theatre) stopTheatre();
  else startTheatre();
});
els.chainScrub.addEventListener("input", () => {
  selectRound(Number(els.chainScrub.value), { animate: false });
});
els.gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  runLiveGate(els.symInput.value);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDrawer();
    closeModal();
    return;
  }
  if (e.target === els.symInput) return;
  if (e.key === "ArrowRight") selectRound(state.index + 1, { animate: true });
  if (e.key === "ArrowLeft") selectRound(state.index - 1, { animate: true });
  if (e.key === " ") {
    e.preventDefault();
    if (state.theatre) stopTheatre();
    else startTheatre();
  }
});

function tickClock() {
  els.clk.textContent = new Date().toISOString().slice(11, 19);
}
tickClock();
setInterval(tickClock, 1000);

async function boot() {
  maybeAutoEnter();
  await Promise.all([tryFetchDefault(), loadMarketFloor()]);
  const params = new URLSearchParams(location.search);
  const q = params.get("round");
  if (!q || !state.report?.rounds?.length) return;
  const bySym = state.report.rounds.findIndex(
    (r) => String(r.proposed).toUpperCase() === q.toUpperCase(),
  );
  if (bySym >= 0) {
    selectRound(bySym, { animate: true });
    return;
  }
  const n = Number(q);
  if (Number.isFinite(n) && n >= 1) selectRound(n - 1, { animate: true });
}


/* ===== Floor demos + order theatre ===== */
state.orderSide = "BUY";

function setHudStep(n, cls) {
  if (!els.hudSteps) return;
  els.hudSteps.dataset.step = String(n);
  els.hudSteps.classList.remove("ok", "bad");
  if (cls) els.hudSteps.classList.add(cls);
}

function setFillView({ status, kicker, word, sub, receiptId }) {
  if (!els.fillBlock) return;
  els.fillBlock.dataset.status = status || "";
  els.fillKicker.textContent = kicker || "Standing by";
  els.fillWord.textContent = word || "—";
  els.fillSub.textContent = sub || "Agent proposes · Witness gates · Fill or reject";
  els.fillReceipt.textContent = receiptId ? `receipt · ${receiptId}` : "receipt · —";
}

async function runCollisionDemo() {
  const btns = [els.demoCollisionBtn, els.gateDemoCollision].filter(Boolean);
  btns.forEach((b) => (b.disabled = true));
  els.gateHint.textContent = "Running Fake BTC collision demo…";
  try {
    const data = await fetchJson("/api/demo/collision");
    showContrast(data);
    const junk = data.junk ?? {};
    const canon = data.canonical ?? {};
    applyVerdictView({
      decision: junk.decision,
      score: junk.score,
      symbol: junk.receipt?.symbol || "BTC (spoof)",
      sub: "Junk BTC ticker vs canonical — BLOCK / ALLOW contrast",
      caseIdx: "DEMO · COLLISION",
      recklessLine: data.copy || "ALLOW = okay to touch, NOT go long. BLOCK = don’t touch.",
      reasons: [
        `Canonical BTC → ${String(canon.decision || "").toUpperCase()} (${canon.score})`,
        `Junk BTC ticker → ${String(junk.decision || "").toUpperCase()} (${junk.score})`,
        ...(junk.reasons ?? []).slice(0, 6),
      ],
      reason_chips: junk.reason_chips ?? ["TICKER COLLISION"],
      evidence: junk.receipt?.evidence ?? [],
      keepContrast: true,
    });
    toast(`Collision demo · CANON ${String(canon.decision).toUpperCase()} vs JUNK ${String(junk.decision).toUpperCase()}`);
    els.gateHint.innerHTML = `Demo · Fake BTC collision · <b>ALLOW ≠ long</b>`;
  } catch (err) {
    toast(`Collision demo failed: ${err.message}`);
    els.gateHint.textContent = `Demo failed — ${err.message}`;
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

async function runRugDemo() {
  const btns = [els.demoRugBtn, els.gateDemoRug].filter(Boolean);
  btns.forEach((b) => (b.disabled = true));
  els.gateHint.textContent = "Running rug / low-liq path…";
  try {
    const data = await fetchJson("/api/demo/rug");
    const r = data.result ?? {};
    hideContrast();
    applyVerdictView({
      decision: r.decision,
      score: r.score,
      symbol: r.receipt?.symbol || "RUG",
      sub: "Scammy / low-liq path — expect BLOCK",
      caseIdx: "DEMO · RUG",
      recklessLine: data.copy || "BLOCK = don’t touch.",
      reasons: r.reasons ?? [],
      reason_chips: r.reason_chips ?? [],
      evidence: r.receipt?.evidence ?? [],
    });
    toast(`Rug demo · ${String(r.decision).toUpperCase()} · score ${r.score}`);
    els.gateHint.innerHTML = `Demo · Rug / contract · <b>BLOCK = don’t touch</b>`;
  } catch (err) {
    toast(`Rug demo failed: ${err.message}`);
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

async function runOrderTheatre(e) {
  e?.preventDefault?.();
  const side = state.orderSide || "BUY";
  const symbol = String(els.orderSym?.value || "BTC").trim().toUpperCase();
  const size = Number(els.orderSize?.value || 1);
  if (!symbol) {
    toast("Enter a symbol");
    return;
  }
  if (els.orderSubmit) els.orderSubmit.disabled = true;
  setHudStep(1);
  setFillView({
    status: "",
    kicker: "Step 01 · Propose",
    word: `${side} ${symbol}`,
    sub: `Size ${size} · agent ticket submitted`,
    receiptId: null,
  });
  await new Promise((r) => setTimeout(r, 320));
  setHudStep(2);
  setFillView({
    status: "",
    kicker: "Step 02 · Witness",
    word: "GATING…",
    sub: "before_you_trade · dossier + Pro context",
    receiptId: null,
  });
  try {
    const data = await fetchJson("/api/demo/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side, symbol, size, mode: "fixture" }),
    });
    const fill = data.fill ?? {};
    const gate = data.gate ?? {};
    const ok = fill.status === "FILL allowed";
    setHudStep(3, ok ? "ok" : "bad");
    setFillView({
      status: fill.status,
      kicker: ok ? "Step 03 · Fill" : "Step 03 · Rejected",
      word: fill.status || "—",
      sub: fill.note || data.copy || "",
      receiptId: data.receipt_id || gate.receipt_id,
    });
    applyVerdictView({
      decision: gate.decision,
      score: gate.score,
      symbol,
      sub: `${side} ${size} ${symbol} · ${fill.status}`,
      caseIdx: "ORDER TICKET",
      recklessLine: `Agent proposed ${side} ${size} ${symbol}. Witness: ${String(gate.decision || "").toUpperCase()}.`,
      reasons: gate.reasons ?? [],
      reason_chips: gate.reason_chips ?? [],
      evidence: [],
    });
    // pull evidence from a quick check if needed — receipt id shown
    toast(`${fill.status} · ${symbol} · ${gate.receipt_id?.slice?.(0, 8) || "receipt"}…`);
    await loadReceipts();
    tickNumber(els.kpiReceipts, state.receipts.length);
  } catch (err) {
    setHudStep(3, "bad");
    setFillView({
      status: "REJECTED by Witness",
      kicker: "Error",
      word: "REJECTED by Witness",
      sub: err.message,
      receiptId: null,
    });
    toast(`Order theatre failed: ${err.message}`);
  } finally {
    if (els.orderSubmit) els.orderSubmit.disabled = false;
  }
}

els.demoCollisionBtn?.addEventListener("click", runCollisionDemo);
els.gateDemoCollision?.addEventListener("click", runCollisionDemo);
els.demoRugBtn?.addEventListener("click", runRugDemo);
els.gateDemoRug?.addEventListener("click", runRugDemo);
els.orderForm?.addEventListener("submit", runOrderTheatre);
els.sideToggle?.querySelectorAll(".side-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.orderSide = btn.getAttribute("data-side") || "BUY";
    els.sideToggle.querySelectorAll(".side-btn").forEach((b) => b.classList.toggle("on", b === btn));
  });
});

boot();
setInterval(() => loadMarketFloor(), 60_000);
