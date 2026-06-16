/* ============================================================
   Vendor Queries prototype — view router + interactions
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };

const VIEW = $("#view");
const CRUMB = { how: "How it works", inbox: "Vendor Inbox", worklist: "Queries", ingestion: "Ingestion log", analytics: "Analytics", integrations: "Integrations", config: "Configuration" };
let currentView = "worklist";
const ME = "Shubham S.";   // the signed-in AP user (matches sidebar footer)
// re-render whatever view is behind the slide-over so data changes show on "back"
function refreshBackground() { if (currentView === "worklist") renderWorklist(); }

/* ─── toast ─── */
function toast(msg, kind = "ok") {
  $("#toast")?.remove();
  const t = el(`<div id="toast" class="toast ${kind}"><span class="toast-ico">${kind==='ok'?'✓':kind==='warn'?'!':'ℹ'}</span><span>${msg}</span></div>`);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 250); }, 2600);
}

const entLabel = (e) => e ? `${e.flag} ${e.code} · ${e.name}` : "— entity unresolved";
const entShort = (e) => e ? `${e.flag} ${e.code}` : "⚠️ —";
const pill = (cls, label, noDot) => `<span class="pill ${cls}${noDot?' no-dot':''}">${label}</span>`;

function setActiveNav(view) {
  $$(".sb-child").forEach(c => c.classList.toggle("active", c.dataset.view === view));
  $("#tb-sub").textContent = CRUMB[view] || "";
}
function render(view) {
  currentView = view;
  setActiveNav(view);
  VIEW.scrollTop = 0;
  ({ how: renderHow, inbox: renderInbox, worklist: renderWorklist, ingestion: renderIngestion, analytics: renderAnalytics, integrations: renderIntegrations, config: renderConfig }[view] || renderWorklist)();
}

/* ─── payment ladder (VQ-E1) component ─── */
function ladderHtml(stages) {
  return `<div class="ladder">${stages.map((s,i) => `
    <div class="lad-step ${s.state}">
      <div class="lad-node">${s.state==='done'?'✓':s.state==='current'?'●':s.state==='skipped'?'–':i+1}</div>
      <div class="lad-label">${s.label}</div>
      ${i<stages.length-1?'<div class="lad-bar"></div>':''}
    </div>`).join("")}</div>`;
}

