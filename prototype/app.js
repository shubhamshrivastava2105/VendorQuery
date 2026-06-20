/* ============================================================
   Vendor Queries prototype — view router + interactions
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };

const VIEW = $("#view");
const CRUMB = { worklist: "Queries", ingestion: "Ingestion & routing", storage: "Vendor storage", analytics: "Analytics", integrations: "Integrations", config: "Configuration" };
let currentView = "worklist";
const ME = "Shubham S.";   // the signed-in AP user (matches sidebar footer)
let currentRole = "Org admin";   // role-based view — switchable from the top bar (user-management PRD)
// re-render whatever view is behind the slide-over so data changes show on "back"
function refreshBackground() { if (currentView === "worklist") renderWorklist(); }

/* ─── role-based access (user-management PRD / VQ-H3) ─── */
function applyRoleAccess() {
  const r = roleDef(currentRole);
  $$(".sb-child").forEach(a => { a.style.display = r.views.includes(a.dataset.view) ? "" : "none"; });
  const lbl = $("#role-label"); if (lbl) lbl.textContent = currentRole;
  const ur = $(".sb-user-role"); if (ur) ur.textContent = "Vendor Queries · " + currentRole;
  if (!r.views.includes(currentView)) render("worklist");
}

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

/* ─── modal ─── */
function closeModal() { $("#modal-overlay")?.remove(); $("#modal-root")?.remove(); }
function modal({ title, subtitle = "", body = "", primary = "Save", onPrimary = null, primaryClass = "btn-primary", wide = false, afterOpen = null }) {
  closeModal();
  const ov = el(`<div id="modal-overlay" class="overlay overlay-modal"></div>`);
  const root = el(`
    <div id="modal-root" class="modal ${wide ? 'modal-wide' : ''}">
      <div class="modal-head">
        <div><div class="modal-title">${title}</div>${subtitle ? `<div class="modal-sub">${subtitle}</div>` : ''}</div>
        <button class="modal-x" id="modal-x" title="Close">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button class="btn" id="modal-cancel">Cancel</button>
        ${onPrimary ? `<button class="btn ${primaryClass}" id="modal-primary">${primary}</button>` : ''}
      </div>
    </div>`);
  document.body.appendChild(ov); document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add("show"));
  ov.addEventListener("click", closeModal);
  $("#modal-x").addEventListener("click", closeModal);
  $("#modal-cancel").addEventListener("click", closeModal);
  if (onPrimary) $("#modal-primary").addEventListener("click", () => { if (onPrimary(root) !== false) closeModal(); });
  document.addEventListener("keydown", function esc(e){ if(e.key==="Escape"){ closeModal(); document.removeEventListener("keydown", esc); } });
  if (afterOpen) afterOpen(root);
  return root;
}

/* ─── searchable vendor picker (the registry has thousands — never a full list) ─── */
function vendorPickerHtml(idp = "vp", placeholder = "Search vendor by name or email…") {
  return `<div class="vpick" id="${idp}">
    <span class="vpick-ico">🔍</span>
    <input class="vpick-input" id="${idp}-input" placeholder="${placeholder}" autocomplete="off"/>
    <div class="vpick-drop hidden" id="${idp}-drop"></div>
  </div>`;
}
function wireVendorPicker(idp, onSelect) {
  const input = $("#" + idp + "-input"), drop = $("#" + idp + "-drop");
  if (!input) return;
  const renderList = (term) => {
    const t = term.trim().toLowerCase();
    const res = (t ? VENDORS.filter(v => (v.name + " " + v.email).toLowerCase().includes(t)) : VENDORS).slice(0, 8);
    drop.innerHTML = res.length
      ? res.map(v => `<div class="vpick-opt" data-name="${v.name.replace(/"/g,'&quot;')}">
          <div class="vpick-txt"><div class="vpick-n">${v.name}</div><div class="vpick-e">${v.email}</div></div>
          <span class="vpick-ent">${v.entity.flag} ${v.entity.code}</span></div>`).join("")
        + (VENDORS.length > res.length ? `<div class="vpick-more">Showing ${res.length} of ${VENDORS.length}+ — keep typing to narrow</div>` : "")
      : `<div class="vpick-empty">No vendor matches “${term}”.</div>`;
    drop.classList.remove("hidden");
    $$(".vpick-opt", drop).forEach(o => o.addEventListener("click", () => {
      const v = VENDORS.find(x => x.name === o.dataset.name);
      input.value = v.name; drop.classList.add("hidden"); onSelect(v);
    }));
  };
  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("input", () => renderList(input.value));
}

