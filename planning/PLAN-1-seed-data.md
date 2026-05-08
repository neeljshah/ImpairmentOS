# Phase 1 — Richer Seed Data

**Goal:** Dashboard has visual variety and the jurisdiction engine is obviously adapting across three cities.
**Time:** 45 min
**File:** `backend/seed.py`
**Depends on:** nothing

---

## Tasks

### 1.1 — Dunmoor property + systems
- [ ] Create "Dunmoor Community Hospital" under Dunmoor jurisdiction
  - address: "45 Elm Street, Dunmoor, MA 01945"
  - owner: "Dunmoor Health Partners LLC"
  - PM: "MedPro Facility Management"
  - carrier: "Patriot National Insurance"
- [ ] Add wet sprinkler system (zone: "Surgical Wing", install 2015)
- [ ] Add fire alarm system (zone: "Building-wide", install 2018)

### 1.2 — Dunmoor active impairment (COMPLIANT mid-workflow)
- [ ] Status: `fire_watch_active`
- [ ] Opened ~2 hours before seed time (use `datetime.now() - timedelta(hours=2)`)
- [ ] AHJ notified within 30 minutes (Dunmoor's strict DFPO-8-5.1 rule — COMPLIANT)
- [ ] Fire watch active, not yet ended
- [ ] Reason: "Sprinkler head replacement — damaged during construction work"
- [ ] 3-4 events: created, ahj_notified, fire_watch_started, repair_started
- **Demo point:** Different jurisdiction rules fire correctly. Mid-workflow state looks different from Cedar Heights. No violations — shows the system works when followed.

### 1.3 — Hartwell Commons property + closed clean impairment
- [ ] Create "Hartwell Commons Shopping Center" under Hartwell jurisdiction
  - address: "700 Main Street, Hartwell, MA 01801"
  - owner: "Hartwell Retail Partners LLC"
  - PM: "Summit Property Group"
  - carrier: "Continental Mutual Insurance"
- [ ] Add wet sprinkler system (zone: "Food Court Wing", install 2011)
- [ ] Impairment: control valve repair, ~3 hours, properly handled
  - AHJ notified (Hartwell requires all)
  - Fire watch assigned and ended
  - Under 4 hours → main drain test NOT required
  - Status: `closed` with all events (5-6 events)
  - closed_at, closed_by filled
- **Demo point:** Not every Hartwell impairment is broken. The system works correctly when used.

### 1.4 — Cedar Heights second impairment (closed_incomplete)
- [ ] Use existing Cedar Heights property, fire alarm system
- [ ] Short impairment (1.5 hrs), fire alarm panel intermittent fault
- [ ] Status: `closed_incomplete`
  - AHJ notified (Hartwell requires all — this one IS notified)
  - Fire watch assigned and ended (short)
  - closure_notes: "Customer declined further investigation. Panel returned to normal operation. Recommended follow-up at next annual."
- [ ] 4-5 events: created, ahj_notified, fire_watch_started, fire_watch_ended, closed_incomplete
- **Demo point:** The escape hatch exists — you can close without full compliance but it's flagged differently.

### 1.5 — Verify
- [ ] Delete `backend/impairmentos.db`
- [ ] Restart backend
- [ ] Confirm dashboard loads: 2 active (Cedar Heights broken + Dunmoor mid-workflow), 3 closed
- [ ] Compliance alerts fire for Cedar Heights but NOT for Dunmoor
- [ ] All jurisdiction info displays correctly on wizard property selection

---

## After This Phase

| Property | Jurisdiction | Impairment | Status | Demo Point |
|----------|-------------|------------|--------|------------|
| Cedar Heights Apts | Hartwell (2017, all) | Frozen pipe 9th floor | `repair_in_progress` | BROKEN — no AHJ, no drain test |
| Cedar Heights Apts | Hartwell (2017, all) | Fire alarm panel | `closed_incomplete` | ESCAPE HATCH |
| Hartwell Commons | Hartwell (2017, all) | Control valve repair | `closed` | CLEAN — system works |
| Wessex Office Park B | Wessex (2014, 4hr) | Valve packing gland | `closed` | CLEAN — 4hr skip valid |
| Dunmoor Hospital | Dunmoor (2020, 30min) | Sprinkler head | `fire_watch_active` | MID-WORKFLOW, compliant |

Dashboard will have: 2 active cards (1 red, 1 amber), 3 closed cards (2 green, 1 yellow). Visual variety.
