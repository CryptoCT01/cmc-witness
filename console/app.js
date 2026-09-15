/** CMC Witness · Pre-trade Gate console */

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
  modePill: document.getElementById("modePill"),
  sessMode: document.getElementById("sessMode"),
  fileInput: document.getElementById("fileInput"),
  reloadBtn: document.getElementById("reloadBtn"),
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
};

const state = {
  report: null,
  receiptsById: new Map(),
  receipts: [],
  index: 0,
  theatre: false,
  theatreTimer: null,
  liveResult: null,
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
  els.reportMeta.textContent = `${report.title ?? "Duel"} · ${report.created_at ?? ""} · ${s.total ?? (report.rounds ?? []).length} rounds · ${state.receipts.length} chained receipts`;
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

function applyVerdictView({
  decision,
  score,
  symbol,
  sub,
  caseIdx,
  recklessLine,
  reasons,
  evidence,
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
    els.evidenceBody.innerHTML = `<tr><td colspan="4" class="empty">No evidence yet.</td></tr>`;
  } else {
    els.evidenceBody.innerHTML = rows
      .map(
        (e) => `<tr>
        <td>${escapeHtml(e.endpoint)}</td>
        <td>${escapeHtml(e.credit_count ?? "—")}</td>
        <td>${escapeHtml(e.status_timestamp ?? "—")}</td>
        <td style="font-family:var(--ui);color:var(--fg2)">${escapeHtml(e.used_for ?? "—")}</td>
      </tr>`,
      )
      .join("");
  }
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
    sub: `Pre-trade gate for ${round.proposed} · chain height ${round.chain_height ?? "—"}`,
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
    els.chainHint.textContent = "prev_hash trail · scrub to inspect";
    return;
  }

  els.chainScrub.max = String(nodes.length - 1);
  els.chainScrub.value = String(state.index);
  els.chainHint.textContent = `${nodes.length} linked blocks · integrity via prev_hash → receipt_hash`;

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
    node.addEventListener("click", () => selectRound(Number(node.dataset.i), { animate: true }));
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
  // Derive summary if missing
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
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
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
  els.reportMeta.textContent = "No duel-report.json found. Run: pnpm witness duel --fixture";
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
      sub: `Live gate · mode ${data.mode ?? receipt.auth_mode ?? "?"} · height ${receipt.chain_height ?? "—"}`,
      caseIdx: "LIVE CHECK",
      recklessLine: `Agent proposed ${sym} — Witness scored from CMC evidence.`,
      reasons: data.reasons ?? [],
      evidence: receipt.evidence ?? [],
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
    els.gateHint.innerHTML = `Live result from <code>/api/check</code>. Also: <code>pnpm witness check ${escapeHtml(sym)} --fixture</code>`;
  } catch (err) {
    // Fall back: try matching duel round by symbol
    const rounds = state.report?.rounds ?? [];
    const idx = rounds.findIndex((r) => String(r.proposed).toUpperCase() === sym.toUpperCase());
    if (idx >= 0) {
      selectRound(idx, { animate: true });
      toast(`No live API — showing duel round for ${sym}`);
      els.gateHint.innerHTML = `Live <code>/api/check</code> unavailable. Showing fixture duel. CLI: <code>pnpm witness check ${escapeHtml(sym)} --fixture</code>`;
    } else {
      toast(`Gate unavailable — use CLI: pnpm witness check ${sym} --fixture`);
      els.gateHint.innerHTML = `Could not reach <code>/api/check</code> (${escapeHtml(err.message)}). Run <code>pnpm witness check ${escapeHtml(sym)} --fixture</code> then reload receipts.`;
    }
  } finally {
    els.runGateBtn.disabled = false;
  }
}

/* Help toggles */
document.querySelectorAll(".help-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-help");
    const card = document.getElementById(id);
    if (!card) return;
    const open = card.hasAttribute("hidden");
    card.toggleAttribute("hidden", !open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
});

els.enterBtn.addEventListener("click", enterFloor);

els.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadReport(JSON.parse(text));
  toast(`Loaded ${file.name}`);
});

els.reloadBtn.addEventListener("click", () => tryFetchDefault());
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
  await tryFetchDefault();
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
