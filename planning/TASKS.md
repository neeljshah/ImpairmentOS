# Task Tracker

Quick-reference checklist. Check off as you go. Work top to bottom.

## Phase 1 — Seed Data (45 min)
- [ ] Dunmoor property + systems
- [ ] Dunmoor active impairment (fire_watch_active, compliant)
- [ ] Hartwell Commons property + closed clean impairment
- [ ] Cedar Heights closed_incomplete impairment (fire alarm)
- [ ] Delete DB, restart, verify 5 impairments load

## Phase 2 — Records Export (1.5 hrs)
- [ ] `GET /properties/{id}/export` endpoint
- [ ] Extract packet generation into reusable helper
- [ ] Export modal component (property picker + date range)
- [ ] Records export view (printable structured document)
- [ ] Wire into App.tsx routing

## Phase 3 — Property Overview (1.5 hrs)
- [ ] `GET /properties/overview` endpoint
- [ ] PropertyOverview.tsx component
- [ ] NavBar "Properties" tab
- [ ] Dashboard property filter dropdown

## Phase 4 — Deficiencies (1.5 hrs)
- [ ] Deficiency model + migration
- [ ] Seed: standpipe corrosion, fire pump aging, Wessex resolved
- [ ] `GET /properties/{id}/deficiencies` endpoint
- [ ] Deficiency list in dashboard/property view
- [ ] Wire count into property overview

## Phase 5 — Walkthrough (2 hrs)
- [ ] `POST /demo/reset` endpoint
- [ ] Walkthrough.tsx (6-step guided tour)
- [ ] Notebook comparison view (Artifact 4 styled)
- [ ] NavBar entry point + first-visit banner

## Phase 6 — Enforcement Visibility (1 hr)
- [ ] BLOCKED badge on active impairment cards
- [ ] Violation one-liners with "Fix →" links
- [ ] Elapsed time indicators (overdue by X days)
- [ ] Stat card: blocked closures count
- [ ] Packet: RESOLUTION REQUIRED section

## Phase 7 — Polish & Ship (1.5 hrs)
- [ ] Demo reset (if not done in Phase 5)
- [ ] Print styles (packet + export)
- [ ] CORS/port consistency
- [ ] Update SUBMISSION_REPORT.md
- [ ] Deploy or record video
- [ ] Final smoke test (full checklist in PLAN-7)
