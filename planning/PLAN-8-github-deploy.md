# Phase 8 — GitHub & Deploy

**Goal:** Get the project on GitHub with a clear README, and optionally deploy or record a demo video.
**Time:** 1.5 hours
**Depends on:** Phase 7 (everything works locally)

---

## Tasks

### 8.1 — Git init and .gitignore
- [ ] `git init` in project root
- [ ] Create `.gitignore`:
  ```
  # Python
  backend/venv/
  __pycache__/
  *.pyc
  *.db

  # Node
  frontend/node_modules/
  frontend/dist/

  # IDE
  .vscode/
  .idea/

  # OS
  .DS_Store
  Thumbs.db

  # Env
  .env
  ```
- [ ] Stage and commit everything

### 8.2 — README.md
- [ ] Project title + one-line description
- [ ] Screenshot or GIF of the dashboard (optional but high-impact)
- [ ] Quick Start:
  ```
  # Backend
  cd backend
  python -m venv venv
  source venv/bin/activate  # or venv\Scripts\activate on Windows
  pip install -r requirements.txt
  uvicorn main:app --port 8001 --reload

  # Frontend
  cd frontend
  npm install
  npm run dev
  ```
- [ ] What it demonstrates:
  - Jurisdiction-aware compliance enforcement
  - State machine that blocks non-compliant closures
  - Audit packet generation
  - Records export (if built)
  - Property portfolio overview (if built)
- [ ] Tech stack: FastAPI, SQLite, React, Vite, Tailwind
- [ ] Architecture overview (1 paragraph, not a diagram)

### 8.3 — Push to GitHub
- [ ] Create repo on GitHub (public or private per submission rules)
- [ ] Push main branch
- [ ] Verify README renders correctly

### 8.4 — Deployment (optional, pick one)

**Option A: Railway + Vercel (live demo)**
- [ ] Backend on Railway (free tier):
  - Add `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Add `requirements.txt` if not present
  - Set environment variables
- [ ] Frontend on Vercel:
  - `cd frontend && npm run build`
  - Deploy `dist/` folder
  - Update `api.ts` BASE to point to deployed backend URL
- [ ] Add live URLs to README and SUBMISSION_REPORT.md

**Option B: Demo video (simpler, equally effective)**
- [ ] Record 2-3 minute walkthrough:
  1. Dashboard overview (30s)
  2. Try to close Cedar Heights — show enforcement blocking (30s)
  3. Fix violations and close successfully (30s)
  4. Show the generated audit packet (15s)
  5. Export records (15s, if built)
  6. Property overview (15s, if built)
- [ ] Upload to YouTube (unlisted) or include as MP4 in submission
- [ ] Add link to README

### 8.5 — Final submission checklist
- [ ] GitHub repo is accessible
- [ ] README has clear setup instructions
- [ ] SUBMISSION_REPORT.md is current
- [ ] Either live URL works OR video is recorded
- [ ] Clean commit history (doesn't need to be perfect, just not embarrassing)
