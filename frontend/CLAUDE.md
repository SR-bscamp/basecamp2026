# frontend/ — Lane A (owner: G, Claude Opus 5.5)

Adds to the root `CLAUDE.md`. Tickets: A1–A9 in `docs/TICKETS.md`.

## Your job: a UI that makes judges lean forward
You are running on Opus 5.5, so use it for taste and invention. **Before writing code, brainstorm 3 distinct design directions, pick one, and write a 10-line design note in `frontend/DESIGN.md`** (5 minutes max). Think outside the box: a plain chat box plus a checklist is the floor, not the goal.

Study the best and borrow on purpose:
- **Linear**: speed, keyboard-first, crisp motion, restrained palette.
- **Bevel**: soft gradients, data that feels calm and beautiful.
- **Oura**: one glanceable score, rings, readiness, progress as identity.
- Also look at Arc, Raycast, Things, Stripe docs.

Ideas worth stealing or improving: a daily **readiness ring**, a **per-department color identity**, a **⌘K command palette** (jump or ask), a satisfying "step done" animation, a Day 1 / Week 1 / Month 1 **timeline**, ambient micro-interactions, a screenshot drop zone that feels like magic, a **model switcher** with live cost and latency, and a Quality tab where the numbers look as good as the product.

## Technical guardrails
- Vite + React + TypeScript (strict) + Tailwind, in this directory.
- Build against `docs/fixtures/chat_response.json` and `eval_results/latest.json` first. `VITE_USE_FIXTURE=1` must keep working; default API base is `http://localhost:8000`.
- Follow `docs/CONTRACT.md` exactly (field names, shapes). If the UI needs something the contract lacks, ask Salmaan (backend) and update the contract together.
- Show a visible **"sample data"** badge on the Quality tab while `_fixture` is true.
- Handle errors with a toast and keep the conversation; loading states everywhere; works on a laptop screen at demo scale.
- Spend creativity where the 3-minute demo script (in `docs/PLAN.md`) will show it. P0 tickets first, flourishes after.
- Don't edit files outside `frontend/` (except via the contract process).
