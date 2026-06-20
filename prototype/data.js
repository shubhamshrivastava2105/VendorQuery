/* ============================================================
   Vendor Queries — illustrative data
   Aligned to the sibling PRDs:
   · Zalora Phase 1  — entities SG/MY/HK/ID/PH, currencies,
     inbound in any language but English replies (Phase 1), Freshdesk
     "Neoflo - …" status sync, whitelist + Google SSO, SAP doc
     number format (5000……), GR-variance SGD 632 vs 579.
   · P2P Invoice Processing — status vocabulary, STP/Smart-Routing
     confidence gates, Accounting Entry Posting ID, configuration.
   · Vendor Queries PRD — query states §9.6, gates G1–G4, Epics.
   ============================================================ */

// Zalora's five legal entities (Zalora Phase 1 PRD)
const ENTITIES = [
  { code: "SG", name: "ZALORA South East Asia Pte. Ltd.", ccy: "SGD", flag: "🇸🇬" },
  { code: "MY", name: "ZALORA Malaysia Sdn Bhd",          ccy: "MYR", flag: "🇲🇾" },
  { code: "HK", name: "ZALORA Hong Kong Ltd",             ccy: "HKD", flag: "🇭🇰" },
  { code: "ID", name: "PT Fashion Eservices Indonesia",   ccy: "IDR", flag: "🇮🇩" },
  { code: "PH", name: "ZALORA Philippines Inc.",          ccy: "PHP", flag: "🇵🇭" },
];

// Query states design must cover (Vendor Queries PRD §9.6) → pill class
const QSTATE = {
  authorising:  { label: "Authorising",            cls: "grey"   },
  authfail:     { label: "Auth failed",            cls: "red"    },
  awaiting:     { label: "Awaiting data",          cls: "yellow" },
  auto:         { label: "Auto-answered",          cls: "green"  },
  routed:       { label: "Routed to human",        cls: "orange" },
  captured:     { label: "Bank-change captured",   cls: "purple" },
  breached:     { label: "SLA breached",           cls: "red"    },
  closed:       { label: "Closed",                 cls: "grey"   },
  reopened:     { label: "Reopened",               cls: "blue"   },
};

// Freshdesk ticket status sync — mirrors the Zalora "Neoflo - …" pattern
const FRESHDESK = {
  auto:     "Neoflo - Auto-resolved",
  routed:   "Neoflo - Routed",
  captured: "Neoflo - Awaiting verification",
  authfail: "Neoflo - On Hold (identity)",
  breached: "Neoflo - Routed (SLA breached)",
  closed:   "Neoflo - Closed",
};

// The processing pipeline (Vendor Queries PRD §7.0–§7.1)
const PIPELINE = [
  { k: "M", icon: "🔀", c: "var(--primary-400)", title: "Routing service",
    desc: "Milestone 1 · the shared, workflow-agnostic layer that sits in front of everything. It classifies every new ticket and every new reply and routes it to the vendor-query workflow, the invoice-processing workflow, or both (multi-label). Low-confidence routing defaults to a human triage queue. Routing accuracy is held to a 98% target (Epic M)." },
  { k: "A", icon: "📥", c: "var(--primary-500)", title: "Intake",
    desc: "Whatever the router sends to this workflow becomes a structured Query record — reusing the Zalora Freshdesk channel. One message can carry several questions, each a resolvable intent. Whatever can't be parsed isn't dropped — it lands in the Ingestion log for review, which is what the Coverage metric measures." },
  { k: "B", icon: "🔐", c: "var(--primary-600)", title: "Identity & Authorization Gate",
    desc: "The anchor. The sender's email is matched against the platform-owned authorization registry (seeded from the ERP vendor master). No answer, document, or amount leaves the system without a passing auth_check. Absolute (G1)." },
  { k: "C", icon: "🧩", c: "var(--purple-500)", title: "Context Assembly",
    desc: "Resolve the legal entity & currency (SG/MY/HK/ID/PH), then fetch the invoice, PO, GRN/SES, payment document, Accounting Entry Posting ID and tax amounts — plus any on-file WHT/TDS certificate or Faktur Pajak from vendor-level storage (Epic N) — into one context object. Every ERP/SAP read goes through a connector you wire up in Integrations. Wrong entity = wrong answer." },
  { k: "D", icon: "🎯", c: "var(--primary-500)", title: "Query vs action · Attempt to Resolve",
    desc: "First separate query from action: a state-changing action (bank-detail / address change, cancel) always routes to a human (G0). For a query, no mandatory classification — like P2P Smart Routing, the system simply tries to ground a confident answer and scores it against gates G2–G4. The only question that matters: can I answer this confidently, or not?" },
  { k: "E", icon: "✳️", c: "var(--green-500)", title: "Outcome",
    desc: "Auto-answers reply on their own the moment the ticket arrives — no human trigger — if grounded AND high-confidence. This covers payment status, breakdown, document requests, invoice-receipt status (VQ-E5) and on-file tax certificates (VQ-E4). Otherwise the query routes to a human, who opens a summarized view with the records, a suggested next step and an editable suggested reply. Bank-detail changes are captured & routed, never auto-applied (Epic I)." },
  { k: "J", icon: "✉️", c: "var(--green-600)", title: "Reply & Close",
    desc: "A single consolidated reply on the same email thread — in English for Phase 1 (inbound may arrive in any language), tracked to SLA. The Freshdesk ticket status is synced back (Neoflo - Auto-resolved / Routed / …). A post-close vendor reply re-opens the same query to a human (VQ-A2)." },
  { k: "K", icon: "📊", c: "var(--grey-700)", title: "Log & Learn",
    desc: "Immutable audit on every action — system or human (100% coverage, hard guardrail) — covering the routing decision, auth_check, records used, resolution path and outbound reply. Containment and accuracy are measured, and driver analysis feeds the P2P / procurement roadmap (Epic K). Feedback feeds reply memory (Epic O, Phase 2)." },
];

