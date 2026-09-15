/** Court of Markets — Judge Console */

const CIRC = 2 * Math.PI * 52;

const els = {
  feed: document.getElementById("feed"),
  evidenceTimeline: document.getElementById("evidenceTimeline"),
  reasonsList: document.getElementById("reasonsList"),
  chainTrack: document.getElementById("chainTrack"),
  chainFocus: document.getElementById("chainFocus"),
  chainScrub: document.getElementById("chainScrub"),
  chainHint: document.getElementById("chainHint"),
  statAllow: document.getElementById("statAllow"),
  statCaution: document.getElementById("statCaution"),
  statBlock: document.getElementById("statBlock"),
  reportMeta: document.getElementById("reportMeta"),
  modePill: document.getElementById("modePill"),
  fileInput: document.getElementById("fileInput"),
  reloadBtn: document.getElementById("reloadBtn"),
  theatreBtn: document.getElementById("theatreBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  stepper: document.getElementById("stepper"),
  verdictPlate: document.getElementById("verdictPlate"),
  verdictWord: document.getElementById("verdictWord"),
  verdictSub: document.getElementById("verdictSub"),
  scoreRing: document.getElementById("scoreRing"),
  scoreValue: document.getElementById("scoreValue"),
  caseIdx: document.getElementById("caseIdx"),
  caseSymbol: document.getElementById("caseSymbol"),
  recklessLine: document.getElementById("recklessLine"),
  proposeBubble: document.getElementById("proposeBubble"),
  judgeBubble: document.getElementById("judgeBubble"),
  duelStage: document.getElementById("duelStage"),
};

const state = {
  report: null,
  receiptsById: new Map(),
  receipts: [],
  index: 0,
  theatre: false,
  theatreTimer: null,
  scoreAnim: null,
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

function decisionColor(d) {
  if (d === "allow") return "var(--emerald)";
  if (d === "caution") return "var(--amber)";
  if (d === "block") return "var(--rose)";
  return "var(--cyan)";
}

function tickNumber(el, to, duration = 900, animKey = "scoreAnim") {
  const target = Math.round(Number(to) || 0);
  const from = Number(el.dataset.value || el.textContent || 0) || 0;
  const start = performance.now();
  if (state[animKey]) cancelAnimationFrame(state[animKey]);
  // Ensure final value even if rAF is throttled (headless / virtual time)
  el.dataset.value = String(target);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (target - from) * eased);
    el.textContent = String(val);
    if (t < 1) state[animKey] = requestAnimationFrame(step);
    else el.textContent = String(target);
  };
  state[animKey] = requestAnimationFrame(step);
  // Fallback settle
  setTimeout(() => {
    el.textContent = String(target);
    el.dataset.value = String(target);
  }, duration + 50);
}

function setScoreRing(score, decision) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const offset = CIRC * (1 - clamped / 100);
  els.scoreRing.style.stroke = decisionColor(decision);
  els.scoreRing.style.strokeDashoffset = String(offset);
  tickNumber(els.scoreValue, clamped, 700, "scoreAnim");
}

function evidenceForRound(round) {
  if (Array.isArray(round.evidence) && round.evidence.length) return round.evidence;
  const receipt = state.receiptsById.get(round.receipt_id);
  if (receipt?.evidence?.length) return receipt.evidence;
  return (round.evidence_endpoints ?? []).map((endpoint) => ({ endpoint }));
}

function receiptForRound(round) {
  return state.receiptsById.get(round.receipt_id) ?? null;
}