/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */
function renderHow() {
  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">How Vendor Queries works</div>
      <div class="page-desc">A new workflow on the Neoflo platform that sits between a company's vendors and its accounts-payable team. It verifies who's asking, assembles the facts from the P2P invoice workflow + the ERP, and auto-answers the high-volume questions the system already knows — routing the genuinely hard ones to a human with the context pre-assembled and a suggested reply ready to send. Behind a strict identity gate, always.</div>
    </div>

    <div class="metrics" style="margin-bottom:20px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">~80% of questions</div><div class="m-value">“Has it<br>been paid?”</div><div class="m-sub">Auto-answered on receipt — no human trigger.</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">The anchor</div><div class="m-value">Identity<br>gate</div><div class="m-sub">No answer leaves the system without a passing auth_check.</div></div>
      <div class="metric" style="--c:var(--purple-500)"><div class="m-label">Grounded</div><div class="m-value">Live<br>data</div><div class="m-sub">Invoice status, payment, tax — via connectors in Integrations.</div></div>
      <div class="metric" style="--c:var(--orange-500)"><div class="m-label">Hard ones</div><div class="m-value">Routed<br>with a draft</div><div class="m-sub">A summarized view + an editable suggested reply to send.</div></div>
    </div>

    <div class="card card-pad" style="margin-bottom:20px">
      <div class="section-label">The workspace at a glance <span class="sl-side">click to open</span></div>
      <div class="surface-grid">
        ${[
          ["worklist","📋","Queries","The action dashboard — every query, auto + human, filtered by outcome, entity or type. Human ones open a summarized view with an editable reply."],
          ["ingestion","📥","Ingestion log","The inbound mail that didn't parse (the Coverage shortfall) — genuine misses recoverable into a query; noise logged for audit."],
          ["analytics","📊","Analytics","Containment north-star, accuracy, automation by type, guardrails at zero, and driver analysis to feed the upstream roadmap."],
          ["integrations","🔌","Integrations","Connect Freshdesk, SAP and the vendor master on-platform — the ERP connector seam each client plugs into."],
          ["config","⚙️","Configuration","Configuration over code — capabilities on/off, confidence thresholds, entities, languages, SLAs."],
          ["inbox","✉️","Vendor Inbox · demo","A simulator that plays a sample email through the pipeline step by step — for trust & onboarding, not daily use."],
        ].map(([v,i,n,d]) => `<div class="surface-card" data-go="${v}"><div class="surface-ico">${i}</div><div><div class="surface-name">${n}</div><div class="surface-desc">${d}</div></div></div>`).join("")}
      </div>
    </div>

    <div class="hiw-wrap">
      <div class="card card-pad">
        <div class="section-label">The processing pipeline <span class="sl-side">click any step · or watch it run</span></div>
        <div class="pipe" id="pipe">
          ${PIPELINE.map((s, i) => `
            <div class="pipe-step" data-i="${i}" style="--c:${s.c}">
              <div class="pipe-rail"><div class="pipe-node">${s.icon}</div>${i < PIPELINE.length-1 ? '<div class="pipe-line"></div>':''}</div>
              <div class="pipe-body"><div class="pipe-k">Step ${s.k}</div><div class="pipe-title">${s.title}</div><div class="pipe-desc">${s.desc}</div></div>
            </div>`).join("")}
        </div>
        <div style="margin-top:16px;display:flex;gap:10px">
          <button class="btn btn-primary" id="hiw-run">▶ Animate the pipeline</button>
          <button class="btn" data-go="worklist">Open the Queries dashboard ›</button>
          <button class="btn btn-ghost" id="hiw-try">See the live demo ›</button>
        </div>
      </div>

      <div class="hiw-side">
        <div class="card card-pad gate-card">
          <div class="section-label">The four resolution gates <span class="sl-side">§7.2 · mirrors P2P Smart Routing</span></div>
          ${GATES.map(g => `<div class="gate-row"><div class="gate-k">${g.k}</div><div class="gate-t">${g.t}</div></div>`).join("")}
        </div>
        <div class="callout">
          <h4>🛡️ G1 is absolute</h4>
          <p>No answer, document, or amount leaves the system without a passing identity check recorded on the query. The single most important safety property of the product. Bank-detail changes are <strong>captured and routed, never auto-applied</strong>.</p>
        </div>
        <div class="card card-pad">
          <div class="section-label">Built on what Zalora already runs</div>
          <div class="reuse-row"><span class="reuse-ico">📨</span><div><strong>Freshdesk channel</strong><span>Same intake + ticket status sync as Zalora Phase 1 (Neoflo - …).</span></div></div>
          <div class="reuse-row"><span class="reuse-ico">🔑</span><div><strong>Whitelist + Google SSO</strong><span>AP users onboarded once to the platform, maker-checker model.</span></div></div>
          <div class="reuse-row"><span class="reuse-ico">🏢</span><div><strong>5 entities · 4 languages</strong><span>SG · MY · HK · ID · PH — English, Mandarin, Bahasa, Filipino.</span></div></div>
          <div class="reuse-row" style="border:none"><span class="reuse-ico">🧾</span><div><strong>P2P invoice data</strong><span>Live status, Accounting Entry Posting ID, payment doc, WHT/VAT.</span></div></div>
        </div>
      </div>
    </div>

    <div class="spacer-20"></div>
    <div class="card card-pad">
      <div class="section-label">Freshdesk ticket status sync <span class="sl-side">reuses the Zalora Phase 1 "Neoflo - …" pattern</span></div>
      <div class="sync-grid">
        ${[
          ["Auto-answered","Neoflo - Auto-resolved","green"],
          ["Routed to human","Neoflo - Routed","orange"],
          ["Bank-change captured","Neoflo - Awaiting verification","purple"],
          ["Auth failed","Neoflo - On Hold (identity)","red"],
          ["SLA breached","Neoflo - Routed (SLA breached)","red"],
          ["Closed","Neoflo - Closed","grey"],
        ].map(([a,b,c])=>`<div class="sync-row"><span class="pill ${c}">${a}</span><span class="sync-arrow">→</span><span class="mono sync-fd">${b}</span></div>`).join("")}
      </div>
    </div>`;

  $$(".pipe-step").forEach(step => step.addEventListener("click", () => {
    $$(".pipe-step").forEach(s => s.classList.remove("lit")); step.classList.add("lit");
  }));
  $("#hiw-run").addEventListener("click", animatePipe);
  $("#hiw-try").addEventListener("click", () => render("inbox"));
}
function animatePipe() {
  const steps = $$(".pipe-step");
  steps.forEach(s => s.classList.remove("lit"));
  steps.forEach((s, i) => setTimeout(() => s.classList.add("lit"), i * 420));
}

/* ─────────────────────────── VENDOR INBOX SIM ─────────────────────────── */
let simIndex = 0;
function renderInbox() {
  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Vendor Inbox <span class="tag" style="vertical-align:middle">live simulator</span></div>
      <div class="page-desc">The vendor never logs in — their whole experience is the email they already send and the reply they get back. Processing is fully automatic: <strong>the moment a ticket arrives it runs through intake → identity gate → context → answer-or-route with no human trigger.</strong> Auto-answers reply on their own; only the genuinely hard ones wait for a person. Select any message to watch it arrive and resolve.</div>
    </div>
    <div class="sim-wrap">
      <div class="mail-list" id="mail-list">
        ${SCENARIOS.map((s, i) => `
          <div class="mail-card ${i===simIndex?'active':''}" data-i="${i}">
            <div class="mail-from"><strong>${s.vendor}</strong><span class="mail-flag">${s.flag}</span></div>
            <div class="mail-email">${s.email}</div>
            <div class="mail-subj">${s.subject}</div>
            <div class="mail-meta">${pill(s.tag.cls, s.tag.label)}</div>
          </div>`).join("")}
      </div>
      <div class="stage" id="stage"></div>
    </div>`;
  $$("#mail-list .mail-card").forEach(c => c.addEventListener("click", () => {
    simIndex = +c.dataset.i;
    $$("#mail-list .mail-card").forEach(x => x.classList.toggle("active", x === c));
    renderStage();
  }));
  renderStage();
}
let runTimers = [];
function renderStage() {
  const s = SCENARIOS[simIndex];
  $("#stage").innerHTML = `
    <div class="stage-head">
      <div><div class="sh-title">${s.subject}</div><div class="sh-sub">${s.vendor} · ${s.flag} ${s.lang} · ${entLabel(s.entity)}${s.entity?` · ${s.entity.ccy}`:''}</div></div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="live-tag" id="live-tag"><span class="live-dot"></span>Ticket received — processing automatically</span>
        <button class="btn btn-sm" id="run-btn">↻ Replay</button>
      </div>
    </div>
    <div class="stage-body">
      <div class="email-bubble">
        <div class="eb-head"><div class="eb-from">${s.vendor} &lt;${s.email}&gt;</div><div class="eb-to">to: ap-vendors@zalora.com · via Freshdesk · ${s.q}</div></div>
        <div class="eb-body"><div class="eb-subject">${s.subject}</div>${s.body.replace(/\n/g,"<br>")}</div>
      </div>
      <div class="run-strip" id="run-strip"></div>
      <div id="outcome-slot"></div>
    </div>`;
  $("#run-btn").addEventListener("click", () => runScenario(s));
  runScenario(s); // auto-process on arrival — no human trigger
}
function runScenario(s) {
  runTimers.forEach(clearTimeout); runTimers = [];
  const strip = $("#run-strip"); strip.innerHTML = "";
  $("#outcome-slot").innerHTML = "";
  const live = $("#live-tag"); if (live) live.classList.remove("done");
  s.run.forEach((step, i) => {
    const node = el(`
      <div class="run-step ${step.state}">
        <div class="run-ico">${step.state==='ok'?'✓':step.state==='fail'?'✕':step.state==='warn'?'!':'◆'}</div>
        <div class="run-txt"><div class="rt-k">${step.k}</div><div class="rt-d">${step.d}</div></div>
        <div class="run-spin"></div>
      </div>`);
    strip.appendChild(node);
    runTimers.push(setTimeout(() => { node.classList.add("show"); node.querySelector(".run-spin")?.remove(); }, 250 + i * 560));
  });
  runTimers.push(setTimeout(() => {
    renderOutcome(s);
    const live2 = $("#live-tag");
    if (live2) {
      live2.classList.add("done");
      live2.innerHTML = s.outcome === "auto"
        ? '<span class="live-dot"></span>Auto-replied — no human touched it'
        : s.outcome === "authfail"
        ? '<span class="live-dot"></span>Blocked — routed, nothing disclosed'
        : '<span class="live-dot"></span>Routed to a human — context attached';
    }
  }, 250 + s.run.length * 560 + 250));
}
function renderOutcome(s) {
  const slot = $("#outcome-slot");
  let html = "";
  const lad = s.ladder ? `<div class="ladder-wrap"><div class="ladder-k">Payment status ladder · “paid” is truthful only at clearing (VQ-E1)</div>${ladderHtml(s.ladder)}</div>` : "";
  if (s.outcome === "auto") {
    html = `<div class="outcome auto"><div class="outcome-head">✅ Auto-answered — no human touched it · Freshdesk → Neoflo - Auto-resolved</div>
      <div class="outcome-body">${lad}
        <div class="reply-box"><div class="rb-meta"><span>To: ${s.email}</span><span>·</span><span>Lang: ${s.lang}</span><span>·</span><span>auth_check ✓</span></div>
        <div class="rb-answer"><strong>${s.answer.lead}</strong> ${s.answer.body}</div><div class="reply-stamp">⏱ ${s.answer.stamp}</div></div></div></div>`;
  } else if (s.outcome === "authfail") {
    html = `<div class="outcome authfail"><div class="outcome-head">⛔ Identity check failed — nothing disclosed · Freshdesk → Neoflo - On Hold (identity)</div>
      <div class="outcome-body"><div class="reply-box"><div class="rb-meta"><span>To: ${s.email}</span><span>·</span><span>auth_check ✕</span></div>
        <div class="rb-answer"><strong>${s.answer.lead}</strong> ${s.answer.body}</div><div class="reply-stamp">🔒 ${s.answer.stamp}</div></div></div></div>`;
  } else if (s.outcome === "routed") {
    html = `<div class="outcome routed"><div class="outcome-head">↗ Routed to a human — context bundle attached · Freshdesk → Neoflo - Routed</div>
      <div class="outcome-body">
        <div class="reason-box"><div class="rx-k">Why it routed</div><div class="rx-v">${s.route.reason}</div></div><div class="spacer-12"></div>
        <div class="suggest-box"><div class="sx-k">Suggested next step</div><div class="sx-v">${s.route.suggest}</div></div><div class="spacer-16"></div>
        <button class="btn btn-primary btn-sm" onclick="openDetailById('${s.q}')">Open in Query Worklist ›</button></div></div>`;
  } else if (s.outcome === "captured") {
    html = `<div class="outcome captured"><div class="outcome-head">🔏 Bank change captured — routed for human verification · Freshdesk → Neoflo - Awaiting verification</div>
      <div class="outcome-body"><div class="bundle-grid">
        <div class="bundle-item"><div class="bi-k">Requested (unverified)</div><div class="bi-v">${s.capture.requested}</div></div>
        <div class="bundle-item"><div class="bi-k">Current on file</div><div class="bi-v">${s.capture.current}</div></div></div><div class="spacer-12"></div>
        <div class="reason-box"><div class="rx-k">Step-up required (out-of-band)</div><div class="rx-v">${s.capture.stepup}</div></div><div class="spacer-12"></div>
        <div class="reply-stamp" style="border:none;padding:0">🛡️ ${s.capture.note}</div></div></div>`;
  }
  slot.innerHTML = html;
  requestAnimationFrame(() => $(".outcome", slot)?.classList.add("show"));
}

