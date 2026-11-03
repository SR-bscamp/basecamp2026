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
# backend (Lane B: ready). Creates its venv on first run, serves on :8000
./backend/run.sh
curl -X POST localhost:8000/api/warm                 # pre-warm the prompt cache before a demo
backend/.venv/bin/python backend/scripts/smoke.py    # live pre-flight check

# frontend (after ticket A1)
cd frontend && npm install && npm run dev      # http://localhost:5173

# evals (C5; needs the backend running on :8000)
python3 evals/run.py --runs 1                   # live; writes eval_results/latest.json
python3 evals/run.py --models claude-haiku-5-5,claude-haiku-4-5,claude-sonnet-5-5,claude-opus-5-5 --runs 3
python3 evals/run.py --mock good                # offline plumbing check; never touches latest.json

# offline tests of the LLM judge plumbing (fake client, no API calls)
python3 evals/test_judge.py
# measure judge/human agreement for real (needs ANTHROPIC_API_KEY; writes eval_results/judge_validation.json)
python3 evals/validate_judge.py
```

### What Lane B provides for the eval suite (done)
- **`tool_calls`** in every `/api/chat` response: `[{name, input, ok}]` for each non-terminal tool run.
- **Prompt variants:** send `"variant": "naive" | "final" | "bad"` in the request body (default `final`). `naive` is a bare-bones prompt, `bad` is deliberately terrible (invents answers, never abstains), so ticket C5b's before/after and "deliberately bad" runs can be produced. See `docs/CONTRACT.md`.

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
eval_results/      latest.json (sample data until a real live run replaces it)
```

## Architecture (sketch)
```
React + Vite + Tailwind --HTTP/JSON--> FastAPI agent (tools: lookup_booking_code, tick_checklist,
   (Lane A)                              find_contact, create_ticket) --> Anthropic API
        ^                                  |  one cached prefix = every knowledge/**/*.md
        |                                  |  tools read data/*.json
        +-- reads eval_results/latest.json <-- evals/run.py (tasks.jsonl -> graders.py -> results)
```
Details and decisions: `docs/PLAN.md` section 3.

## Mock content (Lane C)
- `knowledge/`: 15 docs for the fictional Northwind Advisory (IT, HR, Finance, Consultants), about 7.8K tokens by a chars/4 estimate (31K characters; not a measured tokenizer count). The backend logs the true count.
- Deliberate gaps keep the abstain evals honest: parental leave, meal allowances and Chicago Wi-Fi details are not in any document. Do not add them without updating `evals/tasks.jsonl`.
- `data/`: booking codes, checklists (stable ids), contacts. `screenshots/`: three mock screens plus `expected.json`.

## Demo
Use the 3-minute script in `docs/PLAN.md` section 2 (Consultants > Analyst, booking-code lookup, refusal to invent a code, VPN screenshot upload, honest "I don't know" with a ticket, Under the hood panel, Quality tab). Screenshots to upload are in `screenshots/`. Rehearse on fixtures first (`VITE_USE_FIXTURE=1`), then live; do not run evals during rehearsal (shared rate limit). The 60-second backup screen recording is still to be made.

## Status
- [x] Plan, contract, tickets, fixtures
- [ ] Lane A P0: picker, checklist, chat UI, upload
- [ ] Lane B P0: API, agent + tools, screenshot path, guardrails
- [x] Lane C P0: data, core docs, screenshots, 16 eval tasks, runner (runner and graders verified offline with the mock agent only; no live run yet)
- [x] Lane C P1: extra docs (C1b), LLM judge grader + labelled examples + validation script (C6; plumbing tested offline, agreement not yet measured: `judge_validation` stays 0/0)
- [ ] Lane C: live eval runs, model matrix and prompt variants (C5b, needs backend `tool_calls` + variant switch), backup video (C7)
- [ ] Integration at minute 40, feature freeze at minute 50, rehearsal at 55
