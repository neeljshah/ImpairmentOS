# Phase 4 — Property Compliance Overview

**Goal:** A portfolio-level view showing compliance status across all properties. What Jenna Cortez (managing 47 properties) and Tom Beacon (managing his book of business) would open every morning.
**Time:** 1.5 hours
**Depends on:** Phase 1 (more properties to show)

---

## Why This Matters

The packet says two other PMs called Beacon asking "are our properties in the same situation?" The dashboard shows individual impairments but has no way to answer that question at a portfolio level.

---

## Tasks

### 4.1 — Backend: Property overview endpoint
- [ ] Add to `backend/app/routes/properties.py`:
- [ ] `GET /properties/overview`
- [ ] Returns list of all properties with computed fields:
  ```json
  {
    "id": 1,
    "name": "Cedar Heights Apartments",
    "address": "1411 Cedar Avenue, Hartwell, MA 01801",
    "jurisdiction_name": "City of Hartwell",
    "nfpa25_edition": "2017",
    "compliance_status": "red",
    "active_impairments_count": 1,
    "open_deficiencies_count": 0,
    "violation_count": 2,
    "total_impairments_90d": 2,
    "last_impairment_date": "2026-01-12T07:40:00"
  }
  ```
- [ ] Compliance status logic:
  - `red`: any active impairment with violations (use ImpairmentStateMachine to compute)
  - `amber`: any active impairment (no violations yet)
  - `green`: no active impairments
- [ ] Note: `open_deficiencies_count` returns 0 until Phase 5 adds deficiency data

### 4.2 — Frontend: Properties overview page
- [ ] New file: `frontend/src/components/PropertyOverview.tsx`
- [ ] Fetch from `/properties/overview`
- [ ] Render as a table/card grid:
  - Property name
  - Jurisdiction (with NFPA 25 edition badge)
  - Compliance status dot (red/amber/green circle)
  - Active impairments count
  - Open deficiencies count (will show 0 until Phase 5)
  - Last impairment date
  - Actions: "View Impairments" button, "Export Records" button (if Phase 3 done)
- [ ] Sorted: red first, then amber, then green

### 4.3 — Navigation: Add Properties tab
- [ ] Update `frontend/src/components/NavBar.tsx`:
  - Add "Properties" link/button
  - Accept `onViewProperties` callback prop
- [ ] Update `frontend/src/App.tsx`:
  - Add view type: `{ type: "properties" }`
  - Render `PropertyOverview` when active
  - Wire NavBar's onViewProperties callback

### 4.4 — Dashboard: Property filter dropdown
- [ ] Add a property filter dropdown at the top of Dashboard
- [ ] Options: "All Properties" (default) + each property by name
- [ ] When selected, filter `active_impairments` and `recently_closed` by property id
- [ ] No backend change needed — filter client-side from existing dashboard data

### 4.5 — Add PropertyOverview types to api.ts
- [ ] Add `PropertyOverviewItem` type
- [ ] Add `api.getPropertyOverview()` method

---

## Demo Script

1. "Here's what Tom sees when he opens ImpairmentOS."
2. Properties page: Cedar Heights RED, Dunmoor AMBER, Wessex GREEN, Hartwell Commons GREEN
3. "When Jenna's colleagues call asking 'are we in the same situation?' — green means you're fine, red means something needs action."
4. Click Cedar Heights → dashboard filters to that property → violations visible