/* ─────────────────────────── QUERIES — ACTION DASHBOARD (default) ─────────────────────────── */
let wlFilter = { outcome: "all", entity: "all", type: "all", search: "" };
function wlMatch(q) {
  if (wlFilter.outcome !== "all" && groupOf(q.qstate) !== wlFilter.outcome) return false;
  if (wlFilter.entity !== "all" && (q.entity?.code || "—") !== wlFilter.entity) return false;
  if (wlFilter.type !== "all" && q.type !== wlFilter.type) return false;
  if (wlFilter.search) {
    const t = wlFilter.search.toLowerCase();
    if (!`${q.vendor} ${q.email} ${q.id} ${q.ref} ${q.type}`.toLowerCase().includes(t)) return false;
  }
  return true;
}
function renderWorklist() {
  const total = QUERIES.length;
  const auto = QUERIES.filter(q => !q.human).length;
  const human = QUERIES.filter(q => q.human && q.qstate !== "closed").length;
  const breaches = QUERIES.filter(q => q.qstate === "breached").length;
  const counts = Object.fromEntries(OUTCOME_GROUPS.map(g => [g.key, g.key === "all" ? total : QUERIES.filter(q => groupOf(q.qstate) === g.key).length]));
  const types = [...new Set(QUERIES.map(q => q.type))];
  const rows = QUERIES.filter(wlMatch);

  VIEW.innerHTML = `
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div class="page-title">Queries</div>
        <div class="page-desc">Every vendor query in one place — auto-answered and human-routed alike. Filter by outcome, entity or type. Auto-answered queries were contained with no human touch; the rest open a summarized view with a suggested reply you can edit and send.</div>
      </div>
      <button class="btn btn-primary btn-sm" data-toast="Manual query intake would open here (rare — most arrive via Freshdesk).">＋ New manual query</button>
    </div>

    <div class="metrics" style="margin-bottom:16px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Auto-contained · today</div><div class="m-value">${auto}<span class="m-delta up">▲ no human touch</span></div><div class="m-sub">Replied automatically on receipt</div></div>
      <div class="metric" style="--c:var(--orange-500)"><div class="m-label">Need a human</div><div class="m-value">${human}</div><div class="m-sub">Open in the queue with a context bundle</div></div>
      <div class="metric" style="--c:var(--red-500)"><div class="m-label">SLA breaches</div><div class="m-value">${breaches}</div><div class="m-sub">Past response target — act now</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Containment · today</div><div class="m-value">${Math.round(auto/total*100)}%</div><div class="m-sub">${auto} of ${total} queries</div></div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="chips">
          ${OUTCOME_GROUPS.map(g => `<button class="chip ${wlFilter.outcome===g.key?'active '+g.cls:''}" data-out="${g.key}">${g.label}<span class="chip-c">${counts[g.key]}</span></button>`).join("")}
        </div>
      </div>
      <div class="filter-bar second">
        <div class="search"><span>🔍</span><input id="wl-search" placeholder="Search vendor, query ID, ticket…" value="${wlFilter.search}"/></div>
        <select class="fsel" id="wl-entity">
          <option value="all">All entities</option>
          ${ENTITIES.map(e => `<option value="${e.code}" ${wlFilter.entity===e.code?'selected':''}>${e.flag} ${e.code} · ${e.ccy}</option>`).join("")}
        </select>
        <select class="fsel" id="wl-type">
          <option value="all">All types</option>
          ${types.map(t => `<option value="${t}" ${wlFilter.type===t?'selected':''}>${t}</option>`).join("")}
        </select>
        ${(wlFilter.outcome!=='all'||wlFilter.entity!=='all'||wlFilter.type!=='all'||wlFilter.search) ? '<button class="btn btn-sm" id="wl-clear">Clear filters</button>' : ''}
        <span style="margin-left:auto;font-size:12px;color:var(--muted)">${rows.length} of ${total} shown</span>
      </div>

      <table class="tbl"><thead><tr>
        <th>Query / Ticket</th><th>Vendor</th><th>Entity</th><th>Type</th><th>Touch</th><th>Status</th><th>SLA / Resolved</th><th>Assignee</th><th></th>
      </tr></thead><tbody>
      ${rows.length ? rows.map(q => `
        <tr data-id="${q.id}">
          <td class="mono">${q.id}<div style="font-size:10.5px;color:var(--muted)">${q.ref} · ${q.ts}</div></td>
          <td class="vendor-cell"><strong>${q.vendor}</strong><span>${q.email}</span></td>
          <td>${entShort(q.entity)}</td>
          <td>${pill(TYPECLS[q.type]||'grey', q.type, true)}</td>
          <td>${q.human ? '<span class="touch human">● Human</span>' : '<span class="touch auto">⚡ Auto</span>'}</td>
          <td>${pill(QSTATE[q.qstate].cls, QSTATE[q.qstate].label)}</td>
          <td>${q.resolved ? `<span class="pill green no-dot">⚡ ${q.resolved}</span>` : pill(q.slaState==='breach'?'red':q.slaState==='warn'?'yellow':'grey', (q.slaState==='breach'?'⏰ ':'')+q.sla, true)}</td>
          <td>${q.assignee==='Unassigned'?'<span style="color:var(--muted)">Unassigned</span>':q.assignee==='Auto'?'<span style="color:var(--green-700)">Auto</span>':q.assignee}</td>
          <td><button class="btn btn-sm row-action" data-id="${q.id}">${q.human && q.qstate!=='closed' ? 'Respond' : 'View'}</button></td>
        </tr>`).join("") : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">No queries match these filters.</td></tr>`}
      </tbody></table>

      <div class="dash-foot">
        <span>${rows.length} items</span>
        <div class="dash-foot-right"><span>Rows per page: 50 ⌄</span><span>1–${rows.length} of ${rows.length}</span><span class="pager">‹ 1 ›</span></div>
      </div>
    </div>`;

  $$(".chip").forEach(c => c.addEventListener("click", () => { wlFilter.outcome = c.dataset.out; renderWorklist(); }));
  $("#wl-entity").addEventListener("change", e => { wlFilter.entity = e.target.value; renderWorklist(); });
  $("#wl-type").addEventListener("change", e => { wlFilter.type = e.target.value; renderWorklist(); });
  const search = $("#wl-search");
  search.addEventListener("input", e => { wlFilter.search = e.target.value; const pos = e.target.selectionStart; renderWorklist(); const ns = $("#wl-search"); ns.focus(); ns.setSelectionRange(pos, pos); });
  $("#wl-clear")?.addEventListener("click", () => { wlFilter = { outcome: "all", entity: "all", type: "all", search: "" }; renderWorklist(); });
  $$("#view tbody tr[data-id]").forEach(tr => tr.addEventListener("click", () => openDetailById(tr.dataset.id)));
  $$("#view .row-action").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openDetailById(b.dataset.id); }));
}

/* ─────────────────────────── QUERY DETAIL ───────────────────────────
   · Human-in-the-loop  → summarized view: summary + records + suggested
     next step + an EDITABLE suggested reply the analyst sends.
   · Auto-answered/closed → read-only "already replied" view.
   ------------------------------------------------------------------- */
function humanPack(q, sc) {
  if (sc && sc.outcome === "routed") return {
    records: [
      ["Invoice", "INV-2451", `${q.entity.ccy} ${sc.amount}`],
      ["Goods-receipt value", `${q.entity.ccy} 579.00`, "SAP paid against GR"],
      ["Posting ID", sc.postingId, "Accounting Entry"],
      ["Payment doc", sc.paymentDoc, "Cleared"],
    ],
    summary: `${q.vendor} says it was short-paid PHP 53 on INV-2451. The system already pulled the cause: the invoice was ${q.entity.ccy} ${sc.amount} but the goods-receipt was only ${q.entity.ccy} 579.00, so SAP paid against the GR — a GR-based short-pay, not an error (same 3-way matching rule as P2P).`,
    suggestion: sc.route.suggest, draft: sc.route.draft,
  };
  if (sc && sc.outcome === "captured") return {
    records: [
      ["Requested (unverified)", sc.capture.requested, "from inbound email"],
      ["Current on file", sc.capture.current, "vendor master"],
    ],
    summary: `${q.vendor} asked to change their bank account to ${sc.capture.requested}. Identity passed, but bank changes are captured only — there is no write path to the vendor master in v0. It must be verified out-of-band before anything is applied.`,
    suggestion: sc.capture.stepup,
    draft: "Hi, thanks for your request to update your banking details. For your security we verify every bank-account change by phone, using the number we already hold on file, before applying it — we'll call you shortly to confirm. No payment will use the new account until that check is complete.",
  };
  if (sc && sc.outcome === "authfail") return {
    records: [],
    summary: `Inbound sender ${sc.email} could not be matched to the authorization registry, and the domain mimics a real vendor (…-billing.net vs …-bi.com) — a likely business-email-compromise attempt. The gate disclosed nothing.`,
    suggestion: "Confirm out-of-band with the known Fujifilm contact on file. If genuine, onboard the address to the registry; if not, flag as fraud — do not reply with any balance or account detail.",
    draft: "Thank you for getting in touch. Before we can share any account or payment information we need to verify your identity. Please reply from your registered company email address, or contact your usual AP representative directly.",
  };
  if (q.qstate === "reopened") return {
    records: [["Original auto-answer", "Paid · TXN-55218", "vendor disputes this"]],
    summary: `${q.vendor} replied to a closed auto-answer disputing the figures. By design the system never silently re-auto-answers a pushed-back query — it reopened the same ticket and routed it to a human, with the original answer and assembled context attached.`,
    suggestion: "Re-check the disputed figures against the payment document and goods-receipt, then reply personally. Do not let it re-auto-answer.",
    draft: "Thanks for getting back to us — I've reopened your query and it's now with me personally. Let me re-check the figures against our records and I'll come back to you with a clear breakdown shortly.",
  };
  // statement reconciliation / generic human
  return {
    records: [
      ["Paid", "5 of 10", "cleared"],
      ["Awaiting GR/SES", "3 of 10", "stuck pre-payment"],
      ["Rejected · duplicate", "2 of 10", "flagged upstream"],
    ],
    summary: `${q.vendor} asks why only 5 of 10 invoices are paid. Of the 10: 5 are paid, 3 are awaiting goods-receipt/service-entry confirmation, and 2 were rejected as duplicates. Listing statuses is easy; confirming the stuck lines needs stage/reason data a human should verify (stretch, Epic G).`,
    suggestion: "Confirm the 3 awaiting-GR/SES lines with receiving and the 2 duplicate flags, then send a line-by-line breakdown.",
    draft: "Hi, thanks for your statement query. Of the 10 invoices, 5 are paid, 3 are awaiting goods-receipt/service-entry confirmation, and 2 were flagged as duplicates. I'm confirming the stuck items with our team and will send you a line-by-line breakdown shortly.",
  };
}

function openDetailById(id) {
  const q = QUERIES.find(w => w.id === id);
  if (!q) return;
  const sc = SCENARIOS.find(s => s.id === q.scenario);
  const detail = $("#detail"), overlay = $("#overlay");
  const isAuto = q.qstate === "auto";
  const isClosed = q.qstate === "closed";
  const isHuman = q.human && !isClosed;     // needs a person to respond now
  const fd = FRESHDESK[q.qstate] || (isHuman ? "Neoflo - Routed" : "Neoflo - Auto-resolved");

  // banner
  let banner;
  if (q.qstate === "authfail") banner = `<div class="dt-banner red">⚠️ Identity check failed — possible impersonation. No financial data was disclosed.</div>`;
  else if (q.qstate === "captured") banner = `<div class="dt-banner purple">🔏 Bank-detail change captured. No write path to the vendor master exists in v0 — verify out-of-band before applying.</div>`;
  else if (q.qstate === "breached") banner = `<div class="dt-banner red">⏰ SLA breached. This routed query is past its response target.</div>`;
  else if (q.qstate === "reopened") banner = `<div class="dt-banner blue">↺ Reopened — the vendor pushed back on a closed auto-answer. Now with a human.</div>`;
  else if (isAuto) banner = `<div class="dt-banner green">✅ Auto-answered — contained with no human touch. Reply sent on the same thread in ${q.resolved}.</div>`;
  else if (isClosed) banner = `<div class="dt-banner grey">✔ Closed — resolved by ${q.assignee} in ${q.resolved}. Read-only.</div>`;
  else banner = `<div class="dt-banner orange">↗ Routed to a human — context bundle assembled. Zero additional look-ups required to start.</div>`;

  // ── core: human summarized view vs auto read-only ──
  let core;
  if (isAuto) {
    const lad = sc?.ladder ? `<div class="ladder-wrap"><div class="ladder-k">Payment status ladder (VQ-E1)</div>${ladderHtml(sc.ladder)}</div>` : "";
    const reply = sc ? `<strong>${sc.answer.lead}</strong> ${sc.answer.body}` : `Answered automatically — ${q.reason}.`;
    const stamp = sc ? sc.answer.stamp : "Composed from live records · auth_check ✓";
    core = `
      <div class="card card-pad">
        <div class="dt-section-title">What the system sent <span class="tag" style="margin-left:6px">no human touch</span></div>
        ${lad}
        <div class="reply-box"><div class="rb-meta"><span>To: ${q.email}</span><span>·</span><span>auth_check ✓</span><span>·</span><span>${fd}</span></div>
          <div class="rb-answer">${reply}</div><div class="reply-stamp">⏱ ${stamp}</div></div>
      </div>`;
  } else if (isClosed) {
    core = `
      <div class="card card-pad">
        <div class="dt-section-title">Resolution <span class="tag" style="margin-left:6px">read-only</span></div>
        <div class="summary-box"><div class="sm-k">Summary</div><div class="sm-v">${q.reason}. Resolved by ${q.assignee} in ${q.resolved}.</div></div>
      </div>`;
  } else {
    const pack = humanPack(q, sc);
    core = `
      <div class="card card-pad">
        <div class="dt-section-title">Summary <span class="tag" style="margin-left:6px">AI-assembled · for a human</span></div>
        <div class="summary-box"><div class="sm-k">What's going on</div><div class="sm-v">${pack.summary}</div></div>
        ${pack.records.length ? `<div class="spacer-12"></div><div class="dt-section-title">Records pulled</div>${bundleGrid(pack.records)}` : ""}
        <div class="spacer-12"></div>
        <div class="suggest-box"><div class="sx-k">💡 Suggested next step</div><div class="sx-v">${pack.suggestion}</div></div>
      </div>
      <div class="card card-pad">
        <div class="dt-section-title">Suggested reply <span class="tag" style="margin-left:6px">editable · ${sc?sc.lang:'English'}</span></div>
        <div class="reply-tools">
          <button class="btn btn-sm" id="rt-regen">↻ Regenerate</button>
          <button class="btn btn-sm" id="rt-reset">Reset to suggestion</button>
          <span style="margin-left:auto;font-size:11.5px;color:var(--muted)">You're responding as ${q.assignee==='Unassigned'?'(assign yourself first)':q.assignee} · maker-checker</span>
        </div>
        <textarea class="draft" id="dt-draft">${pack.draft}</textarea>
      </div>`;
  }

  detail.innerHTML = `
    <div class="dt-head">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px">
          <button class="dt-back" id="dt-close">‹</button>
          <div class="dt-title">${isHuman ? 'Respond' : 'Query'} — ${q.vendor}</div>
        </div>
        <div class="dt-crumb">
          <span>📨 Freshdesk ${q.ref}</span><span class="dt-crumb-sep">·</span>
          <span class="mono">${q.id}</span><span class="dt-crumb-sep">·</span>
          <span>${entLabel(q.entity)}</span><span class="dt-crumb-sep">·</span>
          <span class="mono">FD: ${fd}</span>
        </div>
      </div>
      <div class="dt-head-actions">
        ${isHuman ? `
          ${q.assignee==='Unassigned'?'<button class="btn btn-sm" id="dt-assign">Assign to me</button>':''}
          ${q.qstate==='captured'?`<button class="btn btn-sm dt-terminal" style="color:var(--red-600);border-color:var(--red-200)" data-msg="Bank change rejected. Vendor master unchanged." data-newstate="closed">Reject change</button><button class="btn btn-primary btn-sm dt-terminal" data-msg="Verified out-of-band & applied. Freshdesk → Neoflo - Closed." data-newstate="closed">✓ Verify & send</button>`
            : q.qstate==='authfail'?`<button class="btn btn-sm dt-terminal" style="color:var(--red-600);border-color:var(--red-200)" data-msg="Flagged as fraud. Attempt logged; no disclosure." data-newstate="closed">Flag as fraud</button><button class="btn btn-primary btn-sm dt-terminal" data-msg="Safe non-disclosing reply sent." data-newstate="closed">Send safe reply</button>`
            : `<button class="btn btn-primary btn-sm dt-terminal" data-msg="Reply sent. Freshdesk → Neoflo - Closed." data-newstate="closed">Send reply & close</button>`}`
        : '<button class="btn btn-sm" id="dt-reopen">↺ Reopen</button>'}
      </div>
    </div>

    <div class="dt-body">
      ${banner}
      <div class="row" style="gap:10px;align-items:stretch">
        <div class="metric" style="--c:${QSTATE[q.qstate].cls==='red'?'var(--red-500)':QSTATE[q.qstate].cls==='green'?'var(--green-500)':'var(--primary-500)'};flex:1.2;padding:13px 15px"><div class="m-label">Status</div><div style="margin-top:6px">${pill(QSTATE[q.qstate].cls, QSTATE[q.qstate].label)}</div></div>
        <div class="metric" style="--c:var(--purple-500);flex:1;padding:13px 15px"><div class="m-label">Type</div><div style="margin-top:6px">${pill(TYPECLS[q.type]||'grey', q.type, true)}</div></div>
        <div class="metric" style="--c:${q.slaState==='breach'?'var(--red-500)':'var(--green-500)'};flex:1;padding:13px 15px"><div class="m-label">${q.resolved?'Resolved in':'SLA'}</div><div class="m-value" style="font-size:17px;margin-top:4px">${q.resolved||q.sla}</div></div>
        <div class="metric" style="--c:var(--grey-500);flex:1;padding:13px 15px"><div class="m-label">Assignee</div><div class="m-value" style="font-size:15px;margin-top:6px">${q.assignee==='Unassigned'?'—':q.assignee}</div></div>
      </div>

      <div class="card card-pad">
        <div class="dt-section-title">Vendor's question</div>
        <div class="email-bubble">
          <div class="eb-head"><div class="eb-from">${q.vendor} &lt;${q.email}&gt;</div><div class="eb-to">${q.ref} · via Freshdesk · ${q.ts}</div></div>
          <div class="eb-body">${sc ? sc.body.replace(/\n/g,'<br>') : 'Statement: only 5 of 10 invoices appear paid — please explain the rest.'}</div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="dt-section-title">Identity result <span class="tag" style="margin-left:6px">Epic B</span></div>
        <dl class="kv">
          <dt>auth_check</dt><dd>${q.qstate==='authfail'?pill('red','FAILED',true):pill('green','PASSED',true)}</dd>
          <dt>Matched contact</dt><dd>${q.qstate==='authfail'?'— (no match in registry)':q.email}</dd>
          <dt>Authorised scope</dt><dd>${q.qstate==='authfail'?'—':entLabel(q.entity)+' · vendor’s own records'}</dd>
        </dl>
      </div>

      ${core}

      <div class="card card-pad">
        <div class="dt-section-title">Audit trail <span class="tag" style="margin-left:6px">immutable · Epic K</span></div>
        <div class="audit-row"><span class="ar-t">${q.ts.split('· ')[1]||'08:15'}</span><span class="ar-d"><strong>Intake</strong> · email parsed into ${q.id}</span></div>
        <div class="audit-row"><span class="ar-t">+1s</span><span class="ar-d"><strong>Identity gate</strong> · ${q.qstate==='authfail'?'auth_check FAILED — disclosure blocked':'auth_check passed'}</span></div>
        <div class="audit-row"><span class="ar-t">+2s</span><span class="ar-d"><strong>Context assembled</strong> · records fetched from Neoflo (P2P) + ERP</span></div>
        <div class="audit-row"><span class="ar-t">+3s</span><span class="ar-d"><strong>${isAuto?'Auto-answered':isClosed?'Closed':'Routed'}</strong> · ${q.reason} · Freshdesk → ${fd}</span></div>
      </div>
    </div>

    <div class="dt-foot">
      ${isHuman ? `
        ${q.qstate==='captured'?'<button class="btn btn-primary dt-terminal" data-msg="Verified out-of-band & applied. Freshdesk → Neoflo - Closed." data-newstate="closed">✓ Verify & approve change</button><button class="btn dt-terminal" data-msg="Bank change rejected. Vendor master unchanged." data-newstate="closed">Reject</button>'
          : q.qstate==='authfail'?'<button class="btn btn-primary dt-terminal" data-msg="Safe non-disclosing reply sent." data-newstate="closed">Send safe reply</button><button class="btn dt-terminal" style="color:var(--red-600);border-color:var(--red-200)" data-msg="Flagged as fraud. Attempt logged." data-newstate="closed">Flag as fraud</button>'
          : '<button class="btn btn-primary dt-terminal" data-msg="Reply sent. Freshdesk → Neoflo - Closed." data-newstate="closed">Send reply & close</button><button class="btn" data-toast="Draft saved.">Save draft</button>'}`
        : '<button class="btn" data-close>Close</button>'}
      <span style="margin-left:auto;font-size:12px;color:var(--muted)">${isHuman?'Sending syncs status back to Freshdesk '+q.ref:'Read-only · '+fd}</span>
    </div>`;

  overlay.classList.remove("hidden");
  detail.classList.remove("hidden");
  $("#dt-close").addEventListener("click", closeDetail);
  // Assign to me — mutate the query, refresh the panel AND the dashboard behind it
  $("#dt-assign")?.addEventListener("click", () => {
    q.assignee = ME;
    toast(`Assigned to you (${ME}).`);
    refreshBackground();      // dashboard now shows the assignee on "back"
    openDetailById(q.id);     // re-render panel with the new assignee
  });
  // Terminal actions — persist the new state in memory (until page refresh)
  $$(".dt-terminal", detail).forEach(b => b.addEventListener("click", () => {
    if (b.dataset.newstate) {
      q.qstate = b.dataset.newstate;
      q.resolved = q.resolved || "just now";
      q.human = true;
      if (q.assignee === "Unassigned") q.assignee = ME;
    }
    toast(b.dataset.msg || "Done.");
    closeDetail();
    refreshBackground();      // closed query is preserved on the dashboard until refresh
  }));
  $("#dt-reset")?.addEventListener("click", () => { const p = humanPack(q, sc); $("#dt-draft").value = p.draft; });
  $("#dt-regen")?.addEventListener("click", (e) => { e.target.textContent = "↻ Regenerated"; setTimeout(()=>e.target.textContent="↻ Regenerate",1200); });
  $("#dt-reopen")?.addEventListener("click", closeDetail);
  overlay.addEventListener("click", closeDetail, { once: true });
}
function bundleGrid(items) {
  return `<div class="bundle-grid">${items.map(([k,v,s]) => `<div class="bundle-item"><div class="bi-k">${k}</div><div class="bi-v">${v}</div><div class="bi-sub">${s}</div></div>`).join("")}</div>`;
}
function closeDetail() { $("#detail").classList.add("hidden"); $("#overlay").classList.add("hidden"); }
window.openDetailById = openDetailById;

/* ─────────────────────────── ANALYTICS ─────────────────────────── */
function renderAnalytics() {
  const A = ANALYTICS;
  const donut = (segs) => { let acc=0; return `conic-gradient(${segs.map(s=>{const f=acc;acc+=s.pct;return `${s.c} ${f}% ${acc}%`;}).join(", ")})`; };
  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Vendor Queries — Analytics</div>
      <div class="page-desc">Manage by numbers. Containment is the north-star, watched alongside accuracy and the counter-metrics (re-ask, CSAT) so containment is never "won" by frustrating vendors. Targets are provisional — set against the Phase 0 baseline.</div>
    </div>
    <div class="metrics" style="margin-bottom:18px">
      ${A.metrics.map(m => { const drill = m.label.startsWith("Coverage"); return `
        <div class="metric ${drill?'clickable':''}" style="--c:${m.c}" ${drill?'data-go="ingestion"':''}><div class="m-run">Last run: today</div>
          <div class="m-label">${m.label}</div>
          <div class="m-value">${m.value} <span class="m-delta ${m.up?'up':'down'}">${m.up?'▲':'▼'} ${m.delta}</span></div>
          <div class="m-sub">${m.sub}${drill?' · <span class="m-link">view the 12 unparsed →</span>':''}</div></div>`; }).join("")}
    </div>
    <div class="row" style="margin-bottom:16px;align-items:stretch">
      <div class="card card-pad" style="flex:1.1">
        <div class="section-label">Automation rate by question type <span class="sl-side">% auto-resolved within type</span></div>
        ${A.byType.map(b => `<div class="bar-row"><div class="br-label">${b.label}</div><div class="bar-track"><div class="bar-fill" style="width:${b.pct}%;background:${b.c}"></div></div><div class="br-val">${b.pct}%</div></div>`).join("")}
      </div>
      <div class="card card-pad" style="flex:.9">
        <div class="section-label">Question mix <span class="sl-side">last 30 days</span></div>
        <div class="donut-wrap"><div class="donut" style="background:${donut(A.mix)}"><div class="donut-center"><div class="dc-v">2,418</div><div class="dc-l">queries</div></div></div>
          <div class="legend">${A.mix.map(m => `<div class="legend-item"><span class="legend-dot" style="background:${m.c}"></span>${m.label}<strong>${m.pct}%</strong></div>`).join("")}</div></div>
      </div>
    </div>
    <div class="row" style="align-items:stretch">
      <div class="card card-pad" style="flex:1">
        <div class="section-label">Hard guardrails <span class="sl-side">non-negotiable · from day one</span></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
          <div class="guardrail"><div class="g-ico">🔒</div><div class="g-txt"><strong>0</strong><span>Unauthorized disclosures</span></div></div>
          <div class="guardrail"><div class="g-ico">🏦</div><div class="g-txt"><strong>0</strong><span>Fraudulent bank changes applied</span></div></div>
        </div>
        <div class="spacer-16"></div>
        <div class="section-label">Counter-metrics</div>
        <div class="bar-row"><div class="br-label">Vendor re-ask rate</div><div class="bar-track"><div class="bar-fill" style="width:6.4%;background:var(--green-500)"></div></div><div class="br-val">6.4%</div></div>
        <div class="bar-row"><div class="br-label">Vendor CSAT</div><div class="bar-track"><div class="bar-fill" style="width:88%;background:var(--primary-500)"></div></div><div class="br-val">4.4★</div></div>
      </div>
      <div class="card card-pad" style="flex:1">
        <div class="section-label">Driver analysis <span class="sl-side">what generates the most questions → feed P2P roadmap</span></div>
        ${A.drivers.map(d => `<div class="bar-row"><div class="br-label">${d.label}</div><div class="bar-track"><div class="bar-fill" style="width:${d.pct}%;background:${d.c}"></div></div><div class="br-val">${d.pct}%</div></div>`).join("")}
        <div class="reply-stamp" style="margin-top:14px">Each driver is an upstream problem causing vendor questions. Fixing payment-block release upstream would deflect ~34% of routed disputes at source (Phase 2).</div>
      </div>
    </div>`;
}

