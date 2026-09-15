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
  mkMcap: document.getElementById("mkMcap"),
  mkVol: document.getElementById("mkVol"),
  mkBtcD: document.getElementById("mkBtcD"),
  mkEthD: document.getElementById("mkEthD"),
  mkFgVal: document.getElementById("mkFgVal"),
  mkFgClass: document.getElementById("mkFgClass"),
  fgRing: document.getElementById("fgRing"),
  mkAlt: document.getElementById("mkAlt"),
  mkAltSub: document.getElementById("mkAltSub"),
  gainersBody: document.getElementById("gainersBody"),
  losersBody: document.getElementById("losersBody"),
  trendingList: document.getElementById("trendingList"),
  visitedList: document.getElementById("visitedList"),
  newStrip: document.getElementById("newStrip"),
  catList: document.getElementById("catList"),
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
    body: `<p>Type a ticker (<b>BTC</b>) or contract. The gate scores CMC evidence and returns <b>ALLOW / CAUTION / BLOCK</b> — the same call other bots must clear before sizing.</p><p>When a Pro key is present, performance stats + OHLCV spark attach below.</p>`,
  },
  "help-dossier": {
    title: "Dossier evidence",
    body: `<p>Each row is a real CMC API call on the receipt — quotes, listings, optional DEX search. Credits and timestamps prove what the gate saw.</p><p>Witness <b>never invents RSI</b>. Fear&amp;Greed lives on the market floor KPIs, not on the receipt.</p>`,
  },
  allow: {
    title: "What is ALLOW?",
    body: `<p><b>Gate ≠ buy.</b> ALLOW / CAUTION / BLOCK is a pre-trade referee verdict other agents clear via <code>before_you_trade</code> before sizing.</p>
<p><b>ALLOW</b> — CMC evidence looks liquid / identifiable enough to proceed (still not advice).</p>
<p><b>CAUTION</b> — thin books, odd rank, or incomplete identity — size carefully or investigate more.</p>
<p><b>BLOCK</b> — rug-like / unresolvable / dangerous collision — do not size.</p>
<p>Pro panels (mcap, F&amp;G, movers) are <b>market context from CMC</b>, not the gate inventing indicators.</p>`,
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

/* ===== Drawer / Modal ===== */
function openDrawer({ kicker, title, bodyHtml, mode }) {
  state.drawerMode = mode || null;
  els.drawerKicker.textContent = kicker || "Detail";
  els.drawerTitle.textContent = title || "—";
  els.drawerBody.innerHTML = "";
  if (typeof bodyHtml === "string") {
    els.drawerBody.innerHTML = bodyHtml;
  } else if (bodyHtml instanceof Node) {
    els.drawerBody.appendChild(bodyHtml);
  }
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  els.drawerScrim.hidden = false;
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
  els.drawerScrim.hidden = true;
  // park duel mount back if it was moved
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
  try {
    sessionStorage.setItem("cmc_witness_entered", "1");
  } catch {
    /* ignore */
  }
}

function maybeAutoEnter() {
  const params = new URLSearchParams(location.search);
  if (params.get("floor") === "1" || params.get("enter") === "1" || params.get("skipSplash") === "1") {
    enterFloor();
    return;
  }
  try {
    if (sessionStorage.getItem("cmc_witness_entered") === "1") enterFloor();
  } catch {
    /* ignore */
  }
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
  const sorted = [...(perf ?? [])].sort(
    (a, b) => order.indexOf(a.period) - order.indexOf(b.period),
  );
  els.perfGrid.innerHTML = sorted
    .map((p) => {
      const cls = pctClass(p.percent_change);
      return `<div class="perf-cell">
        <div class="pl">${escapeHtml(p.period)}</div>
        <div class="pv ${cls}">${escapeHtml(fmtPct(p.percent_change))}</div>
      </div>`;
    })
    .join("");

  if (spark?.length) {
    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const span = max - min || 1;
    const pts = spark
      .map((v, i) => {
        const x = (i / Math.max(spark.length - 1, 1)) * 200;
        const y = 32 - ((v - min) / span) * 28;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const up = spark[spark.length - 1] >= spark[0];
    const stroke = up ? "#3dff9c" : "#ff5d6c";
    els.sparkSvg.innerHTML = `
      <polyline fill="none" stroke="${stroke}" stroke-width="1.6" points="${pts}" />
      <polyline fill="${up ? "rgba(61,255,156,.12)" : "rgba(255,93,108,.12)"}" stroke="none"
        points="0,36 ${pts} 200,36" />
    `;
  } else {
    els.sparkSvg.innerHTML = "";
  }
}

function applyVerdictView({
  decision,
  score,
  symbol,
  sub,
  caseIdx,
  recklessLine,
  reasons,
  evidence,
  enrichment,
}) {
  const d = decision || "";
  els.verdictBlock.dataset.decision = d;
  els.verdictWord.textContent = d ? String(d).toUpperCase() : "STANDBY";
  els.verdictSub.textContent = sub || "Awaiting symbol or duel round";
  els.scoreValue.textContent = score == null || score === "" ? "—" : String(score);
  els.caseSymbol.textContent = symbol || "—";
  els.caseIdx.textContent = caseIdx || "ROUND —";
  els.recklessLine.textContent = recklessLine || "Load a duel report or run the gate.";
  els.kpiLast.textContent = d ? String(d).toUpperCase() : "—";
  els.kpiLast.style.color =
    d === "allow" ? "var(--green)" : d === "caution" ? "var(--amber)" : d === "block" ? "var(--red)" : "var(--cyan)";

  const rs = reasons ?? [];
  els.reasonsList.innerHTML = rs.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

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
  if (els.chainHint) {
    els.chainHint.textContent = `${nodes.length} linked blocks · integrity via prev_hash → receipt_hash`;
  }

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
  els.theatreBtn.textContent = "▶ Theatre";
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

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${url} ${res.status}`);
    err.status = res.status;
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

function coinRows(list) {
  if (!list?.length) return `<tr><td colspan="3" class="empty">No data</td></tr>`;
  return list
    .map((c) => {
      const pct = c.percent_change_24h;
      return `<tr class="pick" data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(pct ?? "")}">
        <td class="sym">${escapeHtml(c.symbol)} <span style="color:var(--fg3);font-weight:500">${escapeHtml(c.name)}</span></td>
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
        <span class="n">${escapeHtml(c.symbol)}</span>
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
  const btn = document.getElementById("drawerRunGate");
  if (btn) {
    btn.addEventListener("click", () => {
      els.symInput.value = sym;
      closeDrawer();
      runLiveGate(sym);
    });
  }
}

function bindPick(root) {
  root.querySelectorAll("[data-sym]").forEach((el) => {
    el.addEventListener("click", () => openCoinDrawer(el));
  });
}

function openKpiModal(key) {
  const floor = state.marketFloor;
  const g = floor?.global ?? {};
  const fg = floor?.fear_greed ?? {};
  const alt = floor?.altcoin_season ?? {};
  const map = {
    mcap: {
      title: "Total crypto mcap",
      body: `<p><b>${escapeHtml(fmtUsd(g.total_market_cap))}</b></p><p>CMC global-metrics · total market capitalization across listed assets. Context for the gate — not a trade signal.</p>`,
    },
    vol: {
      title: "24h volume",
      body: `<p><b>${escapeHtml(fmtUsd(g.total_volume_24h))}</b></p><p>Reported USD volume (CMC global-metrics). Thin aggregate volume days often pair with CAUTION/BLOCK on micro-caps.</p>`,
    },
    btcd: {
      title: "BTC dominance",
      body: `<p><b>${g.btc_dominance != null ? escapeHtml(Number(g.btc_dominance).toFixed(2)) + "%" : "—"}</b></p><p>BTC share of total mcap. ETH.D: <b>${g.eth_dominance != null ? escapeHtml(Number(g.eth_dominance).toFixed(2)) + "%" : "—"}</b>.</p>`,
    },
    fg: {
      title: "Fear & Greed",
      body: `<p><b>${escapeHtml(fg.value ?? "—")}</b> · ${escapeHtml(fg.classification || "—")}</p><p>CMC v3 Fear &amp; Greed index — Pro floor context only. Witness does <b>not</b> invent this onto receipts.</p>`,
    },
    alt: {
      title: "Altcoin Season",
      body: `<p><b>${escapeHtml(alt.index ?? "—")}</b></p><p>Yearly high ${escapeHtml(alt.yearly_high ?? "—")} · low ${escapeHtml(alt.yearly_low ?? "—")}. Labeled CMC index for market regime context.</p>`,
    },
  };
  const m = map[key];
  if (m) openModal(m);
}

function mountDuelIntoDrawer() {
  els.duelMount.hidden = false;
  els.drawerBody.innerHTML = "";
  els.drawerBody.appendChild(els.duelMount);
}

function openDuelDrawer() {
  openDrawer({
    kicker: "Duel theatre",
    title: "Reckless vs Witness",
    mode: "duel",
    bodyHtml: "",
  });
  mountDuelIntoDrawer();
}

function openChainDrawer() {
  openDrawer({
    kicker: "Receipt chain",
    title: "prev_hash trail",
    mode: "chain",
    bodyHtml: "",
  });
  mountDuelIntoDrawer();
  // scroll chain into view inside drawer
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
    : `LIVE CMC PRO · ${floor.endpoints_used?.length ?? 0} endpoints · ~${Math.round((floor.cache_ttl_ms ?? 55000) / 1000)}s cache · ${floor.fetched_at ?? ""}`;
  els.sessFloor.textContent = mock ? "Floor · MOCK" : "Floor · CMC Pro";
  els.floorMeta.textContent = `${floor.source} · ${floor.fetched_at ?? ""}`;

  const g = floor.global ?? {};
  els.mkMcap.textContent = fmtUsd(g.total_market_cap);
  els.mkVol.textContent = fmtUsd(g.total_volume_24h);
  els.mkBtcD.textContent = g.btc_dominance != null ? `${Number(g.btc_dominance).toFixed(1)}%` : "—";
  if (els.mkEthD) {
    els.mkEthD.textContent = g.eth_dominance != null ? `${Number(g.eth_dominance).toFixed(2)}%` : "—";
  }

  const fg = floor.fear_greed ?? {};
  const fgVal = fg.value != null ? Number(fg.value) : null;
  els.mkFgVal.textContent = fgVal != null ? String(fgVal) : "—";
  if (els.mkFgClass) els.mkFgClass.textContent = fg.classification || "—";
  if (fgVal != null && els.fgRing) els.fgRing.style.setProperty("--fg", String(fgVal));

  const alt = floor.altcoin_season ?? {};
  els.mkAlt.textContent = alt.index != null ? String(alt.index) : "—";
  if (els.mkAltSub) {
    els.mkAltSub.textContent =
      alt.yearly_high != null
        ? `yr high ${alt.yearly_high} · low ${alt.yearly_low ?? "—"}`
        : "index · CMC";
  }

  els.gainersBody.innerHTML = coinRows(floor.gainers);
  els.losersBody.innerHTML = coinRows(floor.losers);
  els.trendingList.innerHTML = coinListItems(floor.trending);
  els.visitedList.innerHTML = coinListItems(floor.most_visited);

  const news = floor.new_listings ?? [];
  els.newStrip.innerHTML = news.length
    ? news
        .map(
          (c) =>
            `<button type="button" class="new-chip" data-sym="${escapeHtml(c.symbol)}" data-name="${escapeHtml(c.name || "")}" data-price="${escapeHtml(c.price_usd ?? "")}" data-pct="${escapeHtml(c.percent_change_24h ?? "")}"><b>${escapeHtml(c.symbol)}</b><span>${escapeHtml(fmtPct(c.percent_change_24h))}</span></button>`,
        )
        .join("")
    : `<span class="empty">No new listings</span>`;

  const cats = floor.categories ?? [];
  els.catList.innerHTML = cats.length
    ? cats
        .map((c) => {
          const ch = c.avg_price_change ?? c.market_cap_change;
          return `<li data-cat="${escapeHtml(c.name)}">
            <span class="n">${escapeHtml(c.name)}</span>
            <span class="${pctClass(ch)}">${escapeHtml(fmtPct(ch))}</span>
          </li>`;
        })
        .join("")
    : `<li class="empty">No categories</li>`;

  els.catList.querySelectorAll("[data-cat]").forEach((el) => {
    el.addEventListener("click", () => {
      openModal({
        title: el.getAttribute("data-cat") || "Category",
        bodyHtml: `<p>CMC category mover from the Pro floor. Use as sector context beside the gate — not a sizing instruction.</p><p>24h change shown on the row.</p>`,
      });
    });
  });

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
    } catch {
      /* next */
    }
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
      sub: `Live · ${data.mode ?? receipt.auth_mode ?? "?"} · h${receipt.chain_height ?? "—"}`,
      caseIdx: "LIVE CHECK",
      recklessLine: `Agent proposed ${sym} — Witness scored from CMC evidence.`,
      reasons: data.reasons ?? [],
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

/* Tabs */
document.querySelectorAll(".tabs").forEach((group) => {
  group.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-tab");
      group.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === tab));
      const panel = group.closest(".panel");
      panel?.querySelectorAll(".tab-pane").forEach((p) => {
        const on = p.id === `pane-${name}`;
        p.toggleAttribute("hidden", !on);
        p.classList.toggle("on", on);
      });
    });
  });
});

/* Help / allow modal */
document.querySelectorAll("[data-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-modal");
    const h = HELP[key];
    if (h) openModal(h);
  });
});
els.allowHelpBtn?.addEventListener("click", () => openModal(HELP.allow));

document.querySelectorAll(".kpi-tap").forEach((btn) => {
  btn.addEventListener("click", () => openKpiModal(btn.getAttribute("data-kpi")));
});

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
  const d = new Date();
  els.clk.textContent = d.toISOString().slice(11, 19);
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

boot();
setInterval(() => loadMarketFloor(), 60_000);
