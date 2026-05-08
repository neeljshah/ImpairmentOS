# ImpairmentOS — Master Build Plan

## Current State (verified 2026-05-08)

**Working:**
- FastAPI backend (SQLite, Alembic, `transitions` state machine)
- React/Vite/Tailwind frontend: Dashboard, 7-step wizard, ImpairmentPacket view
- 3 jurisdictions seeded (Hartwell 2017/notify-all, Wessex 2014/4hr-threshold, Dunmoor 2020/30min)
- 2 properties, 5 systems, 2 impairments (Cedar Heights broken, Wessex clean closed)
- State machine blocks closure when compliance requirements unmet
- Audit packet renders timeline, compliance checklist, event log
- Frontend dist is pre-built

**Port configuration (actual):**
- Backend: port 8001 (api.ts BASE = `http://localhost:8001`)
- Frontend dev: port 5173 (Vite default)
- CORS: config.py allows `localhost:5173` and `localhost:3000`

**Not working / missing:**
- Only 2 impairments — Dunmoor has zero data, dashboard feels empty
- No records export (the packet's central crisis — 7 parties demanding records)
- No property-level compliance overview (Jenna Cortez's use case)
- No deficiency tracking (Artifact 5 standpipe thread unaddressed)
- No guided walkthrough (evaluator must discover enforcement on their own)
- Enforcement violations not visible enough on dashboard (have to click into wizard)
- No GitHub repo, no README, no deployment
- No demo reset capability
- Print/PDF is just `window.print()` with no print styles
- CORS config only lists :5173 and :3000 (correct for dev — these are frontend origins)

---

## Build Order (8 phases, ~12 hours total)

Each phase produces a demoable improvement. No phase depends on a later phase. Phases 1-3 and 6 are critical. Phases 4-5 are high-value. Phases 7-8 are ship-ready polish.

| Phase | Name | Time | What It Unlocks |
|-------|------|------|-----------------|
| 1 | Seed Data | 45 min | Dashboard feels real, 3 jurisdictions demo'ed |
| 2 | Enforcement Visibility | 1 hr | State machine power obvious from dashboard |
| 3 | Records Export | 1.5 hrs | The killer feature the packet screams for |
| 4 | Property Overview | 1.5 hrs | Portfolio view — Jenna Cortez's screen |
| 5 | Deficiency Tracking | 1.5 hrs | Catches Artifact 5 thread |
| 6 | Cedar Heights Walkthrough | 2 hrs | Guided demo that sells the product |
| 7 | Polish & Ship | 1.5 hrs | Print styles, demo reset, port fixes |
| 8 | GitHub & Deploy | 1.5 hrs | README, git init, Vercel/video |

**Total: ~12 hours**

### Minimum Viable Submission (if short on time)
- Phase 1 (seed data) — 45 min
- Phase 2 (enforcement visibility) — 1 hr
- Phase 7 (polish) — 1 hr
- Phase 8 (GitHub/deploy) — 1.5 hrs
= **~4.5 hours** for the highest-impact improvements

---

## Phase Details

| Phase | Plan File |
|-------|-----------|
| 1 | [PLAN-1-seed-data.md](PLAN-1-seed-data.md) |
| 2 | [PLAN-2-enforcement-visibility.md](PLAN-2-enforcement-visibility.md) |
| 3 | [PLAN-3-records-export.md](PLAN-3-records-export.md) |
| 4 | [PLAN-4-property-overview.md](PLAN-4-property-overview.md) |
| 5 | [PLAN-5-deficiencies.md](PLAN-5-deficiencies.md) |
| 6 | [PLAN-6-walkthrough.md](PLAN-6-walkthrough.md) |
| 7 | [PLAN-7-polish.md](PLAN-7-polish.md) |
| 8 | [PLAN-8-github-deploy.md](PLAN-8-github-deploy.md) |

> All plan files now exist. Old numbered duplicates have been deleted.

---

## Key Files Reference

**Backend (edit these):**
- `backend/seed.py` — seed data (Phase 1)
- `backend/app/routes/` — API endpoints
- `backend/app/models/` — SQLAlchemy models
- `backend/schemas.py` — Pydantic request/response schemas
- `backend/state_machine.py` — compliance enforcement engine
- `backend/main.py` — FastAPI app + router registration
- `backend/app/config.py` — settings (CORS origins, ports)
- `backend/database.py` — DB session

**Frontend (edit these):**
- `frontend/src/App.tsx` — view routing (add new views here)
- `frontend/src/api.ts` — API client (BASE URL, type definitions)
- `frontend/src/components/Dashboard.tsx` — main dashboard
- `frontend/src/components/NewImpairmentWizard.tsx` — 7-step wizard
- `frontend/src/components/ImpairmentPacket.tsx` — audit packet view
- `frontend/src/components/NavBar.tsx` — navigation
- `frontend/src/utils.ts` — formatters and helpers
- `frontend/src/index.css` — global styles (add print styles here)

**Do not touch:**
- `backend/venv/` — Python virtual environment
- `frontend/node_modules/` — npm packages
- `backend/alembic/` — existing migrations (add new ones if needed)

---

## Contradiction Reference (keep handy for walkthrough & report)

| # | What | Artifacts | Demo Point |
|---|------|-----------|------------|
| C1 | Standpipe filed clean, known deficient | 3 vs 5 | Deficiency not on ITM report |
| C2 | Fire pump passed on paper, failed post-incident | 3 vs 1 | "SATISFACTORY" means nothing |
| C3 | Main drain claimed done, no AHJ record | 4 vs 1 | Documentation vs. reality |
| C4 | Mike's 4hr rule vs Hartwell's zero threshold | 4,8 vs 1 | Personal convention ≠ law |
| C5 | AHJ's own inspector missed the standpipe | 2 vs 1 | Leverage for Beacon's defense |
| C6 | Battery records describe hardware that's gone | 7 vs 1 | Ghost records |
| C7 | Quarterly report format hides depth of work | 8 vs 3 | Systemic form-design problem |

---

## Old Files (superseded — do not use)

- `Project_Plan.md` — replaced by this file
- `Architecture_v2.md` — reference only
- `Implementation_Sprints.md` — superseded
- `Data_Migration_Plan.md` — already done
- `Testing_Suite.md` — aspirational, not blocking
- Old duplicate plan files (PLAN-2-records-export, PLAN-3-property-overview, etc.) — deleted 2026-05-08