/* ─────────────────────────── CONFIGURATION ─────────────────────────── */
const CAPS = [
  { k: "Payment status", d: "The VQ-E1 ladder — the irreducible MVP floor", on: true, locked: true },
  { k: "Payment breakdown (remittance)", d: "VQ-E2 — additive, needs readable remittance", on: true },
  { k: "Document request", d: "VQ-E3 — PO / invoice / payment proof", on: true },
  { k: "Tax certificate", d: "VQ-E4 — manual in v0 (govt portal); always routes", on: false, locked: true },
  { k: "Tax-rate explanation", d: "Stretch — rule-based; escalate if it doesn't reconcile", on: false },
  { k: "Statement reconciliation", d: "Stretch — depends on stage/reason data access", on: false },
  { k: "Bank-detail change", d: "Capture & route only — never auto-applied", on: true, locked: true },
];
function renderConfig() {
  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Workflow Configuration</div>
      <div class="page-desc">Configuration over code (the platform principle). Everything below is set per workflow (per tenant) — which capabilities are on, confidence thresholds, languages, entities and SLAs. The answer engine simply won't attempt a disabled capability; those queries route to a human.</div>
    </div>
    <div class="cfg-grid">
      <div class="card card-pad">
        <div class="section-label">Enabled capabilities <span class="sl-side">coarse on/off · set once</span></div>
        ${CAPS.map((c,i) => `<div class="cfg-cap"><div class="cc-info"><strong>${c.k} ${c.locked?'<span class="tag" style="margin-left:4px">locked</span>':''}</strong><span>${c.d}</span></div><div class="toggle ${c.on?'on':''} ${c.locked?'locked':''}" data-i="${i}"></div></div>`).join("")}
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Confidence thresholds <span class="sl-side">mirrors P2P STP gates</span></div>
          <div class="slider-row"><label>G2 · Answerability</label><input type="range" min="50" max="99" value="82" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="slider-val">82%</span></div>
          <div class="slider-row"><label>G4 · Answer confidence</label><input type="range" min="50" max="99" value="90" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="slider-val">90%</span></div>
          <div class="reply-stamp" style="margin-top:6px">Below threshold → route to a human rather than guess. A confidently-wrong payment date is worse than a slightly slower human answer.</div>
        </div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Legal entities <span class="sl-side">answer is always entity-scoped (Epic C)</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${ENTITIES.map(e=>`<span class="pill blue no-dot">${e.flag} ${e.code} · ${e.ccy}</span>`).join("")}</div>
        </div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Languages <span class="sl-side">detected from the inbound message</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="pill blue no-dot">🇬🇧 English</span><span class="pill blue no-dot">🇨🇳 Mandarin</span>
            <span class="pill blue no-dot">🇮🇩 Bahasa Indonesia</span><span class="pill blue no-dot">🇵🇭 Filipino</span>
            <span class="pill grey no-dot">+ add</span>
          </div>
        </div>
        <div class="card card-pad">
          <div class="section-label">SLA targets by type · Channel</div>
          <div class="slider-row"><label>Auto-answer · first response</label><span class="slider-val" style="min-width:auto">&lt; 2 min</span></div>
          <div class="slider-row"><label>Routed · dispute</label><span class="slider-val" style="min-width:auto">8 hours</span></div>
          <div class="slider-row"><label>Routed · bank change</label><span class="slider-val" style="min-width:auto">24 hours</span></div>
          <div class="slider-row" style="border:none"><label>Channel · Freshdesk (Zalora pattern)</label><span class="pill green no-dot" style="min-width:auto">Connected</span></div>
        </div>
      </div>
    </div>`;
  $$(".toggle:not(.locked)").forEach(t => t.addEventListener("click", () => t.classList.toggle("on")));
}

/* ─────────────────────────── INGESTION LOG (the un-parsed 7%) ─────────────────────────── */
let ingState = null;          // runtime copy so "Create query" / "Ignore" persist until refresh
let ingFilter = "all";        // all | failed | nonquery
function renderIngestion() {
  if (!ingState) ingState = UNPARSED.map(u => ({ ...u }));
  const S = INGEST_SUMMARY;
  const failed = ingState.filter(u => u.cls === "failed" && !u.resolved).length;
  const ignored = ingState.filter(u => u.cls === "nonquery").length;
  const groups = [
    { key: "all", label: "All inbound (unparsed)", n: ingState.length },
    { key: "failed", label: "Needs review", n: ingState.filter(u => u.cls === "failed").length, cls: "orange" },
    { key: "nonquery", label: "Non-query (ignored)", n: ignored, cls: "grey" },
  ];
  const rows = ingState.filter(u => ingFilter === "all" || u.cls === ingFilter);

  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Ingestion log</div>
      <div class="page-desc">Coverage = messages parsed into a structured query ÷ all inbound (PRD §4.2). The shortfall is <strong>logged, never dropped</strong> (VQ-A1.5). Genuine misses (a scanned invoice that failed OCR, an unsupported language) can be recovered into a query; correctly-ignored noise (auto-replies, newsletters, bounces) is kept for the audit trail.</div>
    </div>

    <div class="metrics" style="margin-bottom:16px">
      <div class="metric" style="--c:var(--grey-500)"><div class="m-label">Inbound today</div><div class="m-value">${S.inbound}</div><div class="m-sub">Messages received via Freshdesk</div></div>
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Parsed → queries</div><div class="m-value">${S.parsed}</div><div class="m-sub">Became a structured Query record</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Coverage</div><div class="m-value">${S.coverage}%</div><div class="m-sub">Target ≥ 90%</div></div>
      <div class="metric" style="--c:var(--orange-500)"><div class="m-label">Needs review</div><div class="m-value">${failed}</div><div class="m-sub">Genuine misses — recover into a query</div></div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="chips">
          ${groups.map(g => `<button class="chip ${ingFilter===g.key?'active '+(g.cls||'grey'):''}" data-ing="${g.key}">${g.label}<span class="chip-c">${g.n}</span></button>`).join("")}
        </div>
        <span style="margin-left:auto;font-size:12px;color:var(--muted)">12 of 168 inbound didn't parse</span>
      </div>
      <table class="tbl"><thead><tr>
        <th>Raw / Ticket</th><th>Sender</th><th>Subject</th><th>Why it didn't parse</th><th>Classification</th><th>Action</th>
      </tr></thead><tbody>
      ${rows.map((u, i) => `
        <tr>
          <td class="mono">${u.id}<div style="font-size:10.5px;color:var(--muted)">${u.ref} · ${u.ts}</div></td>
          <td class="mono" style="font-size:12px">${u.sender}</td>
          <td>${u.subject}</td>
          <td style="color:var(--muted);font-size:12.5px">${u.reason}</td>
          <td>${u.resolved ? pill('green','Recovered → '+u.resolved, true) : u.cls==='failed' ? pill('orange','Needs review') : pill('grey','Ignored (non-query)')}</td>
          <td>${
            u.resolved ? '<span style="color:var(--muted);font-size:12px">—</span>'
            : u.cls==='failed'
              ? `<button class="btn btn-primary btn-sm ing-create" data-id="${u.id}">Create query</button> <button class="btn btn-sm ing-raw" data-id="${u.id}">View raw</button>`
              : `<button class="btn btn-sm ing-recover" data-id="${u.id}">It's a query</button> <button class="btn btn-sm ing-raw" data-id="${u.id}">View raw</button>`
          }</td>
        </tr>`).join("")}
      </tbody></table>
      <div class="dash-foot"><span>${rows.length} items</span><div class="dash-foot-right"><span>Rows per page: 50 ⌄</span><span>1–${rows.length} of ${rows.length}</span><span class="pager">‹ 1 ›</span></div></div>
    </div>`;

  $$(".chip[data-ing]").forEach(c => c.addEventListener("click", () => { ingFilter = c.dataset.ing; renderIngestion(); }));
  $$(".ing-create, .ing-recover").forEach(b => b.addEventListener("click", () => {
    const u = ingState.find(x => x.id === b.dataset.id);
    u.resolved = "VQ-48" + (50 + ingState.indexOf(u)); // mock new query id
    toast(`${u.id} recovered into query ${u.resolved} — now in the Queries dashboard.`);
    renderIngestion();
  }));
  $$(".ing-raw").forEach(b => b.addEventListener("click", () => toast(`Raw message ${b.dataset.id} would open here.`)));
}