const GATES = [
  { k: "G0 — Action vs query", t: "The request is an informational query, not a state-changing action. Any action (bank-detail / address change, cancel) never auto-resolves — it always routes to a human, regardless of confidence (§6.1)." },
  { k: "G1 — Identity", t: "Sender maps to a known, authorised vendor contact for the workflow. Hard block — no disclosure on fail." },
  { k: "G2 — Answerability", t: "Request maps cleanly to records the system can stand behind — not a dispute, not ambiguous." },
  { k: "G3 — Data completeness", t: "All records needed for the answer are present and live. Otherwise route, or hold and explain 'in progress'." },
  { k: "G4 — Answer confidence", t: "Composed answer passes type-specific validation (e.g. it reconciles). Route rather than guess." },
];

// Post-posting payment ladder (VQ-E1). "Paid" is truthful only at clearing.
function ladder(active) {
  const order = ["posted", "due", "blocked", "initiated", "cleared"];
  const labels = {
    posted: "Posted", due: "Due", blocked: "Blocked",
    initiated: "Payment initiated", cleared: "Paid / cleared",
  };
  const ai = order.indexOf(active);
  return order.map((k, i) => {
    let state = "todo";
    if (active === "blocked") {              // on-hold path: blocked is current; initiated/cleared not reached
      if (k === "blocked") state = "current";
      else if (i < ai) state = "done";
      else state = "todo";
    } else {                                  // cleared path: blocked is skipped (never on hold)
      if (k === "blocked") state = "skipped";
      else if (k === active) state = "current";
      else if (i < ai) state = "done";
      else state = "todo";
    }
    return { key: k, label: labels[k], state };
  });
}

