/** Court of Markets — Judge Console */

const els = {
  feed: document.getElementById("feed"),
  detail: document.getElementById("detail"),
  chain: document.getElementById("chain"),
  statAllow: document.getElementById("statAllow"),
  statCaution: document.getElementById("statCaution"),
  statBlock: document.getElementById("statBlock"),
  reportMeta: document.getElementById("reportMeta"),
  fileInput: document.getElementById("fileInput"),
  reloadBtn: document.getElementById("reloadBtn"),
};

let current = null;

function renderSummary(report) {
  const s = report.summary ?? {};
  els.statAllow.textContent = s.allow ?? 0;
  els.statCaution.textContent = s.caution ?? 0;
  els.statBlock.textContent = s.block ?? 0;
  els.reportMeta.textContent = `${report.title ?? "Duel"} · mode=${report.mode ?? "?"} · ${report.created_at ?? ""} · ${s.total ?? 0} rounds`;
}

function renderFeed(report) {
  const rounds = report.rounds ?? [];
  if (!rounds.length) {
    els.feed.className = "feed empty";
    els.feed.textContent = "No rounds in report.";
    return;
  }
  els.feed.className = "feed";
  els.feed.innerHTML = "";
  rounds.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "round" + (current === i ? " active" : "");
    div.innerHTML = `
      <span class="idx">#${r.index ?? i + 1}</span>
      <div>
        <div class="sym">${escapeHtml(r.proposed)}</div>
        <div style="font-size:0.7rem;color:var(--muted)">score ${r.score} · h${r.chain_height ?? "?"}</div>
      </div>
      <span class="badge ${r.decision}">${(r.decision || "?").toUpperCase()}</span>
    `;
    div.addEventListener("click", () => {
      current = i;
      renderFeed(report);
      renderDetail(r);
    });
    els.feed.appendChild(div);
  });
}

function renderDetail(r) {
  if (!r) {
    els.detail.className = "detail empty";
    els.detail.textContent = "Select a round from the feed.";
    return;
  }
  els.detail.className = "detail";
  const endpoints = r.evidence_endpoints?.length
    ? r.evidence_endpoints
    : (r.receipt?.evidence ?? []).map((e) => e.endpoint);

  const reasons = (r.reasons ?? []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const evHtml = (endpoints ?? [])
    .map((p) => `<div class="ev-row"><span class="path">${escapeHtml(p)}</span></div>`)
    .join("") || `<div class="ev-row">No endpoint evidence recorded</div>`;

  els.detail.innerHTML = `
    <div class="decision-row">
      <h4>${escapeHtml(r.proposed)}</h4>
      <span class="badge ${r.decision}">${(r.decision || "?").toUpperCase()}</span>
      <span class="score">${r.score}/100</span>
    </div>
    <p class="line">${escapeHtml(r.reckless_line ?? "")}</p>
    <ul>${reasons}</ul>
    <div class="evidence">
      <h5>Endpoint evidence</h5>
      ${evHtml}
    </div>
    <div class="hash">
      receipt ${escapeHtml(r.receipt_id ?? "")}<br/>
      observed_hash ${escapeHtml(r.observed_hash ?? "")}<br/>
      chain_height ${r.chain_height ?? "—"}
    </div>
  `;
}

function renderChain(report) {
  const rounds = report.rounds ?? [];
  if (!rounds.length) {
    els.chain.className = "chain empty";
    els.chain.textContent = "No chain data.";
    return;
  }
  els.chain.className = "chain";
  els.chain.innerHTML = rounds
    .map((r, i) => {
      const prev = i === 0 ? "genesis" : `← round ${i}`;
      return `<div class="chain-node">
        <div class="h">height ${r.chain_height ?? i}</div>
        <div><strong>${escapeHtml(r.proposed)}</strong> · ${escapeHtml((r.decision || "").toUpperCase())}</div>
        <div class="arrow">${prev}</div>
        <div>${escapeHtml((r.observed_hash ?? "").slice(0, 20))}…</div>
      </div>`;
    })
    .join("");
}

function loadReport(report) {
  current = 0;
  renderSummary(report);
  renderFeed(report);
  renderDetail(report.rounds?.[0]);
  renderChain(report);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function tryFetchDefault() {
  const candidates = ["./duel-report.json", "/duel-report.json", "../duel-report.json"];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        loadReport(data);
        return;
      }
    } catch {
      /* try next */
    }
  }
  els.reportMeta.textContent =
    "No duel-report.json found yet. Run: pnpm witness duel --fixture";
}

els.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadReport(JSON.parse(text));
});

els.reloadBtn.addEventListener("click", () => tryFetchDefault());

tryFetchDefault();