function setActiveNav(view) {
  $$(".sb-child").forEach(c => c.classList.toggle("active", c.dataset.view === view));
  $("#tb-sub").textContent = CRUMB[view] || "";
}
function render(view) {
  if (!roleDef(currentRole).views.includes(view)) view = "worklist";
  currentView = view;
  setActiveNav(view);
  VIEW.scrollTop = 0;
  ({ worklist: renderWorklist, ingestion: renderIngestion, storage: renderVendorStorage, analytics: renderAnalytics, integrations: renderIntegrations, config: renderConfig }[view] || renderWorklist)();
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

/* ─── processing trace (used inside Query detail) ─── */
// Renders the scenario's pipeline steps as a static vertical stepper.
function processTraceHtml(sc) {
  if (!sc || !sc.run) return "";
  return `<div class="run-strip static">${sc.run.map(step => `
    <div class="run-step ${step.state} show">
      <div class="run-ico">${step.state==='ok'?'✓':step.state==='fail'?'✕':step.state==='warn'?'!':'◆'}</div>
      <div class="run-txt"><div class="rt-k">${step.k}</div><div class="rt-d">${step.d}</div></div>
    </div>`).join("")}</div>`;
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
  const navCount = $("#nav-open-count"); if (navCount) navCount.textContent = human;
  const counts = Object.fromEntries(OUTCOME_GROUPS.map(g => [g.key, g.key === "all" ? total : QUERIES.filter(q => groupOf(q.qstate) === g.key).length]));
  const types = [...new Set(QUERIES.map(q => q.type))];
  const rows = QUERIES.filter(wlMatch);

  VIEW.innerHTML = `
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div class="page-title">Queries</div>
        <div class="page-desc">Auto-answered and human-routed queries in one place.</div>
      </div>
      <button class="btn btn-primary btn-sm" id="wl-new">＋ New manual query</button>
    </div>

    <div class="metrics" style="margin-bottom:16px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Auto-answered</div><div class="m-value">${auto}</div><div class="m-sub">Today</div></div>
      <div class="metric" style="--c:var(--orange-500)"><div class="m-label">Need a person</div><div class="m-value">${human}</div><div class="m-sub">In the queue</div></div>
      <div class="metric" style="--c:var(--red-500)"><div class="m-label">SLA breaches</div><div class="m-value">${breaches}</div><div class="m-sub">Past target</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Containment</div><div class="m-value">${Math.round(auto/total*100)}%</div><div class="m-sub">${auto} of ${total}</div></div>
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
          <td class="mono">${q.id}<div style="font-size:10.5px;color:var(--muted)">${q.ref}</div><div style="font-size:10.5px;color:var(--muted)">${q.ts}</div></td>
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
  $("#wl-new")?.addEventListener("click", openNewQueryModal);
}

// Manual query intake (rare — most arrive via Freshdesk)
function openNewQueryModal() {
  let chosen = null;
  const typeOpts = Object.keys(TYPECLS).filter(t => t !== "Unverified sender").map(t => `<option value="${t}">${t}</option>`).join("");
  modal({
    title: "New manual query",
    subtitle: "Most queries arrive automatically via Freshdesk.",
    primary: "Create query",
    body: `
      <div class="form-row">
        <label>Vendor · search the registry</label>
        ${vendorPickerHtml("vp-nq", "Search vendor by name or email…")}
        <div class="form-hint" id="vp-nq-hint">Identity is checked against this vendor's verified contacts.</div>
      </div>
      <div class="form-row"><label>Query type</label><select id="nq-type">${typeOpts}</select></div>
      <div class="form-row"><label>What is the vendor asking?</label><textarea id="nq-msg" placeholder="e.g. Has invoice INV-2098 been paid?"></textarea></div>`,
    afterOpen: () => wireVendorPicker("vp-nq", v => { chosen = v; $("#vp-nq-hint").textContent = `Selected: ${v.name} · ${v.entity.flag} ${v.entity.code}`; }),
    onPrimary: () => {
      if (!chosen) { toast("Pick a vendor first.", "warn"); return false; }
      const type = $("#nq-type").value;
      const id = "VQ-49" + (10 + Math.floor(QUERIES.length));
      QUERIES.unshift({
        id, ref: "MANUAL", vendor: chosen.name, email: chosen.email, entity: chosen.entity,
        type, qstate: "routed", human: true, reason: `${type} · manual intake`,
        sla: "8h 00m", slaState: "ok", assignee: "Unassigned", resolved: null, ts: "11 Jun · now", scenario: null,
      });
      toast(`Manual query ${id} created for ${chosen.name} — now in the queue.`);
      renderWorklist();
    },
  });
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
      ["Goods-receipt value", `${q.entity.ccy} 579.00`, "paid against GR"],
      ["Posting ID", sc.postingId, ""],
      ["Payment doc", sc.paymentDoc, "cleared"],
    ],
    summary: `Short-paid PHP 53 on INV-2451. Cause: invoiced ${q.entity.ccy} ${sc.amount}, but the goods-receipt was ${q.entity.ccy} 579.00 — paid against the GR, not an error.`,
    suggestion: sc.route.suggest, draft: sc.route.draft,
  };
  if (sc && sc.outcome === "captured") return {
    records: [
      ["Requested (unverified)", sc.capture.requested, "from inbound email"],
      ["Current on file", sc.capture.current, "vendor master"],
    ],
    summary: `Request to change bank account to ${sc.capture.requested}. Identity passed, but bank changes are never applied automatically — verify by phone before anything is changed.`,
    suggestion: sc.capture.stepup,
    draft: "Hi, thanks for your request to update your banking details. For your security we verify every bank-account change by phone, using the number we already hold on file, before applying it — we'll call you shortly to confirm. No payment will use the new account until that check is complete.",
  };
  if (sc && sc.outcome === "authfail") return {
    records: [],
    summary: `Sender ${sc.email} isn't a verified contact, and the domain mimics a real vendor (…-billing.net vs …-bi.com) — likely impersonation. Nothing was disclosed.`,
    suggestion: "Confirm with the known contact on file. If genuine, add the address; if not, flag as fraud — never share any balance or account detail.",
    draft: "Thank you for getting in touch. Before we can share any account or payment information we need to verify your identity. Please reply from your registered company email address, or contact your usual AP representative directly.",
  };
  if (q.qstate === "reopened") return {
    records: [["Original answer", "Paid · TXN-55218", "vendor disputes this"]],
    summary: `Vendor replied to a closed answer disputing the figures. It reopened and routed to a person, with the original answer and context attached.`,
    suggestion: "Re-check the disputed figures against the payment document and goods-receipt, then reply personally.",
    draft: "Thanks for getting back to us — I've reopened your query and it's now with me personally. Let me re-check the figures against our records and I'll come back to you with a clear breakdown shortly.",
  };
  // statement reconciliation / generic human
  return {
    records: [
      ["Paid", "5 of 10", "cleared"],
      ["Awaiting GR/SES", "3 of 10", "pre-payment"],
      ["Rejected · duplicate", "2 of 10", "flagged"],
    ],
    summary: `Why only 5 of 10 invoices are paid: 5 paid, 3 awaiting goods-receipt confirmation, 2 rejected as duplicates.`,
    suggestion: "Confirm the 3 awaiting-GR lines with receiving and the 2 duplicate flags, then send a line-by-line breakdown.",
    draft: "Hi, thanks for your statement query. Of the 10 invoices, 5 are paid, 3 are awaiting goods-receipt/service-entry confirmation, and 2 were flagged as duplicates. I'm confirming the stuck items with our team and will send you a line-by-line breakdown shortly.",
  };
}

