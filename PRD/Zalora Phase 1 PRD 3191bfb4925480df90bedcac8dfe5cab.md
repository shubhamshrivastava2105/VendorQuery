# Zalora Phase 1 PRD

<aside>
🧾

**Zalora Phase 1 PRD — Non-Trade Invoice Processing Automation**

This PRD defines the scope, workflows, and functional requirements for Phase 1 of Neoflo's non-trade invoice processing automation for Zalora. It is the single source of truth for what we are building, how it works, and what is out of scope.

</aside>

| **Owner** | **Status** | **Last updated** | **Classification** |
| --- | --- | --- | --- |
| @Shubham Shrivastava | Completed | March 9, 2026 | Confidential |

---

## Related documents

- **Figma Designs** — Visual mockups of the user interface are linked herere
- **User Flow** — Step-by-step user journey documentation is linked [here](https://www.figma.com/board/UMlTy1wSqujRTGNogMpgD8/Zalora---External?node-id=0-1&t=CHVDITTjG6P15wsd-1)
- **Decision Tree** — linked [here](https://miro.com/app/board/uXjVG6IqElk=/)
- **Technical Requirements Document** — Detailed engineering specifications is linked [here](https://docs.google.com/document/d/1g1ZzlpyvoJNcIEBLpHb3fMP_8emx-4nwI0SVKQ0JVMo/edit?usp=sharing)

---

## Executive summary

Zalora's AP team processes ~4,500 non-trade invoices per month across five legal entities. The current manual workflow averages ~6 minutes per invoice through Freshdesk and SAP. Phase 1 automates this end-to-end: Freshdesk → Neoflo → SAP.

- 🎯 **What we're building:** End-to-end automation for non-trade PO invoice processing across SG, MY, HK, ID, and PH.
- ✅ **Scope:** PO series 51, 52, 53, 54. All five entities. PDF and image invoices in English, Mandarin, Bahasa, and Filipino.
- 📈 **Success targets:** To be confirmed post internal testing. 4,000+ invoices/month through the platform. ≥95% system uptime.
- 🚫 **Not in Phase 1:** No STP, no non-PO invoices, no trade invoices, no new ERP or ticketing systems.

---

## 1. Authentication — Login & Sign-up

### 1.1 Overview

Access to the Neoflo platform is restricted to whitelisted users only. Before a user can sign in or sign up, their email address must be manually added to the tenant's whitelist by the Neoflo team. This is a B2B-first approach — tenant provisioning and self-serve onboarding are deferred to a future enhancement.

### 1.2 Authentication method

Google SSO is the only supported authentication method for Phase 1. There is no username/password login.

### 1.3 User journey

The user lands on the Neoflo login screen and clicks **Continue with Google**. Google handles identity verification and returns the authenticated email to Neoflo. Neoflo then checks the email against the whitelist:

- **Email is whitelisted, first visit** — account is created, user is signed in, and lands on the invoice dashboard. (Sign-up)
- **Email is whitelisted, returning user** — user is signed in and lands on the invoice dashboard. (Sign-in)
- **Email is not whitelisted** — user sees an error and cannot proceed.

There is no separate sign-up screen. The distinction between sign-up and sign-in is handled silently based on whether the email exists in the system.

### 1.4 Whitelisting process

Whitelisting is a manual operation performed by the Neoflo team. The client (e.g., Zalora) shares the list of email addresses that require access. Neoflo adds them to the tenant before the user attempts to log in.

Access permissions are uniform in Phase 1 — all whitelisted users have access to all actions. Role-based access control (RBAC) is deferred to a future enhancement.

### 1.5 Session

Sessions remain active for 30 days. After 30 days, the user is required to re-authenticate via Google SSO. Additional session management rules (device limits, force logout, etc.) are deferred to a future enhancement.

### 1.6 Error state

| Scenario | Error message |
| --- | --- |
| Email not whitelisted (sign-in or sign-up attempt) | "Your email address is not authorized to access this platform. Please contact your administrator or reach out to Neoflo support to request access." |

### 1.7 Out of scope (Phase 1)

- Microsoft SSO or any other identity provider
- Self-serve tenant creation on sign-up
- Role-based access control and permission management
- Password-based authentication
- Multi-factor authentication (MFA)
- Device management or concurrent session limits

---

## 2. Overview

### 1.1 Current state

| **Metric** | **Current state** |
| --- | --- |
| Total non-trade invoices per month | ~4,500 |
| Average processing time per invoice | ~6 minutes |

### 1.2 Invoice type distribution

| **PO series** | **Type** | **Monthly volume** |
| --- | --- | --- |
| 51 / 53 | Standard PO (3-way match) | 1,850 |
| 52 | Blanket PO with SES | 1,900 |
| 54 | Blanket PO without SES | 750 |
| **Total** |  | **4,500** |

### 1.3 Scope

#### In scope

**Invoice types**

- Non-trade invoices only, with manual tax code mapping
- All PO-based invoices: series 51, 52, 53, 54
- 1–10 pages per invoice (average 2–3 pages)
- Supported languages: English, Mandarin, Bahasa, Filipino
- Supported formats: PDF, images

**Entities**

- Singapore (SG), Malaysia (MY), Hong Kong (HK), Indonesia (ID) (with Faktur Pajak), Philippines (PH)

**Workflows**

- 3-way match with GR line items — PO series 51/53
- 3-way match with Service Entry Sheet — PO series 52
- 2-way match — PO series 54

**Platform features**

- Freshdesk integration for ticket-based invoice ingestion
- AI-powered invoice data extraction, including PO identification from invoice and ticket content
- Vendor validation against the PO
- Duplicate invoice detection
- PO, GRN, and SES retrieval from SAP
- Intelligent matching with a user review interface
- Manual tax code assignment
- Maker-checker workflow: AI as maker, human as checker (single role for Phase 1)
- SAP integration for document posting

**First 90 days**

- All invoices require manual review — no auto-approval until confidence benchmarks are met
- SAP posting is user-initiated via the "Post to ERP" action

#### Out of scope

*The following items are excluded from Phase 1. Any work on excluded items requires a separate Change Request and commercial agreement.*

**Excluded countries**

| **Country** | **Reason** |
| --- | --- |
| China | Outsourced to a third-party provider |
| Taiwan | Business operations winding down |
| Vietnam | Confirmed out of scope by Zalora |
| ICONIC(Australia) | To be part of Phase 2, with alignment already established on approach and expectations. |

**Invoice types and processes deferred to future phases**

| **Item** | **Target phase** |
| --- | --- |
| Trade invoices, 45 series (3-way match) | Phase 2 |
| Trade PPD invoices, 45 series (2-way match) | Phase 2 |
| Non-PO invoices (park → attach → complete → approval) | Phase 2 |
| Freight invoices (SCM validations, many-to-many mapping) | Phase 3 |
| Country-specific tax coding (VAT and WHT) | Phase 3 |
| Indonesia VAT and Faktur Pajak compliance | Phase 3 |
| UID reconciliation (MY ↔ ID) | Phase 3 |
| Marketplace reconciliation (seller payout pipeline) | Phase 2 |
| Supplier self-service portal | Phase 3 |
| Intercompany invoices (MY ↔ SG custom SAP program) | Phase 3 |
| Order-to-Cash (billing, collections) | Future |

**System and integration exclusions**

- Any ERP system other than SAP
- Any ticketing system other than Freshdesk
- Direct bank integrations or payment processing
- Treasury management systems
- Vendor master data management or onboarding
- Custom SAP programs (e.g., intercompany MY ↔ SG)
- Data warehouse and Seller Central integrations

**Functional exclusions**

- Straight-through processing (STP) without human review
- Automated payment execution
- Credit note processing (<1% of current volume)
- Debit note processing
- GR creation, SES creation, or PO creation/modification
- Vendor communication or dispute resolution
- Historical data migration or backlog processing
- Custom report development or mobile application
- Manual upload of invoices (ingestion is strictly via Freshdesk webhook)

**Automation capabilities (available but disabled in Phase 1)**

- **STP:** Auto-approve and auto-post to ERP is available in the platform but will remain disabled for Zalora. Enablement may be considered after the 90-day stabilization period.
- **Vendor email notifications:** Post-processing email to vendors.

**Advanced features (deferred)**

- Multi-level approval workflows
- Auto-selection of VAT and WHT codes
- Advanced analytics dashboards (operational logs will be captured for future use)

**Reporting and insights**

- Reporting and analytics dashboards are a Phase 2 deliverable. All operational data will be logged from day one, ensuring Phase 2 dashboards are built on complete, clean data.

### 1.4 Success criteria

| **Metric** | **Target** | **Measurement method** |
| --- | --- | --- |
| Average processing time per invoice | To be updated by Neoflo after internal testing of the whole workflow | Median time from user clicking "Review" to successful ERP posting. Median is used to account for outliers. |
| System uptime (business hours) | ≥95% | Platform monitoring |
| Monthly invoice coverage | ~4,000+ of 4,500 invoices processed through the platform | Platform logs |

**Processing time — measurement logic**

The clock starts when the user clicks the **Review** button on an invoice and stops when the **ERP posting is confirmed** in SAP. Median processing time across all invoices in a given month is used as the reporting metric. Median is intentionally chosen over average to reduce the impact of outliers (e.g., invoices with complex exceptions or extended hold periods).

---

## 2. User journeys

### 2.1 Happy path: Successful match

Email received → Freshdesk ticket created → Agent sets status to "Ready for Neoflo" → Neoflo processes the invoice → User reviews and approves → User **posts to ERP** → Freshdesk ticket updated automatically

### 2.2 Exception path: Mismatch detected

Neoflo processes the invoice → Freshdesk ticket stays "Neoflo - Processing" until all tasks complete → Freshdesk ticket updated to "Neoflo - On Hold" (task requires attention) → User edits fields where AI confidence is low → User approves → User posts to SAP → Freshdesk ticket updated to "Neoflo - Posted"

### 2.3 Exception path: Vendor mismatch

Neoflo processes the invoice → Freshdesk ticket stays "Neoflo - Processing" until all tasks complete → Freshdesk ticket updated to "Neoflo - On Hold" (vendor task requires attention) → User reviews invoice on Neoflo → User approves (if vendor is valid) → User posts to SAP → Freshdesk ticket updated to "Neoflo - Posted"; or user rejects with a note → Freshdesk ticket updated to "Neoflo - Rejected"

> **Note:** Until the invoice is approved or rejected, the user can navigate back to any prior stage to make corrections. Mandatory fields require navigating back to the Extraction stage; optional fields can be edited at the current stage.
> 

---

## 3. Functional requirements

### 3.1 Platform design principle

The platform is configuration-driven. All business rules — tolerance thresholds, matching logic, field mappings — are configurable per workflow without code changes.

### 3.2 Invoice processing workflow

- Stage 1: Ingestion
    
    **Ticket creation and assignment**
    
    Tickets are auto-created when an email arrives at one of three shared non-trade group email addresses. Assignment is manual: a senior team member (currently Theresa or a designated senior) assigns the ticket to the relevant agent via the Freshdesk agent dropdown. Agents may also self-assign.
    
    Freshdesk is a general ticketing system, not a structured invoice submission portal. Tickets may include SOA requests, payment inquiries, audit documents, and delivery order requests in addition to invoices. Agents determine ticket purpose by reviewing the email thread and manually updating the transaction type or category.
    
    **Triggering Neoflo**
    
    Invoice ingestion starts via a Freshdesk webhook, triggered when an agent manually changes the ticket status to "Ready for Neoflo."
    
    When a single Freshdesk ticket contains multiple invoices, Neoflo generates a separate entry for each attachment. Each invoice appears as an individual line item on the Neoflo dashboard and is processed independently.
    
    When a ticket contains multiple invoices, the ticket status reflects the combined state of all invoices using the following priority:
    
    | **Condition** | **Freshdesk ticket status** |
    | --- | --- |
    | Invoice downloaded from Freshdesk, processing started | Neoflo - Processing |
    | Invoice being extracted, validated, or matched | Neoflo - Processing |
    | Invoice is on hold (mismatch, low confidence, or blocked) | Neoflo - On Hold |
    | All invoices on a ticket are on hold | Neoflo - On Hold |
    | Some invoices on a ticket are on hold, others are processing or done | Neoflo - Partially On Hold |
    | Some invoices on a ticket are still processing, others are done | Neoflo - Partially Processing |
    | Some invoices on a ticket are rejected, duplicates, or PO fully utilized | Neoflo - Partially Rejected |
    | Invoice approved, awaiting posting to SAP | Neoflo - Approved |
    | All invoices on a ticket approved, awaiting posting to SAP | Neoflo - Approved |
    | Invoice successfully posted to SAP | Neoflo - Posted |
    | All invoices on a ticket successfully posted to SAP | Neoflo - Posted |
    | Invoice rejected (by user or system) | Neoflo - Rejected |
    | All invoices on a ticket rejected | Neoflo - Rejected |
    | Posting to SAP failed | Neoflo - On Hold |
    
    The platform downloads invoice documents (PDF, image, and similar formats) from the Freshdesk ticket and stores them securely. The original document is attached to the SAP accounting entry upon posting.
    
    The Neoflo dashboard includes a Freshdesk ticket reference column for full traceability between invoices and source tickets.
    
    **Note: How the AP agent works across Freshdesk and Neoflo:** The AP agent's primary workspace is Freshdesk. Their job is to process as many tickets as possible — they triage emails, determine invoice intent, and set the status to "Ready for Neoflo" for multiple tickets before switching to the Neoflo platform. Once they've moved a batch of invoices to Neoflo, they open the Neoflo dashboard to review and action them. They don't need to monitor Neoflo in real time — the Freshdesk ticket status updates automatically as Neoflo processes each invoice, so the agent knows when something needs their attention.
    
    **Processing time context:** Extraction may take 1–2 minutes. Once extraction is complete, the remaining steps (validation, matching) are deterministic and near-instant.
    
    **In practice:** The expected pattern is: batch-move tickets in Freshdesk → switch to Neoflo → review and approve/reject processed invoices. The agent comes to Neoflo only when action is required — not continuously.
    
- Stage 2: Extraction
    
    The AI engine extracts invoice fields based on workflow-specific configuration. Each field receives a confidence score (0–100%), displayed with the following indicators:
    
    - Above configured threshold: Auto-confirmed, no user action required
    - Below threshold (shown in red): Mandatory user verification
    
    **Extraction auto-skip (tenant configurable):** If all mandatory extraction fields meet the configured confidence thresholds, the extraction stage is auto-confirmed and the user lands directly on the Summary Screen without manual review. This is tenant configurable.
    
    **Zalora — first 90 days:** Extraction review is mandatory for Zalora regardless of confidence scores during the first 90-day stabilisation period, to build trust in the system before enabling auto-skip.
    
- Stage 3: Summary Screen
    
    After extraction is confirmed, the user lands on the **Summary Screen** — the central hub between extraction and ERP posting. It shows 4 tasks, each running and updating in real time.
    
    **The 4 tasks**
    
    | Task | What it validates |
    | --- | --- |
    | **Duplicate Detection** | Checks if the invoice number + vendor + legal entity combination already exists in the system. Runs first — if a duplicate is found, all other tasks are skipped. |
    | **Vendor Validation** | Validates vendor name against the PO using fuzzy matching with string normalization — checks that the vendor on the invoice matches the vendor on the PO |
    | **Metadata Validation** | Header/billing fields — supplier details, total amount, currency, company entity, GRN numbers etc. — compared against PO and GRN |
    | **Line Item Validation** | Line-by-line quantity, unit price, and amount matching against PO and GRN/SES, covering series 51/53 (3-way), 52 (SES), and 54 (2-way) |
    
    **Task statuses**
    
    Each task shows one of 3 states:
    
    - **In Progress** — system is still processing; task is locked and details cannot be viewed or interacted with
    - **Action Required** — processing complete; user needs to resolve an issue before proceeding
    - **Done ✅** — processing complete; no issues found
    
    **Execution order and parallel behaviour**
    
    Duplicate Detection runs first. If a duplicate is detected:
    
    - All other tasks (Vendor Validation, Metadata Validation, Line Item Validation) are skipped entirely
    - The summary screen shows the duplicate details and the original SAP document reference
    - The only available action is to reject the invoice. There is no option to proceed.
    
    If no duplicate is found, the remaining 3 tasks start in parallel immediately. Processing times vary:
    
    - Vendor Validation — near-instant (deterministic)
    - Metadata Validation — near-instant (deterministic)
    - Line Item Validation — seconds to a few minutes depending on PO/GRN/SES complexity
    
    The summary screen updates in real time as each task completes independently.
    
    **Freshdesk ticket status update**
    
    The Freshdesk ticket status is updated only after all tasks have completed — i.e., all running tasks have reached either Done ✅ or Action Required. The ticket remains at "Neoflo - Processing" while any task is still In Progress.
    
    - All tasks Done ✅ → Neoflo - Approved (after user approves)
    - Any task Action Required → Neoflo - On Hold
    - User rejects → Neoflo - Rejected
    
    **Accessing task details**
    
    - While In Progress: task is locked — user cannot view details or take any action
    - Once Action Required or Done: user can click into the task to view full details. Done tasks remain accessible — the user can browse them and edit optional fields within them at any time before the invoice is approved or rejected.
    
    **Sub-task: Vendor Validation detail**
    
    Vendor lookup runs against the PO using the associated vendor name. Fuzzy matching is applied to compare the vendor name on the invoice against the vendor name on the PO — if the mismatch exceeds the configured tolerance threshold, the task shows Action Required. String normalization (e.g., "Pvt" = "Private") is configured in workflow settings. If the user updates the PO number at the extraction stage, vendor validation re-triggers automatically.
    
    **Sub-task: Metadata Validation detail**
    
    Compares extracted header/billing fields against the PO and GRN. Mandatory field mismatches show Action Required and require the user to navigate back to Extraction to fix. Optional field mismatches are editable directly within the task screen.
    
    **Sub-task: Line Item Validation detail**
    
    Line item matching logic follows the PO series:
    
    - **Series 51/53 (Standard PO — 3-way match):** Invoice matched against PO + GRN line items. GR is always mandatory — if unavailable, task shows Action Required with a hard block. Invoice amount can be less than GR (AP adjusts, SAP auto-reverses variance); invoice exceeding GR is blocked until GR is updated. Rounding tolerance: ~SGD 5 total, SGD 1 per line item (in local currency per entity).
    - **Series 52 (Blanket PO with SES — 3-way match):** Invoice matched against SES total. SES number can be entered manually or sourced from the ticket/email. Partial SES permitted. Mismatch beyond tolerance is a hard block.
    - **Series 54 (Blanket PO without SES — 2-way match):** Invoice total must not exceed remaining PO balance. Currency must match PO currency. If balance is insufficient, user must add a new PO.
    
    Matching logic supports one-to-many and many-to-one line items. Tax (VAT and WHT) codes are assigned manually by the user during line item review.
    
    **Fixing issues within a task**
    
    When the user navigates into a task and resolves an issue, the task automatically re-runs on return to the summary screen. No manual trigger needed. Status updates accordingly.
    
    **Field editability rules**
    
    - Optional fields — editable directly within the task screen at any time before the invoice is approved or rejected
    - Mandatory fields — only editable by navigating back to the Extraction stage. This re-runs all tasks from scratch.
    - The user can navigate back to Extraction at any point unless the invoice is already Approved or Rejected.
    
    **Approve condition**
    
    The Approve button is enabled only when all 4 tasks show Done ✅. On Approve, the invoice moves to the ERP Posting stage.
    
    **Reject**
    
    The user can reject the invoice directly from the summary screen at any time — including while tasks are still In Progress. A rejection reason is mandatory. On rejection, all In Progress tasks stop immediately and the Freshdesk ticket is updated to Neoflo - Rejected.
    
    **STP behaviour**
    
    When STP is enabled and all 4 tasks pass without issues, the summary screen is bypassed entirely — the invoice goes directly to ERP posting. STP is disabled for Zalora in Phase 1.
    
    **Edge cases**
    
    | Scenario | Behaviour |
    | --- | --- |
    | Duplicate detected | All other tasks skipped; only rejection available |
    | All tasks In Progress | Summary screen visible but all tasks locked — user can only wait or reject |
    | One task Action Required, others Done | Done tasks still accessible for optional field edits |
    | User navigates back to Extraction | All 4 tasks reset to In Progress and re-run from scratch |
    | User edits optional field within a task | Task auto re-runs; status updates on summary screen |
    | User rejects while tasks In Progress | Invoice rejected immediately; all tasks stop; Freshdesk updated to Neoflo - Rejected |
    | All tasks Done | Approve button enabled; user can still browse tasks or edit optional fields before approving |
    | Invoice Approved or Posted | Summary screen fully read-only; no back-navigation possible |
    | Any task still In Progress | Freshdesk ticket not updated until all tasks complete |
- Stage 4: PO / GRN / SES retrieval (runs during Extraction)
    
    The platform extracts the PO number directly from the email or invoice (~30% of invoices). If not on either, it searches the Freshdesk ticket. If still unavailable, the user enters it manually.
    
    PO assignment logic:
    
    1. If the PO number is on the invoice, auto-assign regardless of how many invoices are on the ticket.
    2. If a ticket has one PO and one invoice, auto-assign.
    3. If the ticket clearly maps a PO to each invoice, assign accordingly.
    4. If the system cannot determine the mapping, surface it for user input. 
    
    Note: If the PO number is not found on the invoice or ticket, the field is left blank at the extraction stage. The user must enter the PO number manually before proceeding — this is a hard block. The invoice cannot move forward until the PO number is provided or the user rejects it.
    
    **Note:** When a Freshdesk ticket has multiple invoices with PO numbers, users manually map each PO to the corresponding invoice.
    
    A single invoice may reference multiple POs.
    
    Users can also enter one or more SES numbers directly. This allows the platform to match the invoice against the specified SES without retrieving all SES records for a given PO.
    
    The platform identifies the PO series from the first two digits of the PO number and retrieves data from SAP accordingly:
    
    | **PO series** | **Type** | **Data retrieved from SAP** | **Matching approach** |
    | --- | --- | --- | --- |
    | 51, 53 | Standard PO | PO + GRN (line items) | 3-way, amount-level |
    | 52 | Blanket PO with SES | PO + SES (total amount) | 3-way, amount-level |
    | 54 | Blanket PO without SES | PO only | 2-way, amount-level |
    
    Matching logic supports one-to-many and many-to-one line items.
    
    **Hard blocks at this stage**
    
    - GRN unavailable (series 51/53): Processing cannot proceed until goods receipt is completed in SAP.
    - SES unavailable (series 52): Processing cannot proceed until the Service Entry Sheet is available in SAP.
    - Missing invoice attachment in Freshdesk: Requester must attach a PDF or image invoice.
    - Missing Faktur Pajak (Indonesia, where required): Requester or vendor must provide the Faktur Pajak number.
- Stage 5: Matching — detailed rules (reference for Stage 3 Line Item Validation)
    
    #### Series 51/53: 3-way match (PO + GR + invoice)
    
    Series 51 is the highest-volume PO type across all Zalora entities for non-trade purchases. Series 53 follows identical logic and is used for certain asset-related purchases.
    
    **GR is always mandatory.** If no GR exists in SAP for the referenced PO, the invoice is held until the GR is created.
    
    **GR behavior — key complexity**
    
    The GR is always generated based on the full PO line item amount. Requesters cannot modify the GR to reflect the actual invoice amount.
    
    Example:
    
    | **Document** | **Amount** |
    | --- | --- |
    | PO / GR amount | SGD 632 |
    | Actual invoice amount | SGD 579 |
    | Variance | SGD 53 |
    
    **How Neoflo handles this in SAP**
    
    1. AP opens the invoice posting screen and enters header details.
    2. AP enters the PO number; SAP retrieves the GR and populates line items.
    3. SAP auto-populates the GR amount (e.g., SGD 632).
    4. AP compares with the invoice amount (e.g., SGD 579).
    5. AP overwrites the line item amount to match the invoice.
    6. SAP auto-calculates and posts a reversal entry for the variance.
    7. AP simulates the document before posting.
    8. AP posts the invoice; SAP generates the FI + 63-series document.
    9. AP attaches the invoice PDF to the SAP document.
    10. AP updates the Freshdesk ticket with the SAP document reference and resolves it.
    
    **Supplementary invoices:** Subsequent charges are posted as a **Subsequent Debit** (posting type differs; matching logic is the same).
    
    **Partial invoices:** Allowed when the GR amount is equal to or greater than the invoice amount. If the invoice exceeds the GR, processing is blocked until the GR is updated.
    
    **Multiple POs:** A single invoice can reference multiple PO numbers. AP enters both POs; SAP processes against the combined balance.
    
    **Tolerance and rounding**
    
    - Rounding tolerance: ~SGD 5 for total amount differences (directionally agreed, not yet formalized) and SGD 1 for line item differences
    - SAP system tolerance: SGD 200 exists but is not business-approved for non-trade
    - The SGD 5 tolerance must be configured in local currency per legal entity
    
    **Configuration summary for series 51/53**
    
    | **Rule** | **Detail** |
    | --- | --- |
    | Matching type | 3-way: PO + GR + invoice |
    | GR mandatory | Yes — invoice cannot proceed without a GR in SAP |
    | GR amount | Always follows PO amount, not invoice amount |
    | Invoice < GR | Allowed — AP adjusts line item; SAP auto-reverses variance |
    | Invoice > GR | Blocked — GR must be updated by requester first |
    | Partial invoices | Allowed against partial GR |
    | Supplementary invoices | Posted as "Subsequent Debit" |
    | Multiple POs | Supported — invoice can reference 2+ POs |
    | Rounding tolerance | ~SGD 5 (in local currency per entity) |
    | Purchasing/variance tolerance | Not accepted for non-trade — SAP flags, human reviews |
    
    #### Series 52: 3-way match with SES
    
    Users enter either a PO number or an SES number. If an SES number is entered, the platform matches the invoice directly against that SES.
    
    - SES number can be sourced from the Freshdesk ticket, email content, or invoice
    - Users can enter multiple PO or SES numbers
    - Partial SES is permitted
    - Matching rule: Invoice total must equal SES total, within configurable tolerance (~SGD 5)
    - Mismatch: Hard block — user must re-enter SES, re-run matching, or reject
    
    **Note:** Unit price tolerance for series 51/53 is SGD 5 at the total invoice level. Line item level validation is not in scope for Phase 1 — matching is done on total amount only.
    
    #### Series 54: 2-way match (PO balance validation)
    
    Validation rules:
    
    - Invoice total must not exceed PO total
    - Current invoice amount must not exceed the remaining PO balance
    - If the balance is insufficient, the requester must add a new PO
    
    Currency requirement: Invoice currency must match PO currency.
    
    #### Tax code assignment
    
    Tax (VAT and WHT) codes are not set at the PO level for series 51/53. Tax determinations apply at the invoice line item level.
    
    Users manually assign VAT and WHT codes during invoice processing. Default settings and code reference data are maintained in a separate configuration document.
    
- Stage 6: Approve and ERP posting (previously User Review)
    
    Once all 4 tasks on the Summary Screen show Done ✅, the user clicks **Approve** to confirm and move to ERP posting.
    
    **Important:** Final accounting is based on the amount as stated on the invoice. The invoice value is not editable after the extraction stage.
    
    **Field editability rules across stages**
    
    - All fields (mandatory and optional) are editable at the Extraction stage.
    - Optional fields can also be edited directly within each task screen on the Summary Screen — at any time before the invoice is approved or rejected.
    - Mandatory fields can only be edited by navigating back to the Extraction stage — they are read-only everywhere else. This re-runs all 4 tasks from scratch.
    - Once an invoice is Approved or Rejected, no fields can be edited and back-navigation is not possible.
- Stage 7: Post to SAP
    
    We will need to check with SAP Consultant (Neoflo or Zalora) on the format of Invoice accounting entries for Invoice posting. 
    
    On user action ("Post to ERP"), Neoflo calls Zalora's custom SAP posting function with:
    
    - Invoice header data
    - Line item details (series 51/53)
    - PO/GRN references
    - GL codes and cost centers (derived from PO) - SAP Consultant to Advise on this.
    
    **On success**
    
    - SAP returns the document number (e.g., 5000123456)
    - Original PDF is attached to the SAP document
    - Freshdesk ticket is updated to "Neoflo - Posted"
    
    **On failure**
    
    - Platform shows an actionable error message
    - User may retry after resolving the issue
    - Freshdesk ticket is updated to "Neoflo - On Hold" with error details

### 3.3 Exception handling

**Guiding principle:** Surface exceptions clearly, with context and guided next steps.

| **Exception** | **Platform behavior** | **User action** | **Freshdesk status** |
| --- | --- | --- | --- |
| Vendor mismatch | Block with vendor details displayed | Contact Finance to update PO; retry | Neoflo - On Hold |
| Duplicate invoice | Auto-reject; display original invoice details and SAP document number | Verify with vendor | Neoflo - Rejected |
| PO/GRN/SES not found | Hard block; display clear identification message with details of what was not found | Verify PO/SES number on invoice and retry, or reject the invoice | Neoflo - On Hold |
| GRN unavailable (51/53) | Hard block; display GR completion status | Complete GR in SAP; retry | Neoflo - On Hold |
| SES mismatch (52) | Hard block; display invoice vs. SES amounts | Correct SES in SAP or reject invoice | Neoflo - On Hold |
| PO budget exceeded (54) | On hold; display utilization breakdown | Extend PO budget or allocate a new PO | Neoflo - On Hold |
| Amount mismatch (beyond tolerance) | On hold; variance details displayed | User can update the SES amount | Neoflo - On Hold |
| Mandatory field mismatch | Approve disabled; fields highlighted | Edit fields to resolve | Neoflo - On Hold |
| Low confidence extraction | Fields flagged (amber/red) | Verify and confirm or edit flagged fields | Neoflo - On Hold |

**Additional notes**

- Rejected invoices can be reprocessed by resetting the Freshdesk ticket status to "Ready for Neoflo."
- The system will not allow processing when the total amount tolerance exceeds a configurable SGD (or other currencies) threshold.

**Error message format:**

- What happened
- Why it happened
- What to do next
- Who to contact

### 3.4 Freshdesk integration

**Status Synchronization**

| **Neoflo status** | **Freshdesk status** | **Trigger** |
| --- | --- | --- |
| Fetched | Neoflo - Processing | Invoice downloaded successfully |
| Processing | Neoflo - Processing | Throughout extraction, validation, and matching |
| Approved | Neoflo - Approved | User approval complete; awaiting posting to SAP |
| Posted | Neoflo - Posted | Successfully posted to SAP |
| Rejected | Neoflo - Rejected | User rejection |
| Duplicate invoice | Neoflo - Rejected | Duplicate detected |
| PO fully utilized | Neoflo - On Hold | Series 54 budget exceeded |
| Posting failed | Neoflo - On Hold | SAP posting failed |

**Custom fields updated on Freshdesk tickets**

| **Field** | **Description** |
| --- | --- |
| Status | Current processing status within Neoflo |
| vendor_id | Matched vendor ID from SAP |
| sap_document_number | SAP document number on successful posting |
| processing_started_at | Timestamp when Neoflo began processing |
| approved_at | Timestamp of user approval |
| posted_at | Timestamp of SAP posting |
| rejection_reason | Reason for rejection, if applicable |

**Automated notes**

Neoflo appends structured notes to Freshdesk tickets at key milestones:

- Successful posting: SAP document number and posting details
- Rejections: Rejection reason
- Errors requiring action: Error details and resolution steps

**Invoice deep-links in private notes**

Each time an invoice status changes, Neoflo posts a private note on the corresponding Freshdesk ticket with a direct link to that invoice on the Neoflo platform. This allows the AP agent to jump straight to the invoice without having to search by Freshdesk ticket ID on the Neoflo dashboard.

When a ticket contains multiple invoices, the private note includes a separate deep-link for each invoice, clearly labeled (e.g., Invoice 1 of 3, Invoice 2 of 3), so the agent can navigate directly to any specific invoice without ambiguity.

The link is updated with every status change, so the note always reflects the current state.

### 3.5 Configurability

**Design philosophy:** Any changes to Zalora's business rules are handled through configuration, not code — keeping change management fast and non-disruptive.

**Configurable parameters**

- Field extraction checklist
- Confidence thresholds per field
- Matching rules (exact, tolerance-based, fuzzy) per field
- Tolerance values (amounts and percentages) at a field level
- Mandatory vs. optional fields
- Vendor validation fields
- SAP entry additional fields

**Configuration process**

1. Neoflo provides default and recommended settings.
2. Zalora reviews and adjusts.
3. Final settings are saved and applied in Workflow Settings.
4. Updates can be made during Phase 1 without a code deployment.

---

## 4. Open questions

*The following require input from Zalora before we finalize the implementation plan.*

- **Q:** How does SAP handle record retrieval across multiple languages?
- **Q:** Can we confirm that for every 51/53 series PO, there will always be only one invoice — and any subsequent billing should be posted as a subsequent debit?
- **Q:** Does every Freshdesk ticket have a unique ticket ID? Asking because we want to use that as the link key on the Neoflo dashboard — so invoices can be searched and filtered by ticket.
- **Q (UAT):** Can you confirm UAT participation — 2 weeks, entity by entity, with 2–3 designated users per entity? Please share participant names and their home base / office location. This will help us determine which sessions are in-person and which are remote. Participants must be available for the full 2-week UAT duration. We will share a detailed UAT plan once this is confirmed. Training prerequisites (recorded videos + documentation) will be shared before UAT begins.
- **Q (Vendor validation):** Vendor name matching runs against the PO, not the vendor master. String normalization is handled through a configurable list in workflow settings — for example, "Pvt" matching "Private." Can you share the full list of abbreviations, alternate spellings, and short forms that appear in your POs? This will help us configure the normalization rules correctly before go-live and avoid vendor mismatch false positives during UAT.
- **Q (Tax codes):** We'd like to understand more about how VAT and WHT tax codes work across each entity.
- **Q (Freshdesk ticket reading)**: A Freshdesk thread can have multiple attachments across multiple replies — revisions, corrections, back-and-forth. How do we identify which attachment is the final invoice to process?
- **Q (Vendor email notifications — multi-invoice tickets):** When a Freshdesk ticket contains multiple invoices, how should post-processing vendor email notifications work? Two options to consider:
    - **Per invoice:** Send a separate email each time an individual invoice is processed. This gives the vendor immediate visibility but may result in multiple emails for a single ticket.
    - **Per ticket (combined):** Send one consolidated email covering all invoices on the ticket. Cleaner for the vendor, but raises a timing question — if some invoices are processed while others are on hold or rejected, do we wait for all of them to reach a terminal state before sending? That wait could span several days.
    
    Please also share the email template you currently use for vendor notifications so we can map the right data fields to it.
    

---

## 5. Risks and mitigation

### 5.1 Key risks

| **Risk** | **Impact** | **Probability** | **Mitigation** |
| --- | --- | --- | --- |
| SAP integration complexity | High — delays go-live | High | Start technical discovery with Zalora IT immediately; secure SAP sandbox access; fallback to manual posting if automated posting is delayed |
| Configuration errors | Medium — incorrect processing | Medium | Thorough UAT with production-representative data; parallel processing initially; rollback capability maintained |
| Freshdesk webhook reliability | Low — minor processing delays | Medium | REST API polling as fallback; retry logic with exponential backoff; monitoring configured |
| Scope creep | High — delays and cost overruns | Medium | Phase 1 boundaries enforced by this document; formal change control process; Phase 2 backlog for deferred requests |
| AI extraction accuracy below target | Medium — increases manual corrections | Low | Test with production Zalora invoices early; refine confidence thresholds iteratively; user correction capability provides a safety net |
| User adoption resistance | High — system underutilization | Low | Engage the AP team early in design; deliver comprehensive training; demonstrate quick wins; secure leadership sponsorship |
| Performance at scale | Medium — degraded processing speed | Low | Load testing before go-live; horizontal scalability by design; monitoring and alerting in place |

### 5.2 Critical dependencies

**From Zalora**

- Responses to all open questions in Section 4
- SAP UAT environment access
- Sample invoices for testing (100+ invoices recommended)
- Default fields for extraction, matching, and ERP posting
- UAT participant availability — full 2-week commitment, with designated participant names confirmed per entity in advance

---

## 6. Timeline

<aside>
⚠️

**Timelines are pending.** Exact milestone dates will be confirmed once all open questions in Section 4 are resolved and scope is formally signed off by both teams. Neoflo will share a detailed timeline and effort breakdown with Zalora at that point.

</aside>

The milestones below are from Zalora's perspective and will be sequenced once scope is aligned.

| **Milestone** | **Description** | **Date** |
| --- | --- | --- |
| Milestone 1: PRD closure | Zalora reviews and signs off on this document. All open questions answered, scope confirmed, both teams aligned on Phase 1. | To be confirmed post open-question resolution |
| Milestone 2: Dev sign-off | Neoflo completes internal development review and shares a detailed timeline and effort breakdown with Zalora. | To be confirmed following PRD closure |
| Milestone 3: UAT kick-off | Zalora begins hands-on testing with real invoice data. 2-week UAT window. | To be confirmed following dev sign-off |
| Milestone 4: Go-live | System goes live for Zalora's AP team, with hypercare support for the first 90 days. | To be confirmed post-UAT |

---

## 7. Review cadence

To be aligned with Zalora. We'd like to discuss and confirm the right cadence for the following phases:

- **Hypercare (first 90 days post go-live):** What frequency works for your team — daily check-ins initially, moving to weekly? Who should be in the room?
- **Post-stabilization:** How often should we review operational performance and plan for the next phase?

We'll propose a structure once we hear from Zalora on availability and preferred format.

---

## 8. Next steps

**Zalora — pending scope alignment**

- Review this PRD and provide feedback
- Respond to all open questions in Section 4
- Unblock on SAP access

---

## 9. Reference materials

1. **Chart of accounts** — Legal entity names, codes, VAT and WHT tax code lists per entity: [link](https://www.google.com/url?q=https://docs.google.com/spreadsheets/d/1vsjhJHY9gO6gLiVvJaJDAM9-V64uNu0ZYJjAvMQw8zY/edit?gid%3D0%23gid%3D0&sa=D&source=docs&ust=1771413963129955&usg=AOvVaw2xm01uqaqHOpP1-8nMo31U)
2. **Invoice samples** — 10 per PO series per entity (5 happy paths + 5 exceptions). Artifacts per sample: Invoice PDF, Freshdesk ticket, PO/GR/SES data, SAP posting screenshot: [link](https://drive.google.com/drive/folders/1L9XwOxkXCz4zu0UsS7phubP6iKV31_lL)
3. **SMEs** — Finance: Theresa | Freshdesk: Alzar | SAP: Nicky

---

## 10. Sign-off

*By signing off on this document, both teams confirm that the scope, requirements, and open questions captured here are accurate and agreed upon. Any changes after sign-off require a formal Change Request.*

| **Party** | **Name** | **Role** | **Date** | **Status** |
| --- | --- | --- | --- | --- |
| Zalora | Mary Ann |  | March 13, 2026 | Pending |
| Neoflo | Kaustav | Engineering Manager | March 9, 2026 | Done |
| Neoflo | Sundip | SME | March 9, 2026 | Done |
| Neoflo | Shubham | Product Manager | March 9, 2026 | Done |
| Neoflo | Prithvi | Customer Success | March 9, 2026 | Done |