/* ─────────────────────────── INTEGRATIONS (Connector Studio) ─────────────────────────── */
let connState = null; // runtime copy so Connect/Disconnect persist within the session
const ST = {
  connected:   { cls: "green",  label: "Connected" },
  verifying:   { cls: "yellow", label: "Verifying (Phase 0)" },
  error:       { cls: "red",    label: "Error" },
  disconnected:{ cls: "grey",   label: "Not connected" },
};
function renderIntegrations() {
  if (!connState) connState = CONNECTORS.map(c => ({ ...c }));
  const groups = [...new Set(connState.map(c => c.group))];
  const okCount = connState.filter(c => c.status === "connected").length;
  VIEW.innerHTML = `
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div class="page-title">Integrations</div>
        <div class="page-desc">Connect the data Vendor Queries needs — set it all up here on the platform, no separate tooling. Each client's SAP differs, so the ERP layer sits behind a connector abstraction; payment-status answers are only enabled where a read path is live (PRD §10 / §11).</div>
      </div>
      <button class="btn btn-primary btn-sm" data-toast="New connector wizard would open here.">＋ New connector</button>
    </div>

    <div class="metrics" style="margin-bottom:18px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Connectors live</div><div class="m-value">${okCount}/${connState.length}</div><div class="m-sub">Across channel, ERP & data sources</div></div>
      <div class="metric" style="--c:var(--yellow-500)"><div class="m-label">In Phase 0 check</div><div class="m-value">${connState.filter(c=>c.status==='verifying').length}</div><div class="m-sub">Payment-doc / remittance read feasibility</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Channel</div><div class="m-value" style="font-size:20px">Freshdesk</div><div class="m-sub">Reuses Zalora Phase 1 intake</div></div>
      <div class="metric" style="--c:var(--purple-500)"><div class="m-label">Auth registry</div><div class="m-value" style="font-size:20px">ERP-seeded</div><div class="m-sub">4,512 vendor contacts synced</div></div>
    </div>

    ${groups.map(g => `
      <div class="section-label" style="margin:18px 0 12px">${g}</div>
      <div class="conn-grid">
        ${connState.map((c, i) => c.group === g ? connCard(c, i) : "").join("")}
      </div>`).join("")}`;

  $$(".conn-card .conn-connect").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const i = +b.dataset.i, c = connState[i];
    if (c.status === "connected") { c.status = "disconnected"; c.last = "Disconnected just now"; toast(`${c.name} disconnected.`, "warn"); }
    else if (c.status === "verifying") { c.status = "connected"; c.last = "Connected just now · Phase 0 passed"; toast(`${c.name} verified & connected.`); }
    else { c.status = "connected"; c.last = "Connected just now"; toast(`${c.name} connected.`); }
    renderIntegrations();
  }));
  $$(".conn-card .conn-test").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); toast(`Test ping to ${connState[+b.dataset.i].name}: success (142 ms).`); }));
  $$(".conn-card .conn-cfg").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); toast(`Configuration for ${connState[+b.dataset.i].name} would open here.`); }));
}
function connCard(c, i) {
  const s = ST[c.status];
  const isOn = c.status === "connected";
  return `
    <div class="card conn-card">
      <div class="conn-top">
        <div class="conn-icon">${c.icon}</div>
        <div style="flex:1">
          <div class="conn-name">${c.name}</div>
          <div class="conn-desc">${c.desc}</div>
        </div>
        ${pill(s.cls, s.label)}
      </div>
      <div class="conn-meta"><span class="mono">${c.protocol}</span><span class="conn-dot">·</span><span>${c.last}</span></div>
      <div class="conn-actions">
        <button class="btn btn-sm conn-test" data-i="${i}" ${isOn?'':'disabled'}>Test</button>
        <button class="btn btn-sm conn-cfg" data-i="${i}">Configure</button>
        <button class="btn btn-sm ${isOn?'':'btn-primary'} conn-connect" data-i="${i}" style="margin-left:auto">${isOn?'Disconnect':c.status==='verifying'?'Verify & connect':'Connect'}</button>
      </div>
    </div>`;
}

