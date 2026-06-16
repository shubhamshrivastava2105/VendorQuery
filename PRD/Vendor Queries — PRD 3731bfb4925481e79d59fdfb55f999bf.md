# Vendor Queries — PRD

<aside>
💬

**Status:** Ready for review

**Owner:** Shubham Shrivastava (Product)

**Stage:** Problem agreed, solution scoped, ready for eng/design grooming

**Last updated:** 8 June 2026

</aside>

<aside>
🧭

**Reading guide by audience.** Execs / Sales / Marketing → §0 (TL;DR) and §15 (GTM). Product / Eng → §6 (scope), §7 (architecture), §8 (functional requirements), §10 (data & integrations), §11 (NFRs). Design → §5 (users), §9 (UX & states). CS / Implementation → §4 (metrics), §14 (rollout & support). Everyone should read §0 and §4.

</aside>

---

# 0. TL;DR

<aside>
🎯

**In one sentence:** A platform that sits between a company's vendors and its accounts-payable (AP) team, automatically answering the high-volume "where's my payment?" class of questions the system already knows the answer to — gated by a strict identity check — and routing the genuinely hard ones to a human with all the context pre-assembled.

</aside>

**The problem.** Roughly 4 out of 5 vendor questions to an AP team are simple status checks the system already holds the answer to, but a human still stops, looks them up across several systems, and replies. That cumulative drain is the cost.

**The product.** For every inbound vendor question, the platform: (1) **verifies who's asking** before revealing anything, (2) **assembles the facts** (right legal entity, currency, invoice, PO, payment, tax), and (3) **attempts a grounded answer** — if it can produce one with high confidence, it replies; if not, it hands the query to a human with the context already attached. Bank-detail changes are captured for a human to verify, never auto-applied.

