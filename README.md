# ImpairmentOS

**Jurisdiction-aware fire protection impairment management with state-machine enforcement.**

When a fire suppression system goes offline, contractors need documentation that survives regulatory and legal scrutiny — not a notebook entry reconstructed after the fact. ImpairmentOS enforces the compliant workflow as the only path, producing an audit-ready Impairment Packet as a byproduct of doing the work.

## What It Demonstrates

- **State machine enforcement** — the system cannot advance to CLOSED if AHJ notification is missing for a jurisdiction that requires it. Blocked transitions, not warnings.
- **Jurisdiction rules engine** — each property knows its local fire code edition, AHJ contact, notification thresholds, and drain test requirements. Rules adapt to the property; the technician doesn't have to remember them.
- **Impairment Packet** — a structured audit document generated at closure: timestamped timeline, compliance checklist, immutable event log, jurisdiction details.
- **Records export** — generate all impairment records for a property in a date range, formatted for legal discovery, AHJ requests, or carrier audits.
- **Property portfolio view** — compliance status across all managed properties: red (violations), amber (active), green (clear).
- **Deficiency tracking** — field deficiencies tied to properties and systems, with ITM-report linkage.
- **Guided walkthrough** — interactive Cedar Heights demo showing what went wrong and how the system prevents it.

## Quick Start

**Prerequisites:** Python 3.11+, Node.js 18+

**Option 1 — Windows one-click:**
```
start.bat
```

**Option 2 — Manual:**

```bash
# Backend (port 8001)
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Frontend (port 5173, new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — the database seeds automatically on first backend start.

**API docs:** `http://localhost:8000/docs`

## Demo Walkthrough

1. **Dashboard** — Cedar Heights shows a red BLOCKED badge with 2 violations. Dunmoor shows an active, compliant fire watch.
2. **Enforcement** — Click "Take Action" on Cedar Heights → navigate to Close → see the state machine block closure with a violation list.
3. **Fix it** — Record AHJ notification + main drain test PSI → closure succeeds → Impairment Packet generated.
4. **Export Records** — NavBar → "Export Records" → select Cedar Heights + 3-year range → structured document for all 7 demanding parties.
5. **Properties tab** — portfolio compliance status across all 4 properties.
6. **Cedar Heights Demo** — NavBar → "▶ Cedar Heights Demo" → 6-step guided walkthrough from field notebook to audit packet.

**Reset to broken state at any time:** NavBar → "↺ Reset Demo"

## Tech Stack

- **Backend:** FastAPI, SQLite, SQLAlchemy, Alembic, `transitions` state machine
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Architecture:** REST API with jurisdiction-aware compliance rules stored in the database. State transitions are validated server-side by `ImpairmentStateMachine` before any database write. The Impairment Packet is generated on-demand from the event log — it cannot be edited after the fact.

## Project Structure

```
backend/
  main.py               # FastAPI app + router registration
  seed.py               # Demo data (3 jurisdictions, 4 properties, 5 impairments)
  state_machine.py      # Compliance enforcement engine
  app/
    models/             # SQLAlchemy models
    routes/             # API endpoints
    services/           # Business logic (packet generation, impairment ops)

frontend/
  src/
    App.tsx             # View routing
    api.ts              # API client + TypeScript types
    components/         # Dashboard, Wizard, Packet, Export, Overview, Walkthrough
    utils.ts            # Formatters and helpers
```
