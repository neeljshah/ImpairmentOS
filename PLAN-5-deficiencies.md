# Phase 5 — Deficiency Tracking (Light)

**Goal:** Show awareness of the Artifact 5 standpipe corrosion thread. Not a full deficiency CRUD — just enough to demonstrate you caught it.
**Time:** 1.5 hours
**Depends on:** Phase 4 (wires deficiency count into property overview)

---

## Why This Matters

Artifact 5: Linda flags standpipe corrosion (Day -78), sends Steeplechase a proposal (Day -74), no response, Tom says "let it sit" (Day -62). The deficiency never appeared on any ITM report. This is the second failure thread the packet plants. Not addressing it is a missed opportunity.

---

## Tasks

### 5.1 — Backend: Deficiency model
- [ ] New file: `backend/app/models/deficiency.py`
- [ ] Fields:
  - `id`: int PK
  - `property_id`: FK → properties
  - `system_id`: FK → systems
  - `reported_by`: str
  - `reported_at`: datetime
  - `description`: str
  - `severity`: str ("critical" | "non_critical")
  - `status`: str ("open" | "proposal_sent" | "customer_declined" | "repair_scheduled" | "resolved")
  - `proposal_sent_at`: datetime | null
  - `proposal_response`: str | null
  - `resolved_at`: datetime | null
  - `resolved_by`: str | null
  - `nfpa_reference`: str | null
  - `notes`: str | null
  - `on_itm_report`: bool (was this formally documented?)
  - `created_at`: datetime
- [ ] Add to `backend/app/models/__init__.py` exports
- [ ] Also add to `backend/models.py` backward-compat shim (re-export Deficiency)
- [ ] Create table: call `Base.metadata.create_all(engine)` at the top of `seed_db()` before seeding (simpler than Alembic for a prototype)

### 5.2 — Backend: Seed deficiency data
- [ ] Add to `backend/seed.py` (after properties and systems are created):

**Cedar Heights — standpipe corrosion (Artifact 5):**
- reported_by: "M. DiSalvo"
- reported_at: Day -78 (2026-02-19)
- description: "Corrosion on 9th floor west stairwell standpipe hose connection threads. Not failed but deteriorating."
- severity: "non_critical"
- status: "proposal_sent"
- proposal_sent_at: Day -74 (2026-02-23)
- proposal_response: "No response. Follow-up Day -68, no response. Tom: 'let it sit.'"
- on_itm_report: False ← the problem
- nfpa_reference: "NFPA 25 §5.2"

**Cedar Heights — fire pump aging (Artifact 7, carrier recommendation):**
- reported_by: "K. Fielding (Continental Mutual)"
- reported_at: Day -416 (2025-03-19)
- description: "Fire pump approaching end of expected service life. Recommend replacement or overhaul within 36 months."
- severity: "non_critical"
- status: "open"
- on_itm_report: False
- nfpa_reference: "Carrier Rec 5.2-A"

**Wessex Office Park — resolved (for contrast):**
- reported_by: "T. Beacon"
- reported_at: 60 days ago
- description: "Gauge on 2nd floor riser reading low — replaced"
- severity: "non_critical"
- status: "resolved"
- resolved_at: 55 days ago
- resolved_by: "T. Beacon"
- on_itm_report: True

### 5.3 — Backend: Deficiency endpoints
- [ ] New file: `backend/app/routes/deficiencies.py`
- [ ] `GET /properties/{id}/deficiencies` — list deficiencies for a property
- [ ] `GET /deficiencies/summary` — count open deficiencies per property (for overview)
- [ ] Register router in `backend/main.py`

### 5.4 — Frontend: Deficiency display
- [ ] Add deficiency list to the dashboard when a property filter is active, or as a section in the property overview
- [ ] Each deficiency shows:
  - Description
  - Severity badge (critical = red, non_critical = amber)
  - Status badge (open = red, proposal_sent = amber, resolved = green)
  - "On ITM report?" indicator — red ✗ if False, green ✓ if True
  - Days open (if not resolved)
- [ ] The Cedar Heights standpipe should look alarming: 78+ days open, NOT on ITM report, no response

### 5.5 — Wire into property overview
- [ ] Update `GET /properties/overview` (Phase 4) to include `open_deficiencies_count` from real data
- [ ] Update `PropertyOverview.tsx` to show the count
- [ ] Cedar Heights shows "2 open deficiencies"

### 5.6 — Add to api.ts
- [ ] Add `Deficiency` type
- [ ] Add `api.getPropertyDeficiencies(propertyId)` method

---

## What This Does NOT Build

- No deficiency creation UI (evaluators don't need to create new ones)
- No deficiency-to-repair workflow
- No notifications or escalation
- Mention these as expansion opportunities in the report