// ── Scenarios shown in the Vendor Inbox simulator ──
// outcome: auto | routed | captured | authfail
const SCENARIOS = [
  {
    id: "INV-2098", q: "VQ-4821",
    vendor: "FUJIFILM Business Innovation Asia Pacific Pte. Ltd.",
    email: "ar.team@fujifilm-bi.com", knownContact: true,
    flag: "🇸🇬", lang: "English", entity: ENTITIES[0], amount: "9,500.00",
    sapDoc: "5000482915", postingId: "5100774120", paymentDoc: "2000915338",
    subject: "Has invoice INV-2098 been paid yet?",
    body: "Hi team,\n\nCould you let me know the status of our invoice INV-2098 (SGD 9,500.00)? We haven't seen the funds yet.\n\nThanks,\nLina — Fujifilm AR",
    intents: ["Payment status"], outcome: "auto", qstate: "auto",
    tag: { label: "Payment status", cls: "blue" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4821 created · 1 intent · via Freshdesk FD-88230" },
      { state: "ok",   k: "Identity check passed", d: "ar.team@fujifilm-bi.com → authorised contact" },
      { state: "ok",   k: "Answerable", d: "Maps cleanly to payment-status — not a dispute" },
      { state: "ok",   k: "Context assembled", d: "Entity SG · Posting ID 5100774120 · Payment doc 2000915338 · remittance found" },
      { state: "ok",   k: "Data complete", d: "Payment ladder read: Posted → Due → Initiated → Cleared" },
      { state: "ok",   k: "Confident — auto-answered", d: "Reconciles to payment doc · Freshdesk → Neoflo - Auto-resolved" },
    ],
    ladder: ladder("cleared"),
    answer: {
      lead: "Paid.",
      body: "Invoice INV-2098 (SGD 9,500.00) was <strong>paid on 3 June 2026</strong>, reference <strong>TXN-55218</strong>, to your account ending <strong>••4471</strong>.",
      stamp: "Status reflects SAP clearing · as of the last sync on 11 Jun 2026, 08:15 SGT.",
    },
  },
  {
    id: "INV-3120", q: "VQ-4822",
    vendor: "Exclusive Networks Singapore Pte Ltd",
    email: "finance@exclusive-networks.sg", knownContact: true,
    flag: "🇸🇬", lang: "English", entity: ENTITIES[0], amount: "14,250.00",
    sapDoc: "5000483002", postingId: "5100774890", paymentDoc: "—",
    subject: "When will INV-3120 be paid? It's overdue",
    body: "Hello,\n\nWe issued INV-3120 (SGD 14,250.00) three weeks ago and it appears overdue. When can we expect payment?\n\nBest,\nFinance, Exclusive Networks",
    intents: ["Payment status"], outcome: "auto", qstate: "auto",
    tag: { label: "Payment status · on hold", cls: "yellow" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4822 created · via Freshdesk FD-88229" },
      { state: "ok",   k: "Identity check passed", d: "finance@exclusive-networks.sg → authorised contact" },
      { state: "ok",   k: "Answerable", d: "Payment-status request" },
      { state: "info", k: "Context assembled", d: "Posting ID 5100774890 carries an invoice-level PAYMENT BLOCK" },
      { state: "ok",   k: "Honest in-progress answer", d: "'Paid' is only stated at clearing — here we report the block honestly" },
    ],
    ladder: ladder("blocked"),
    answer: {
      lead: "On hold — not yet paid.",
      body: "Invoice INV-3120 (SGD 14,250.00) is approved and posted, but currently on a <strong>payment hold</strong> and will be skipped from payment runs until the hold is released by our AP team. No payment has been initiated yet — it is not lost.",
      stamp: "Payment-block status as of the last SAP sync on 11 Jun 2026, 08:15 SGT.",
    },
  },
  {
    id: "INV-2890", q: "VQ-4823",
    vendor: "iTH Logistics (M) Sdn Bhd",
    email: "billing@ith-logistics.my", knownContact: true,
    flag: "🇲🇾", lang: "English", entity: ENTITIES[1], amount: "22,400.00",
    sapDoc: "5000480177", postingId: "5100770455", paymentDoc: "2000910221",
    subject: "Please send the PO and payment proof for INV-2890",
    body: "Hi,\n\nCan you send us the purchase order and the payment proof for invoice INV-2890 (MYR 22,400.00)? We need it for our records.\n\nRegards,\niTH Logistics Billing",
    intents: ["Document request"], outcome: "auto", qstate: "auto",
    tag: { label: "Document request", cls: "purple" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4823 created · via Freshdesk FD-88228" },
      { state: "ok",   k: "Identity check passed", d: "billing@ith-logistics.my → authorised contact" },
      { state: "ok",   k: "Answerable", d: "Look-up-and-send pattern" },
      { state: "ok",   k: "Context assembled", d: "PO 5300-771 + payment proof (doc 2000910221) on file & in scope" },
      { state: "ok",   k: "Documents in scope", d: "Both documents belong to the vendor's own records" },
    ],
    ladder: ladder("cleared"),
    answer: {
      lead: "Documents attached.",
      body: "Attached for invoice INV-2890 (MYR 22,400.00): <strong>PO-5300771.pdf</strong> and <strong>payment-proof-2000910221.pdf</strong>. Payment was made on 28 May 2026.",
      stamp: "Documents released only after a passing identity check.",
    },
  },
  {
    id: "DISPUTE-632", q: "VQ-4824",
    vendor: "Car Station Automotive Inc.",
    email: "accounts@carstation.ph", knownContact: true,
    flag: "🇵🇭", lang: "English", replyLang: "English", entity: ENTITIES[4], amount: "632.00",
    sapDoc: "5000479884", postingId: "5100769003", paymentDoc: "2000908774",
    subject: "You underpaid us on INV-2451",
    body: "Hi,\n\nWe invoiced PHP 632.00 for INV-2451 but only received PHP 579.00 — short by PHP 53. Please correct this.\n\nThanks,\nCar Station Accounts",
    intents: ["Short-pay / dispute"], outcome: "routed", qstate: "routed",
    tag: { label: "Dispute → human", cls: "orange" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4824 created · via Freshdesk FD-88231" },
      { state: "ok",   k: "Identity check passed", d: "accounts@carstation.ph → authorised contact" },
      { state: "fail", k: "Not auto-answerable", d: "Detected as a dispute — routed to a person" },
      { state: "info", k: "Cause pre-assembled", d: "Invoice PHP 632 vs goods-receipt PHP 579 — paid against the goods-receipt" },
      { state: "warn", k: "Routed to human", d: "Lands in the queue · Freshdesk → Neoflo - Routed" },
    ],
    route: {
      reason: "Amount mismatch — invoiced PHP 632.00 vs goods-receipt PHP 579.00. Paid against the goods-receipt value, so PHP 53.00 was short-paid by design, not in error.",
      suggest: "Confirm the GR shortfall with procurement / receiving, then explain the GR-based payment to the vendor or raise a debit note if the GR was wrong.",
      draft: "Hi, thanks for flagging INV-2451. Our records show payment was made against the goods-receipt value of PHP 579.00 rather than the invoiced PHP 632.00. I'm confirming the receipt with our team and will come back to you with next steps shortly.",
    },
  },
  {
    id: "BANK-CHANGE", q: "VQ-4825",
    vendor: "FGV IFFCO Sdn Bhd",
    email: "treasury@fgv-iffco.com", knownContact: true,
    flag: "🇲🇾", lang: "English", entity: ENTITIES[1], amount: "—",
    sapDoc: "—", postingId: "—", paymentDoc: "—",
    subject: "Update our bank account for future payments",
    body: "Dear AP,\n\nPlease update our banking details. New account: Maybank 5141-•••-2290. Apply to all future payments.\n\nRegards,\nTreasury, FGV IFFCO",
    intents: ["Bank-detail change"], outcome: "captured", qstate: "captured",
    tag: { label: "Bank change · step-up", cls: "purple" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4825 created · via Freshdesk FD-88232" },
      { state: "ok",   k: "Identity check passed", d: "Sender is a known contact — but sensitive intent detected" },
      { state: "warn", k: "Sensitive intent · step-up required", d: "Bank-detail change → phone verification required" },
      { state: "info", k: "Captured to query record", d: "New details stored for review — NO write path to vendor master exists in v0" },
      { state: "warn", k: "Routed for human verification", d: "Freshdesk → Neoflo - Awaiting verification" },
    ],
    capture: {
      requested: "Maybank · 5141-•••-2290",
      current: "CIMB · 8001-•••-7741",
      stepup: "Call-back to the phone number on the vendor master (+60 3-•••-8842) — never a number supplied in this email.",
      note: "Bank-detail changes are captured and routed only — never applied automatically. The identity check plus phone verification carry the fraud defence.",
    },
  },
  {
    id: "AUTH-FAIL", q: "VQ-4826",
    vendor: "Unknown sender",
    email: "payments-update@fujifilm-billing.net", knownContact: false,
    flag: "⚠️", lang: "English", entity: null, amount: "—",
    sapDoc: "—", postingId: "—", paymentDoc: "—",
    subject: "URGENT: confirm payment + update remittance bank",
    body: "Hello, this is Fujifilm finance. Please confirm the balance owed and send all payment remittances to our updated bank account immediately. — Accounts",
    intents: ["Unverified sender"], outcome: "authfail", qstate: "authfail",
    tag: { label: "Auth failed", cls: "red" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4826 created · via Freshdesk FD-88233" },
      { state: "fail", k: "Identity check failed", d: "payments-update@fujifilm-billing.net is not a verified contact" },
      { state: "fail", k: "Disclosure blocked", d: "Domain mimics a real vendor (…-billing.net vs …-bi.com) — nothing revealed" },
      { state: "warn", k: "Safe non-disclosing reply + logged", d: "Attempt logged with reason · Freshdesk → Neoflo - On Hold (identity)" },
    ],
    answer: {
      lead: "Identity could not be verified.",
      body: "We can't share any payment or account details until we've verified your identity. If you're an authorised contact, please reach us from your registered company email or contact your usual AP representative.",
      stamp: "No financial data is included in a failed-identity reply. Attempt logged for review.",
    },
  },
  {
    id: "MULTI", q: "VQ-4810",
    vendor: "FJ DIGITAL DESIGN SERVICES",
    email: "ar@fjdigital.co.id", knownContact: true,
    flag: "🇮🇩", lang: "Bahasa Indonesia", replyLang: "English", entity: ENTITIES[3], amount: "8,750,000",
    sapDoc: "5000478120", postingId: "5100767551", paymentDoc: "2000905910",
    subject: "3 pertanyaan: status INV-5567, bukti bayar, dan sertifikat PPh",
    body: "Halo tim,\n\nMohon bantuannya:\n1) Status pembayaran INV-5567?\n2) Tolong kirim bukti pembayaran INV-5512.\n3) Kami butuh sertifikat potong PPh untuk Q1.\n\nTerima kasih.",
    intents: ["Payment status", "Document request", "Tax certificate"], outcome: "auto", multi: true, qstate: "auto",
    tag: { label: "Multi-intent · 2 auto + 1 routed", cls: "green" },
    run: [
      { state: "ok",   k: "Intake · 3 intents", d: "One message (inbound: Bahasa Indonesia) → three resolvable intents · via Freshdesk FD-88210" },
      { state: "ok",   k: "Identity check passed", d: "ar@fjdigital.co.id → authorised contact" },
      { state: "ok",   k: "Intent 1 · Payment status", d: "INV-5567 cleared → auto-answered" },
      { state: "ok",   k: "Intent 2 · Document request", d: "Payment proof for INV-5512 on file → auto-answered" },
      { state: "warn", k: "Intent 3 · Tax certificate", d: "No in-date PPh certificate on file in vendor storage → routed to a person to pull from the portal" },
      { state: "info", k: "One consolidated reply · English", d: "Answerable intents sent now; routed intent acknowledged — never held back" },
    ],
    ladder: ladder("cleared"),
    answer: {
      lead: "2 of 3 answered now; 1 with our team.",
      body: "<strong>1) INV-5567</strong> — paid on 5 June 2026, ref TXN-55901.<br><strong>2) Payment proof for INV-5512</strong> — attached (payment-proof-2000905910.pdf).<br><strong>3) Q1 PPh certificate</strong> — it isn't on file yet, so our team is retrieving it; you'll hear back within SLA.",
      stamp: "Reply is in English even though the question arrived in Bahasa Indonesia. One email, not three. An on-file certificate would have been served automatically from vendor storage.",
    },
  },
  {
    id: "INV-RECEIPT", q: "VQ-4818",
    vendor: "Pos Malaysia Berhad",
    email: "ar@pos.com.my", knownContact: true,
    flag: "🇲🇾", lang: "English", replyLang: "English", entity: ENTITIES[1], amount: "4,180.00",
    sapDoc: "5000481540", postingId: "5100773201", paymentDoc: "—",
    subject: "Did you receive our invoice INV-7741?",
    body: "Hi AP team,\n\nWe sent invoice INV-7741 (MYR 4,180.00) on 2 June but haven't had any acknowledgement. Can you confirm you received it and where it stands?\n\nThanks,\nPos Malaysia AR",
    intents: ["Invoice receipt"], outcome: "auto", qstate: "auto",
    tag: { label: "Invoice receipt", cls: "blue" },
    run: [
      { state: "ok",   k: "Intake", d: "Structured Query VQ-4818 created · via Freshdesk FD-88224" },
      { state: "ok",   k: "Identity check passed", d: "ar@pos.com.my → authorised contact" },
      { state: "ok",   k: "Query — answerable", d: "Resolve via lookup cascade" },
      { state: "ok",   k: "Found in invoice workflow", d: "INV-7741 found — received, in processing (matched to PO)" },
      { state: "ok",   k: "Known state — auto-answered", d: "A found invoice is answered with its current state; a 'no record' conclusion would route instead" },
    ],
    ladder: ladder("posted"),
    answer: {
      lead: "Received — in processing.",
      body: "We received invoice INV-7741 (MYR 4,180.00) on 2 June 2026. It's <strong>currently in processing</strong> (matched to your PO and posted as a payable); it isn't yet due for payment. We'll keep you updated as it moves toward a payment run.",
      stamp: "Resolved from the invoice-processing workflow · as of the last sync on 11 Jun 2026, 08:15 SGT. We never auto-send a bare 'no record' — an unresolved case routes to a person.",
    },
  },
];

