# Compass — an onboarding copilot (basecamp2026)

A department-aware onboarding assistant: pick **IT, HR, Consultants or Finance & Booking Codes**, get a personalized checklist, chat with an agent grounded in company docs (with citations), upload a **screenshot** and be told what to do, and see a **Quality tab** that proves it works: an eval suite plus a model comparison (pass rate, cost and latency per model).

Hackathon project, team of three. **Everything here is mock data for a fictional company. This repo is public: never commit keys or real data.**

| Lane | Owner | Folders |
|---|---|---|
| A · Frontend | G (Giraldo), Claude Opus 5.5 | `frontend/` |
| B · Backend / agent | Salmaan | `backend/` |
| C · Content + evals | Chase | `knowledge/` `data/` `screenshots/` `evals/` `eval_results/` |

## Start here
1. `docs/PLAN.md` — idea, demo script, architecture, scope tiers
2. `docs/CONTRACT.md` — frozen API contract + model pricing
3. `docs/TICKETS.md` — 25 tickets, each paste-ready for Claude Code
4. `CLAUDE.md` (root) and the `CLAUDE.md` inside your lane's folder

## Setup (everyone, ~2 minutes)
```bash
git clone https://github.com/SR-bscamp/basecamp2026.git
cd basecamp2026
git checkout -b lane-a   # or lane-b / lane-c
```
Create a local `.env` in the repo root (it is gitignored; **never commit it**):
```bash
ANTHROPIC_API_KEY=        # paste your key here, locally only
MODEL=claude-haiku-5-5    # default model; the evals decide the final choice
VITE_USE_FIXTURE=1        # 1 = frontend reads fixtures instead of the backend
# ANTHROPIC_BASE_URL=     # leave unset for the direct Anthropic API
```
If your shell exports `ANTHROPIC_BASE_URL` for another tool, unset it for this project, or the key is sent to the wrong endpoint.

## Run (available as the lane tickets land)
```bash
# backend (after ticket B1)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# frontend (after ticket A1)
cd frontend && npm install && npm run dev      # http://localhost:5173

# evals (after ticket C5)
python3 evals/run.py                            # writes eval_results/latest.json
```

## Repo map
```
CLAUDE.md          shared rules for every Claude Code session
docs/              PLAN, CONTRACT, TICKETS, fixtures/
frontend/          Vite + React + TS + Tailwind        (Lane A)
backend/           FastAPI + Anthropic SDK             (Lane B)
knowledge/         mock company docs per department    (Lane C)
data/              booking codes, checklists, contacts (Lane C)
screenshots/       mock screenshots for demo + evals   (Lane C)
evals/             tasks, graders, judge, runner       (Lane C)
eval_results/      latest.json (sample data until C5 runs)
```

## Status
- [x] Plan, contract, tickets, fixtures
- [ ] Lane A P0: picker, checklist, chat UI, upload
- [ ] Lane B P0: API, agent + tools, screenshot path, guardrails
- [ ] Lane C P0: data, core docs, screenshots, 12 eval tasks, runner
- [ ] Integration at minute 40, feature freeze at minute 50, rehearsal at 55