function renderSummary(report) {
  const s = report.summary ?? {};
  tickNumber(els.statAllow, s.allow ?? 0, 700, "statAllowAnim");
  tickNumber(els.statCaution, s.caution ?? 0, 700, "statCautionAnim");
  tickNumber(els.statBlock, s.block ?? 0, 700, "statBlockAnim");
  els.modePill.textContent = `MODE · ${String(report.mode ?? "?").toUpperCase()}`;
  els.reportMeta.textContent = `${report.title ?? "Duel"} · ${report.created_at ?? ""} · ${s.total ?? 0} rounds · ${state.receipts.length} chained receipts`;
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
        <div class="meta">score ${r.score} · height ${r.chain_height ?? "?"}</div>
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
    ? `${escapeHtml(dec)} <span style="color:var(--muted);font-size:0.85rem;font-family:var(--font-mono)">· ${round.score}/100</span>`
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

function renderVerdict(round) {
  if (!round) {
    els.verdictPlate.dataset.decision = "";
    els.verdictWord.textContent = "STANDBY";
    els.verdictSub.textContent = "Awaiting docket";
    setScoreRing(0, null);
    els.caseIdx.textContent = "ROUND —";
    els.caseSymbol.textContent = "—";
    els.recklessLine.textContent = "Load a duel report to open the courtroom.";
    return;
  }
  const d = round.decision || "";
  els.verdictPlate.dataset.decision = d;
  els.verdictWord.textContent = String(d || "—").toUpperCase();
  els.verdictSub.textContent = `Market-truth judgment for ${round.proposed} · chain height ${round.chain_height ?? "—"}`;
  setScoreRing(round.score ?? 0, d);
  els.caseIdx.textContent = `ROUND ${round.index ?? state.index + 1}`;
  els.caseSymbol.textContent = round.proposed;
  els.recklessLine.textContent = round.reckless_line || "";
}

function renderEvidence(round) {
  const rows = evidenceForRound(round || {});
  if (!rows.length) {
    els.evidenceTimeline.innerHTML = `<div class="empty-note">No endpoint evidence on this round.</div>`;
  } else {
    els.evidenceTimeline.innerHTML = rows
      .map(
        (e) => `
      <article class="ev-card">
        <div class="ev-path">${escapeHtml(e.endpoint)}</div>
        <div class="ev-meta">
          <span>credits <strong>${escapeHtml(e.credit_count ?? "—")}</strong></span>
          <span>ts <strong>${escapeHtml(e.status_timestamp ?? "—")}</strong></span>
        </div>
        ${e.used_for ? `<div class="ev-used">${escapeHtml(e.used_for)}</div>` : ""}
      </article>`,
      )
      .join("");
  }

  const reasons = round?.reasons ?? [];
  els.reasonsList.innerHTML = reasons.length
    ? `<h4>Opinion of the Court</h4><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : "";
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
      prev_hash: r.prev_hash ?? receipt?.prev_hash ?? (i === 0 ? null : null),
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
    <strong style="color:var(--text)">${escapeHtml(node.symbol)}</strong>
    · height ${escapeHtml(node.chain_height)}
    · ${escapeHtml(String(node.decision || "").toUpperCase())} (${escapeHtml(node.score)})
    <br/>prev_hash <span style="color:var(--cyan)">${escapeHtml(prev)}</span>
    <br/>receipt_hash <span style="color:var(--magenta)">${escapeHtml(rh)}</span>
    <br/>observed_hash ${escapeHtml(node.observed_hash || "—")}
  `;
}

function selectRound(i, { animate = false } = {}) {
  const report = state.report;
  if (!report?.rounds?.length) return;
  state.index = Math.max(0, Math.min(report.rounds.length - 1, i));
  const round = report.rounds[state.index];
  renderVerdict(round);
  renderTheatre(round, { animate });
  renderEvidence(round);
  renderFeed(report);
  renderStepper(report);
  renderChain(report);
  els.chainScrub.value = String(state.index);
  const active = els.chainTrack.querySelector(".chain-node.active");
  if (active && typeof active.scrollIntoView === "function") {
    // Keep page scroll anchored on the hero; only nudge the horizontal track.
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
  // Prefer joining evidence from receipts when report lacks detail
  for (const r of report.rounds ?? []) {
    if ((!r.evidence || !r.evidence.length) && state.receiptsById.has(r.receipt_id)) {
      const rec = state.receiptsById.get(r.receipt_id);
      r.evidence = rec.evidence;
      r.prev_hash = r.prev_hash ?? rec.prev_hash;
      r.receipt_hash = r.receipt_hash ?? rec.receipt_hash;
    }
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

els.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadReport(JSON.parse(text));
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

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") selectRound(state.index + 1, { animate: true });
  if (e.key === "ArrowLeft") selectRound(state.index - 1, { animate: true });
  if (e.key === " ") {
    e.preventDefault();
    if (state.theatre) stopTheatre();
    else startTheatre();
  }
});

// Init ring geometry
els.scoreRing.style.strokeDasharray = String(CIRC);
els.scoreRing.style.strokeDashoffset = String(CIRC);

async function boot() {
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