// ── Outcome groups for the comprehensive query list filters ──
// group: which filter chip a query falls under
const OUTCOME_GROUPS = [
  { key: "all",      label: "All queries",       cls: "grey"   },
  { key: "auto",     label: "Auto-answered",     cls: "green"  },
  { key: "routed",   label: "Routed to human",   cls: "orange" },
  { key: "captured", label: "Bank change",       cls: "purple" },
  { key: "authfail", label: "Auth failed",       cls: "red"    },
  { key: "breached", label: "SLA breached",      cls: "red"    },
  { key: "closed",   label: "Closed",            cls: "grey"   },
];
// map a query's qstate → its filter group
const groupOf = (qstate) => ({
  auto: "auto", reopened: "routed", routed: "routed", captured: "captured",
  authfail: "authfail", breached: "breached", closed: "closed",
}[qstate] || "routed");

const TYPECLS = {
  "Payment status": "blue", "Payment breakdown": "green", "Document request": "purple",
  "Invoice receipt": "blue",
  "Dispute / short-pay": "orange", "Tax certificate": "yellow", "Tax-rate question": "yellow",
  "Statement reconciliation": "grey", "Bank-detail change": "purple", "Unverified sender": "red",
};

// ── ONE comprehensive list of every query (auto + human-routed) — PRD §9.5 ──
// human: did a person touch it (false = contained automatically)
const QUERIES = [
  // ---- need a human ----
  { id: "VQ-4826", ref: "FD-88233", vendor: "Unverified sender", email: "payments-update@fujifilm-billing.net",
    entity: null, type: "Unverified sender", qstate: "authfail", human: true,
    reason: "Auth failed · possible impersonation", sla: "1h 02m", slaState: "warn", assignee: "Unassigned",
    resolved: null, ts: "11 Jun · 08:16", scenario: "AUTH-FAIL" },
  { id: "VQ-4810", ref: "FD-88210", vendor: "FJ DIGITAL DESIGN SERVICES", email: "ar@fjdigital.co.id",
    entity: ENTITIES[3], type: "Tax certificate", qstate: "breached", human: true,
    reason: "Tax certificate · not on file → portal fetch", sla: "−0h 18m", slaState: "breach", assignee: "Unassigned",
    resolved: null, ts: "11 Jun · 06:40", scenario: "MULTI" },
  { id: "VQ-4824", ref: "FD-88231", vendor: "Car Station Automotive Inc.", email: "accounts@carstation.ph",
    entity: ENTITIES[4], type: "Dispute / short-pay", qstate: "routed", human: true,
    reason: "Dispute · amount mismatch", sla: "4h 12m", slaState: "ok", assignee: "Unassigned",
    resolved: null, ts: "11 Jun · 08:12", scenario: "DISPUTE-632" },
  { id: "VQ-4825", ref: "FD-88232", vendor: "FGV IFFCO Sdn Bhd", email: "treasury@fgv-iffco.com",
    entity: ENTITIES[1], type: "Bank-detail change", qstate: "captured", human: true,
    reason: "Bank-detail change · step-up", sla: "11h 40m", slaState: "ok", assignee: "Priya N.",
    resolved: null, ts: "11 Jun · 08:09", scenario: "BANK-CHANGE" },
  { id: "VQ-4799", ref: "FD-88198", vendor: "Mandiri Tunas Finance", email: "ap@mtf.co.id",
    entity: ENTITIES[3], type: "Statement reconciliation", qstate: "routed", human: true,
    reason: "Statement reconciliation · 5 of 10 paid", sla: "6h 30m", slaState: "ok", assignee: "Daniel W.",
    resolved: null, ts: "11 Jun · 07:55", scenario: null },
  { id: "VQ-4788", ref: "FD-88187", vendor: "Maybank Trustees Berhad", email: "ap@maybank-trustees.my",
    entity: ENTITIES[1], type: "Dispute / short-pay", qstate: "reopened", human: true,
    reason: "Reopened · vendor disputed a closed auto-answer", sla: "2h 05m", slaState: "ok", assignee: "Unassigned",
    resolved: null, ts: "11 Jun · 07:31", scenario: null },
  // ---- contained automatically ----
  { id: "VQ-4821", ref: "FD-88230", vendor: "FUJIFILM Business Innovation Asia Pacific Pte. Ltd.", email: "ar.team@fujifilm-bi.com",
    entity: ENTITIES[0], type: "Payment status", qstate: "auto", human: false,
    reason: "Payment status · paid", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 48s", ts: "11 Jun · 08:15", scenario: "INV-2098" },
  { id: "VQ-4822", ref: "FD-88229", vendor: "Exclusive Networks Singapore Pte Ltd", email: "finance@exclusive-networks.sg",
    entity: ENTITIES[0], type: "Payment status", qstate: "auto", human: false,
    reason: "Payment status · on hold", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 12s", ts: "11 Jun · 08:11", scenario: "INV-3120" },
  { id: "VQ-4823", ref: "FD-88228", vendor: "iTH Logistics (M) Sdn Bhd", email: "billing@ith-logistics.my",
    entity: ENTITIES[1], type: "Document request", qstate: "auto", human: false,
    reason: "Document request · PO + proof", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "0m 54s", ts: "11 Jun · 08:07", scenario: "INV-2890" },
  { id: "VQ-4818", ref: "FD-88224", vendor: "Pos Malaysia Berhad", email: "ar@pos.com.my",
    entity: ENTITIES[1], type: "Invoice receipt", qstate: "auto", human: false,
    reason: "Invoice receipt · received, in processing", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 02s", ts: "11 Jun · 08:01", scenario: "INV-RECEIPT" },
  { id: "VQ-4815", ref: "FD-88221", vendor: "Adyen Singapore Pte Ltd", email: "ap.sg@adyen.com",
    entity: ENTITIES[0], type: "Payment status", qstate: "auto", human: false,
    reason: "Payment status · paid", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 33s", ts: "11 Jun · 07:48", scenario: null },
  { id: "VQ-4811", ref: "FD-88219", vendor: "DOKU (PT Nusa Satu Inti Artha)", email: "billing@doku.com",
    entity: ENTITIES[3], type: "Payment breakdown", qstate: "auto", human: false,
    reason: "Payment breakdown · remittance", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "2m 05s", ts: "11 Jun · 07:40", scenario: null },
  { id: "VQ-4808", ref: "FD-88214", vendor: "GHL Systems Berhad", email: "finance@ghl.com",
    entity: ENTITIES[1], type: "Payment status", qstate: "auto", human: false,
    reason: "Payment status · initiated", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 20s", ts: "11 Jun · 07:22", scenario: null },
  { id: "VQ-4802", ref: "FD-88205", vendor: "SF Express (Hong Kong) Ltd", email: "ar@sf-express.hk",
    entity: ENTITIES[2], type: "Document request", qstate: "auto", human: false,
    reason: "Document request · invoice copy", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "0m 47s", ts: "11 Jun · 07:05", scenario: null },
  { id: "VQ-4795", ref: "FD-88193", vendor: "2C2P (Pte. Ltd.)", email: "settlement@2c2p.com",
    entity: ENTITIES[0], type: "Payment breakdown", qstate: "auto", human: false,
    reason: "Payment breakdown · remittance", sla: "—", slaState: "ok", assignee: "Auto",
    resolved: "1m 58s", ts: "11 Jun · 06:51", scenario: null },
  // ---- closed (human-resolved earlier) ----
  { id: "VQ-4781", ref: "FD-88176", vendor: "JNE Express (PT Tiki)", email: "ar@jne.co.id",
    entity: ENTITIES[3], type: "Dispute / short-pay", qstate: "closed", human: true,
    reason: "Dispute resolved · debit note raised", sla: "—", slaState: "ok", assignee: "Daniel W.",
    resolved: "3h 12m", ts: "10 Jun · 16:20", scenario: null },
  { id: "VQ-4776", ref: "FD-88170", vendor: "Ninja Logistics Pte Ltd", email: "ap@ninjavan.co",
    entity: ENTITIES[0], type: "Tax certificate", qstate: "closed", human: true,
    reason: "WHT certificate fetched & sent", sla: "—", slaState: "ok", assignee: "Priya N.",
    resolved: "5h 41m", ts: "10 Jun · 14:02", scenario: null },
];

// Back-compat: the human-needing subset (open worklist)
const WORKLIST = QUERIES.filter(q => q.human && q.qstate !== "closed");

// ── Ingestion log — the inbound messages behind the Coverage metric ──
// Coverage = parsed ÷ total inbound (PRD §4.2). The shortfall is logged, not dropped (VQ-A1.5).
// cls: "failed" = genuine miss, recoverable → create a query · "nonquery" = correctly ignored
const INGEST_SUMMARY = { inbound: 168, parsed: 156, unparsed: 12, coverage: 93 };
const UNPARSED = [
  { id: "RAW-9914", ts: "11 Jun · 08:21", sender: "ar@premier-logistics.my", subject: "Invoice query (scan attached)",
    ref: "FD-88240", reason: "Attachment-only — scanned image, OCR could not read it", cls: "failed", recoverable: true },
  { id: "RAW-9910", ts: "11 Jun · 08:03", sender: "billing@trans-asia.vn", subject: "Hỏi về thanh toán hóa đơn",
    ref: "FD-88238", reason: "Garbled encoding — body unreadable (inbound is accepted in any language; replies are English)", cls: "failed", recoverable: true },
  { id: "RAW-9907", ts: "11 Jun · 07:48", sender: "accounts@meridian-supply.sg", subject: "Fwd: Fwd: RE: payment",
    ref: "FD-88236", reason: "Forwarded chain — no extractable intent in body", cls: "failed", recoverable: true },
  { id: "RAW-9901", ts: "11 Jun · 07:22", sender: "finance@blueocean.ph", subject: "(no subject)",
    ref: "FD-88233", reason: "Vendor match low-confidence — held for review", cls: "failed", recoverable: true },
  { id: "RAW-9898", ts: "11 Jun · 07:05", sender: "noreply@calendar.google.com", subject: "Out of office: AR team",
    ref: "—", reason: "Out-of-office auto-reply", cls: "nonquery", recoverable: false },
  { id: "RAW-9895", ts: "11 Jun · 06:51", sender: "news@adyen.com", subject: "Adyen Product Update — June 2026",
    ref: "—", reason: "Marketing newsletter — not a vendor query", cls: "nonquery", recoverable: false },
  { id: "RAW-9890", ts: "11 Jun · 06:30", sender: "mailer-daemon@zalora.com", subject: "Undelivered Mail Returned to Sender",
    ref: "—", reason: "Delivery failure / bounce notification", cls: "nonquery", recoverable: false },
  { id: "RAW-9884", ts: "11 Jun · 06:12", sender: "raj.kumar@zalora.com", subject: "FYI — vendor chasing us",
    ref: "—", reason: "Internal email (zalora.com) — not a vendor", cls: "nonquery", recoverable: false },
  { id: "RAW-9879", ts: "11 Jun · 05:58", sender: "promo@deals-blast.net", subject: "You've won a $500 voucher!!!",
    ref: "—", reason: "Spam — quarantined", cls: "nonquery", recoverable: false },
];

// ── Integrations / Connector Studio (PRD §10 data dependencies) ──
// status: connected | verifying | error | disconnected
const CONNECTORS = [
  { group: "Routing & channel", name: "Routing service", desc: "Classifies every ticket and reply to the right workflow(s)",
    protocol: "Internal", status: "connected", last: "Routing accuracy: 98.1%", icon: "🔀" },
  { group: "Routing & channel", name: "Freshdesk", desc: "Vendor email intake and ticket status sync",
    protocol: "Webhook + REST poll", status: "connected", last: "Last sync: 2 min ago", icon: "📨" },

  { group: "ERP / SAP", name: "SAP — Invoice & clearing status", desc: "Live invoice stage and clearing status",
    protocol: "RFC / BAPI", status: "connected", last: "Last read: 5 min ago", icon: "🧾" },
  { group: "ERP / SAP", name: "SAP — Payment doc + remittance", desc: "Payment date, reference and deductions",
    protocol: "RFC / BAPI", status: "verifying", last: "Feasibility check in progress", icon: "💳" },
  { group: "ERP / SAP", name: "Zoho Books (ERP)", desc: "Bill and payment data for Zoho-based clients",
    protocol: "REST API", status: "verifying", last: "Mapping bill states", icon: "📚" },
  { group: "ERP / SAP", name: "ERP Vendor Master", desc: "Seeds the platform's verified-contact registry",
    protocol: "RFC / IDoc", status: "connected", last: "Last sync: 1 hr ago · 4,512 contacts", icon: "🏢" },

  { group: "Data sources", name: "Document store", desc: "Invoice PDFs, POs and payment proof",
    protocol: "S3 / object store", status: "connected", last: "Last read: 8 min ago", icon: "📁" },
  { group: "Data sources", name: "Vendor storage", desc: "Per-vendor WHT/TDS certificates and Faktur Pajak",
    protocol: "Platform store", status: "connected", last: "Last read: 14 min ago · 38 documents", icon: "🗄️" },
  { group: "Data sources", name: "Tax certificate portal", desc: "Government-portal fetch — on-file certificates serve from vendor storage",
    protocol: "Gov. portal", status: "disconnected", last: "Manual fetch for now", icon: "🪪" },
];

// ── Analytics ──
const ANALYTICS = {
  metrics: [
    { label: "Containment rate", value: "44.2%", delta: "+4.1", up: true, sub: "Resolved with no human · target 40%", c: "var(--green-500)" },
    { label: "Auto-answer accuracy", value: "96.2%", delta: "+0.8", up: true, sub: "Target 95%+", c: "var(--primary-500)" },
    { label: "Routing accuracy", value: "98.1%", delta: "+0.6", up: true, sub: "Routed to the right workflow · target 98%", c: "var(--purple-500)" },
    { label: "Coverage / ingestion", value: "93.0%", delta: "+1.4", up: true, sub: "Parsed into a query · target ≥ 90%", c: "var(--orange-500)" },
  ],
  // Where replies route
  routing: [
    { label: "Vendor-query workflow", pct: 58, c: "var(--primary-500)" },
    { label: "Invoice-processing workflow", pct: 27, c: "var(--green-500)" },
    { label: "Both", pct: 12, c: "var(--purple-500)" },
    { label: "Human triage", pct: 3, c: "var(--grey-500)" },
  ],
  byType: [
    { label: "Payment status", pct: 86, c: "var(--primary-500)" },
    { label: "Document request", pct: 81, c: "var(--purple-500)" },
    { label: "Invoice receipt", pct: 72, c: "var(--primary-400)" },
    { label: "Payment breakdown", pct: 64, c: "var(--green-500)" },
    { label: "Tax certificate", pct: 47, c: "var(--yellow-500)" },
    { label: "Statement reconciliation", pct: 38, c: "var(--grey-500)" },
    { label: "Dispute / short-pay", pct: 0, c: "var(--red-500)" },
  ],
  mix: [
    { label: "Payment status", pct: 40, c: "var(--primary-500)" },
    { label: "Document request", pct: 18, c: "var(--purple-500)" },
    { label: "Invoice receipt", pct: 11, c: "var(--primary-400)" },
    { label: "Payment breakdown", pct: 13, c: "var(--green-500)" },
    { label: "Dispute / short-pay", pct: 9, c: "var(--orange-500)" },
    { label: "Tax (cert + rate)", pct: 6, c: "var(--yellow-500)" },
    { label: "Bank change / other", pct: 3, c: "var(--grey-400)" },
  ],
  drivers: [
    { label: "Unreleased payment blocks", pct: 34, c: "var(--orange-500)" },
    { label: "GR / invoice quantity mismatch", pct: 27, c: "var(--red-500)" },
    { label: "Truncated remittance reference", pct: 21, c: "var(--purple-500)" },
    { label: "Invoice stuck pre-posting", pct: 18, c: "var(--grey-500)" },
  ],
};

// ── Vendor-level storage (Epic N) — per-vendor documents used as answer context ──
// status: valid | expiring | expired
const VENDOR_STORAGE = [
  { vendor: "FUJIFILM Business Innovation Asia Pacific Pte. Ltd.", entity: ENTITIES[0],
    type: "WHT certificate", ref: "WHT-SG-2026-Q1", validity: "Valid to 31 Mar 2027", status: "valid",
    version: "v2", added: "Priya N. · 4 Jun 2026", icon: "🪪" },
  { vendor: "FJ DIGITAL DESIGN SERVICES", entity: ENTITIES[3],
    type: "Faktur Pajak", ref: "010.000-26.00001234", validity: "Valid to 31 Dec 2026", status: "valid",
    version: "v1", added: "Daniel W. · 2 Jun 2026", icon: "🧾" },
  { vendor: "iTH Logistics (M) Sdn Bhd", entity: ENTITIES[1],
    type: "WHT/TDS certificate", ref: "CP58-MY-2025", validity: "Expires 30 Jun 2026", status: "expiring",
    version: "v1", added: "Priya N. · 12 May 2026", icon: "🪪" },
  { vendor: "Ninja Logistics Pte Ltd", entity: ENTITIES[0],
    type: "WHT certificate", ref: "WHT-SG-2025-Q4", validity: "Expired 31 Mar 2026", status: "expired",
    version: "v1", added: "Priya N. · 8 Jan 2026", icon: "🪪" },
  { vendor: "DOKU (PT Nusa Satu Inti Artha)", entity: ENTITIES[3],
    type: "Faktur Pajak", ref: "010.000-26.00005678", validity: "Valid to 31 Dec 2026", status: "valid",
    version: "v3", added: "Daniel W. · 27 May 2026", icon: "🧾" },
];

// ── Vendor master (the registry has thousands; this is the searchable sample) ──
// Used by the searchable vendor picker in Vendor storage upload & Vendor configuration.
const VENDORS = [
  { name: "FUJIFILM Business Innovation Asia Pacific Pte. Ltd.", email: "ar.team@fujifilm-bi.com", entity: ENTITIES[0] },
  { name: "Exclusive Networks Singapore Pte Ltd", email: "finance@exclusive-networks.sg", entity: ENTITIES[0] },
  { name: "iTH Logistics (M) Sdn Bhd", email: "billing@ith-logistics.my", entity: ENTITIES[1] },
  { name: "Car Station Automotive Inc.", email: "accounts@carstation.ph", entity: ENTITIES[4] },
  { name: "FGV IFFCO Sdn Bhd", email: "treasury@fgv-iffco.com", entity: ENTITIES[1] },
  { name: "FJ DIGITAL DESIGN SERVICES", email: "ar@fjdigital.co.id", entity: ENTITIES[3] },
  { name: "Pos Malaysia Berhad", email: "ar@pos.com.my", entity: ENTITIES[1] },
  { name: "Mandiri Tunas Finance", email: "ap@mtf.co.id", entity: ENTITIES[3] },
  { name: "Maybank Trustees Berhad", email: "ap@maybank-trustees.my", entity: ENTITIES[1] },
  { name: "Adyen Singapore Pte Ltd", email: "ap.sg@adyen.com", entity: ENTITIES[0] },
  { name: "DOKU (PT Nusa Satu Inti Artha)", email: "billing@doku.com", entity: ENTITIES[3] },
  { name: "GHL Systems Berhad", email: "finance@ghl.com", entity: ENTITIES[1] },
  { name: "SF Express (Hong Kong) Ltd", email: "ar@sf-express.hk", entity: ENTITIES[2] },
  { name: "2C2P (Pte. Ltd.)", email: "settlement@2c2p.com", entity: ENTITIES[0] },
  { name: "JNE Express (PT Tiki)", email: "ar@jne.co.id", entity: ENTITIES[3] },
  { name: "Ninja Logistics Pte Ltd", email: "ap@ninjavan.co", entity: ENTITIES[0] },
  { name: "Shopee Mobile Malaysia Sdn Bhd", email: "ap@shopee.com.my", entity: ENTITIES[1] },
  { name: "Lazada Express HK Ltd", email: "billing@lazada.hk", entity: ENTITIES[2] },
  { name: "GoTo Financial Indonesia", email: "ar@gotofinancial.co.id", entity: ENTITIES[3] },
  { name: "PLDT Enterprise", email: "billing@pldt.com.ph", entity: ENTITIES[4] },
];

// ── Workflow rejections (Epic M) ──
// Every message is ALWAYS routed to a workflow — there is no "unrouted" state. The receiving
// workflow then ACCEPTS or REJECTS it based on that workflow's configuration (an intent switched
// off, a non-query, or a mis-route). Rejections surface here to be re-routed or confirmed.
//   routedTo : which workflow it was routed to (key into TRIAGE_TARGETS)
//   kind     : "reject" (workflow rejected — re-route/override) | "parse" (couldn't parse)
//   suggest  : suggested correct workflow ("query"|"invoice"|"both") or "dismiss" (correctly rejected noise)
const ROUTING_TRIAGE = [
  { id: "RT-2041", ts: "11 Jun · 08:24", sender: "ap@shopee.com.my", ref: "FD-88242",
    subject: "Re: INV-9912 — and also when is our August invoice due?",
    kind: "reject", routedTo: "query",
    reason: "Vendor-query accepted the status question but rejected the invoice attachment — it also belongs in invoice-processing.",
    suggest: "both" },
  { id: "RT-2038", ts: "11 Jun · 08:09", sender: "finance@ghl.com", ref: "FD-88239",
    subject: "Fwd: new invoice for July services",
    kind: "reject", routedTo: "invoice", wrong: true,
    reason: "Routed to invoice-processing, which rejected it — there's no invoice attached; it's a short-pay/remittance dispute. Mis-route.",
    suggest: "query" },
  { id: "RT-2035", ts: "11 Jun · 07:52", sender: "ar@gotofinancial.co.id", ref: "FD-88235",
    subject: "kenapa pembayaran INV-7720 dipotong pajak?",
    kind: "reject", routedTo: "query",
    reason: "Vendor-query rejected per config: the tax-rate-explanation intent is set to Off for this workflow (VQ-L3), so it isn't auto-handled. Accept as a human query or re-route.",
    suggest: "query" },
  { id: "RT-2031", ts: "11 Jun · 07:31", sender: "news@adyen.com", ref: "—",
    subject: "Adyen Product Update — June 2026",
    kind: "reject", routedTo: "query",
    reason: "Vendor-query rejected it as a non-query (marketing newsletter). Confirm the rejection or re-route if it's genuinely a query.",
    suggest: "dismiss" },
  { id: "RAW-9914", ts: "11 Jun · 08:21", sender: "ar@premier-logistics.my", ref: "FD-88240",
    subject: "Invoice query (scan attached)",
    kind: "parse", routedTo: "query",
    reason: "Routed to vendor-query but couldn't be parsed into a structured query — attachment-only scan, OCR failed.",
    suggest: "query" },
  { id: "RAW-9910", ts: "11 Jun · 08:03", sender: "billing@trans-asia.vn", ref: "FD-88238",
    subject: "Hỏi về thanh toán hóa đơn",
    kind: "parse", routedTo: "query",
    reason: "Routed to vendor-query but couldn't be parsed — garbled encoding (inbound is accepted in any language; replies are English).",
    suggest: "query" },
];
const TRIAGE_TARGETS = [
  { key: "query", label: "Vendor-query", cls: "blue" },
  { key: "invoice", label: "Invoice-processing", cls: "green" },
  { key: "both", label: "Both", cls: "purple" },
];

// ── Roles & access (user-management PRD / VQ-H3) ──
// The experience is role-based and switchable from the top bar. Each role grants access to a set
// of views and platform actions. Assignment normally syncs from the Freshdesk ticket; when a routed
// query is NOT assigned in Freshdesk, an org/workspace admin assigns it on the platform.
//   views       : nav items this role can open
//   assignOthers: can assign a query to any team member on the platform (else self-assign only)
//   configure   : can edit Configuration & Integrations
const ALL_VIEWS = ["worklist", "ingestion", "storage", "analytics", "integrations", "config"];
const ROLES = [
  { key: "Org admin",       views: ALL_VIEWS, assignOthers: true,  configure: true,  desc: "Full access across the org — workspaces, users, integrations, config" },
  { key: "Workspace admin", views: ALL_VIEWS, assignOthers: true,  configure: true,  desc: "Full access within this workspace, including config & integrations" },
  { key: "AP analyst",      views: ["worklist", "ingestion", "storage", "analytics"], assignOthers: false, configure: false, desc: "Handle queries, triage & routing, vendor storage; self-assign only" },
];
const roleDef = (key) => ROLES.find(r => r.key === key) || ROLES[0];

// Platform team (who an admin can assign work to)
const TEAM = [
  { name: "Shubham S.", role: "Org admin", you: true },
  { name: "Priya N.",   role: "Workspace admin" },
  { name: "Daniel W.",  role: "AP analyst" },
  { name: "Aisha R.",   role: "AP analyst" },
  { name: "Marcus T.",  role: "AP analyst" },
];

// Document types available in vendor storage (extensible by config — VQ-N3)
const STORAGE_TYPES = [
  { type: "WHT certificate", icon: "🪪" },
  { type: "WHT/TDS certificate", icon: "🪪" },
  { type: "Faktur Pajak", icon: "🧾" },
  { type: "Tax residency certificate", icon: "📜" },
  { type: "Bank confirmation letter", icon: "🏦" },
  { type: "W-8BEN / W-9", icon: "📄" },
];
