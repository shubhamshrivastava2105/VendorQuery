# P2P MVP - Invoice Processing

# 📋 P2P Workflow: Epics & User Stories

<aside>
🔗

**Design Resources** — [Designs linked](https://www.figma.com/design/phUngkYLssC4N8M3fHBTVV/P2P?node-id=0-1&t=1BzRuK6SV1ur4zbk-1) | [User flow](https://www.figma.com/board/A84sAfZ9T5rE6VFaCAiMI2/P2P-Workflow?t=yEqYCna07Nb5k16X-1)

</aside>

---

## 🎯 Overview

This document outlines the complete **P2P (Procure-to-Pay)** invoice processing workflow, from ingestion through ERP posting. The system supports both automated (STP) and manual review workflows with configurable tenant-level controls.

**Workflow Status Flow:**

```jsx
Fetched → Extracted → Extraction Confirmed → Summary Screen
  (Duplicate Detection → Vendor Validation + Metadata Validation + Line Item Validation)
→ Approved → Posted
```

**Smart Routing (User Story 1.7):** The flow above represents the full pipeline, but processing is not linear. The system evaluates each gate and routes the user to the first stage requiring intervention. If extraction confidence is high, the user skips Extraction Review. If all Summary Screen tasks pass with no issues, the user skips the Summary Screen entirely. If all ERP posting fields are derivable, the invoice is auto-posted — this is Straight Through Processing (STP).

The Summary Screen is the central hub between extraction and ERP posting. All validation, matching, and duplicate detection happens as parallel tasks within it. See User Story 1.5 for the full spec and User Story 1.7 for Smart Routing logic.

---

# 📊 EPIC 1 — Dashboard & Invoice Overview

<aside>
🎯

**Epic Goal:** Provide users with a unified dashboard to view ingested invoices and track them in real-time with status and filters.

</aside>

## User Story 1.1 — View Newly Ingested Invoices

### Display Requirements

- Display all invoices with the correct, applicable status
- Real-time status updates across the workflow

### Dashboard Columns

| Column | Description |
| --- | --- |
| File Name | Name of the uploaded/fetched file |
| Source | Email / Manual |
| Timestamp | Date and time of ingestion |
| Sender / Uploaded By | Email sender or user who uploaded |
| Vendor Name | Displays "NA" until extracted |
| Invoice Number | Displays "NA" until extracted |
| Total Amount | Displays "NA" until extracted |

### Filter Options

- **Status** (multi-select): Fetched, Extracted, Extraction Confirmed, Duplicate Detection, Vendor Validation, Metadata Validation, Line Item Validation, ERP Posting, Posted, Rejected, PO Fully Utilized
- **Date**: Custom range, Today, Last 7 days
- **Vendor Name**
- **File Name**
- **Source** (Email / Manual)
- **Sender / Uploaded By**
- **Invoice Number**
- **Total Amount** (Range)

### Sorting Options

Sort by: Vendor Name | Status | Total Amount | Timestamp

### Additional Features

**Pagination**

- Paginated view for large invoice volumes

**Refresh & Locking**

- Data refreshes on manual page refresh only
- If an invoice is being edited, prevent concurrent processing
- Lock message: *"This invoice is being processed by another user"*

---

## User Story 1.2 — Start Review

Clicking **Review** button opens the processing screen for that invoice based on current invoice status.

---

## User Story 1.3 — Fields Mapping

<aside>
🔄

**Dynamic Field Mapping** — Neoflo must support dynamic field-mapping capability that aligns internal Neoflo fields with ERP-specific fields across multiple data objects.

</aside>

### Mapping Relationships

**Invoice Mapping**

Neoflo Invoice ID fields ↔ Vendor Invoice fields

**PO Mapping**

Neoflo PO ID fields ↔ ERP Purchase Order fields

**GRN Mapping**

Neoflo GRN fields ↔ ERP Goods Receipt Note fields

These mappings should be cultivated and iteratively updated within the Neoflo platform(Under Tenant Configuration) until a comprehensive, exhaustive field-mapping library is established.

---

## User Story 1.4 — Status-Based Navigation

### Navigation Rules

The navigation flow between screens is determined entirely by the current invoice status. Figma designs outline expected screen transitions across all statuses.

### Status-Driven Flow

- **Fetched** → Navigate to *Invoice Extraction & Review*
- **Extracted** → Navigate to *Extraction Confirmation*
- **Summary Screen task statuses** (Duplicate Detection, Vendor Validation, Metadata Validation, Line Item Validation) → Navigate to *Summary Screen*
- **Approved** → Read-only view of invoice and matching details
- **Posted** → Read-only view of invoice and matching details
- **Rejected** → Read-only view of rejected invoice with confidence scores
- Standard workflow: Dashboard → Invoice Extraction & Review → Summary Screen (parallel tasks) → Approve → ERP Posting → Posted
- **Smart Routing (User Story 1.7)** applies at every stage — extraction is auto-confirmed, the Summary Screen is bypassed, or the invoice is auto-posted depending on which gates pass.

<aside>
⚠️

**Status Locking Rules**

- Cannot navigate backwards or reject invoices in **Approved** status
- Cannot change or reject invoices in **Posted** status — fully read-only
- View/Edit permissions strictly governed by current status and allowed actions
- **PO Number and all extracted fields are editable only within the Extraction Review stage.** Users can navigate back to extraction from the Summary Screen at any point before the invoice is Approved or Rejected. Re-confirming extraction re-runs all 4 Summary Screen tasks from scratch. See User Story 1.6.
</aside>

---

## User Story 1.5 — Summary Screen & Parallel Task Processing

**As a** Billing/AP team member, **I want** to land on a single summary screen after extraction that shows the status of all validation tasks in real time, **so that** I can see what needs my attention and act on it without navigating through sequential stages.

<aside>
🔗

**Relationship with Smart Routing (User Story 1.7)**

The Summary Screen is shown to the user only when at least one task requires intervention (Action Required). If all tasks complete with Done ✅, Smart Routing bypasses the Summary Screen entirely — regardless of whether STP is enabled as a tenant toggle. STP (User Story 8.2) defines the threshold configuration; Smart Routing (User Story 1.7) defines the gate logic.

</aside>

---

### Overview

After extraction is confirmed, the user lands on a **Summary Screen** — the central hub between extraction and ERP posting. It shows 4 tasks that run and update in real time.

| Task | What it validates |
| --- | --- |
| **Duplicate Detection** | Checks if the invoice number + vendor + legal entity combination already exists. Runs first — if a duplicate is found, all other tasks are skipped. |
| **Vendor Validation** | Vendor name match against PO using fuzzy matching with string normalization |
| **Metadata Validation** | Header/billing fields — supplier details, total amount, currency, company entity, GRN numbers etc. — compared against PO and GRN |
| **Line Item Validation** | Line-by-line quantity, unit price, and amount matching against PO and GRN/SES |

---

### Task Statuses

| Status | Meaning |
| --- | --- |
| **In Progress** | System is still processing — details are locked, user cannot view or interact |
| **Action Required** | Processing complete — user needs to fix something before proceeding |
| **Done ✅** | Processing complete — no issues found |

---

### Execution Order and Parallel Behaviour

Duplicate Detection runs first. If a duplicate is detected:

- All other tasks (Vendor Validation, Metadata Validation, Line Item Validation) are skipped entirely
- The summary screen shows the duplicate details and original document reference
- The only available action is to reject the invoice — there is no option to proceed

If no duplicate is found, the remaining 3 tasks start in parallel immediately. Processing times vary:

- **Vendor Validation** — near-instant (deterministic)
- **Metadata Validation** — near-instant (deterministic)
- **Line Item Validation** — seconds to a few minutes depending on PO/GRN complexity

The summary screen updates in real time as each task completes independently. A task marked Done does not wait for tasks still In Progress.

---

### Status Update After Summary Screen

The invoice status (and any connected ticket status) is updated **only after all running tasks have completed** — i.e., all tasks have reached either Done ✅ or Action Required. No update is made while any task is still In Progress.

| Outcome | Status |
| --- | --- |
| Duplicate detected | Rejected (immediately on detection) |
| Any task Action Required | Invoice held on Summary Screen — user must resolve before approving |
| All tasks Done ✅, user approves | Approved → ERP Posting → Posted |
| User rejects at any point | Rejected |

---

### Accessing Task Details

- **While In Progress** — task is locked. User cannot view details or interact. Must wait for processing to complete.
- **Once Action Required or Done** — user can click into the task to view full details. Even tasks marked Done are accessible — the user can view them and edit optional fields within them at any time before the invoice is Approved or Rejected.

---

### Fixing Issues Within a Task

When the user navigates into a task and makes a fix, the task automatically re-runs on return to the summary screen. No manual trigger needed. Status updates accordingly.

<aside>
🔒

**Field editability rules:**

- **Optional fields** — editable directly within the task screen at any time before the invoice is Approved or Rejected.
- **Mandatory fields** — only editable by navigating back to the Extraction stage. This re-runs all 4 tasks from scratch.
- The user can navigate back to Extraction at any point unless the invoice is already Approved or Rejected.
</aside>

---

### Extraction Auto-Skip (Tenant Configurable)

See **User Story 1.7 — Smart Routing, Gate 1** for the full extraction auto-skip specification. In summary: if all mandatory extraction fields meet configured confidence thresholds, the extraction stage is auto-confirmed and Smart Routing evaluates the next gate.

---

### Approve Condition

The **Approve** button is enabled only when all 4 tasks show **Done ✅**. On Approve, the invoice moves to the ERP Posting stage.

---

### Reject

The user can reject the invoice directly from the summary screen at any time — including while tasks are still In Progress. A rejection reason is mandatory. On rejection, all In Progress tasks stop immediately and the invoice status is set to Rejected.

---

### Edge Cases

| Scenario | Behaviour |
| --- | --- |
| Duplicate detected | All other tasks skipped; only rejection available |
| All tasks In Progress | Summary screen visible but all tasks locked — user can only wait or reject |
| One task Action Required, others Done | User can click into the task needing attention; Done tasks still accessible for optional edits |
| User navigates back to Extraction | All 4 tasks reset to In Progress and re-run from scratch |
| User edits optional field within a task | Task auto re-runs; status updates on summary screen |
| All tasks Done | Approve button enabled; user can still browse tasks or edit optional fields before approving |
| All tasks Done ✅, no Action Required | Summary Screen bypassed via Smart Routing (User Story 1.7, Gate 2) — user routed to ERP Posting or auto-posted if all ERP fields derivable |
| Invoice Approved or Posted | Summary screen fully read-only; no back-navigation possible |
| User rejects while tasks In Progress | Invoice rejected immediately; all tasks stop; status set to Rejected |
| Any task still In Progress | Status not updated until all tasks complete |

---

### Acceptance Criteria

1. Duplicate Detection runs first; if a duplicate is found, all other tasks are skipped and only rejection is available
2. If no duplicate, Vendor Validation, Metadata Validation, and Line Item Validation start in parallel immediately
3. Each task updates its status independently in real time on the summary screen
4. Task details are locked while In Progress — accessible only once Action Required or Done
5. Done tasks remain accessible for viewing and optional field edits
6. Mandatory field edits require back-navigation to Extraction, which re-runs all 4 tasks
7. Approve button enabled only when all 4 tasks show Done ✅
8. User can reject from the summary screen at any time, including while tasks are In Progress
9. Status updated only after all running tasks complete
10. Summary Screen bypassed when all tasks pass via Smart Routing (User Story 1.7, Gate 2)
11. Extraction auto-skip is tenant configurable

---

## User Story 1.6 — PO and Field Correction via Extraction Stage

**As a** Billing/AP team member, **I want** to navigate back to the extraction stage from any point in the workflow to correct extracted fields (including PO Number), **so that** downstream stages automatically refresh with the corrected data without me having to reject and reprocess the invoice.

---

### Decision: All Field Edits — Including PO — Only Through Extraction

Extracted fields, including PO Number, can only be edited within the **Extraction Review** stage. There is no inline edit option for any extracted field on the Summary Screen. However, the user can navigate back to extraction from the Summary Screen at any point before the invoice is Approved or Rejected.

When the user re-confirms extraction, all downstream stages that have already run are invalidated and re-executed with the updated data.

<aside>
🔒

**Field editability rules across stages:**

- **All fields** (mandatory and optional) are editable at the Extraction stage.
- **Optional fields** can also be edited within each task on the Summary Screen — up until the invoice is Approved or Rejected.
- **Mandatory fields** can only be edited by navigating back to the Extraction stage — they are read-only at all other stages. To correct a mandatory field, use the "Edit Extraction" action, which re-runs all 4 Summary Screen tasks with the updated data.
- **Once an invoice is Approved or Rejected, no fields can be edited and back-navigation is not possible — the invoice is fully locked.**
</aside>

---

### Navigating Back to Extraction

An "Edit Extraction" action is available from the Summary Screen at any point before the invoice is Approved or Rejected. Clicking it reopens the Extraction Review screen in fully editable mode — all fields, including PO Number, can be modified.

The user edits as needed and re-confirms extraction. This triggers a fresh downstream run.

---

### Downstream Refresh on Extraction Re-confirmation

When the user re-confirms extraction, the system treats it as a new extraction confirmation and re-runs all downstream stages:

<aside>
🔄

**On extraction re-confirmation:**

1. All 4 Summary Screen tasks (Duplicate Detection, Vendor Validation, Metadata Validation, Line Item Validation) are reset and re-run from scratch
2. Any in-progress tasks are cancelled immediately
3. Invoice status resets to "Extraction Confirmed" and progresses forward
4. Audit trail logs the re-confirmation event with a "Re-confirmed from extraction" marker, listing what changed
</aside>

**If PO Number was changed:**

- PO/GRN fetch re-triggers with the new PO Number
- Line item matching restarts from scratch using the new PO data
- All previous matching results are discarded

**If only non-PO fields were changed:**

- Vendor validation re-runs against the updated vendor fields
- Matching re-runs only if any matching-relevant field was modified; otherwise cached results are reused

---

### UI Requirements

**On the Summary Screen:**

- All extracted fields (including PO) displayed as read-only
- "Edit Extraction" button clearly visible — not hidden or buried
- Tooltip: *"To edit any extracted field, go back to extraction"*

**At Extraction Stage (when navigated back):**

- All fields editable, including PO Number
- Confidence scores remain visible
- "Confirm Extraction" re-triggers downstream refresh

**Progress indicator after re-confirmation:**

- *"Re-running validation and matching with updated data..."*
- Downstream results replaced once re-runs complete

---

### Stages and Edit Access

| Stage | Fields Editable Here? | Can Navigate Back to Extraction? |
| --- | --- | --- |
| Extraction Review | ✅ Yes — all fields including PO | — |
| Summary Screen (any task) | ✅ Optional fields only — editable within task screen | ✅ Yes — via "Edit Extraction" (re-runs all 4 tasks) |
| Approved | ❌ No | ❌ No — invoice locked |
| Posted | ❌ No | ❌ No — fully read-only |

---

### Acceptance Criteria

1. All extracted fields, including PO Number, are editable only within the Extraction Review stage
2. No edit affordance shown for any extracted field on the Summary Screen (all extracted fields are read-only there)
3. "Edit Extraction" navigation is available from the Summary Screen at any point before the invoice is Approved or Rejected
4. Re-confirming extraction invalidates and re-runs all downstream stages
5. If PO was changed, PO/GRN fetch and matching are re-triggered; previous results discarded
6. If only non-PO fields changed, vendor validation re-runs; matching re-runs only if matching-relevant fields changed
7. Invoice status resets to "Extraction Confirmed" on re-confirmation and progresses forward
8. All 4 Summary Screen tasks re-run from scratch on extraction re-confirmation
9. Audit trail logs the re-confirmation event with change details and timestamp
10. If the new PO is not found, show error: *"PO not found. Please verify the PO Number."* — user remains on extraction

---

## User Story 1.7 — Smart Routing (Cascading Gate Logic)

**As a** Billing/AP team member, **I want** the system to skip any stage where my involvement is not required, **so that** I only land on screens where there is something for me to act on — reducing unnecessary clicks and processing time.

---

### Core Principle

Invoice processing is not linear. The user does not step through every stage sequentially. Instead, the system evaluates each gate in the workflow and routes the user to the **first stage that requires human intervention**. If no stage requires intervention, the invoice progresses automatically.

---

### Routing Gates

The system evaluates the following gates in order after ingestion:

| Gate | Condition to Pass | If Passed | If Failed |
| --- | --- | --- | --- |
| **Gate 1: Extraction** | All mandatory extraction fields meet configured confidence thresholds | Extraction auto-confirmed; skip to Gate 2 | User lands on Extraction Review screen |
| **Gate 2: Summary Screen Tasks** (Duplicate Detection → Vendor Validation + Metadata Validation + Line Item Validation) | No duplicate detected, AND all 3 parallel tasks (Vendor, Metadata, Line Item) complete with status Done ✅ — no Action Required on any task | Summary Screen bypassed; skip to Gate 3 | User lands on Summary Screen to resolve tasks showing Action Required |
| **Gate 3: ERP Posting Fields** | All ERP-required fields (GL Code, Cost Centre, VAT Tax Code, WHT Tax Code, etc.) are derivable from invoice/PO/GRN data — no manual input needed | Invoice auto-approved and posted to ERP (Straight Through Processing) | User lands on ERP Posting screen to populate missing fields, then approves |

---

### Routing Behaviour

**All gates pass → Straight Through Processing (STP)**

The invoice moves from ingestion to ERP posting with zero human touchpoints. This is not a separate mode — STP is the natural outcome when every gate clears. The STP tenant configuration (User Story 8.2) controls the thresholds that determine whether gates pass.

**Gate 1 fails → User lands on Extraction Review**

After the user confirms extraction, Gates 2 and 3 are re-evaluated. Smart Routing applies on every forward progression — if the remaining gates pass, the user skips directly to the end.

**Gate 1 passes, Gate 2 fails → User lands on Summary Screen**

The user resolves tasks showing Action Required. Once all tasks are Done ✅, Gate 3 is evaluated. If ERP fields are complete, the invoice is approved and posted. If not, the user lands on the ERP Posting screen.

**Gates 1 and 2 pass, Gate 3 fails → User lands on ERP Posting screen**

The user populates any missing ERP-required fields (e.g., GL Code, Cost Centre) and approves. The invoice is then posted.

---

### Smart Routing on Re-confirmation

When the user navigates back to Extraction (via "Edit Extraction" — see User Story 1.6) and re-confirms, Smart Routing re-evaluates all downstream gates from scratch. If the re-confirmed data now passes Gates 2 and 3, the user is routed directly to the appropriate endpoint without stopping at intermediate screens.

---

### Key Constraints

- Smart Routing is always active — it is not a toggle. The tenant configuration controls the thresholds, not the routing behaviour itself.
- All 4 Summary Screen tasks always **run** in the background regardless of routing. Smart Routing determines whether the user **sees** the Summary Screen, not whether the tasks execute.
- Duplicate Detection is a hard block — if a duplicate is found, the user always lands on the Summary Screen with a rejection prompt, regardless of other task results.
- Line item sum mismatch at extraction is a hard block — Smart Routing cannot bypass this even if confidence thresholds are met (see User Story 3.3).

---

### Acceptance Criteria

1. User is never shown a stage where no action is required — routing skips clean stages automatically
2. If all extraction fields meet confidence thresholds, user does not see the Extraction Review screen
3. If all Summary Screen tasks complete with Done ✅ (no Action Required), user does not land on the Summary Screen
4. If all ERP-required fields are derivable without manual input, invoice is auto-approved and posted without user involvement
5. Smart Routing re-applies after extraction re-confirmation — downstream gates re-evaluated
6. Duplicate detection always surfaces to the user regardless of routing
7. Line item sum mismatch always surfaces to the user regardless of routing
8. All routing decisions are logged in the audit trail with gate pass/fail status

---

# 📥 EPIC 2 — Invoice Ingestion

<aside>
🎯

**Epic Goal:** Reliably ingest invoices via email or manual upload, validate file types, deduplicate entries, and record ingestion metadata.

</aside>

## User Story 2.1 — Email Ingestion

### Polling Configuration

- Poll configured inbox every [X] minutes (configurable)
- Support Google Workspace and Microsoft Outlook inboxes
- Retrieve only new/unread emails

### File Processing

- **Supported formats:** PDF, JPG, JPEG, PNG
- **Not supported:** CSV, Word, ZIP, encrypted PDFs
- Classify documents into invoice vs non-invoice
- One email may contain multiple invoices — each processed individually

### Validation

- Safely ignore non-invoice files
- Guarantee all valid invoices are detected and processed

### Status Update

Update status to **"Fetched"** once fetched successfully

### Processing Flow

```jsx
Fetch Mails 
    → Extraction 
    → Auto-confirm if all fields meet confidence thresholds (tenant configurable)
       OR user manually confirms
    → Summary Screen:
        Task 1: Duplicate Detection
        If no duplicate → Tasks 2-4 in parallel:
          Vendor Validation + Metadata Validation + Line Item Validation
    → All tasks Done → Approve → ERP Posting → Posted
    → Log result
    → Display on dashboard with current status
```

---

## User Story 2.2 — Manual Upload

### Upload Interface

- Drag & drop or file picker UI
- Multiple files allowed
- Support multi-file uploads (ZIP not supported — individual PDF, JPG, JPEG, PNG files only)

### Automatic Processing

- Detect unique invoices
- Ignore unsupported formats
- Ignore encrypted files

### Toast Notifications

- All success → *"Successfully uploaded X invoices."*
- Partial ignores → *"Uploaded X invoices. Ignored Y files."*
- All ignored → *"No invoices uploaded. Y files ignored."*

### File Storage

- **Supported formats:** PDF, JPG, JPEG, PNG
- Store files in object storage
- Update status to **"Fetched"** once uploaded successfully

### Processing Flow

```jsx
Manual Upload 
    → Extraction 
    → Auto-confirm if all fields meet confidence thresholds (tenant configurable)
       OR user manually confirms
    → Summary Screen:
        Task 1: Duplicate Detection
        If no duplicate → Tasks 2-4 in parallel:
          Vendor Validation + Metadata Validation + Line Item Validation
    → All tasks Done → Approve → ERP Posting → Posted
    → Log result
    → Display on dashboard with current status
```

---

## User Story 2.3 — Log Invoice Metadata

Store the following metadata for each invoice:

- **Source** (Email / Manual)
- **User** (Email sender / Uploading user)
- **Timestamp**
- **Tenant ID**

---

# 🔍 EPIC 3 — Invoice Data Extraction

<aside>
🎯

**Epic Goal:** Extract structured data from invoice documents using AI/OCR, map to tenant-configured fields, and validate vendor information.

</aside>

## User Story 3.1 — Extract Invoice Data

- Extract data from invoice using the **extraction data module**
- Extract fields based on tenant configuration
- Map raw OCR output → structured fields
- Multi-page invoice extraction supported

---

## User Story 3.2 — Map Extracted Data

### Data Mapping

- Map all extracted data to correct fields
- Empty fields for missing values
- Display confidence scores for each field

### Visual Indicators

- Color coding: High confidence / Low confidence
- User can edit any field

### User Actions

- User can confirm or reject post-extraction

### Status Updates

- **"Extracted"** — when data extraction is successful
- **"Extraction Confirmed"** — when user confirms extraction
- **"Rejected"** — when user rejects the invoice

---

## User Story 3.3 — Validate Line Item Sum

### Validation Rule

Validate: Sum(line items) = Amount Before VAT

This check runs at the **Extraction stage**, immediately as the user reviews extracted data — before they can confirm extraction and proceed to the Summary Screen.

### Mismatch Handling

- If mismatch → show an inline error on the extraction screen, clearly highlighting the discrepancy
- Error Message: *"Sum of line items (X) does not match Total Amount Before VAT (Y). Please correct the line items or the total amount before proceeding."*
- The **Confirm Extraction** button is disabled until the mismatch is resolved
- Resolution paths:
    - User corrects one or more line item amounts so the sum matches the stated total
    - User corrects the Total Amount Before VAT field to match the sum of line items
- Once the values match, the error clears and Confirm Extraction becomes available

<aside>
⚠️

**Blocking rule:** This validation is a hard block at extraction. An invoice with a line item sum mismatch cannot proceed to the Summary Screen under any circumstance — including when extraction auto-skip is enabled. If auto-skip is active and this mismatch is detected, the invoice is routed to manual extraction review to resolve the discrepancy.

</aside>

---

# ✅ EPIC 3B — Vendor Validation

<aside>
🎯

**Epic Goal:** Validate vendor information against master data to ensure invoice is from a recognized, active vendor.

</aside>

## User Story 3B.1 — Vendor Validation

### Validation Logic

- Validate vendor fields based on tenant configuration with master data
- Task shows **Action Required** if vendor not found
- Task shows **Action Required** if vendor is blocked

### Error Messages

- *"Vendor does not exist"*
- *"Vendor is blocked"*

<aside>
💡

**Note:** Vendor Validation is now a task within the Summary Screen (User Story 1.5). This epic defines the underlying validation logic that powers that task. Vendor validation runs in parallel with Metadata Validation and Line Item Validation — after Duplicate Detection completes without a match. There is no standalone "Vendor Validated" status in the platform model.

</aside>

---

---

# 🔍 EPIC 3C — Invoice Validations

<aside>
🎯

**Epic Goal:** Perform validation checks to identify duplicate invoices and PO utilization issues before processing.

</aside>

## User Story 3C.1 — Duplicate Invoice Detection

<aside>
💡

**Note:** Duplicate Detection is now Task 1 in the Summary Screen (User Story 1.5). This epic defines the underlying detection logic that powers that task. If a duplicate is found, the Summary Screen skips all other tasks and shows only the rejection option.

</aside>

### Validation Rule

Flag invoice if the same Invoice Number + Vendor + Legal Entity combination already exists in the system.

### Error Display

Shown directly on the Summary Screen with the duplicate details and original document reference.

*"Duplicate invoice detected. Invoice Number [X] from Vendor [Y] has already been processed."*

### Outcome

All other tasks skipped. Only available action is rejection. Status set to **"Rejected"**.

---

## User Story 3C.2 — PO Utilization Validation

<aside>
💡

**Note:** PO Fully Utilized is surfaced as a task-level error within the **Line Item Validation** task on the Summary Screen. It is not a pre-Summary Screen gate. The invoice reaches the Summary Screen normally; Line Item Validation detects the utilization issue and shows Action Required. The only available resolution is to reject the invoice.

</aside>

### Detection Logic

- **Fully utilized:** Sum of previously posted invoices against this PO ≥ PO total amount
- **Partially utilized:** Sum of previously posted invoices < PO total amount — not a block

### Error Display

Shown within the Line Item Validation task screen on the Summary Screen.

*"This PO has been fully utilized. PO Number [X] has already been exhausted by previous invoices."*

### Outcome

Line Item Validation shows Action Required. No further processing is possible. The only available action is to reject the invoice. Invoice status set to **Rejected**.

---

---

# 📄 EPIC 4 — PO and GRN Extraction

<aside>
🎯

**Epic Goal:** Fetch and extract Purchase Order (PO) and Goods Receipt Note (GRN) data from external systems for matching validation.

</aside>

## User Story 4.1 — Fetch PO & GRN using PO Number

### Trigger

PO/GRN fetch is triggered automatically when PO Number is confirmed:

- **Auto-confirmed:** When PO confidence ≥ configured threshold
- **Manually confirmed:** When user confirms PO in extraction stage
- **Re-triggered:** When user navigates back to extraction, changes the PO Number, and re-confirms — see User Story 1.6

### Fetch Logic

- Fetch PO + GRN from external systems using the confirmed PO Number
- Fetch happens in background immediately after PO confirmation
- If PO data is missing → *"PO not found"*
- If GRN data is missing → *"GRN not found"*

### Dependency

<aside>
🔗

**Relationship with Matching:** Line item matching cannot start until PO/GRN data is fetched. The sequence is:

1. PO confirmed → 2. PO/GRN fetch triggered → 3. Line item matching starts
</aside>

---

## User Story 4.2 — Extract PO and GRN Data

- Extract PO/GRN data and map to fields per tenant configuration
- Empty fields when data/mapping is unavailable
- PO/GRN data is made available to the Line Item Validation task on the Summary Screen once successfully retrieved

---

# ✅ EPIC 5 — Matching Engine

<aside>
🎯

**Epic Goal:** Define the 2-way and 3-way matching logic that powers the Line Item Validation task on the Summary Screen.

</aside>

<aside>
💡

**Note:** Matching is no longer a standalone sequential screen. This epic defines the underlying matching logic that runs within the **Line Item Validation** task on the Summary Screen (User Story 1.5). Mismatches on mandatory fields show Action Required and block approval; mismatches on optional fields can be acknowledged within the task screen.

</aside>

<aside>
💡

**Important:** There can be multiple invoices for the same PO, and multiple POs for the same invoice.

</aside>

## User Story 5.1 — Perform 2-Way Matching

**As a system**, I want to compare invoice fields with PO fields so mismatches are visible.

- Compare Invoice ↔ PO fields per tenant configuration
- **Match Indicators:** ✅ Matches → Green | ❌ Mismatches → Red

---

## User Story 5.2 — Perform 3-Way Matching

**As a system**, I want to compare invoice vs PO vs GRN so receipt discrepancies are visible.

- Compare Invoice ↔ PO ↔ GRN fields per tenant configuration
- **Match Indicators:** ✅ Matches → Green | ❌ Mismatches → Red

---

## User Story 5.3 — Show-Only Matching

### Matching Behavior

- Mismatches on **optional fields** do not block approval (see User Story 5.4 for details)
- Mismatches on **mandatory fields** DO block approval until resolved
- User can edit invoice data
- Reject with mandatory reason

### Universal Rule

**Invoice Qty ≤ GRN Qty ≤ PO Qty**

### Line Item Matching

- Fuzzy matching: Invoice = PO = GRN
- Combination of Quantity × Units = Total line amount
- Highlight all matches and mismatches with color coding

### Status Updates

- **"Approved"** — when user approves the invoice from the Summary Screen (all 4 tasks Done ✅)
- **"Rejected"** — when user rejects the invoice

### Additional Data Capture

- Certain parameters from tenant configuration may be required for ERP posting (e.g., GL Code, Cost Centre)
- If values cannot be derived from invoice/PO/GRN, prompt user for manual input
- Invoice cannot proceed to approval until all required fields are completed

### Edge Conditions

<aside>
✅

**1. No Mismatches State**

- All fields marked with green indicators
- Confidence score displayed for each matched field
- **Approve button on the Summary Screen is ENABLED**
- User can return to the Summary Screen and approve the invoice
</aside>

<aside>
⚠️

**2. Partial or Full Mismatch State**

- Mismatched fields highlighted with red indicators
- User options: **Acknowledge** (confirm prediction is correct) or **Edit** (correct the value)
- **Approve button on the Summary Screen is DISABLED** until all mismatches resolved
- Cannot proceed until every mismatch is acknowledged or edited
</aside>

<aside>
🔓

**3. Resolution & Approve Unlock**

- If field is edited: Do NOT ask for re-acknowledgment (treat as user-confirmed)
- If mismatch is acknowledged: Mark as resolved
- Once ALL mismatches are acknowledged or edited: **Approve button on the Summary Screen is ENABLED**
</aside>

---

## User Story 5.4 — Mandatory vs Optional Field Matching

**As a** Billing/AP team member, **I want** the system to enforce 100% match on mandatory fields while allowing partial matches on optional fields, **so that** critical data integrity is maintained while giving flexibility to acknowledge acceptable variances on non-critical fields.

### Field Classification

- Fields classified as **Mandatory** or **Optional** based on tenant configuration (Epic 8)
- Classification applies to all matching types (2-way and 3-way)
- Field classification visible in matching UI with clear visual distinction (asterisk or "Required" label)

### Mandatory Field Matching Rules

<aside>
🔴

**Mandatory Fields — 100% Match Required**

- Must achieve 100% match between Invoice ↔ PO ↔ GRN
- If mismatch: Field highlighted with red indicator, **Approve button on the Summary Screen DISABLED**
- User **cannot** simply acknowledge — must **edit** to achieve 100% match
- Error message: *"Mandatory field mismatch. Edit required to proceed."*
</aside>

### Optional Field Matching Rules

<aside>
🟡

**Optional Fields — Flexible Matching**

- Can have partial matches or mismatches
- If mismatch: Field highlighted with yellow/amber indicator
- User options: **Acknowledge** (confirm mismatch is acceptable) or **Edit** (correct the value)
- Acknowledged optional field mismatches logged in audit trail
- Optional field mismatches **do not block** Approve button (once mandatory fields matched)
</aside>

### Approve Button Activation Logic

**DISABLED when:**

- Any mandatory field has a mismatch (regardless of optional field status)

**ENABLED when:**

- All mandatory fields show 100% match (green status)
- AND all optional field mismatches are either resolved (edited) or acknowledged

### UI/UX Requirements

**Summary Banner**

- *"X mandatory fields require correction"*
- *"Y optional fields need review"*

**Visual Distinction**

- Mandatory fields: Bold label with asterisk (*)
- Optional fields: Regular label

**Mismatch Indicators**

- Mandatory mismatch: Red border + "Edit Required" badge
- Optional mismatch: Yellow/amber border + "Review" badge
- Matched fields: Green checkmark

**Tooltip on Disabled Approve**

- *"Resolve all mandatory field mismatches to enable approval"*

### Example Scenarios

| Scenario | Mandatory Fields | Optional Fields | Approve Button |
| --- | --- | --- | --- |
| All fields match | ✅ 100% matched | ✅ 100% matched | **ENABLED** |
| Mandatory mismatch exists | ❌ 1 mismatch | ✅ All matched | **DISABLED** |
| Only optional mismatches | ✅ 100% matched | ⚠️ 2 mismatches (unacknowledged) | **DISABLED** |
| Optional mismatches acknowledged | ✅ 100% matched | ⚠️ 2 mismatches (acknowledged) | **ENABLED** |
| Mixed - mandatory not resolved | ❌ 1 mismatch | ⚠️ 1 acknowledged | **DISABLED** |

### Audit Trail Requirements

**Mandatory Field Edits**

Log: original value, new value, user ID, timestamp

**Optional Field Acknowledgments**

Log: field name, mismatch details, user ID, timestamp, acknowledgment reason (optional free text)

**Final Approval Record**

Include summary of any acknowledged optional mismatches

### Edge Cases

1. **Field Reclassification:** If tenant changes field from optional to mandatory, existing in-progress invoices flagged for re-validation
2. **Bulk Acknowledgment:** User can "Acknowledge All Optional Mismatches" with single action (with confirmation dialog)
3. **Partial Edit:** If user partially edits mandatory field but doesn't achieve 100% match, field remains in mismatch state

---

# 🔄 EPIC 6 — Real-Time Status Updates

<aside>
🎯

**Epic Goal:** Provide real-time status updates and read-only view modes for completed/rejected invoices.

</aside>

## User Story 6.1 — Auto Status Updates

**Status Flow:**

```jsx
Fetched → Extracted → Extraction Confirmed
  → Summary Screen:
      Duplicate Detection
      → (if no duplicate) Vendor Validation + Metadata Validation + Line Item Validation [parallel]
  → Approved
  → ERP Posting
  → Posted
```

**Rejection / hold branches:**

- Duplicate detected → Rejected immediately
- Any task Action Required → invoice held on Summary Screen for user action
- PO Fully Utilized → surfaced as Action Required in Line Item Validation task
- User rejects at any point → Rejected

**Note:** The invoice status reflects the current active stage. While on the Summary Screen, the status reflects whichever task is actively running or needs attention.

---

## User Story 6.2 — View Mode for Approved/Posted/Rejected

- **Approved & Posted Stages:** Show final invoice and matching details (read-only)
- **Rejected Stage:** Show rejected invoice and extracted fields with confidence scores (read-only)
- All three stages are in **read-only mode**

---

# 📤 EPIC 7 — ERP Posting

<aside>
🎯

**Epic Goal:** Post approved invoices to ERP systems with tenant-specific field mapping.

</aside>

## User Story 7.1 — Post Approved Invoices

- Only invoices in **"Approved"** status can be posted to ERP
- Approved status is reached when all 4 Summary Screen tasks show Done ✅ and the user approves the invoice
- Fields configurable per tenant
- Save **Accounting Entry Posting ID** into the system when posting invoices to ERP
- Update status to **"Posted"** when posting is successful

---

# ⚙️ EPIC 8 — Tenant-Level Configuration

<aside>
🎯

**Epic Goal:** Provide comprehensive tenant-level configuration for extraction, validation, matching, and export parameters.

</aside>

<aside>
💡

**Design Reference:** To visualize configuration UI, refer to "Tenant Configuration" in Figma link.

</aside>

## User Story 8.1 — Tenant Configuration

### 1. General Settings

- Mandatory manual approval before ERP posting (Yes/No)
- Legal Entity: Country, Name, Address, VAT ID
- Email to fetch mails from (text field - email ID)
- Polling frequency (in minutes) — Numeric field

### 2. Field-Level Thresholds & Matching Rules

Thresholds and matching rules are configured **per field** for both **metadata fields** and **line item fields**.

---

#### A. Extraction Stage — Confidence Score Based

For extraction, all fields are evaluated based on **confidence score**:

- **Rule:** Field passes if confidence score ≥ configured threshold
- **Example:** PO Number extracted with 96% confidence, threshold is 95% → Pass

| Field | Type | Threshold |
| --- | --- | --- |
| PO Number | Confidence Score | Numeric (0-100%) |
| Invoice Number | Confidence Score | Numeric (0-100%) |
| Invoice Date | Confidence Score | Numeric (0-100%) |
| Total Amount | Confidence Score | Numeric (0-100%) |
| Vendor Name | Confidence Score | Numeric (0-100%) |
| Tax ID | Confidence Score | Numeric (0-100%) |
| Line Item Fields | Confidence Score | Numeric (0-100%) |

---

#### B. Vendor Validation & Matching Stages — Value Comparison Based

For Vendor Validation and Matching, fields are compared by **value** (Invoice ↔ PO ↔ GRN):

**Alphanumeric Fields — Exact Match Required**

- **Rule:** Values must match exactly (case-insensitive)
- **Fields:** Vendor Name, PO Number, Invoice Number, Item Code, Item Description, VAT ID, Tax ID, etc.
- **Example:** Invoice Vendor Name = "acme corp", PO Vendor Name = "ACME Corp" → Pass (case-insensitive)

**Numeric Fields — Threshold Based**

- **Rule:** Values must be within configured threshold
- **Fields:** Total Amount, Quantity, Unit Price, Line Item Total, etc.
- **Threshold options (tenant configurable):**
    - **Exact:** Must match exactly (threshold = 0)
    - **Range:** Value must fall within min-max range
    - **Percentage:** Value must be within ±X% of expected value

| Field | Field Type | Matching Rule | Threshold Options |
| --- | --- | --- | --- |
| Vendor Name | Alphanumeric | Exact match (case-insensitive) | N/A |
| PO Number | Alphanumeric | Exact match (case-insensitive) | N/A |
| Invoice Number | Alphanumeric | Exact match (case-insensitive) | N/A |
| Item Code | Alphanumeric | Exact match (case-insensitive) | N/A |
| Item Description | Alphanumeric | Exact match (case-insensitive) | N/A |
| VAT ID / Tax ID | Alphanumeric | Exact match (case-insensitive) | N/A |
| Total Amount | Numeric | Within threshold | Exact / Range / Percentage |
| Quantity | Numeric | Within threshold | Exact / Range / Percentage |
| Unit Price | Numeric | Within threshold | Exact / Range / Percentage |
| VAT Amount | Numeric | Within threshold | Exact / Range / Percentage |
| Line Item Total | Numeric | Within threshold | Exact / Range / Percentage |

---

#### C. Line Item Matching — Fuzzy Matching

Line items are matched using **fuzzy matching**:

- Line items don't need to be in the same order across Invoice, PO, and GRN
- System finds the best match for each line item across documents
- Each matched line item pair is then validated using the field-level rules above

---

#### D. Extraction Auto-Confirm Logic

Extraction can be auto-confirmed (bypassing manual review) if **all mandatory extraction fields** have confidence scores ≥ their configured thresholds. This is tenant configurable.

Once extraction is confirmed (manually or automatically), all 4 Summary Screen tasks run in the background. However, Smart Routing (User Story 1.7) determines whether the user is shown the Summary Screen: if all tasks complete with Done ✅ and no Action Required, the Summary Screen is bypassed and the user is routed directly to ERP Posting (or, if all ERP fields are derivable, straight through to posting). The tasks always execute — routing controls visibility, not execution.

### 3. Fields to Extract

#### A. Vendor Validation — Fields to Check

☐ Vendor Name

☐ Tax ID

#### B. Invoice Fields

**Metadata:**

1. PO Number
2. Invoice Number
3. Invoice Date
4. Payment Term
5. Due Date
6. Vendor Legal Entity
7. Vendor Address
8. Vendor VAT ID
9. Company Legal Entity
10. Company Address
11. Company VAT ID
12. Description
13. Currency
14. Total Amount before VAT/GST
15. VAT/GST
16. Total Amount after VAT/GST
17. WHT (Withholding Tax)
18. Net Amount after WHT
19. Vendor Bank Name
20. Vendor Bank Account Number
21. Vendor Bank Account Name
22. Vendor Bank SWIFT

**Line Items:**

1. Item Code
2. HSN Code
3. Item Description
4. Unit of measurement
5. Quantity
6. Unit Price
7. Total price for line item before VAT

#### C. Vendor Validation — Field List for Master Data Matching:

1. Vendor Legal Entity
2. Vendor VAT ID
3. Vendor Address
4. Vendor Bank Name
5. Vendor Bank Account Number
6. Vendor Bank Account Name
7. Vendor Bank SWIFT

#### D. PO (Purchase Order) Fields

**Metadata:**

1. Company Legal Entity
2. Company VAT ID
3. Company Address
4. Currency
5. Total Amount before VAT/GST
6. VAT/GST
7. Total Amount after VAT/GST
8. Payment Term
9. Due Date
10. Total Quantity

**Line Items:**

1. Item Code
2. Item Description
3. Unit of measurement
4. Quantity
5. Unit Price
6. Total price for line item before VAT

#### E. Template to expose fields to Match in 2-Way / 3-Way Matching

Each field can be marked as Mandatory or Optional:

| Field | Matching Rule | Mandatory/Optional |
| --- | --- | --- |
| PO Number | Invoice = PO = GRN | checkbox |
| Item Code | Invoice = PO = GRN | checkbox |

#### F. ERP Posting Fields

<aside>
ℹ️

**Note:** Post field mapping differs by client/ERP system

</aside>

All the mandatory and Optional fields should be pre-populated and should be included already. + Additional fields from below:

1. Company Code
2. General Ledger / Account Code
3. Cost Center
4. VAT Tax Code
5. WHT Tax Code

#### G. Type of Matching

- Configurable at tenant level (currently)
- Future: May move to vendor-level / series based on PO(Zalora) configuration
- Example: 2-way matching for one vendor, 3-way for another

<aside>
💡

**Configuration Philosophy** — Checkboxes against fields represent which fields a tenant wants to use for extraction/validation/matching. Different clients rely on different identifiers (e.g., Client X validates using Vendor Name, Client Y uses Tax ID). This allows the system to be flexible and tenant-specific, not hardcoded.

</aside>

---

## User Story 8.2 — Straight Through Processing (STP) Configuration

> **Note: STP and Zalora Phase 1**
> 

> STP is available as a platform capability but is explicitly **disabled for Zalora in Phase 1**. All invoices require manual review during the 90-day stabilization period. Enablement may be considered post-stabilization once confidence benchmarks are met. Refer to the Zalora Phase 1 PRD for details.
> 

**As a** Tenant Admin/Config Owner, **I want** to enable or disable Straight Through Processing at the tenant level, **so that** invoices meeting all quality thresholds can be automatically approved without manual intervention, improving processing efficiency.

### Configuration UI

- Add **"Enable Straight Through Processing"** checkbox in Tenant Configuration panel
- Checkbox **unchecked (disabled) by default** for new tenants
- When STP enabled, display additional STP configuration options
- Configuration changes require Admin role permissions
- Changes take effect immediately for new invoices; in-progress invoices follow original configuration

### STP Configuration Options

| Parameter | Type | Description | Default |
| --- | --- | --- | --- |
| Enable STP | Checkbox | Master toggle for straight through processing | Off |
| Extraction Confidence Threshold | Numeric (0-100%) | Minimum confidence score for all extracted fields | 95% |
| Mandatory Fields Match Required | Checkbox (locked ON) | All mandatory fields must have 100% match | Always ON |
| Optional Fields Match Threshold | Numeric (0-100%) | Minimum match percentage for optional fields | 90% |
| Vendor Validation Required | Checkbox | Vendor must be validated against master data | On |
| Duplicate Check Required | Checkbox | Invoice must pass duplicate validation | On |
| Auto-Post to ERP | Checkbox | Automatically post to ERP after STP approval | Off |

### STP Eligibility Criteria

<aside>
✅

**An invoice qualifies for STP ONLY if ALL conditions are met:**

1. **Extraction Confidence:** All extracted fields have confidence scores ≥ configured threshold
2. **Mandatory Fields:** 100% match on all mandatory fields (Invoice ↔ PO ↔ GRN as applicable)
3. **Optional Fields:** Match percentage ≥ configured threshold
4. **Vendor Validation:** Vendor exists and is not blocked (if validation required)
5. **Duplicate Check:** Invoice passes duplicate validation (if check required)
6. **Line Item Validation:** Sum of line items equals Amount Before VAT
7. **No Missing Fields:** All tenant-configured mandatory fields are populated
</aside>

### STP Workflow Behavior

**When STP is ENABLED and invoice qualifies:**

```jsx
Ingestion → Extraction → Summary Screen (all 4 tasks auto-pass) → AUTO-APPROVE → ERP Posting → Posted
```

- Invoice automatically transitions through statuses without human touchpoint
- Status updates: Fetched → Extracted → Extraction Confirmed → Summary Screen (all tasks auto-pass) → Approved (auto) → ERP Posting → **Posted (STP)**
- If Auto-Post to ERP is enabled in tenant config, posting happens immediately after auto-approval without any manual trigger

**When STP is ENABLED but invoice does NOT qualify:**

- Invoice follows standard manual review workflow
- System logs reason(s) for STP disqualification
- Invoice appears in queue with badge: *"STP Failed - Manual Review Required"*

**When STP is DISABLED:**

- All invoices follow standard manual review workflow
- No STP eligibility evaluation performed

### UI/UX Requirements

**Tenant Configuration Panel**

```jsx
☐ Enable Straight Through Processing (STP)
   └─ When enabled, invoices meeting all thresholds are auto-approved

[Visible when STP enabled:]
├─ Extraction Confidence Threshold: [____]% (default: 95%)
├─ ☑ Mandatory Fields Must Match 100% (locked)
├─ Optional Fields Match Threshold: [____]% (default: 90%)
├─ ☑ Require Vendor Validation
├─ ☑ Require Duplicate Check
└─ ☐ Auto-Post to ERP after STP Approval
```

**Dashboard Indicators**

1. STP-processed invoices display badge: **"Auto-Approved (STP)"**
2. Filter option added: "Processing Type" → Manual / STP
3. STP-failed invoices show: **"STP Failed"** badge with hover tooltip showing failure reason(s)

**Invoice Detail View (for STP-processed invoices)**

1. Read-only view showing all matched fields
2. "Processed By: System (STP)" in audit section
3. STP eligibility scorecard showing all criteria and pass/fail status

### Audit Trail Requirements

**STP-Approved Invoices** must log:

- Timestamp of auto-approval
- All confidence scores at time of processing
- Match percentages for mandatory and optional fields
- STP configuration values used (threshold settings)
- Processing duration (ingestion to approval)

**STP-Failed Invoices** must log:

- Timestamp of STP evaluation
- Specific criteria that failed (with values)
- Reason code(s) for manual review routing

### Edge Cases & Restrictions

1. **STP + Maker-Checker:** If maker-checker workflow enabled (future), STP auto-approval counts as "maker" action only; checker review still required
2. **STP Override:** Admin can manually trigger re-review of STP-approved invoice within [X] hours (configurable)
3. **STP Pause:** Admin can temporarily pause STP processing without disabling configuration (e.g., during audit periods)
4. **Threshold Changes:** Changing thresholds does not retroactively affect already-processed invoices
5. **Partial STP:** Not supported in MVP—invoice either fully qualifies or goes to manual review

### Example STP Evaluation

| Criteria | Threshold | Invoice Value | Status |
| --- | --- | --- | --- |
| Extraction Confidence | ≥ 95% | 97% | ✅ Pass |
| Mandatory Fields Match | 100% | 100% | ✅ Pass |
| Optional Fields Match | ≥ 90% | 85% | ❌ Fail |
| Vendor Validated | Required | Yes | ✅ Pass |
| Duplicate Check | Required | Passed | ✅ Pass |

<aside>
❌

**Result:** STP Failed → Routed to Manual Review

**Reason:** Optional fields match (85%) below threshold (90%)

</aside>

---

# 📊 EPIC 9 — Insights & Analytics

<aside>
🎯

**Epic Goal:** Provide comprehensive analytics dashboard for invoice processing metrics, user actions, and STP performance.

</aside>

<aside>
💡

**Design Reference:** To visualize insights dashboard, refer to "Insights" in Figma link.

</aside>

## Filters

**Date Filters**

- Daily
- Weekly
- Monthly
- Custom Range

**Vendor Filter**

- Multi-select list of vendors

---

## Metrics

### 1. Email Ingestion Metrics

- Total emails fetched
- Number of emails with valid invoices
- Number of emails ignored:
    - Irrelevant file format
    - No invoices found
- **Export:** List of emails that were not processed (CSV download)

### 2. Upload Metrics

- Total invoices (line items on dashboard) uploaded manually

### 3. Processing Metrics

- Invoices posted to ERP
- **SLA:** Upload (Review button click) → Approved/ERP push
    - Individual invoice level
    - Average across all invoices
- **System processing time**
    - Individual invoice level
    - Average across all invoices
- **Manual review duration**
    - Individual invoice level
    - Average across all invoices

### 4. User Actions Log

- Log of edits, approvals, rejections on invoice level
- User attribution for all actions

### 5. Matching Logs

- Fully matched invoices
- Partially matched invoices
- No matches

### 6. STP Insights

| Metric | Description |
| --- | --- |
| STP Rate | % of invoices processed via STP vs total invoices |
| STP Failure Reasons | Breakdown of why invoices failed STP eligibility |
| STP Processing Time | Average time from ingestion to STP approval |
| Manual vs STP Volume | Trend chart comparing processing types over time |
| STP Threshold Analysis | Recommendations for threshold adjustments based on failure patterns |

---

# 📚 Appendix

## Status Flow Diagram

```jsx
┌─────────────────────────────────────────────────────────────┐
│                     INVOICE PROCESSING FLOW                  │
└─────────────────────────────────────────────────────────────┘

          Fetched
             ↓
          Extracted
             ↓
     Extraction Confirmed
             ↓
      ┌─── SUMMARY SCREEN ───────────────────────────┐
      │  Task 1: Duplicate Detection                  │
      │       ↓ (if duplicate) → REJECTED             │
      │       ↓ (if no duplicate)                     │
      │  Tasks 2-4 in parallel:                       │
      │    Vendor Validation      ┐                   │
      │    Metadata Validation    ├→ Action Required  │
      │    Line Item Validation   ┘  (any task)       │
      │       ↓ (all Done ✅)                          │
      │  User Approves                                │
      └───────────────────────────────────────────────┘
             ↓
         Approved
             ↓
         ERP Posting
             ↓
         Posted

At any point → User can Reject → Rejected
```

**Status Descriptions:**

| Status | Description | User Screen |
| --- | --- | --- |
| Fetched | Invoice ingested via email or manual upload | — |
| Extracted | Data extraction complete, pending user confirmation | Extraction Review |
| Extraction Confirmed | User confirmed extracted data (or auto-confirmed via confidence threshold) | — |
| Duplicate Detection | Summary Screen Task 1 running — checking for duplicate invoice | Summary Screen |
| Vendor Validation | Summary Screen Task 2 running — validating vendor against master data (existence and blocked status) | Summary Screen |
| Metadata Validation | Summary Screen Task 3 running — validating header/billing fields | Summary Screen |
| Line Item Validation | Summary Screen Task 4 running — matching line items against PO/GRN | Summary Screen |
| Approved | All 4 tasks Done ✅ and user has approved the invoice; ready for ERP posting | Read-only View |
| ERP Posting | Invoice being posted to ERP | — |
| Posted | Invoice successfully posted to ERP | Read-only View |
| Rejected | User rejected, or duplicate detected | Read-only View |
| PO Fully Utilized | PO exhausted; surfaced as Action Required in Line Item Validation | Summary Screen |

---

## Glossary

| Term | Definition |
| --- | --- |
| **P2P** | Procure-to-Pay |
| **PO** | Purchase Order |
| **GRN** | Goods Receipt Note |
| **STP** | Straight Through Processing |
| **VAT** | Value Added Tax |
| **GST** | Goods and Services Tax |
| **WHT** | Withholding Tax |
| **ERP** | Enterprise Resource Planning |
| **OCR** | Optical Character Recognition |

---

*Document Version: 1.0*

*Last Updated: 11 Mar 2026*

[✅ P2P MVP — Dev QA Checklist](https://www.notion.so/P2P-MVP-Dev-QA-Checklist-31b1bfb4925481b1bb5ee2fc9a5a0003?pvs=21)