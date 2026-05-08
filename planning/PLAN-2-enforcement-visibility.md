# Phase 2 — Enforcement Visibility

**Goal:** Make the state machine's power obvious from the dashboard without requiring the evaluator to click into the wizard and discover it.
**Time:** 1 hour
**Files:** `frontend/src/components/Dashboard.tsx`, `frontend/src/components/ImpairmentPacket.tsx`
**Depends on:** Phase 1 (more impairments to contrast with)

---

## Why This Is Phase 2

The state machine is your core differentiator. Right now you have to know to try closing the Cedar Heights impairment to see it work. Most evaluators won't discover that on their own. This phase makes it unmissable.

---

## Tasks

### 2.1 — "BLOCKED" badge on active impairment cards
- [ ] In `Dashboard.tsx` → `ActiveCard`, when an impairment has compliance violations that block closure, render a prominent badge:
  ```
  ██ BLOCKED: Cannot close — 2 violations ██
  ```
- [ ] Badge: `bg-red-700 text-white px-3 py-1.5 rounded font-bold text-sm`
- [ ] Position: between the status badge row and the compliance detail row
- [ ] Data source: call `/impairments/{id}/compliance` on dashboard load, or compute violations client-side using jurisdiction rules from the impairment data (simpler — no extra API call needed)
- [ ] Client-side check logic (mirrors state_machine.py):
  - `ahj_notification_required && durationHours > notification_threshold_hours && !ahj_notified` → violation
  - `main_drain_on_restore && durationHours > 4 && !main_drain_test_performed` → violation
  - `fire_watch_started_at && !fire_watch_ended_at` → violation
  - Duration: `(Date.now() - opened_at) / 3600000` for active, or use `restored_at` if set
  - All jurisdiction fields available at `imp.system.property.jurisdiction.*`

### 2.2 — Violation one-liners with "Fix →" links
- [ ] Below the BLOCKED badge, list each violation:
  ```
  ✗ AHJ notification required (Hartwell Fire Code §17-4.7) — overdue 116 days [Fix →]
  ✗ Main drain test required (NFPA 25 §13.2.5, >4h) — NOT RECORDED [Fix →]
  ```
- [ ] "Fix →" calls `onTakeAction(imp)` — jumps to the wizard at the relevant step
- [ ] Red text, bold, with the X icon already defined in Dashboard.tsx

### 2.3 — Elapsed time / overdue indicators
- [ ] For active impairments with violations, compute how long each requirement has been overdue:
  - AHJ: `days since opened_at` (for Hartwell where threshold=0)
  - Main drain: `days since restored_at` (if restored and duration > 4h)
- [ ] Show: "overdue by 116 days" / "overdue by 4 hours" in red
- [ ] For compliant active impairments (Dunmoor), show green: "AHJ notified within 30-min deadline ✓"

### 2.4 — "Blocked Closures" stat card
- [ ] Add a 5th stat card to the dashboard grid (change grid from 4-col to 5-col, or replace "Avg Resolution" if space is tight)
- [ ] Label: "Blocked Closures"
- [ ] Value: count of active impairments with blocking violations
- [ ] Accent: red if > 0, slate if 0
- [ ] Sub: "compliance violations"

### 2.5 — Packet: "RESOLUTION REQUIRED" section
- [ ] In `ImpairmentPacket.tsx`, when viewing an in-progress impairment with violations:
- [ ] Add a section at the top of the packet body (before Property & System):
  ```
  ┌──────────────────────────────────────────┐
  │ RESOLUTION REQUIRED                       │
  │                                            │
  │ ✗ AHJ notification required               │
  │   Action: Call Marshal Elena Reyes at      │
  │   (508) 555-0147 and record notification   │
  │                                            │
  │ ✗ Main drain test not recorded             │
  │   Action: Perform test per NFPA 25 §13.2.5│
  │   and record static/residual PSI           │
  └──────────────────────────────────────────┘
  ```
- [ ] Include jurisdiction-specific AHJ contact info from the packet data
- [ ] Style: `bg-red-50 border-2 border-red-400 rounded-lg p-4`

---

## Visual Before/After

**Before:**
```
[Active Card]
  Cedar Heights — 9th Floor Zone
  Frozen pipe at vertical riser
  Status: Repair in Progress
  (small compliance status text, easy to miss)
  [Take Action] [View Timeline]
```

**After:**
```
[Active Card]
  Cedar Heights — 9th Floor Zone
  Frozen pipe at vertical riser
  Status: Repair in Progress
  ██ BLOCKED: Cannot close — 2 violations ██
  ├─ ✗ AHJ notification overdue by 116 days [Fix →]
  └─ ✗ Main drain test not recorded [Fix →]
  (compliance detail row)
  [Notify AHJ] [Take Action] [View Timeline]
```

---

## No New Backend Work

All data needed is already available in the impairment response (jurisdiction rules, ahj_notified, main_drain_test_performed, timestamps). The violation logic is computed client-side using the same rules as `state_machine.py`.