/* ─────────────────────────── GUIDED TOUR ─────────────────────────── */
const TOUR = [
  { view: "how", title: "1 · The big idea", body: "Vendor Queries auto-answers the ~80% of questions that are simple status checks, and routes the hard ones to a human with context pre-assembled — all behind a strict identity gate. It's a new workflow on the same Neoflo platform as P2P." },
  { view: "inbox", title: "2 · Watch it run", body: "This is the vendor's email. Click 'Process this email' to watch intake → identity gate → context → answer-or-route happen live. Try the dispute, bank-change and auth-fail messages too." },
  { view: "worklist", title: "3 · The AP analyst", body: "Everything that needs a human lands here — same Invoice-Dashboard layout your team already uses, with SLA timers, route reasons and Freshdesk tickets. Click a row to open the context bundle." },
  { view: "analytics", title: "4 · The AP manager", body: "Containment is the north-star, with two hard guardrails at zero: unauthorized disclosures and auto-applied bank changes. Driver analysis feeds the upstream P2P roadmap." },
];
let tourStep = 0;
function startTour() { tourStep = 0; showTour(); }
function showTour() {
  $(".tour-pop")?.remove();
  const t = TOUR[tourStep];
  render(t.view);
  const pop = el(`<div class="tour-pop" style="right:28px;bottom:28px">
      <h5>${t.title}</h5><p>${t.body}</p>
      <div class="tour-nav"><span class="tour-step">${tourStep+1} / ${TOUR.length}</span>
        <div class="tour-btns"><button class="tn-skip">Skip</button><button class="tn-next">${tourStep===TOUR.length-1?'Done':'Next ›'}</button></div></div></div>`);
  document.body.appendChild(pop);
  pop.querySelector(".tn-skip").addEventListener("click", () => pop.remove());
  pop.querySelector(".tn-next").addEventListener("click", () => { if (tourStep === TOUR.length-1) pop.remove(); else { tourStep++; showTour(); } });
}