// Platform-side assignment — only when not assigned in Freshdesk
function assignQueryTo(q, name) {
  q.assignee = name;
  q.assignSource = "platform";
  toast(`Assigned to ${name === ME ? 'you' : name}.`);
  refreshBackground();
  openDetailById(q.id);
}
function openAssignModal(q) {
  const opts = TEAM.map(m => `<option value="${m.name}">${m.name} — ${m.role}${m.you ? ' (you)' : ''}</option>`).join("");
  modal({
    title: "Assign on the platform",
    subtitle: "Not assigned on the Freshdesk ticket — assign it here.",
    primary: "Assign",
    body: `
      <div class="form-row"><label>Assign to</label><select id="asg-who">${opts}</select></div>
      <div class="form-hint">Every query has one accountable assignee; changes are audit-logged.</div>`,
    onPrimary: () => assignQueryTo(q, $("#asg-who").value),
  });
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
  // assignment source (Freshdesk-first, platform fallback) + role
  const role = roleDef(currentRole);
  const unassigned = q.assignee === "Unassigned";
  const asgSource = unassigned ? "Not assigned in Freshdesk" : q.assignee === "Auto" ? "Auto-resolved" : q.assignSource === "platform" ? "Assigned on the platform" : "Assigned in Freshdesk";

  // banner
  let banner;
  if (q.qstate === "authfail") banner = `<div class="dt-banner red">⚠️ Identity check failed — possible impersonation. Nothing was disclosed.</div>`;
  else if (q.qstate === "captured") banner = `<div class="dt-banner purple">🔏 Bank-change request captured. Never applied automatically — verify by phone first.</div>`;
  else if (q.qstate === "breached") banner = `<div class="dt-banner red">⏰ SLA breached — past its response target.</div>`;
  else if (q.qstate === "reopened") banner = `<div class="dt-banner blue">↺ Reopened — the vendor pushed back on a closed answer. Now with a person.</div>`;
  else if (isAuto) banner = `<div class="dt-banner green">✅ Auto-answered in ${q.resolved} — no one touched it.</div>`;
  else if (isClosed) banner = `<div class="dt-banner grey">✔ Closed — resolved by ${q.assignee} in ${q.resolved}.</div>`;
  else banner = `<div class="dt-banner orange">↗ Routed to a person — context assembled, ready to respond.</div>`;

  // ── core: human summarized view vs auto read-only ──
  let core;
  if (isAuto) {
    const lad = sc?.ladder ? `<div class="ladder-wrap"><div class="ladder-k">Payment status</div>${ladderHtml(sc.ladder)}</div>` : "";
    const reply = sc ? `<strong>${sc.answer.lead}</strong> ${sc.answer.body}` : `Answered automatically — ${q.reason}.`;
    const stamp = sc ? sc.answer.stamp : "Composed from live records · identity verified";
    core = `
      <div class="card card-pad">
        <div class="dt-section-title">What we sent <span class="tag" style="margin-left:6px">no human touch</span></div>
        ${lad}
        <div class="reply-box"><div class="rb-meta"><span>To: ${q.email}</span><span>·</span><span>identity ✓</span><span>·</span><span>${fd}</span></div>
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
        <div class="dt-section-title">Summary <span class="tag" style="margin-left:6px">auto-assembled</span></div>
        <div class="summary-box"><div class="sm-k">What's going on</div><div class="sm-v">${pack.summary}</div></div>
        ${pack.records.length ? `<div class="spacer-12"></div><div class="dt-section-title">Records</div>${bundleGrid(pack.records)}` : ""}
        <div class="spacer-12"></div>
        <div class="suggest-box"><div class="sx-k">💡 Suggested next step</div><div class="sx-v">${pack.suggestion}</div></div>
      </div>
      <div class="card card-pad">
        <div class="dt-section-title">Suggested reply <span class="tag" style="margin-left:6px">editable</span></div>
        <div class="reply-tools">
          <button class="btn btn-sm" id="rt-regen">↻ Regenerate</button>
          <button class="btn btn-sm" id="rt-reset">Reset</button>
          <span style="margin-left:auto;font-size:11.5px;color:var(--muted)">Responding as ${q.assignee==='Unassigned'?'(assign yourself first)':q.assignee}</span>
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
          ${unassigned?`<button class="btn btn-sm" id="dt-assign">${role.assignOthers?'Assign…':'Assign to me'}</button>`:''}
          ${q.qstate==='captured'?`<button class="btn btn-sm dt-terminal" style="color:var(--red-600);border-color:var(--red-200)" data-msg="Bank change rejected. Vendor master unchanged." data-newstate="closed">Reject change</button><button class="btn btn-primary btn-sm dt-terminal" data-msg="Verified by phone & applied." data-newstate="closed">✓ Verify & send</button>`
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
        <div class="metric" style="--c:var(--grey-500);flex:1;padding:13px 15px"><div class="m-label">Assignee</div><div class="m-value" style="font-size:15px;margin-top:6px">${unassigned?'—':q.assignee}</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">${asgSource}</div></div>
      </div>

      ${isHuman && unassigned ? `<div class="dt-banner ${role.assignOthers?'blue':'grey'}" style="display:block">
        🧑‍💼 <strong>Not assigned on the Freshdesk ticket.</strong> ${role.assignOthers ? 'Assign it on the platform — pick a team member or take it yourself.' : 'An org/workspace admin assigns it on the platform; you can take it yourself.'}
      </div>` : ''}

      <div class="card card-pad">
        <div class="dt-section-title">Vendor's question</div>
        <div class="email-bubble">
          <div class="eb-head"><div class="eb-from">${q.vendor} &lt;${q.email}&gt;</div><div class="eb-to">${q.ref} · via Freshdesk · ${q.ts}</div></div>
          <div class="eb-body">${sc ? sc.body.replace(/\n/g,'<br>') : 'Statement: only 5 of 10 invoices appear paid — please explain the rest.'}</div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="dt-section-title">Identity check</div>
        <dl class="kv">
          <dt>Result</dt><dd>${q.qstate==='authfail'?pill('red','FAILED',true):pill('green','PASSED',true)}</dd>
          <dt>Matched contact</dt><dd>${q.qstate==='authfail'?'— (no match)':q.email}</dd>
          <dt>Scope</dt><dd>${q.qstate==='authfail'?'—':entLabel(q.entity)+' · own records'}</dd>
        </dl>
      </div>

      ${core}

      ${sc ? `<div class="card card-pad">
        <div class="dt-section-title">How this query was processed <span class="tag" style="margin-left:6px">pipeline trace</span></div>
        ${processTraceHtml(sc)}
      </div>` : ''}

      <div class="card card-pad">
        <div class="dt-section-title">Audit trail <span class="tag" style="margin-left:6px">immutable</span></div>
        <div class="audit-row"><span class="ar-t">${q.ts.split('· ')[1]||'08:15'}</span><span class="ar-d"><strong>Routed</strong> · classified → vendor-query workflow${q.qstate==='captured'?' (action)':''}</span></div>
        <div class="audit-row"><span class="ar-t">+0s</span><span class="ar-d"><strong>Intake</strong> · email parsed into ${q.id}</span></div>
        <div class="audit-row"><span class="ar-t">+1s</span><span class="ar-d"><strong>Identity check</strong> · ${q.qstate==='authfail'?'failed — disclosure blocked':'passed'}</span></div>
        <div class="audit-row"><span class="ar-t">+2s</span><span class="ar-d"><strong>${q.qstate==='captured'?'Action — held for a person':'Context assembled'}</strong> · ${q.qstate==='captured'?'never auto-resolved':'invoice workflow + ERP + vendor storage'}</span></div>
        <div class="audit-row"><span class="ar-t">+3s</span><span class="ar-d"><strong>${isAuto?'Auto-answered':isClosed?'Closed':'Routed'}</strong> · ${q.reason} · ${fd}</span></div>
      </div>
    </div>

    <div class="dt-foot">
      ${isHuman ? `
        ${q.qstate==='captured'?'<button class="btn btn-primary dt-terminal" data-msg="Verified by phone & applied." data-newstate="closed">✓ Verify & approve change</button><button class="btn dt-terminal" data-msg="Bank change rejected. Vendor master unchanged." data-newstate="closed">Reject</button>'
          : q.qstate==='authfail'?'<button class="btn btn-primary dt-terminal" data-msg="Safe non-disclosing reply sent." data-newstate="closed">Send safe reply</button><button class="btn dt-terminal" style="color:var(--red-600);border-color:var(--red-200)" data-msg="Flagged as fraud. Attempt logged." data-newstate="closed">Flag as fraud</button>'
          : '<button class="btn btn-primary dt-terminal" data-msg="Reply sent. Freshdesk → Neoflo - Closed." data-newstate="closed">Send reply & close</button><button class="btn" data-toast="Draft saved.">Save draft</button>'}`
        : '<button class="btn" data-close>Close</button>'}
      <span style="margin-left:auto;font-size:12px;color:var(--muted)">${isHuman?'Sending syncs status back to Freshdesk '+q.ref:'Read-only · '+fd}</span>
    </div>`;

  overlay.classList.remove("hidden");
  detail.classList.remove("hidden");
  $("#dt-close").addEventListener("click", closeDetail);
  // Platform-side assignment (when not assigned in Freshdesk). Admins/leads can assign anyone.
  $("#dt-assign")?.addEventListener("click", () => {
    if (role.assignOthers) openAssignModal(q);
    else assignQueryTo(q, ME);
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
      <div class="page-title">Analytics</div>
      <div class="page-desc">Last 30 days.</div>
    </div>
    <div class="metrics" style="margin-bottom:18px">
      ${A.metrics.map(m => { const drill = m.label.startsWith("Coverage"); return `
        <div class="metric ${drill?'clickable':''}" style="--c:${m.c}" ${drill?'data-go="ingestion"':''}>
          <div class="m-label">${m.label}</div>
          <div class="m-value">${m.value} <span class="m-delta ${m.up?'up':'down'}">${m.up?'▲':'▼'} ${m.delta}</span></div>
          <div class="m-sub">${m.sub}</div></div>`; }).join("")}
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
    <div class="row" style="margin-bottom:16px;align-items:stretch">
      <div class="card card-pad" style="flex:1">
        <div class="section-label">Routing service</div>
        <div class="bar-row"><div class="br-label" style="font-weight:600">Routing accuracy</div><div class="bar-track"><div class="bar-fill" style="width:98.1%;background:var(--purple-500)"></div></div><div class="br-val">98.1%</div></div>
        <div class="spacer-12"></div>
        <div class="section-label">Where replies route <span class="sl-side">last 30 days</span></div>
        ${A.routing.map(r => `<div class="bar-row"><div class="br-label">${r.label}</div><div class="bar-track"><div class="bar-fill" style="width:${r.pct}%;background:${r.c}"></div></div><div class="br-val">${r.pct}%</div></div>`).join("")}
      </div>
    </div>
    <div class="row" style="align-items:stretch">
      <div class="card card-pad" style="flex:1">
        <div class="section-label">Guardrails</div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="guardrail"><div class="g-ico">🔒</div><div class="g-txt"><strong>0</strong><span>Unauthorized disclosures</span></div></div>
          <div class="guardrail"><div class="g-ico">🏦</div><div class="g-txt"><strong>0</strong><span>Bank changes auto-applied</span></div></div>
          <div class="guardrail"><div class="g-ico">📋</div><div class="g-txt"><strong>100%</strong><span>Audit coverage</span></div></div>
        </div>
        <div class="spacer-16"></div>
        <div class="section-label">Counter-metrics <span class="sl-side">satisfaction inferred from behaviour</span></div>
        <div class="bar-row"><div class="br-label">Vendor re-ask rate</div><div class="bar-track"><div class="bar-fill" style="width:6.4%;background:var(--green-500)"></div></div><div class="br-val">6.4%</div></div>
        <div class="bar-row"><div class="br-label">Reply sentiment (positive)</div><div class="bar-track"><div class="bar-fill" style="width:82%;background:var(--primary-500)"></div></div><div class="br-val">82%</div></div>
        <div class="bar-row"><div class="br-label">Dispute / reopen rate</div><div class="bar-track"><div class="bar-fill" style="width:4.1%;background:var(--orange-500)"></div></div><div class="br-val">4.1%</div></div>
      </div>
      <div class="card card-pad" style="flex:1">
        <div class="section-label">What drives the questions <span class="sl-side">upstream causes</span></div>
        ${A.drivers.map(d => `<div class="bar-row"><div class="br-label">${d.label}</div><div class="bar-track"><div class="bar-fill" style="width:${d.pct}%;background:${d.c}"></div></div><div class="br-val">${d.pct}%</div></div>`).join("")}
      </div>
    </div>`;
}

/* ─────────────────────────── CONFIGURATION ─────────────────────────── */
// Per-intent handling mode: off | human | automated. Actions are locked to human.
const CAPS = [
  { k: "Payment status", d: "“Paid” only stated once cleared", kind: "query", mode: "automated", locked: true },
  { k: "Payment breakdown", d: "Which invoices a payment covers, with deductions", kind: "query", mode: "automated" },
  { k: "Document request", d: "PO, invoice copy, payment proof", kind: "query", mode: "automated" },
  { k: "Invoice receipt", d: "Whether an invoice was received and where it stands", kind: "query", mode: "automated" },
  { k: "Tax certificate", d: "Auto-served when on file in vendor storage, else routed", kind: "query", mode: "automated" },
  { k: "Tax-rate explanation", d: "Rule-based; escalate if it doesn’t reconcile", kind: "query", mode: "human" },
  { k: "Statement reconciliation", d: "List statuses; explain anything stuck", kind: "query", mode: "human" },
  { k: "Bank-detail change", d: "Captured & routed, never applied automatically", kind: "action", mode: "human", locked: true },
  { k: "Address change", d: "Always routed to a person", kind: "action", mode: "human", locked: true },
];
const MODES = ["off", "human", "automated"];
const MODE_LABEL = { off: "Off", human: "Human", automated: "Automated" };
let cfgVendor = null;                 // vendor selected in the per-vendor config picker
const vendorCfg = { "Car Station Automotive Inc.": { autoReply: false } };  // overrides (default on)
function renderConfig() {
  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Configuration</div>
      <div class="page-desc">Workflow and per-vendor settings.</div>
    </div>
    <div class="cfg-grid">
      <div class="card card-pad">
        <div class="section-label">How each query type is handled <span class="sl-side">off · human · automated</span></div>
        ${CAPS.map((c,i) => `
          <div class="cfg-cap">
            <div class="cc-info"><strong>${c.k} ${c.kind==='action'?'<span class="pill purple no-dot" style="margin-left:4px">action</span>':''}</strong><span>${c.d}</span></div>
            <div class="modeseg" data-i="${i}">
              ${MODES.map(m => {
                const active = c.mode === m;
                const disabled = c.kind === 'action' && m === 'automated';
                return `<button class="modeseg-opt ${active?'active':''} ${disabled?'disabled':''}" data-i="${i}" data-mode="${m}" ${disabled?'disabled':''}>${MODE_LABEL[m]}</button>`;
              }).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Per-vendor settings</div>
          <div class="form-row" style="margin:10px 0 12px">${vendorPickerHtml("vp-cfg", "Search a vendor to configure…")}</div>
          <div id="cfg-vendor-box">${cfgVendorBoxHtml()}</div>
          ${Object.keys(vendorCfg).length ? `<div class="reply-stamp" style="margin-top:10px">Overridden: ${Object.entries(vendorCfg).map(([n,c])=>`${n} (auto-reply ${c.autoReply===false?'off':'on'})`).join(' · ')}</div>` : ''}
        </div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Accuracy & confidence targets</div>
          <div class="slider-row"><label>Auto-answer accuracy</label><span class="pill green no-dot" style="min-width:auto">95%+</span></div>
          <div class="slider-row"><label>Routing confidence</label><span class="pill blue no-dot" style="min-width:auto">98%</span></div>
          <div class="slider-row" style="border:none"><label>Coverage</label><span class="pill blue no-dot" style="min-width:auto">≥ 90%</span></div>
        </div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Legal entities <span class="sl-side">answers are entity-scoped</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${ENTITIES.map(e=>`<span class="pill blue no-dot">${e.flag} ${e.code} · ${e.ccy}</span>`).join("")}</div>
        </div>
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-label">Reply language</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span class="pill green no-dot">🇬🇧 English</span>
            <span style="font-size:12px;color:var(--muted)">Inbound accepted in any language; replies are English.</span>
          </div>
        </div>
        <div class="card card-pad">
          <div class="section-label">SLA targets · channel</div>
          <div class="slider-row"><label>Auto-answer · first response</label><span class="slider-val" style="min-width:auto">&lt; 2 min</span></div>
          <div class="slider-row"><label>Routed · dispute</label><span class="slider-val" style="min-width:auto">8 hours</span></div>
          <div class="slider-row"><label>Routed · bank change</label><span class="slider-val" style="min-width:auto">24 hours</span></div>
          <div class="slider-row" style="border:none"><label>Channel · Freshdesk</label><span class="pill green no-dot" style="min-width:auto">Connected</span></div>
        </div>
      </div>
    </div>`;
  $$(".modeseg-opt:not([disabled])").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.i;
    CAPS[i].mode = b.dataset.mode;
    renderConfig();
  }));
  $$(".toggle:not(.locked):not(.vcfg-toggle)").forEach(t => t.addEventListener("click", () => t.classList.toggle("on")));
  wireVendorPicker("vp-cfg", v => { cfgVendor = v; $("#cfg-vendor-box").innerHTML = cfgVendorBoxHtml(); wireCfgVendorBox(); });
  wireCfgVendorBox();
}
function cfgVendorBoxHtml() {
  if (!cfgVendor) return `<div class="cfg-empty">Search above to configure a vendor.</div>`;
  const cfg = vendorCfg[cfgVendor.name] || { autoReply: true };
  return `
    <div class="cfg-cap" style="border-top:1px solid var(--grey-100);padding-top:14px">
      <div class="cc-info"><strong>${cfgVendor.name}</strong><span>${cfgVendor.entity ? entLabel(cfgVendor.entity) + ' · ' : ''}${cfgVendor.email || ''}</span></div>
      <div class="toggle vcfg-toggle ${cfg.autoReply !== false ? 'on' : ''}"></div>
    </div>
    <div class="form-hint">Auto-reply is <strong id="vcfg-state">${cfg.autoReply !== false ? 'on' : 'off — every query is routed to a person'}</strong> for this vendor.</div>`;
}
function wireCfgVendorBox() {
  const t = $(".vcfg-toggle");
  if (!t) return;
  t.addEventListener("click", () => {
    t.classList.toggle("on");
    const on = t.classList.contains("on");
    vendorCfg[cfgVendor.name] = { autoReply: on };
    $("#vcfg-state").innerHTML = on ? "on" : "off — every query is routed to a person";
    toast(`Auto-reply ${on ? 'enabled' : 'disabled'} for ${cfgVendor.name}.`);
  });
}

/* ─────────────────────────── VENDOR STORAGE (Epic N) ─────────────────────────── */
const VS_ST = {
  valid:    { cls: "green",  label: "Valid" },
  expiring: { cls: "yellow", label: "Expiring soon" },
  expired:  { cls: "red",    label: "Expired · never served" },
};
let vsState = null;        // runtime copy so uploads persist within the session
let vsSearch = "";         // vendor filter
function renderVendorStorage() {
  if (!vsState) vsState = VENDOR_STORAGE.map(v => ({ ...v }));
  const total = vsState.length;
  const valid = vsState.filter(v => v.status === "valid").length;
  const expiring = vsState.filter(v => v.status === "expiring").length;
  const expired = vsState.filter(v => v.status === "expired").length;

  // group documents by vendor; filter by search term
  const t = vsSearch.trim().toLowerCase();
  const byVendor = {};
  vsState.forEach(d => { (byVendor[d.vendor] = byVendor[d.vendor] || []).push(d); });
  const vendorNames = Object.keys(byVendor)
    .filter(n => !t || (n + " " + (byVendor[n][0].entity?.name || "")).toLowerCase().includes(t))
    .sort();

  VIEW.innerHTML = `
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div class="page-title">Vendor storage</div>
        <div class="page-desc">Documents on file, per vendor.</div>
      </div>
      <button class="btn btn-primary btn-sm" id="vs-upload">＋ Upload document</button>
    </div>

    <div class="metrics" style="margin-bottom:16px">
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Documents on file</div><div class="m-value">${total}</div><div class="m-sub">Across ${Object.keys(byVendor).length} vendors</div></div>
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Valid</div><div class="m-value">${valid}</div><div class="m-sub">Auto-served when requested</div></div>
      <div class="metric" style="--c:var(--yellow-500)"><div class="m-label">Expiring soon</div><div class="m-value">${expiring}</div><div class="m-sub">Refresh before they lapse</div></div>
      <div class="metric" style="--c:var(--red-500)"><div class="m-label">Expired</div><div class="m-value">${expired}</div><div class="m-sub">Never served — routed to a person</div></div>
    </div>

    <div class="card card-pad" style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
      <div class="search" style="flex:1;max-width:420px"><span>🔍</span><input id="vs-search" placeholder="Search vendor by name…" value="${vsSearch}"/></div>
      <span style="font-size:12px;color:var(--muted)">${vendorNames.length} vendor${vendorNames.length===1?'':'s'} shown</span>
    </div>

    <div id="vs-list">
    ${vendorNames.length ? vendorNames.map(name => {
      const docs = byVendor[name];
      const ent = docs[0].entity;
      return `<div class="card" style="margin-bottom:14px">
        <div class="vs-vhead">
          <div><div class="vs-vname">${name}</div><div class="vs-vmeta">${entLabel(ent)} · ${docs.length} document${docs.length===1?'':'s'} on file</div></div>
          <button class="btn btn-sm vs-upload-v" data-vendor="${name.replace(/"/g,'&quot;')}">＋ Upload to this vendor</button>
        </div>
        <table class="tbl"><thead><tr>
          <th>Document</th><th>Reference</th><th>Validity</th><th>Status</th><th>Version</th><th>Added by</th><th></th>
        </tr></thead><tbody>
        ${docs.map(v => `
          <tr>
            <td><span style="margin-right:6px">${v.icon}</span>${v.type}</td>
            <td class="mono" style="font-size:12px">${v.ref}</td>
            <td style="font-size:12.5px;color:${v.status==='expired'?'var(--red-600)':v.status==='expiring'?'var(--orange-600)':'var(--muted)'}">${v.validity}</td>
            <td>${pill(VS_ST[v.status].cls, VS_ST[v.status].label, true)}</td>
            <td class="mono" style="font-size:12px">${v.version}</td>
            <td style="font-size:12px;color:var(--muted)">${v.added}</td>
            <td><button class="btn btn-sm" data-toast="${v.status==='expired'?'Expired — re-upload a current document before it can be served.':'Document preview / version history would open here.'}">${v.status==='expired'?'Re-upload':'View'}</button></td>
          </tr>`).join("")}
        </tbody></table>
      </div>`;
    }).join("") : `<div class="card card-pad" style="text-align:center;color:var(--muted);padding:40px">No vendor matches “${vsSearch}”. <button class="btn btn-sm" id="vs-clear" style="margin-left:8px">Clear search</button></div>`}
    </div>

`;

  $("#vs-upload").addEventListener("click", () => openUploadModal(null));
  $$(".vs-upload-v").forEach(b => b.addEventListener("click", () => openUploadModal(VENDORS.find(v => v.name === b.dataset.vendor) || { name: b.dataset.vendor })));
  const s = $("#vs-search");
  s.addEventListener("input", e => { vsSearch = e.target.value; const pos = e.target.selectionStart; renderVendorStorage(); const n = $("#vs-search"); n.focus(); n.setSelectionRange(pos, pos); });
  $("#vs-clear")?.addEventListener("click", () => { vsSearch = ""; renderVendorStorage(); });
}

// Upload modal — scoped to a vendor (preselected when launched from a vendor row)
function openUploadModal(preVendor) {
  let chosen = preVendor && preVendor.email ? preVendor : null;
  const typeOpts = STORAGE_TYPES.map(t => `<option value="${t.type}">${t.icon} ${t.type}</option>`).join("");
  modal({
    title: "Upload document",
    subtitle: "Stored against a single vendor.",
    primary: "Upload & store",
    body: `
      <div class="form-row">
        <label>Vendor ${preVendor ? '' : '· search the registry'}</label>
        ${preVendor ? `<div class="field-input" style="background:var(--grey-25)">${preVendor.name}${preVendor.entity ? ` · ${preVendor.entity.flag} ${preVendor.entity.code}` : ''}</div>`
          : vendorPickerHtml("vp-up", "Search vendor by name or email…")}
        <div class="form-hint" id="vp-up-hint">${preVendor ? 'Pre-selected from the vendor row.' : 'Start typing to find a vendor.'}</div>
      </div>
      <div class="form-grid2">
        <div class="form-row"><label>Document type</label><select id="up-type">${typeOpts}</select></div>
        <div class="form-row"><label>Reference no.</label><input type="text" id="up-ref" placeholder="e.g. WHT-SG-2026-Q2"/></div>
      </div>
      <div class="form-grid2">
        <div class="form-row"><label>Valid until</label><input type="date" id="up-valid"/></div>
        <div class="form-row"><label>File</label><div class="field-input" style="color:var(--muted)">📎 Choose a file…</div></div>
      </div>
      <div class="form-hint">An expired document is never used to answer a query.</div>`,
    afterOpen: () => { if (!preVendor) wireVendorPicker("vp-up", v => { chosen = v; $("#vp-up-hint").textContent = `Selected: ${v.name} · ${v.entity.flag} ${v.entity.code}`; }); },
    onPrimary: () => {
      if (!chosen) { toast("Pick a vendor first — documents are stored per vendor.", "warn"); return false; }
      const type = $("#up-type").value;
      const ref = ($("#up-ref").value || "").trim() || "—";
      const validRaw = $("#up-valid").value;
      const st = STORAGE_TYPES.find(x => x.type === type);
      vsState.unshift({
        vendor: chosen.name, entity: chosen.entity || null, type, ref,
        validity: validRaw ? `Valid to ${new Date(validRaw).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}` : "Valid (no expiry set)",
        status: "valid", version: "v1", added: `${ME} · just now`, icon: st ? st.icon : "📄",
      });
      toast(`${type} stored against ${chosen.name}.`);
      renderVendorStorage();
    },
  });
}

/* ─────────────────────────── INGESTION & ROUTING ───────────────────────────
   Every inbound message is ALWAYS routed to a workflow — there is no unrouted state.
   The receiving workflow then ACCEPTS or REJECTS it based on its own configuration
   (an intent switched off, a non-query, or a mis-route). Rejections surface here for a
   human to re-route to the correct workflow or confirm. Parse failures are recovered.
   Nothing is ever dropped (Epic M). Decisions are audited (VQ-K1).
   --------------------------------------------------------------------------------------- */
let ingState = null;          // runtime copy so actions persist until refresh
let ingFilter = "reject";     // reject | parse
function renderIngestion() {
  if (!ingState) ingState = ROUTING_TRIAGE.map(u => ({ ...u }));
  const S = INGEST_SUMMARY;
  const rejectOpen = ingState.filter(u => u.kind === "reject" && !u.resolved).length;
  const parseOpen = ingState.filter(u => u.kind === "parse" && !u.resolved).length;
  const tLabel = (k) => (TRIAGE_TARGETS.find(t => t.key === k) || { label: k, cls: "grey" });
  const groups = [
    { key: "reject", label: "Workflow rejections", n: ingState.filter(u => u.kind === "reject").length, cls: "purple" },
    { key: "parse", label: "Parse failures", n: ingState.filter(u => u.kind === "parse").length, cls: "orange" },
  ];
  const rows = ingState.filter(u => u.kind === ingFilter);
  // re-route + (for noise) confirm-rejection actions
  const actionsFor = (u) => {
    if (u.kind === "parse") return `<button class="btn btn-primary btn-sm ing-create" data-id="${u.id}">Create query</button> <button class="btn btn-sm ing-raw" data-id="${u.id}">View raw</button>`;
    const reroute = TRIAGE_TARGETS.map(tg => `<button class="btn btn-sm ${tg.key===u.suggest?'btn-primary':''} ing-route" data-id="${u.id}" data-target="${tg.key}">${tg.label}</button>`).join(" ");
    const dismiss = u.suggest === "dismiss" ? `<button class="btn btn-sm btn-primary ing-dismiss" data-id="${u.id}">Confirm rejection</button> ` : "";
    return `<div class="ing-route-actions">${dismiss}${reroute}</div>`;
  };

  VIEW.innerHTML = `
    <div class="page-head">
      <div class="page-title">Ingestion & routing</div>
      <div class="page-desc">Re-route rejected messages and recover anything that didn't parse.</div>
    </div>

    <div class="metrics" style="margin-bottom:16px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Messages routed</div><div class="m-value">100%</div><div class="m-sub">No unrouted state</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Routing accuracy</div><div class="m-value">98.1%</div><div class="m-sub">Routed to the right workflow</div></div>
      <div class="metric" style="--c:var(--purple-500)"><div class="m-label">Rejections</div><div class="m-value">${rejectOpen}</div><div class="m-sub">Re-route or confirm</div></div>
      <div class="metric" style="--c:var(--orange-500)"><div class="m-label">Parse failures</div><div class="m-value">${parseOpen}</div><div class="m-sub">Coverage ${S.coverage}%</div></div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <div class="chips">
          ${groups.map(g => `<button class="chip ${ingFilter===g.key?'active '+(g.cls||'grey'):''}" data-ing="${g.key}">${g.label}<span class="chip-c">${g.n}</span></button>`).join("")}
        </div>
        <span style="margin-left:auto;font-size:12px;color:var(--muted)">${ingFilter==='reject'?'Suggested workflow is highlighted':'Recover into a query'}</span>
      </div>
      <table class="tbl"><thead><tr>
        <th>Ref / Ticket</th><th>Sender</th><th>Subject</th><th>Routed to</th><th>${ingFilter==='reject'?'Rejected — why':'Why it didn’t parse'}</th><th>Action</th>
      </tr></thead><tbody>
      ${rows.length ? rows.map(u => { const rt = tLabel(u.routedTo); return `
        <tr>
          <td class="mono">${u.id}<div style="font-size:10.5px;color:var(--muted)">${u.ref} · ${u.ts}</div></td>
          <td class="mono" style="font-size:12px">${u.sender}</td>
          <td>${u.subject}</td>
          <td>${pill(rt.cls, rt.label, true)}${u.wrong?` <span class="pill red no-dot" style="margin-top:4px">mis-route</span>`:''}</td>
          <td style="color:var(--muted);font-size:12.5px">${u.reason}</td>
          <td>${u.resolved ? pill('green', '✓ '+u.resolved, true) : actionsFor(u)}</td>
        </tr>`; }).join("") : `<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--muted)">Nothing in this queue. 🎉</td></tr>`}
      </tbody></table>
      <div class="dash-foot"><span>${rows.length} items</span><div class="dash-foot-right"><span>Rows per page: 50 ⌄</span><span>1–${rows.length} of ${rows.length}</span><span class="pager">‹ 1 ›</span></div></div>
    </div>`;

  $$(".chip[data-ing]").forEach(c => c.addEventListener("click", () => { ingFilter = c.dataset.ing; renderIngestion(); }));
  $$(".ing-route").forEach(b => b.addEventListener("click", () => {
    const u = ingState.find(x => x.id === b.dataset.id);
    const tg = TRIAGE_TARGETS.find(t => t.key === b.dataset.target);
    u.resolved = `Re-routed → ${tg.label}`;
    toast(`${u.id} re-routed to ${tg.label}.`);
    renderIngestion();
  }));
  $$(".ing-dismiss").forEach(b => b.addEventListener("click", () => {
    const u = ingState.find(x => x.id === b.dataset.id);
    u.resolved = "Rejection confirmed";
    toast(`${u.id} confirmed as a non-query.`);
    renderIngestion();
  }));
  $$(".ing-create").forEach(b => b.addEventListener("click", () => {
    const u = ingState.find(x => x.id === b.dataset.id);
    u.resolved = "Recovered → VQ-48" + (50 + ingState.indexOf(u));
    toast(`${u.id} recovered into a query.`);
    renderIngestion();
  }));
  $$(".ing-raw").forEach(b => b.addEventListener("click", () => openRawModal(ingState.find(x => x.id === b.dataset.id))));
}

function openRawModal(u) {
  if (!u) return;
  modal({
    title: "Raw message",
    subtitle: `${u.id} · ${u.ref} · ${u.ts}`,
    primary: null,
    body: `
      <div class="email-bubble">
        <div class="eb-head"><div class="eb-from">${u.sender}</div><div class="eb-to">to: ap-vendors@zalora.com · via Freshdesk</div></div>
        <div class="eb-body"><div class="eb-subject">${u.subject}</div><div style="color:var(--muted)">— message body —</div></div>
      </div>
      <div class="form-hint" style="margin-top:12px">Reason flagged: ${u.reason}</div>`,
  });
}

/* ─────────────────────────── INTEGRATIONS (Connector Studio) ─────────────────────────── */
let connState = null; // runtime copy so Connect/Disconnect persist within the session
const ST = {
  connected:   { cls: "green",  label: "Connected" },
  verifying:   { cls: "yellow", label: "Verifying" },
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
        <div class="page-desc">Channel, ERP and document connectors.</div>
      </div>
      <button class="btn btn-primary btn-sm" id="conn-new">＋ New connector</button>
    </div>

    <div class="metrics" style="margin-bottom:18px">
      <div class="metric" style="--c:var(--green-500)"><div class="m-label">Connectors live</div><div class="m-value">${okCount}/${connState.length}</div><div class="m-sub">Channel, ERP & data sources</div></div>
      <div class="metric" style="--c:var(--yellow-500)"><div class="m-label">Verifying</div><div class="m-value">${connState.filter(c=>c.status==='verifying').length}</div><div class="m-sub">Payment / remittance read</div></div>
      <div class="metric" style="--c:var(--primary-500)"><div class="m-label">Channel</div><div class="m-value" style="font-size:20px">Freshdesk</div><div class="m-sub">Email intake & status sync</div></div>
      <div class="metric" style="--c:var(--purple-500)"><div class="m-label">Verified contacts</div><div class="m-value" style="font-size:20px">4,512</div><div class="m-sub">Synced from the vendor master</div></div>
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
    else if (c.status === "verifying") { c.status = "connected"; c.last = "Connected just now"; toast(`${c.name} verified & connected.`); }
    else { c.status = "connected"; c.last = "Connected just now"; toast(`${c.name} connected.`); }
    renderIntegrations();
  }));
  $$(".conn-card .conn-test").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); toast(`Test ping to ${connState[+b.dataset.i].name}: success (142 ms).`); }));
  $$(".conn-card .conn-cfg").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); openConnectorModal(connState[+b.dataset.i]); }));
  $("#conn-new")?.addEventListener("click", () => modal({
    title: "Add a connector",
    subtitle: "Connect another ERP or data source.",
    primary: "Continue",
    body: `
      <div class="form-row"><label>Connector type</label><select id="nc-type">
        <option>SAP (RFC / BAPI)</option><option>Zoho Books (REST)</option><option>Freshdesk (Webhook)</option>
        <option>Object store (S3)</option><option>Vendor master (IDoc)</option><option>Custom / other</option>
      </select></div>
      <div class="form-row"><label>Display name</label><input type="text" placeholder="e.g. SAP — Payment doc (APAC)"/></div>
      <div class="form-hint">Payment answers switch on once a read path is verified.</div>`,
    onPrimary: () => toast("Connector setup would continue here."),
  }));
}
function openConnectorModal(c) {
  modal({
    title: `Configure · ${c.name}`,
    subtitle: `${c.group} · ${c.protocol}`,
    primary: "Save settings",
    body: `
      <div class="form-row"><label>Status</label><div class="field-input" style="background:var(--grey-25)">${ST[c.status].label} · ${c.last}</div></div>
      <div class="form-grid2">
        <div class="form-row"><label>Endpoint / host</label><input type="text" value="${c.protocol.includes('REST')||c.protocol.includes('Webhook')?'https://api.'+c.name.toLowerCase().split(' ')[0]+'.example':'sap-prd-apac.internal'}"/></div>
        <div class="form-row"><label>Poll interval</label><select><option>Real-time (webhook)</option><option>1 min</option><option>5 min</option><option>15 min</option></select></div>
      </div>
      <div class="form-row"><label>Read scope</label><div class="field-input" style="color:var(--muted)">${c.desc}</div></div>
      <div class="form-hint">Credentials are stored securely on the platform.</div>`,
    onPrimary: () => toast(`${c.name} settings saved.`),
  });
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

/* ─────────────────────────── BOOT ─────────────────────────── */
// global handler for lightweight/illustrative buttons (data-toast / data-close)
document.addEventListener("click", (e) => {
  if (!e.target.closest(".vpick")) $$(".vpick-drop").forEach(d => d.classList.add("hidden"));
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
  { name: "Invoice Processing", desc: "Invoice capture to ERP posting" },
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
  if (!b.classList.contains("current")) toast(`Switching to "${b.dataset.ws}" isn't available yet.`, "info");
}));
document.addEventListener("click", (e) => { if (!wsMenu.contains(e.target) && e.target.id !== "ws-trigger") wsMenu.classList.add("hidden"); });

/* ─── role switcher (role-based view — user-management PRD) ─── */
const roleMenu = el(`
  <div id="role-menu" class="ws-menu hidden">
    <div class="ws-menu-head">Your role · what you can see & do</div>
    ${ROLES.map(r => `<button class="ws-opt role-opt" data-role="${r.key}"><div><div class="ws-opt-name">${r.key}</div><div class="ws-opt-desc">${r.desc}</div></div><span class="ws-check role-check">✓</span></button>`).join("")}
  </div>`);
document.body.appendChild(roleMenu);
function paintRoleMenu() {
  $$(".role-opt", roleMenu).forEach(b => b.classList.toggle("current", b.dataset.role === currentRole));
}
$("#role-trigger")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!roleMenu.classList.contains("hidden")) { roleMenu.classList.add("hidden"); return; }
  paintRoleMenu();
  const r = $("#role-trigger").getBoundingClientRect();
  roleMenu.style.top = (r.bottom + 8) + "px"; roleMenu.style.left = r.left + "px";
  roleMenu.classList.remove("hidden");
});
$$(".role-opt", roleMenu).forEach(b => b.addEventListener("click", () => {
  roleMenu.classList.add("hidden");
  if (b.dataset.role === currentRole) return;
  currentRole = b.dataset.role;
  applyRoleAccess();
  render(roleDef(currentRole).views.includes(currentView) ? currentView : "worklist");
  toast(`Viewing as ${currentRole}. Nav and actions now reflect this role.`, "info");
}));
document.addEventListener("click", (e) => { if (!roleMenu.contains(e.target) && e.target.id !== "role-trigger" && !e.target.closest("#role-trigger")) roleMenu.classList.add("hidden"); });

function logout() {
  const screen = el(`
    <div id="signin" class="signin">
      <div class="signin-card">
        <img src="neoflo_logo.png" alt="Neoflo" class="signin-logo"/>
        <div class="signin-ws">Vendor Queries</div>
        <h2>Sign in to continue</h2>
        <p>Access is restricted to whitelisted users via Google SSO.</p>
        <button class="gbtn" id="signin-go">${GOOGLE_G}<span>Continue with Google</span></button>
        <div class="signin-note">You've been signed out.</div>
      </div>
    </div>`);
  document.body.appendChild(screen);
  $("#signin-go").addEventListener("click", () => { screen.remove(); toast("Signed in as Shubham S. (shubham.s@neoflo.ai)."); });
}

$$(".sb-child").forEach(c => c.addEventListener("click", () => render(c.dataset.view)));
applyRoleAccess();    // role-based nav (defaults to Org admin)
render("worklist");   // action dashboard is the default view
