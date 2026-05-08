# Phase 6 — Cedar Heights Interactive Walkthrough

**Goal:** A guided demo mode that walks the evaluator through the Cedar Heights scenario step by step. Shows what went wrong, what should have happened, and how ImpairmentOS prevents it.
**Time:** 2 hours
**Depends on:** Phase 1 (seed data), Phase 2 (enforcement visibility)

---

## Why This Matters

The evaluator has to discover the enforcement by clicking around. The walkthrough makes the argument for you — it tells the story from the packet through the lens of your product.

---

## Tasks

### 6.1 — Backend: Scenario reset endpoint
- [ ] New file: `backend/app/routes/demo.py`
- [ ] `POST /demo/reset` — truncate all tables, re-run `seed_db()`
- [ ] Returns `{ "status": "reset", "message": "Demo data restored" }`
- [ ] Register router in `backend/main.py`

### 6.2 — Frontend: Walkthrough component
- [ ] New file: `frontend/src/components/Walkthrough.tsx`
- [ ] Multi-step guided experience:

**Step 1: "The Situation"**
- Summary of Cedar Heights on Day -116
- Show the impairment card in its broken state
- Key facts: 5h 50m impairment, AHJ not notified, main drain test not recorded
- Button: "See What Went Wrong"

**Step 2: "The Notebook" (Before)**
- Styled version of Artifact 4 — the handwritten log entry
- Highlight problems: Mike's 4-hour rule note, Linda's "was AHJ notified?" note, no formal records
- Monospace font, slightly off-white background for notebook feel
- Button: "See How ImpairmentOS Handles This"

**Step 3: "With ImpairmentOS" (After)**
- Show the impairment with violations highlighted (reuse enforcement visibility from Phase 2)
- Point out: "The system already knows AHJ notification is required — it won't let you close without it"
- Button: "Try to Close It"

**Step 4: "Enforcement in Action"**
- Navigate to the close step of the Cedar Heights impairment wizard
- Evaluator clicks "Close Impairment" and sees the violations list
- Text: "This is the moment that would have saved Beacon $50K+ in legal fees"
- Button: "Now Fix It"

**Step 5: "The Compliant Path"**
- Guide through: Notify AHJ -> record notification ref -> record main drain test -> close
- Each step has a brief annotation explaining what's happening
- On successful closure: show the generated Impairment Packet
- Button: "See the Result"

**Step 6: "The Impairment Packet"**
- Show the completed audit packet (reuse ImpairmentPacket component)
- Highlight: "This document answers every question from Marshal Reyes, Continental Mutual, and Worth Patel"
- Button: "Back to Dashboard" (trigger demo reset)

### 6.3 — Navigation: Walkthrough entry point
- [ ] Add "Cedar Heights Demo" button to NavBar
- [ ] Add view type in App.tsx: `{ type: "walkthrough" }`
- [ ] Optional: first-load banner — "First time? Walk through the Cedar Heights scenario"

### 6.4 — Notebook comparison data
- [ ] Hardcoded data structure in the component (no API needed) with Artifact 4 log content
- [ ] Styled as a scanned notebook page — monospace, off-white background, annotations in red

---

## Component Structure

```
Walkthrough.tsx
  WalkthroughStep (generic wrapper with progress bar)
  NotebookView (styled Artifact 4 content)
  Uses existing:
    ActiveCard / enforcement badges (Phase 2)
    NewImpairmentWizard (steps 4-5, prefilled)
    ImpairmentPacket (step 6)
```

---

## Key Design Decisions

- Uses the REAL UI components with real data, not screenshots
- Steps 4-5 are interactive — evaluator actually clicks through the wizard
- Demo reset at the end restores the broken state for re-runs
- Keep text short. One or two sentences per step. The UI does the talking.