/* ─────────────────────────── BOOT ─────────────────────────── */
// global handler for lightweight/illustrative buttons (data-toast / data-close)
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { render(go.dataset.go); return; }
  const b = e.target.closest("[data-toast],[data-close]");
  if (!b) return;
  if (b.hasAttribute("data-toast")) toast(b.dataset.toast || "Done.");
  if (b.hasAttribute("data-close")) closeDetail();
});
$(".sb-collapse")?.addEventListener("click", () => $("#app").classList.toggle("collapsed"));

/* ─── account menu + logout ─── */
const GOOGLE_G = `<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.6 28.1c-.5-1.4-.7-2.9-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z"/></svg>`;
const acctMenu = el(`
  <div id="acct-menu" class="acct-menu hidden">
    <div class="acct-head"><div class="acct-av">SS</div><div><div class="acct-name">Shubham S.</div><div class="acct-email">shubham.s@neoflo.ai</div></div></div>
    <div class="acct-role">AP · Admin · Vendor Queries workspace</div>
    <div class="acct-div"></div>
    <button class="acct-item" data-toast="Profile & preferences would open here.">⚙️ Account settings</button>
    <button class="acct-item danger" id="acct-logout">⎋ Log out</button>
  </div>`);
document.body.appendChild(acctMenu);
function toggleAcctMenu(trigger) {
  if (!acctMenu.classList.contains("hidden")) { acctMenu.classList.add("hidden"); return; }
  const r = trigger.getBoundingClientRect();
  acctMenu.style.top = acctMenu.style.bottom = acctMenu.style.left = acctMenu.style.right = "auto";
  if (r.top < 120) { acctMenu.style.top = (r.bottom + 8) + "px"; acctMenu.style.right = (innerWidth - r.right) + "px"; }
  else { acctMenu.style.bottom = (innerHeight - r.top + 8) + "px"; acctMenu.style.left = "12px"; }
  acctMenu.classList.remove("hidden");
}
$(".sb-footer")?.addEventListener("click", (e) => { e.stopPropagation(); toggleAcctMenu($(".sb-footer")); });
$(".tb-avatar")?.addEventListener("click", (e) => { e.stopPropagation(); toggleAcctMenu($(".tb-avatar")); });
document.addEventListener("click", (e) => { if (!acctMenu.contains(e.target)) acctMenu.classList.add("hidden"); });
$("#acct-logout").addEventListener("click", () => { acctMenu.classList.add("hidden"); logout(); });

