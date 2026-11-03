# CLAUDE.md — Compass (basecamp2026)

Shared instructions for every teammate's Claude Code session in this repo. Lane folders have their own `CLAUDE.md` that adds to this one.

## What we're building
**Compass**: a department-aware onboarding copilot (IT, HR, Consultants, Finance & Booking Codes). Pick a department, get a checklist, chat with an agent grounded in mock docs (with citations), upload a screenshot and get told what to do, and see a Quality tab that proves it works (eval suite + model comparison). 60-minute hackathon, team of three.

> **Lane A (frontend): read `docs/FRONTEND_FEEDBACK.md` before your next change.** The current UI needs a full visual redo.

## Read in this order
1. `docs/PLAN.md` — the idea, demo script, architecture, scope tiers (P0/P1/P2)
2. `docs/CONTRACT.md` — the **frozen API contract**, JSON shapes, model pricing
3. `docs/TICKETS.md` — your lane's tickets, each paste-ready
4. The `CLAUDE.md` in the folder you are working in

To start a ticket, tell Claude: *"Read docs/PLAN.md and docs/CONTRACT.md, then implement ticket B3 from docs/TICKETS.md."*

## Who owns what
| Lane | Owner | Directories (only edit these) |
|---|---|---|
| A · Frontend | G (Giraldo), on Claude Opus 5.5 | `frontend/` |
| B · Backend / agent | Salmaan | `backend/` |
| C · Content + evals | Chase | `knowledge/`, `data/`, `screenshots/`, `evals/`, `eval_results/` |
| Shared | all | `docs/`, root files: tell the others before changing the contract, fixtures or this file |

Staying in your own directories is what prevents merge conflicts. If you need something from another lane, ask them (or change the contract with notice).

## Hard rules
1. **This repo is public.** Never commit `.env`, keys, tokens, real company/client/personal data, or course exercise files. Everything is a fictional company ("Northwind Advisory").
2. The API key lives **only** in your local `.env` (copy the template from `README.md`). Never paste it in chat, code, docs or logs.
3. **The contract is frozen** (`docs/CONTRACT.md` + `docs/fixtures/` + `eval_results/latest.json`). Build to it. Changing it needs a heads-up to the other two lanes in the same commit message.
4. **Fixtures first.** The UI must always demo: keep `VITE_USE_FIXTURE=1` working. `eval_results/latest.json` with `"_fixture": true` is sample data; the UI labels it as such.
5. **Mock data only, but never fake results.** Real eval numbers must come from `evals/run.py`; never hand-edit scores to look better.
6. The agent must never invent booking codes, names, dates or policies: it answers from the docs and tools or says it doesn't know.

## Git workflow (fast and boring)
- Branches: `lane-a`, `lane-b`, `lane-c`. Commit small and often; push often.
- Merge to `main` when something works: `git pull --rebase origin main`, then push. Because lanes own separate directories, conflicts should be rare.
- Commit messages: `[A3] checklist panel with progress ring` (ticket id first).
- Never force-push `main`. Never commit generated junk (`node_modules`, `.venv`, `dist`, `__pycache__` are gitignored).

## Models and cost
- Default model comes from `.env` `MODEL`. Candidates verified on the course key (text + images): `claude-haiku-5-5`, `claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-opus-5-5`, `claude-opus-4-8`.
- Prices are in `docs/CONTRACT.md` (Pricing). Use that table for `usage.cost_usd`; don't hard-code your own.
- **Model choice is decided by the evals** (pass rate per dollar), not opinion. The Quality tab shows the comparison.
- One shared API key and rate limit: eval runs use concurrency ≤ 3. Don't run evals while rehearsing the demo.

## Conventions
- Backend: Python 3.11+, FastAPI, type hints, small modules. Frontend: Vite + React + TypeScript (strict) + Tailwind.
- Money in USD floats, latency in ms, tokens as integers; JSON field names exactly as in the contract.
- Prefer the simplest thing that works. P0 before P1 before P2. No speculative features.
- Prompt and tool design lessons we already learned: write specific tool descriptions, put volatile content after the cached prefix, grade outcomes not means, validate any LLM judge on labelled examples before trusting it.

## Done means
Works end to end on the demo script in `docs/PLAN.md`, falls back cleanly to fixtures, and nothing secret is in git.