**Why now / why us.** It runs on the same Neoflo platform as our [P2P invoice-processing workflow](https://app.notion.com/p/2fd1bfb492548070a2edecb6a460ccae) — so it can draw on live invoice stage/status, rejection reasons, payment data, and tax amounts the platform already handles, plus the vendor master from the customer's ERP/SAP. For multi-entity, multi-currency, multi-language customers like [Zalora](https://app.notion.com/p/3191bfb4925480df90bedcac8dfe5cab), that grounding is the moat.

**v0 in one breath.** Identity-and-authorization gate (the anchor) → automatic answers for **payment status, payment breakdown, and document requests** → human handoff for everything else, context attached → bank-detail requests captured and routed → everything logged and measured from day one. Tax certificates are handled manually in v0 (downloaded from government portals, not held in any system we read); tax-rate explanations and statement reconciliation are stretch goals.

**Headline success metric.** **Containment rate** — the share of in-scope vendor questions resolved without a human. **Target is TBD: we set it after the Phase 0 baseline** against real customer data, rather than guessing now. Two non-negotiable guardrails hold from day one: **zero unauthorized disclosures** and **zero fraudulent bank-detail changes applied.**

**Who asked for it.** This isn't a hypothesis we went looking to justify — **Zalora has requested vendor-query handling as part of their Phase 3.** That makes Zalora both the design partner and the first customer for v0. The product stays generic; Zalora is the proving ground.

---

# 1. How this fits the Neoflo platform

## 1.0 The strategic bet

<aside>
♟️

**Why this is the right next build.** Two reinforcing reasons, both grounded in something real rather than a market guess:

- **Expand within P2P accounts.** Customers already running our invoice-processing workflow have the data (invoice status, payments, tax, vendor master) that makes vendor-query answers possible. This is a natural upsell that deepens the platform's hold on the AP function.
- **A wedge into new accounts.** For AP teams not yet on our P2P product, vendor-query pain is a sharp, standalone entry point that can lead back to the core workflow.
- **A committed first customer.** **Zalora has asked for this as their Phase 3** — so v0 has a real launch customer and a real dataset to validate against, not a notional one.
</aside>

This product is **not** a standalone help desk. It is a new surface on the existing Neoflo platform, deliberately scoped to *consume* what the platform already produces rather than rebuild it.

| Capability | Who owns it | How Vendor Queries uses it |
| --- | --- | --- |
| Invoice stage/status + rejection reasons | P2P Invoice Processing workflow / ERP | Source of truth for "where is my invoice / why is it stuck" |
| Payment + remittance (post-posting, from SAP's payment run) | ERP — **per-client integration** (read path exists for Zalora; every client's SAP differs; produced *after* invoice processing — see §10.1) | Source for payment status and payment-breakdown answers |
| Tax amounts (WHT/VAT) — extracted and posted | ERP / invoice-processing extraction | Source for tax-rate explanations and breakdowns |
| Vendor master (identity seed) | Customer ERP, **seeds a platform-owned authorization registry** | Starting point for **identity & authorization** — but the platform owns the registry (see Epic B), because some authorised askers won't exist in the ERP master |
| Duplicate Detection (Invoice # + Vendor + Legal Entity) | P2P Invoice Processing Workflow | Already prevents duplicate payments upstream — **out of scope here** |
| Post-processing vendor email ("invoice processed") | P2P Invoice Processing Workflow | Basic proactive notification — **owned there, not here** |
| Freshdesk integration & ticket status sync | Zalora Phase 1 integration | Shared intake channel and status-sync pattern we reuse |

<aside>
📐

**Design principle inherited from the platform:** *configuration over code.* Thresholds, matching rules, languages, SLAs, and which question types are enabled are all workflow-configurable — consistent with the P2P and Zalora PRDs.

</aside>

---

# 2. The problem

<aside>
📣

**This is a requested problem, not a hypothesis.** Zalora has asked us to handle vendor queries as part of their Phase 3. The industry research below is supporting color that tells us the problem generalises beyond one customer — but the reason this PRD exists is a real customer ask.

</aside>

<aside>
🔑

**Key insight: vendor questions are a symptom, not the disease.** The flood is really three problems wearing one uniform, each needing a different fix: a **volume problem** (many simple "where's my payment?" questions that shouldn't need a human), a **root-cause problem** (a smaller number of real exceptions caused by something breaking upstream — split into vendor-raised disputes like "you underpaid me" and internal exceptions the vendor isn't aware of, like an invoice stuck on an unmatched PO), and a **trust/security problem** (replying to the wrong person is a data leak; bank-detail-change requests are a fraud vector). Beneath all three: **vendors only ask because no one tells them anything first.** Silence creates the questions.

</aside>

## 2.1 Where the time and money go

- **~80% of vendor questions are simply "has it been paid yet?"** — only ~1 in 5 is a real problem worth an expert's time. ([VendorInfo](https://vendorinfo.com/tips-best-ap-vendor-service/))
- **Volume eats real capacity.** 43% of AP teams spend six or more hours every month just answering vendor questions; some spend 20+. ([MineralTree — State of AP](https://www.mineraltree.com/blog/blog-how-to-respond-to-vendor-inquiries/))
- **Inquiry-handling time is a recognised efficiency lever** — every hour spent looking answers up is an hour not spent on higher-value finance work. ([MineralTree — AP KPIs](https://www.mineraltree.com/blog/three-kpis-every-team-should-measure/)) A per-interruption refocus cost (~23 min) compounds it, though for quick look-ups the dominant cost is volume. ([Gallup / UC Irvine](https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx))
- **Each manual touch is expensive.** The same hand-done, multi-system effort that makes an invoice cost $12–$40 to process (vs $1–$5 automated) is what every vendor query triggers. ([HighRadius](https://www.highradius.com/resources/Blog/ap-cost-per-invoice/))
- **Vendors hate it too.** Chasing invoice status is suppliers' single biggest payment-process frustration; 44% feel AP teams don't respond well. ([MineralTree](https://www.mineraltree.com/blog/blog-how-to-respond-to-vendor-inquiries/))

## 2.2 Why the questions exist (upstream causes)

Many "real" questions only exist because something broke earlier. Nearly **a third (31%) of PO-based invoices can't be approved as they arrive and need manual rework first**, and **88% of hand-processed AP documents contain an error**. ([CTMfile](https://ctmfile.com/story/eliminating-invoice-exceptions-is-one-of-the-most-effective-ways-for-accoun), [CostBits / MHC](https://costbits.com/costbits-insights/uncovering-irregularities-in-accounts-payable)) Many can't be answered by AP alone — they need procurement, receiving, or tax. *(The classic downstream symptom — paying the same invoice twice — is a processing/SAP-layer problem, already prevented upstream by Duplicate Detection in the [invoice-processing workflow](https://app.notion.com/p/2fd1bfb492548070a2edecb6a460ccae), not by this product.)*

## 2.3 Risk & trust

Every answer reveals financial information, so replying to the wrong person is a data leak. The sharpest risk is the bank-detail change: a fraudster impersonates a supplier and asks to "update our bank account." This is not rare — **79% of companies faced payment-fraud attempts in 2024; 63% rank email impersonation as their single biggest fraud threat**, average fraudulent request ~$24,586. ([Zenwork](https://www.zenwork.com/payments/blog/types-of-accounts-payable-fraud-to-watch-in-2025/), [AFP / Truist](https://www.financialprofessionals.org/training-resources/resources/articles/Details/what-treasury-professionals-need-to-know-about-business-email-compromise-in-2025), [Hoxhunt](https://hoxhunt.com/blog/business-email-compromise-statistics)) This is *why the identity gate, not a bank-change feature, is the v0 anchor.*

## 2.4 The multi-country dimension (e.g. Zalora)

A large customer buys from the same supplier through several legal entities, currencies, and countries — so "where's my payment?" can't be answered until we know *which* entity and currency. Questions arrive in several SEA languages. Tax and reconciliation questions are a **top category, not an edge case** (tax-certificate requests, statement reconciliations, withholding-rate disputes), and many have exact, rule-based answers — good automation candidates.

<aside>
⚠️

**Evidence caveat.** Every number above is third-party industry research (mostly US / mid-market), *not* our own customers. Treat as directional. Phase 0 validates it two ways: (1) against a real customer's support-desk history (e.g. Zalora's), and (2) by talking to customer AP teams to confirm the problem and the question mix.

</aside>

## 2.5 Who feels it

- **AP analyst** — lives the interruption tax; pulled off real work to look up answers the system already holds.
- **Vendor** — in the dark about money owed; can't find out without chasing a human.
- **AP manager** — has two problems: *no numbers to manage by* (can't see volume, mix, or time spent), and a rare-but-expensive *fraud tail risk* if an impersonator gets bank details changed.
- **Internal colleague** — currently the unwilling go-between for vendor and AP.
- **Tax / treasury** — wants tax-certificate and rate questions answered without landing on their desk.

---

# 3. Goals & non-goals

## 3.1 Goals

1. Cut the human effort spent per vendor question (raise containment).
2. Let vendors self-serve anything the system already knows — faster answers, fewer chases.
3. Ensure every answer and change request reaches **only an authorised asker** — close the disclosure and impersonation paths.
4. Create the measurement baseline that doesn't exist today.

## 3.2 Non-goals (v0)

- **Settling disputes automatically** — genuine disagreements go to a person.
- **Auto-updating vendor records** — v0 only *captures and routes* bank-detail/address changes; a human verifies and applies.
- **Owning proactive "invoice processed" notifications** — that lives in the invoice-processing workflow. Richer proactive payment-status messaging is Phase 2.
- **Full SEA language coverage** — v0 starts with the most common few.
- **VIP/tiered SLAs** — uniform handling in v0.
- **A vendor self-service portal** — v0 meets vendors on email (see §15 decision log).

---

# 4. Success metrics & instrumentation

<aside>
📊

**Principle:** every metric below has a precise definition, a provisional target, and a named instrumentation source. Targets marked *provisional* are confirmed against the Phase 0 baseline before go-live. All events are logged from day one.

</aside>

## 4.1 North-star

| Metric | Definition | Target (provisional) | How measured |
| --- | --- | --- | --- |
| **Containment rate** | In-scope queries resolved with **no human touch** ÷ all in-scope queries | **TBD after Phase 0 baseline** | Query records where resolution = auto and human_touch = false |

## 4.2 Supporting metrics

| Metric | Definition | Target (provisional) | How measured |
| --- | --- | --- | --- |
| Automation rate by type | % auto-resolved within each question type | TBD after Phase 0 baseline | Query records grouped by intent_type |
| Time to first response | Intake → first reply sent | Auto: median under 2 min | Timestamps on query record |
| Time to resolve | Intake → terminal state (answered/closed) | Auto: median under 5 min; routed: tracked vs SLA | Timestamps on query record |
| Coverage / ingestion rate | % of inbound vendor messages parsed into a structured query | ≥ 90% | Intake logs vs raw inbound count |
| Trackable-channel share | % of queries via a trackable channel (vs untraceable phone) | Increasing trend | source field on query record |

## 4.3 Quality & guardrails

| Metric | Definition | Target | How measured |
| --- | --- | --- | --- |
| **Auto-answer accuracy** | Sampled auto-answers judged correct by QA | TBD after Phase 0 baseline (set high — this is near-guardrail) | Weekly QA sample + vendor re-ask signal |
| **Unauthorized disclosure** (hard guardrail) | Answers sent to an asker who failed authorization | **0** | Every outbound answer must carry a passing auth_check_id |
| **Fraudulent bank-detail changes applied** (hard guardrail) | Bank-detail changes applied without human verification | **0** | Bank-change events are capture-only; no write path in v0 |
| Auth-gate coverage | Outbound answers preceded by a successful identity check | 100% | Schema constraint: answer blocked without auth_check_id |
| Vendor re-ask rate (counter-metric) | Same vendor re-asks the same query within 7 days | under 10% | Thread/intent clustering on query records |
| Vendor CSAT (counter-metric) | Satisfaction on resolved queries | Establish baseline, then improve | Lightweight post-resolution signal |

<aside>
🧪

**Counter-metrics matter:** containment must not be "won" by frustrating vendors into giving up. Re-ask rate and CSAT are tracked alongside containment and reviewed together.

</aside>

---

# 5. Users & jobs-to-be-done

| Persona | Job-to-be-done | What v0 gives them |
| --- | --- | --- |
| **Vendor** (supplier) | "Tell me where my money is without making me chase a human." | Fast, accurate, language-appropriate auto-answers |
| **AP analyst** | "Stop interrupting me with questions the system can answer; when something real reaches me, give me everything I need." | ~80% deflected; escalations arrive with a pre-assembled context bundle + suggested next step |
| **AP manager** | "Give me numbers to manage by, and make sure no fraudulent bank-change ever slips through." | Containment/accuracy dashboard; identity gate + zero-fraud guardrail |
| **Internal colleague** (easily forgotten) | "Stop making me the messenger between the vendor and AP." | Vendors get answers directly; fewer internal chase requests |
| **Tax / treasury** (critical for APAC) | "Tax-certificate and rate questions shouldn't land on my desk." | Tax-cert requests routed with context (automated fetch is v1); rule-based rate explanations (stretch) |

---

# 6. Scope: question taxonomy & v0 prioritization

Every question type scored on volume, value, automatability, and strategic fit. Section 8 builds only the rows marked **Build now** (and stretch where data allows).

<aside>
📊

**Caveat:** the "how often" figures in this table are **not yet from our own customers** — they're external industry research plus our judgment (full list in §17). Phase 0 replaces them with the real question mix from a customer's own support-desk history (e.g. Zalora's) before scope is locked.

</aside>

| Question type | Auto-answerable? | Primary data source | v0 decision | Reasoning |
| --- | --- | --- | --- | --- |
| **Payment status** — "where's my money?" | Yes | Invoice status (Neoflo) + payment lifecycle (SAP: open → due → blocked → initiated → cleared) | **Build now** — the anchor | Biggest volume; system has the answer; moves containment most. "Paid" only at cleared (see §10.1 / VQ-E1) |
| **Payment breakdown** — "what does this payment cover?" | Yes | Remittance from SAP's payment run (not the bank) | **Build now** | Same answering engine as status |
| **Short-pay / deduction / credit note** — "you paid me less than I invoiced" | No — route in v0 | Payment doc + remittance (deductions, WHT, credit notes) — *if* retained readably | **Route to human** (Build-now candidate once remittance read is proven) | Very common and trust-sensitive. The breakdown engine (VQ-E2) often *has* the answer ("less $X WHT / credit note CN-12"), but until Phase 0 proves remittance is readable, route with context rather than risk a wrong "why" |
| **Invoice not received / no record** — "did you get my invoice?" | No — route in v0 | Neoflo intake/processing state (Fetched / Rejected / not found) | **Route to human** (Build-now candidate) | High-volume and answerable from data we hold (we can see if it was received/rejected/never arrived). Routed in v0 to avoid wrongly telling a vendor "no record" when it's mid-processing; a strong fast-follow once intake-state mapping is validated |
| **Document request** — "send the PO / payment proof" | Yes, if on file | Stored invoice PDF, PO, SAP doc | **Build now** | Look-up-and-send pattern |
| **Tax certificate** — "send my WHT/TDS certificate" | No — manual in v0 | Downloaded manually from government portals; **not** stored in ERP | **Route to human** (v1 candidate) | The certificate isn't in any system we read — it's pulled from a govt portal by a person. Automating fetch/verify/share is a v1 build once we know the source per country |
| **Bank-detail change** — "update our account" | No — needs a human | Captured to query record | **Capture & route** (verification flow deferred) | Very low volume, always human; identity gate already blocks impersonation |
| **Tax-rate question** — "why 2% not 1%?" | Partly — rule-based | WHT/VAT amount (invoice or ERP/Neoflo(if already processed)) + tax rule + vendor tax status | **Stretch** (explain; escalate if it doesn't reconcile) | Answer follows fixed rules, so explainable |
| **Statement reconciliation** — "why only 5 of 10 paid?" | Partly | Invoice statuses + rejection reasons (Neoflo) | **Stretch** (depends on data access) | Listing statuses is easy; explaining why one is stuck needs stage/reason data |
| **Genuine dispute** — "you underpaid me" | No — needs judgment | Context bundle for human | **Route to human** | Symptom of an upstream issue; automating judgment is wrong |
| Anything unclear | No | — | **Route to human** | Catch-all |

**Thesis in one line:** auto-answer the high-volume questions the system already knows, explain the rule-based tax ones, capture bank changes safely, and route everything needing judgment to a human with context pre-assembled — all behind a strict identity gate.

---

# 7. Solution overview & architecture

**In one sentence:** the platform meets vendors on the channel they already use, confirms who's asking, assembles the facts from Neoflo + ERP, classifies intent, then answers / explains / reconciles / routes / captures — and logs everything.

## 7.1 Processing pipeline

```jsx
Inbound vendor message (email / Freshdesk)
        ↓
[A] Intake — parse into a structured Query record (intent unknown yet)
        ↓
[B] Identity & Authorization Gate ──(fail)──▶ reveal nothing; verify or route to human
        ↓ (pass: asker mapped to vendor + scope)
[C] Context Assembly — resolve legal entity + currency; fetch invoice/PO/GRN/payment/tax
        ↓
[D] Attempt to resolve — try to build a grounded answer from the assembled records
        ↓
[E–I] Outcome (one of):
   ├─ Answer automatically (status / breakdown / document / tax cert) → only if grounded AND high confidence
   ├─ Explain (tax-rate)          [stretch]  → rule-based reason; escalate if it doesn't reconcile
   ├─ Reconcile (statement)       [stretch]  → per-invoice status + reason any is stuck
   ├─ Route to human (low confidence / not grounded / dispute / unclear) → context bundle + suggested next step
   └─ Capture & route (bank-detail change)   → record request; never auto-update
        ↓
[J] Reply & close — vendor's language, tracked to SLA, source-channel status synced
        ↓
[K] Log & learn — immutable audit + analytics (containment, time, accuracy, drivers)
```

## 7.2 Resolution decision (cascading gates, mirrors P2P Smart Routing)

| Gate | Condition to auto-resolve | If it fails |
| --- | --- | --- |
| **G1 — Identity** | Sender maps to a known vendor contact AND is authorised for the entity/records in question | No disclosure; request verification or route to human (hard block) |
| **G2 — Answerability** | The request maps cleanly to records the system can stand behind (not a dispute, not ambiguous) | Route to human |
| **G3 — Data completeness** | All records needed for the answer are present and live | Route to human, or hold and explain "in progress" |
| **G4 — Answer confidence** | Composed answer passes type-specific validation (e.g. reconciles) | Route to human rather than guess |

<aside>
🛡️

**G1 is absolute.** No answer, document, or amount leaves the system without a passing identity check recorded on the query. This is the single most important safety property of the product.

</aside>

## 7.3 Three non-negotiables

- **Knowing who's allowed to ask** — identity + authorization before anything is revealed (the v0 anchor), via a platform-owned, ERP-seeded registry (Epic B).
- **Getting entity & currency right** — for a multi-entity customer, an answer to the wrong entity isn't incomplete, it's *wrong*.
- **Recording & measuring from day one** — to prove containment moved and defend every answer given.

---

# 8. Functional requirements

<aside>
🧱

**Format.** Epics group user stories (VQ-x#) with testable acceptance criteria. Bold epics are v0; stretch epics are marked. Field/threshold specifics are tenant-configurable (Epic L).

</aside>

## Epic A — Intake & channel (v0)

**VQ-A1 · Email/Freshdesk ingestion** — *As the platform, I want to turn every inbound vendor message into a structured Query record so it can be processed and tracked.*

1. Receive vendor messages from configured channels (email inbox and/or Freshdesk webhook, reusing the Zalora pattern).
2. Create a Query record: source, sender, timestamp, workflow (the customer's vendor-query workflow; "tenant" and "workflow" are the same boundary in P0), raw body, attachments, unique ID.
3. Classify message as vendor-query vs not; safely log and ignore non-queries.
4. One message may contain multiple distinct questions — each becomes its own resolvable intent on the record.
5. *Acceptance:* ≥90% of inbound vendor messages produce a structured Query record; non-queries are logged, not dropped.

**VQ-A2 · Threading & dedupe**

<aside>
📬

**P0 is single-channel: email (via Freshdesk), the channel Zalora already uses.** The architecture is channel-agnostic so more channels can plug in later, but v0 builds and validates one channel only. The cross-channel merge below is therefore a *design-for-later* note, not a P0 build item.

</aside>

1. Link follow-ups to the original thread; never open a duplicate query for the same thread.
2. **Reopen on post-close reply.** If a vendor replies to an already-closed query — including disputing a closed auto-answer ("that's wrong") — the message threads to the *same* query (no new record) and the query reopens and routes to a human (Closed → Routed). The system never silently re-auto-answers a query the vendor has pushed back on: a post-close reply is treated as low-confidence / dispute (G2) by construction, with the original answer and assembled context attached for the analyst. The reopen fires the re-ask signal (§4.3). "Closed" is therefore terminal *until* a new inbound message arrives on the thread, not permanently final.
3. *(Later, multi-channel)* detect the same question arriving on two channels and merge.
4. *Acceptance (P0):* a vendor replying twice on one email thread yields one open query, not two; and a reply to a closed query reopens that same query and routes it to a human, rather than opening a new query or re-auto-answering.

## Epic B — Identity & authorization gate (v0 — the anchor)

<aside>
🔐

**The authorization registry is platform-owned, ERP-seeded.** The ERP vendor master is the *seed* for who a vendor's contacts are — but it isn't sufficient on its own, because real vendor organisations have people who need visibility (a new AP clerk, a finance lead, a shared mailbox) who were never entered in the customer's ERP. So the platform owns its own **authorization registry**: seeded from the ERP vendor master, then extended and maintained on-platform, scoped per legal entity. This is a real v0 build, not a lookup against the ERP. *(It also dovetails with the shared user/assignment capability in Epic H — same underlying notion of platform-managed access.)*

</aside>

**VQ-B1 · Sender → authorised-contact match** — *As the platform, I want to confirm the sender is a known, authorised contact for the vendor before revealing anything.*

1. The asker is identified by their **email address** (v0), matched against the **platform authorization registry** (seeded from the ERP vendor master, extended on-platform).
2. Produce an auth_check result: pass / fail / needs_step_up, with the matched vendor_id and authorised scope.
3. *Acceptance:* no downstream answer can be composed without a pass (schema-enforced).

**VQ-B2 · Authorization scope (workflow-level in P0)**

<aside>
🔑

**P0 decision — access is at the workflow level, not per legal entity.** In P0 an authorised contact is authorised for the *workflow* (i.e. that customer's vendor-query workflow); we do **not** build per-legal-entity access control. **But the *answer* must still respect the legal entity the vendor is asking about** — entity is a *data-fetch and answering* concern (Epic C), not an access-gate concern. So: the gate decides "can this person be answered at all?" at the workflow level; the answer engine then fetches and replies for the specific entity/invoice in question. Per-entity *access restriction* is a later phase.

</aside>

1. In P0, resolve whether the asker is an authorised contact for the workflow; restrict answers to that vendor's own records.
2. Entity is handled downstream (Epic C): the answer is scoped to the entity the query is about, even though access isn't gated per entity.
3. *Acceptance:* a vendor can only ever receive their own records; and an answer about Entity A never returns Entity B's figures.

**VQ-B3 · Step-up / out-of-band for sensitive requests**

1. For sensitive intents (e.g. bank-detail change), require confirmation through an independent channel already on file (e.g. a phone number from the vendor master, never one supplied in the message).
2. *Acceptance:* sensitive intents cannot proceed on inbound-message trust alone.

**VQ-B4 · Unknown / failed-auth handling**

1. On fail, reveal nothing; respond with a safe, non-disclosing message and/or route to a human; log the attempt with reason.
2. *Acceptance:* failed-auth queries never contain financial data in the outbound reply.

## Epic C — Context assembly (v0)

**VQ-C1 · Entity & currency resolution** — determine the legal entity and currency the query refers to (from invoice #, PO #, ticket, or asker scope); if ambiguous, ask one clarifying question or route — never guess. *Acceptance:* queries resolved against the wrong entity = 0 in the test set.

**VQ-C2 · Record fetch** — fetch the relevant invoice, PO, GRN/SES, payment record, SAP document number, and tax amounts from Neoflo (P2P) and the ERP into one context object. *Acceptance:* the context object contains every field the target intent needs, or the gap is flagged.

**VQ-C3 · Live status & freshness** — read live status; label anything still in progress. *Acceptance:* never present a stale "paid" when status is still processing.

## Epic D — Answer-or-route (v0)

<aside>
🎯

**No mandatory classification step.** v0 does **not** depend on correctly sorting each message into a type first. For every query the system simply *attempts a grounded answer* from the records it assembled — and the only decision that matters is **"can I answer this confidently, or not?"** If yes, it replies; if not (low confidence, missing data, a dispute, or anything ambiguous), it routes to a human. This avoids two failure modes by construction: there is no "undefined type," and there is no "misclassified into the wrong bucket." A wrong guess can't send a bad answer, because a low-confidence attempt routes to a human regardless of what it looked like.

**Is "type" needed at all? Almost not — and never on the answer path.** The runtime above never branches on a pre-assigned type; it only asks "can I ground a confident answer?". Type survives in exactly two places, both *after* the answer decision and both harmless if wrong:

- **(1) A config on/off switch (Epic L).** Before go-live, an admin flips which capabilities are on for a workflow — e.g. "answer payment-status and documents; never touch bank-detail changes." This is a coarse capability toggle set once in config, not a per-message label. *Flow:* admin config → the answer engine simply won't attempt a disabled capability → those queries route to a human.
- **(2) An analytics tag applied after resolution (Epic K).** Once a query is resolved, it's bucketed for reporting ("42% were payment-status"). *Flow:* query resolved → a tag is attached for the dashboard → if a tag is wrong, a chart is slightly off, nothing else. No vendor ever gets a worse answer because of it.

So there is **no manual per-message classification step, and nothing the vendor or an operator must tag.** If we wanted, we could ship P0 with only the config switch and add analytics tagging later; neither sits on the path that decides what a vendor is told.

</aside>

**VQ-D1 · Attempt to resolve** — for each query, try to compose a grounded answer from the assembled records and score confidence. No vendor- or operator-applied tags; nothing depends on a pre-assigned type.

**VQ-D2 · Answer or route** — apply the §7.2 gates; answer only if grounded and high-confidence, otherwise route to a human (or hold if data is still in progress). *Acceptance:* low-confidence, not-grounded, and disguised-complaint cases route to a human, not an auto-answer.

## Epic E — Automated answers (v0)

<aside>
📝

**Tax certificates are out of scope for v0 (manual).** A WHT/TDS certificate is downloaded manually from a government portal and is **not** stored in the ERP or anywhere this product reads. So in v0, certificate requests are **routed to a human**, who fetches and sends it. Automating fetch/verify/share is a **v1** build, once we confirm the source per country — see §6 and Open Question 2.

</aside>

- **VQ-E1 · Payment status** — map the invoice to the **real post-posting status ladder** and answer for the stage it's actually at. "Paid" is only stated at the **cleared** stage; every earlier stage is reported honestly as in-progress with the specific reason:
    1. **Posted / open** — booked as a payable, not yet due.
    2. **Due** — past the derived due date (posting date + payment terms), eligible for the next payment run.
    3. **Blocked** — on a payment block (vendor- or invoice-level); will be skipped until released. High-value answer: "on hold," not "coming soon."
    4. **Payment initiated** — selected by the payment run / file sent to the bank, but **not yet confirmed**. State as "payment in progress," never "paid."
    5. **Paid / cleared** — bank confirmed and the open item cleared in SAP. **Only here** do we answer "paid on {date}, ref {reference}."
    
    *Why this matters:* reading SAP at stage 4 and saying "paid" would be wrong — the money may not have moved, or could still fail. Which of these stages are readable depends on the client's SAP setup (see §10.1 and the Phase 0 gate).
    
    1. **Every payment answer carries an "as of {date/time}" stamp.** Because clearing can lag reality (especially manual-clearing clients — see §10.1), the reply states the freshness of the data it's based on (e.g. "as of the last SAP sync on 6 June"). This prevents a confidently-stale "not paid" to a vendor who was in fact paid after the last read. *Acceptance:* no payment-status reply is sent without an as-of timestamp.
- **VQ-E2 · Payment breakdown (remittance)** — answer which invoices a payment covers, gross, deductions (incl. WHT), net, from the **remittance data**. Note the source: this breakdown **originates in SAP's payment run** (which selected those open items), **not** from the bank — the bank only moves money and doesn't know about invoices. So the data exists at the source; the open question is whether this client's SAP **retains** it in a readable form vs. generating-and-emailing it (see §10.1, Phase 0 gate).
- **VQ-E3 · Document request** — return the requested document (PO, invoice copy, payment proof / SAP doc) if on file and in scope; otherwise route to human.
- **VQ-E4 · Tax certificate — *route to human in v0* (v1 candidate).** The WHT/TDS certificate is downloaded manually from a government portal and isn't held in the ERP or any system we read, so v0 does not auto-answer these: the request is routed to a human who retrieves and sends it. v1 will revisit automated fetch/verify/share once the per-country source is known.

*Acceptance (all of E):* answer only when gates G1–G4 pass; otherwise hand to a human with context. Every answer carries its auth_check_id and the records it was built from.

## Epic F — Explain: tax-rate (stretch)

**VQ-F1** — give the rule-based reason (relevant tax rule, vendor tax status, certificate on file) using the calculated tax amount fetched from the invoice or, post-processing, from ERP/Neoflo. Escalate to a human if it doesn't reconcile.

## Epic G — Reconcile: statement (stretch)

**VQ-G1** — list each invoice's status; for any stuck, surface the reason from invoice-processing stage/rejection data (e.g. "awaiting GR/SES", "rejected: duplicate"). Where the reason isn't machine-available, route that line to a human.

## Epic H — Human handoff (v0)

<aside>
👥

**Triage & assignment — answering the four questions head-on.**

- **Triage *to whom*?** A routed query lands in a shared **vendor-query queue** for that workflow. An AP user picks it up (self-assign) or a lead assigns it. These are the customer's own AP/finance staff — the same people who already resolve escalations today — not a new team.
- **Is Vendor Queries a new workflow with its own users?** Yes — it is a distinct *workflow* on the platform (alongside invoice processing). But the **users are not workflow-specific**: a person is onboarded once to the platform and can be granted access to one or more workflows. So "a vendor-query handler" is just a platform user with access to the vendor-query workflow.
- **How are these users onboarded?** Through the platform's user management, following the same whitelist + Google-SSO model as Zalora Phase 1 auth: an admin invites/whitelists the person, they sign in via SSO, and the admin grants workflow access and a role. *(Note: these are internal AP users, a completely separate concept from the vendor-side authorization registry in Epic B — don't conflate the two.)*
- **Where is assignment built?** **On the platform, as a shared capability** — users, roles, queues, and assignment living on Neoflo. Today invoice processing does assignment *outside* the platform, on Freshdesk. Building it once on-platform means **invoice processing can adopt the same capability** instead of each workflow leaning on Freshdesk separately. *(This is the recommendation; the dependency on the shared user/assignment service is called out for eng sequencing. Tagged for confirmation with the team.)*
</aside>

**VQ-H3 · Platform users, roles & assignment (shared capability)** — *As an AP admin, I want to onboard staff once to the platform and assign vendor-query work to them, reusing the same user model as other workflows.*

1. Users are onboarded to the **platform** (whitelist + SSO), then granted access to the vendor-query workflow with a role (e.g. handler, lead).
2. Routed queries enter a shared queue; users self-assign or a lead assigns; assignee is shown on the query and dashboard.
3. The user/role/queue/assignment service is built to be **workflow-agnostic** so invoice processing can reuse it (replacing the current Freshdesk-side assignment over time).
4. *Acceptance:* a single onboarded user can be granted access to more than one workflow; every routed query has exactly one accountable assignee; assignment changes are audit-logged.

**VQ-H1 · Context bundle** — when routing, hand the AP analyst the assembled context, classified intent, a draft of what's known, and a **suggested next step**. Never auto-answer a routed query.

**VQ-H2 · Disputes** — route genuine disputes to a human, and on the way attach the underlying cause we can already see. *In plain terms:* if a vendor says "you underpaid me," the system doesn't argue — it pulls up *why* the figures differ (for example, the invoice was $632 but the goods-receipt in SAP was only $579, so SAP paid against the GR) and hands the analyst that explanation alongside the query, so they start with the answer already in front of them rather than digging for it. *Acceptance:* a routed query opens with zero additional look-ups required to start work.

## Epic I — Bank-detail capture & route (v0)

**VQ-I1** — capture the bank-change request into the query record, trigger the Epic B step-up requirement, and route to a human; **no write path to vendor master exists in v0.** *Acceptance:* bank-detail changes applied automatically = 0 (by construction).

## Epic J — Reply, language & SLA (v0)

- **VQ-J1 · Reply & language** — compose a clear reply in the vendor's language. **Language is detected from the vendor's own incoming message** (the text they wrote), with a configurable default fallback per workflow; v0 supports the most common few SEA languages, configurable. *(Open: do we mirror the inbound language automatically, or let the workflow pin a fixed reply language? Tagged for confirmation.)*
- **VQ-J2 · SLA timers** — track each query against a configurable deadline by type; surface breaches.
- **VQ-J3 · Close & status sync** — on resolution, close the query and sync status back to the source channel (Freshdesk ticket status, mirroring the Zalora pattern).
- **VQ-J4 · Multi-intent / partial replies** — when one message carries several intents (VQ-A1.4) that resolve differently, the vendor receives a *single consolidated reply* on the thread, not one email per intent. Answerable intents are answered immediately; intents that route to a human are acknowledged in the same reply ("the rest is with our team; you'll hear back within SLA"). Answerable intents are **never** held back waiting on a routed one. *Acceptance:* a message with 3 questions where 2 are auto-answerable and 1 routes produces one outbound reply containing the 2 answers plus an acknowledgement of the routed intent; the routed intent still lands in the queue with its context bundle.

## Epic K — Logging, audit & analytics (v0)

- **VQ-K1 · Immutable audit** — log every query, the auth_check, the records used, the resolution path, and the outbound reply.
- **VQ-K2 · Analytics** — containment, automation rate by type, time-to-first-response, time-to-resolve, accuracy, re-ask rate, and **driver analysis** (which upstream problems generate the most questions).

## Epic L — Workflow configuration (v0)

<aside>
⚙️

**Naming:** configuration is organised **per workflow** — invoice processing is one workflow, Vendor Queries is another — consistent with how the platform already frames tenant setup.

</aside>

**VQ-L1** — configure per workflow (per tenant): enabled question types, confidence thresholds (G2/G4), identity/authorization rules & whitelist, supported languages, SLA targets by type, and channel settings. Consistent with the platform's configuration-over-code principle.

---

# 9. UX & user journeys (for design)

<aside>
🖥️

**Where each journey happens:** the **vendor** never logs in — their whole experience is the email they already send and the reply they get back. The **AP analyst** and **AP manager** work entirely on the **Neoflo platform**, in the same place they handle invoices today. No vendor portal in v0.

</aside>

## 9.1 End-to-end happy path (the 80% case)

This is the journey that has to feel effortless, because it's most of the volume.

1. **Vendor emails** "Has invoice INV-2098 been paid?" to the AP mailbox (the one already wired to Freshdesk).
2. **Intake** turns the email into a Query record; the vendor sees nothing yet.
3. **Identity gate** matches the sender's email to an authorised contact in the registry → pass.
4. **Context assembly** resolves the legal entity the invoice belongs to, fetches its status + payment record.
5. **Answer-or-route** grounds a confident answer: "INV-2098 was paid on 3 June, ref TXN-55218, to your account ending 4471."
6. **Reply** goes back on the same email thread, in the vendor's language, within ~2 minutes — no human touched it.
7. **Log** records the whole chain (who asked, identity result, records used, answer sent) for audit and analytics.

<aside>
⏱️

**The felt experience:** the vendor sent an email and got a correct, specific answer back faster than a human could have opened the ticket. That speed *is* the product.

</aside>

## 9.2 Vendor journey (the only external actor)

- **Sends:** a free-text email, any of the supported languages, possibly several questions at once, possibly with an attachment.
- **Gets, in the good case:** a fast, specific, entity-correct answer on the same thread.
- **Gets, if we can't verify them:** a safe, non-disclosing message ("we need to verify your identity before we can share payment details") — never a leak, never a dead end.
- **Gets, if it needs a human:** a brief acknowledgement that it's being looked into, then a human reply within SLA.
- **Never:** has to log into a portal, create an account, or learn a new tool.

## 9.3 AP analyst journey (handles the escalations)

1. Opens the **Query dashboard** on Neoflo — a worklist of queries that need a person, each showing vendor, entity, SLA timer, and why it routed.
2. Picks up (or is assigned) a query and opens **Query detail.**
3. Sees the **context bundle already assembled** — the vendor's question, the identity result, the relevant invoice/PO/payment, and *the reason it couldn't be auto-answered* (e.g. "dispute: amount mismatch — invoice $632 vs GR $579").
4. Acts on a **suggested next step**, edits the draft reply, and sends.
5. Closes the query; status syncs back to the Freshdesk thread automatically.

<aside>
🧰

**Design principle for the analyst:** the escalation should open with the answer *already researched*. If the analyst has to go look something up in SAP or Neoflo, the context bundle failed its job. Zero additional look-ups to *start* work is the bar.

</aside>

## 9.4 AP manager journey (oversight, not babysitting)

1. Opens the **Analytics** view on Neoflo.
2. Reads the numbers that matter: containment rate, automation by type, time-to-resolve, accuracy, SLA breaches, and re-ask rate.
3. Reads **driver analysis** — which upstream problems generate the most questions — and feeds that back into the P2P/procurement roadmap.
4. Never needs to touch individual queries unless an exception escalates.

## 9.5 Key screens

| Screen | Primary user | Purpose | Must show |
| --- | --- | --- | --- |
| Query dashboard / worklist | AP analyst | Triage & track what needs a human | Vendor, entity, SLA timer, route reason, channel ref (Freshdesk ticket), assignee, status |
| Query detail (escalation) | AP analyst | Act fast on one query | Vendor question, identity result, assembled context (invoice/PO/payment), route reason, draft reply, suggested next step, audit trail |
| Analytics | AP manager | Manage by numbers | Containment, automation-by-type, time metrics, accuracy, re-ask, SLA breaches, driver analysis |
| Workflow configuration | Admin / CS | Set the workflow up | Enabled capabilities (on/off), confidence thresholds, auth registry & rules, languages, SLA targets, channel settings |

## 9.6 States design must cover

For each query, design needs a clear state for: **Authorising** · **Auth failed** (safe, non-disclosing) · **Awaiting data** ("in progress, not yet posted") · **Auto-answered** (closed, no human) · **Routed to human** (with context bundle) · **Bank-change captured** (awaiting human verification) · **SLA breached** (needs attention) · **Closed** (read-only, full audit visible) · **Reopened** (a post-close vendor reply re-opened the query → routed to a human, with the original answer and context attached).

## 9.7 Tone of the vendor-facing reply

Replies should be short, specific, and factual — lead with the answer ("Paid on 3 June"), then the supporting detail. Never expose internal jargon or system names. When verification fails, be polite and clear about the next step without hinting at any account detail.

---

---

# 10. Data & integration dependencies (engineering)

| Dependency | Used for | Status / note |
| --- | --- | --- |
| Invoice stage/status + rejection reasons | Status answers, statement reconciliation | **Available** in invoice processing workflow; fetchable |
| Payment document + remittance (payment date, amount, reference, deductions) | Payment-status (VQ-E1) + breakdown (VQ-E2) answers | **Per-client integration, post-posting.** Produced by SAP's **payment run**, *after* invoice processing hands off — **not** the same as the posting document we already store (see note below). Read path for status confirmed for Zalora; payment-doc/remittance read to be verified in Phase 0. Every client's SAP differs, so this sits behind a connector abstraction (see NFRs) |
| Invoice posting (accounting) document — "Accounting Entry Posting ID" | Confirming an invoice is *booked* (not *paid*) | **Available** — captured by invoice processing at ERP posting. Useful as "booked" evidence, but does **not** answer "have I been paid" |
| Tax amounts (WHT/VAT) | Breakdown, tax-rate explanation | **Available** from invoice extraction or ERP/Neoflo post-processing |
| Authorization registry (ERP-seeded, platform-owned) | Identity & authorization | **New v0 build.** Vendor master seeds it; platform extends/maintains it per entity (Epic B). Open item: vendor-master contact-data quality |
| Tax-deduction (WHT/TDS) certificate | Tax-cert requests | **Out of scope for v0 — manual.** Downloaded from government portals by a person; not in ERP or any system we read. Routed to a human in v0; automated fetch/verify/share is a v1 candidate (source per country = open) |
| Freshdesk (or email) channel | Intake + status sync | Reuse Zalora integration pattern |
| Document store (invoice PDFs, etc.) | Document requests | Reuse invoice processing object storage |

<aside>
⚠️

**Posting document ≠ payment document — don't conflate them.** Invoice processing ends at **Posted** and stores the **Accounting Entry Posting ID** (the document created when the invoice is *booked* in SAP). The **payment** — with its date, amount, reference, and remittance breakdown — is created **later, by SAP's payment run**, on the customer's payment cycle; it is **not** captured by invoice processing. "Is my invoice booked?" is answerable from data we have; "where's my **payment** / what did it cover?" needs the post-posting data described in §10.1.

</aside>

## 10.1 The payment lifecycle (post-posting) — what "paid" really means

The invoice-processing workflow stops at **Posted**. Everything a vendor actually asks about ("when will I be paid / have I been paid / what did this cover?") happens *after* that, mostly inside SAP, and **varies by client**. Engineering and CS need this model because it determines what's answerable.

**How a posted invoice becomes a payment:**

1. **Due date is derived.** Payment terms are **SAP codes** (e.g. `ZTERM`) held on the vendor's **Business Partner (BP) / vendor master**. Due date = **baseline date + payment term**. The baseline is usually the **posting date** (most reliable); some vendors are configured to use the **invoice date** (less trusted, can be wrong); received/document date also exists. Posting date is the common default.
2. **Open items are selected.** Invoices that are due and **not blocked** become candidates. A **payment block** (vendor- or invoice-level) means the vendor isn't paid until it's released — a high-value thing to be able to answer ("you're on hold").
3. **The payment run executes.** SAP's payment run (e.g. `F110`) groups due open items per vendor into a payment. **Frequency (weekly / biweekly / monthly) and manual-vs-automated are client choices.**
4. **Money moves — two models, client-dependent.** Either (a) **bank integration / host-to-host**: SAP emits a payment file (e.g. ISO 20022 `pain.001`) sent to the bank automatically; or (b) **manual upload**: a person exports a file / CSV and uploads it on the **bank portal**. The file we send out is the **outbound payment instruction**.
5. **The bank confirms back.** The bank returns a **statement** (e.g. `MT940` / `CAMT.053`) and sometimes a **payment-status report** (`pain.002` / `CAMT.054`) confirming success/failure. This is a *different* document from the one we sent.
6. **SAP clears the item.** The statement is imported (**electronic bank statement / EBS**) and the open item is **cleared** — turning "open" into "paid." Clearing can be **automated or manual** (a person reconciles and posts it). A **"payment triggered" flag** may exist before clearing.

<aside>
🧾

**Where remittance comes from (it's not the bank).** The invoice-to-payment mapping a vendor wants — "this $9,500 = INV-1001 + INV-1002 − $500 WHT" — is a byproduct of the payment run's open-item selection, so it **originates in SAP**. The bank only needs an amount, an account, and a short reference; it doesn't know what an invoice is. The **remittance advice** is that SAP-side mapping, formatted for the vendor (sent by SAP directly, embedded in the payment file's structured fields, or as a short reference — often truncated, which is *why* vendors ask). The **payment document** is SAP's internal record of the same event. Implication: we don't reconstruct remittance from the bank — we read it from SAP, *if* this client retains it readably.

</aside>

<aside>
🚦

**Consequences for the product (and Phase 0).** "Paid" is only truthful at **clearing** (step 6); steps 1–5 are all flavours of in-progress (see the VQ-E1 ladder). And for a **manual-clearing** client, SAP can lag reality by days. What's answerable therefore depends on per-client SAP config — these are Phase 0 / SME confirmations, not assumptions:

- Is **clearing/EBS automated or manual** for this client? (Decides how fresh "paid" is.)
- **Bank integration or manual portal upload?** (Decides whether a "payment initiated" signal even exists to read.)
- Is the **payment-block** field readable? (Enables the "you're on hold" answer.)
- Is **remittance retained in a readable form**, or only generated-and-emailed? (Decides whether VQ-E2 can auto-answer.)
</aside>

---

# 11. Non-functional requirements

- **Security & privacy:** identity gate on every answer; least-privilege scope per asker; no sensitive data in URLs/logs beyond what's necessary; immutable audit.
- **Reliability:** channel intake with retry/backoff; fallback to polling if a webhook fails (per Zalora mitigations); no answer on stale data. **Every payment answer carries an explicit "as of {date/time}" stamp** reflecting the last successful read of the source (critical where clearing is manual and SAP lags reality — see §10.1).
- **Performance:** auto-answer median under 2 min to first response; classification + assembly near-real-time.
- **Internationalization:** multi-language replies (configurable subset in v0); entity/currency-aware.
- **Pluggability:** the ERP/SAP data layer sits behind a **connector abstraction.** v0 builds and ships against Zalora's SAP only; because each client's SAP differs, the connector is the seam that lets later clients plug in without reworking the core. Payment-status answers are only available where a read path is integrated — not assumed free.
- **Configurability:** all business rules via config, no code deploy (platform principle).
- **Observability:** every gate decision logged with pass/fail + reason for audit and tuning.

---

# 12. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Confident but wrong answer | Auto-answer only when gates G1–G4 pass; otherwise route; track accuracy weekly |
| Disclosure to the wrong person | Identity gate (G1) on every answer; least-privilege scope; explicit cross-entity tests |
| Fraudulent bank-detail change | Capture-only, no write path in v0; step-up/out-of-band; identity gate blocks impersonation |
| Wrong answer for a multi-entity customer | Entity/currency resolution is a hard prerequisite (G3); ambiguity → clarify or route |
| Stale data ("paid" when still processing) | Read live status; label in-progress clearly |
| Low vendor adoption | Meet vendors on email; make self-service genuinely faster for them |
| Containment "won" by frustrating vendors | Re-ask rate + CSAT reviewed alongside containment |
| Dirty vendor-master contact data weakens the identity gate | Phase 0 data-quality check; fail closed (route to human) when match is weak |

---

# 13. Open questions

1. **Channel for v0** — email only, or behind a vendor portal? *(Recommendation: email first — see §15.)*
2. **Where is the tax-deduction certificate generated**, and how do we fetch it reliably?
3. **Out-of-band method** for bank-detail step-up — call-back, pre-registered contact, or two-person approval?
4. **Confidence thresholds** — starting values for G2 (intent) and G4 (answer) before tuning?
5. **Languages** — which SEA languages must v0 support at launch?
6. **SLA ownership** — who sets response-time targets per type, us or each customer, on a vendor level?
7. **Vendor-master completeness** — is contact data clean enough to authorise on, per entity?
8. **Payment lifecycle per client (Zalora first)** — is **clearing/EBS automated or manual** (how fresh is "paid")? **Bank integration or manual portal upload** (does a "payment initiated" signal exist)? Is the **payment-block** field readable? Is **remittance retained readably** or only emailed? (See §10.1.)

---

# 14. Rollout plan & support model

## 14.0 Definition of done & launch criteria

<aside>
✅

**What "Phase 1 is live" means.** v0 is launched when all of the following hold for the first customer (Zalora):

- **Identity gate (Epic B) is enforced on 100% of outbound answers** — no answer composes without a passing auth_check (schema-enforced). This is non-negotiable.
- **The MVP floor is met (see below).**
- **Both hard guardrails hold:** zero unauthorized disclosures, zero auto-applied bank-detail changes.
- **Human handoff works end-to-end** — routed queries land in the shared queue with a context bundle, an accountable assignee, and Freshdesk status sync.
- **Everything is logged** — every query, auth_check, records used, and outbound reply are captured (Epic K), so containment and accuracy can be measured.
- **Accuracy clears the bar set in Phase 0** — the auto-answer accuracy target (defined against the Phase 0 baseline) is met on the hypercare QA sample before auto-answers run unsupervised.
</aside>

<aside>
🧱

**The MVP floor (the irreducible ship-bar).** Phase 0 can return "change-scope" rather than a clean go. To keep that unambiguous: the **single irreducible capability is automated payment status** (the VQ-E1 ladder) behind the identity gate — that is what makes this a product rather than a router. **Payment breakdown (VQ-E2) and document requests (VQ-E3) are highly desirable but additive** — if Phase 0 shows remittance isn't readably available, we still ship status-only and route the rest, rather than not shipping. Below automated payment status, there is no v0 worth launching; at or above it, we launch and add the rest as the data proves out.

</aside>

## 14.1 Phased rollout

<aside>
🚦

**Phase 0 is a hard go/no-go gate. We do not start building Phase 1 until it passes.** Two unknowns are make-or-break, and if either fails, the v0 design changes materially rather than proceeding as written:

1. **Vendor-master / authorization-data quality** — is the customer's contact data clean and complete enough, per entity, to authenticate a sender? If not, either the identity gate degrades to step-up-on-everything (which kills containment) or we widen the platform registry's manual-onboarding scope before building. *Go test: on a real sample, what share of inbound senders can we confidently map to an authorised contact?*
2. **SAP/ERP read feasibility for *payment*, not just posting.** This is subtler than it looks. The invoice-processing workflow ends at **Posted** — what it stores is the **invoice posting (accounting) document**, generated at posting time. That tells a vendor "your invoice is booked," **not** "you've been paid." The data a vendor actually wants — payment date, amount, reference — lives in the **payment document / remittance**, which is produced *later* by SAP's payment run and is **not captured by invoice processing today.** So the gate must test three distinct reads, not one: (a) invoice/clearing **status**, (b) the **payment document + remittance** (for "where's my payment" and breakdown answers), and (c) the **WHT certificate source** (generated outside this product — confirm where, and whether we can fetch it). Confirmed for Zalora at the status level; payment-doc/remittance and certificate reads must be verified. *Go test: for a real paid invoice, read back its payment document, remittance breakdown, and (if applicable) WHT certificate.*

**Why this matters:** payment-status (VQ-E1), payment-breakdown (VQ-E2), and tax-certificate (VQ-E4) all depend on data that lives *after* the invoice-processing handoff. If those reads aren't available for a client, those answers can't be enabled there — posting-time data alone can't answer "where's my payment?"

**Also in Phase 0 (validation, not gating):** pull the customer's question history (e.g. Zalora's support desk), confirm the §6 volume mix, and set the metric targets that §4 leaves as TBD.

**Volume & sizing — to be set after Zalora benchmarking.** This PRD does **not** yet state expected query volume (queries/day, peak load, % auto-answerable), human-handoff queue load, or an eng effort/timeline estimate. These will be **updated once we check with Zalora and complete Phase 0 benchmarking** against their real support-desk history — they're deliberately left open rather than guessed, because they drive both the performance NFRs (§11) and the staffing/effort sizing.

</aside>

- **Phase 0 — Baseline & feasibility gate.** Run the two go/no-go tests above, confirm the §6 volume mix against real data, and set the §4 metric targets. Output: a clear go / no-go / change-scope decision.
- **Phase 1 — Identity gate + core answers.** The identity-and-authorization gate first, then auto-answers for status, breakdown, and documents; entity/currency; recording. Bank-detail requests captured & routed. Measure containment, speed, accuracy.
- **Phase 1.5 — APAC tax & reconciliation** (as data allows). Tax certificates, tax-rate explanations, statement reconciliation.
- **Phase 2 — Reduce questions at source.** Richer proactive payment-status messaging (building on the invoice-processing notification) + cross-team handoff workflows.

## 14.2 CS / implementation checklist

| Step | What it involves |
| --- | --- |
| Vendor-master sync & hygiene | Connect and validate contact data per entity (gates the identity check) |
| Channel wiring | Email/Freshdesk intake + status sync, reusing the Zalora pattern |
| Configuration | Enabled question types, thresholds, languages, SLAs, auth rules |
| Baseline & targets | Set containment/accuracy baseline from Phase 0 data |
| Hypercare | First 90 days: monitor accuracy + escalations daily → weekly; tune thresholds |

## 14.3 What CS monitors

Containment trend, auto-answer accuracy, escalation volume & reasons, SLA breaches, and driver analysis (which upstream problems to feed back to the P2P / procurement roadmap).

---

# 15. Go-to-market notes (sales & marketing)

## 15.1 Positioning

**For** AP teams drowning in "where's my payment?" emails, **Vendor Query Automation** contains the high-volume majority automatically and safely, and hands humans only the questions that truly need them — **grounded in the same Neoflo data that already processes the invoices.**

## 15.2 Differentiators

- **Grounded, not generic.** Answers come from live invoice status, payment data, and tax amounts already on the platform — not a bolted-on chatbot.
- **Safe by design.** Identity gate on every answer; bank changes never auto-applied; full audit trail.
- **Built for APAC complexity.** Multi-entity, multi-currency, multi-language; withholding-tax deductions surfaced in payment breakdowns, with tax-certificate automation on the roadmap (v1) — not treated as an afterthought.
- **Measurable value.** Containment rate is the headline number customers can watch move.

## 15.3 Ideal customer profile

Mid-to-large AP operations with high vendor-query volume, multiple legal entities/currencies, and an existing Neoflo P2P footprint (or intent to adopt one). Zalora is the design-partner archetype.

## 15.4 Objection handling

| Objection | Response |
| --- | --- |
| "Won't it send wrong answers?" | It answers only when confident and authorised; everything else goes to a human with context. Accuracy is held to a high, QA-tracked bar (target set from the Phase 0 baseline). |
| "What about fraud / bank changes?" | Bank changes are captured and verified by a human — never auto-applied. Every answer passes an identity check. |
| "Our vendors won't use a portal." | They don't have to — it works over the email they already use. |
| "We have multiple entities and currencies." | Entity/currency resolution is a built-in prerequisite, not an add-on. |

## 15.5 Key product decisions (the "why this way")

- **Email first, not a portal** — 60%+ of supplier-portal rollouts fail to get used; meet vendors where they are. ([Sotro](https://sotro.io/blog/supplier-portals-are-dead))
- **Identity gate is the v0 anchor** — the disclosure/impersonation path is the highest-severity risk; close it first.
- **Bank changes never auto-applied** — captured and handed to a person; the identity gate carries the fraud defence.
- **Route disputes to people** — disputes are a symptom of an upstream issue; automating the judgment papers over it.
- **When unsure, hand to a human** — a confidently wrong payment date is worse than a slightly slower human answer.
- **Entity/currency correctness is a v0 requirement** — for customers like Zalora, correctness depends on it.
- **Measure from day one** — no baseline exists today; without it we can't prove the product worked.

---

# 16. Glossary

- **Accounts payable (AP)** — the team that pays a company's suppliers.
- **Vendor / supplier** — a business the company buys from and owes money to.
- **Invoice / PO / GRN / SES** — the bill; the official order; the goods-receipt note; the service-entry sheet.
- **Payment terms** — the agreed timing of payment (e.g. net 30), held as a **code** (`ZTERM`) on the vendor's BP/vendor master; combined with the baseline date to derive the due date.
- **Posting date vs invoice date** — posting date is when the invoice is booked in SAP (the usual, most-reliable baseline for due-date calc); invoice date is the date on the vendor's document (less trusted).
- **Payment run** — SAP's batched payment process (e.g. `F110`) that selects due, non-blocked open items and generates payments; scheduled or manual, per client.
- **Open item** — an unpaid, un-cleared invoice sitting as a payable until payment clears it.
- **Payment block** — a flag (vendor- or invoice-level) that stops an item being paid until released.
- **Clearing / EBS** — clearing marks an open item as paid once the bank confirms; the electronic bank statement (EBS) is imported to do this, automated or manual.
- **Payment document** — SAP's internal record of a payment (distinct from the posting/accounting document, which records the *invoice* being booked).
- **Payment breakdown (remittance advice)** — the payer-to-vendor note explaining a payment (invoices covered, amounts, deductions); **originates in SAP's payment run**, not the bank.
- **Bank documents** — the *outbound* payment instruction file we send (e.g. `pain.001` / CSV) and the *inbound* bank statement / status report the bank returns (e.g. `MT940`, `CAMT.053`, `pain.002`).
- **Containment rate** — share of questions resolved without a human; our north-star metric.
- **Identity & authorization gate** — the check that the asker is a known, authorised vendor contact before anything is revealed.
- **Out-of-band verification** — confirming via a separate, independent channel (e.g. a known phone number), not the original message.
- **Withholding tax (WHT / TDS)** — tax the buyer holds back and remits on the vendor's behalf; the vendor needs a certificate to claim it.
- **Business email compromise (BEC)** — fraud where a criminal impersonates a supplier by email, often to redirect payment.
- **STP** — straight-through processing (auto-approve/post), a P2P capability; referenced here for contrast only.

---

# 17. Sources

[VendorInfo — tips](https://vendorinfo.com/tips-best-ap-vendor-service/) · [VendorInfo — calls](https://vendorinfo.com/a-wake-up-call-on-supplier-calls/) · [MineralTree — State of AP](https://www.mineraltree.com/blog/blog-how-to-respond-to-vendor-inquiries/) · [MineralTree — AP KPIs](https://www.mineraltree.com/blog/three-kpis-every-team-should-measure/) · [InvoiceInfo](https://invoiceinfo.com/2017/10/cost-to-communicate-with-vendors/) · [HighRadius](https://www.highradius.com/resources/Blog/ap-cost-per-invoice/) · [CTMfile](https://ctmfile.com/story/eliminating-invoice-exceptions-is-one-of-the-most-effective-ways-for-accoun) · [CostBits / MHC](https://costbits.com/costbits-insights/uncovering-irregularities-in-accounts-payable) · [Gallup / UC Irvine](https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx) · [Zenwork](https://www.zenwork.com/payments/blog/types-of-accounts-payable-fraud-to-watch-in-2025/) · [AFP / Truist](https://www.financialprofessionals.org/training-resources/resources/articles/Details/what-treasury-professionals-need-to-know-about-business-email-compromise-in-2025) · [Hoxhunt](https://hoxhunt.com/blog/business-email-compromise-statistics) · [Sotro](https://sotro.io/blog/supplier-portals-are-dead)

**Related internal PRDs:** [P2P MVP — Invoice Processing](https://app.notion.com/p/2fd1bfb492548070a2edecb6a460ccae) · [Zalora Phase 1 PRD](https://app.notion.com/p/3191bfb4925480df90bedcac8dfe5cab)

<aside>
📌

*Industry numbers are directional benchmarks. The highest-value next step is Phase 0: replace them with a real customer's question data (e.g. Zalora's) to lock the volume mix, the v0 priorities, and the metric targets.*

</aside>