/* ─── workspace (workflow) dropdown — tenant stays static ─── */
const WORKSPACES = [
  { name: "Vendor Queries", desc: "Vendor query automation", current: true },
  { name: "Invoice Processing", desc: "P2P invoice capture → ERP posting" },
  { name: "Cash Application", desc: "Bank reconciliation & settlement" },
  { name: "AR Forecast", desc: "Receivables forecasting" },
];
const wsMenu = el(`
  <div id="ws-menu" class="ws-menu hidden">
    <div class="ws-menu-head">Switch workspace · Zalora</div>
    ${WORKSPACES.map(w => `<button class="ws-opt ${w.current?'current':''}" data-ws="${w.name}"><div><div class="ws-opt-name">${w.name}</div><div class="ws-opt-desc">${w.desc}</div></div>${w.current?'<span class="ws-check">✓</span>':''}</button>`).join("")}
  </div>`);
document.body.appendChild(wsMenu);
$("#ws-trigger")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!wsMenu.classList.contains("hidden")) { wsMenu.classList.add("hidden"); return; }
  const r = $("#ws-trigger").getBoundingClientRect();
  wsMenu.style.top = (r.bottom + 8) + "px"; wsMenu.style.left = r.left + "px";
  wsMenu.classList.remove("hidden");
});
$$(".ws-opt", wsMenu).forEach(b => b.addEventListener("click", () => {
  wsMenu.classList.add("hidden");
  if (!b.classList.contains("current")) toast(`Switching to "${b.dataset.ws}" isn't available in this prototype.`, "info");
}));
document.addEventListener("click", (e) => { if (!wsMenu.contains(e.target) && e.target.id !== "ws-trigger") wsMenu.classList.add("hidden"); });

function logout() {
  const screen = el(`
    <div id="signin" class="signin">
      <div class="signin-card">
        <img src="neoflo_logo.png" alt="Neoflo" class="signin-logo"/>
        <div class="signin-ws">Vendor Queries</div>
        <h2>Sign in to continue</h2>
        <p>Access is restricted to whitelisted users via Google SSO.</p>
        <button class="gbtn" id="signin-go">${GOOGLE_G}<span>Continue with Google</span></button>
        <div class="signin-note">You've been signed out. Session ends after 30 days (Zalora Phase 1 auth model).</div>
      </div>
    </div>`);
  document.body.appendChild(screen);
  $("#signin-go").addEventListener("click", () => { screen.remove(); toast("Signed in as Shubham S. (shubham.s@neoflo.ai)."); });
}

$$(".sb-child").forEach(c => c.addEventListener("click", () => render(c.dataset.view)));
$("#proto-tour").addEventListener("click", startTour);
render("worklist");   // action dashboard is the default view
