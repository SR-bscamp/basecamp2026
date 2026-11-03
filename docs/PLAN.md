# Compass — an onboarding copilot (hackathon plan)

60 minutes. Team of three. Everything here is mock data. This repo is **public**: no keys, no real company or client data, no course exercise files.

## 1. The idea

New hires get lost in the first two weeks: which systems do I need, which booking code do I use, why is my VPN broken. **Compass** is an onboarding copilot that knows *your department's* playbook and can *see your screen*.

- **Pick your department** (IT, HR, Consultants, Finance & Booking Codes) and role. You get a personalized Day 1 / Week 1 / Month 1 checklist with a progress ring.
- **Ask anything.** Answers come only from the mock company documents, with citations. When the docs don't cover it, Compass says so and offers to open a ticket. It never invents an answer.
- **Upload a screenshot** (VPN error, MFA prompt, timesheet, benefits page). Compass identifies the screen, explains what to do next, cites the doc, and ticks the matching checklist item.
- **Booking-code coach.** A deterministic lookup tool answers "what code do I book training time to?" and refuses to invent codes.
- **Under the hood** panel shows model, tokens, cache hits, cost and latency per answer.
- **Quality tab.** A real eval suite scores the agent, with before/after prompt scores. This is the flex: we built it, then measured it.

## 2. Demo script (3 minutes — build backwards from this)

1. Pick **Consultants → Analyst**. Checklist appears, progress ring at 0%.
2. Ask: "Which booking code do I use for internal training?" Tool call, exact code, citation chip.
3. Ask for a code that does not exist. Compass refuses to guess. *(Same lesson as the "shoes" eval.)*
4. **Upload the VPN-error screenshot.** Compass names the screen, gives 3 steps, cites the IT doc, ticks "Set up VPN".
5. Ask something the docs don't cover. Honest "I don't know", plus an inline ticket card routed to HR or IT.
6. Open **Under the hood**: model, cache-read tokens, cost per answer in fractions of a cent.
7. Open **Quality**: N tasks, 3 runs, pass rate by department, and "original prompt X% to final prompt Y%", plus a deliberately bad prompt scoring low to prove the eval can fail.

## 3. Architecture

```
React + Vite + Tailwind  ──HTTP/JSON──▶  FastAPI (Python)  ──▶  Anthropic API
   (lane A)                                (lane B)               Haiku 4.5 default
        ▲                                      │
        │                              knowledge/*.md  (one shared cached prefix)
        └── reads eval_results/latest.json     data/*.json (booking codes, checklists, contacts)
                       ▲
                evals/run.py (lane C)
```

Key decisions (several came from an advisor review):

| Decision | Why |
|---|---|
| **One shared cached prefix** holding *all* departments' docs; the department goes in the user turn | Haiku needs a ≥ 4096-token prefix to cache. Per-department docs may be too small, which would make the cache flex show zero. |
| **Actions are tool calls** (`tick_checklist`, `lookup_booking_code`, `create_ticket`, `find_contact`); the reply is prose + a small JSON envelope | Avoids streaming partial JSON, a time sink. Tool results are deterministic and easy to eval. |
| **Streaming is P1**, non-streaming first | A 2-second spinner demos fine. Ship it working, then upgrade. |
| **Model choice decided by the eval, not by opinion** | The eval runs the same tasks on Haiku 5.5, Haiku 4.5, Sonnet 5.5 and Opus 5.5 and reports pass rate, cost and latency per model; the default is the best pass rate per dollar. Verified on the course key: all four accept text and images. |
| **No vector DB** | Docs are small. Whole-prefix caching is simpler and is the Day 2 lesson. |
| **In-memory state** (checklist, tickets) | No database setup; fine for a demo. |

## 4. Scope and cut lines

- **P0 (must work by minute 40):** department picker, checklist, text chat with citations, screenshot upload, booking-code tool, honest-abstain behaviour, fixture-driven UI.
- **P1 (minute 40–52):** Under-the-hood panel, Quality tab fed by real eval results, ticket card, streaming prose.
- **P2 (only if ahead):** manager dashboard, timesheet-screenshot check, proactive nudges.
- **Cut if behind:** Sonnet routing, 5-run stability (use 3), tickets tab (inline card only).

## 5. Eval design (the flex)

~25 tasks, grouped by department. Reuse the Day 2 harness shape: task → runner → graders → results.

- **Deterministic graders:** `response_contains` (exact codes, dates), `tool_used` (booking lookup called), `response_not_contains` / `tool_not_used` (never invent a code, don't call the ticket tool for answerable questions).
- **Abstain tests:** questions with no doc support must produce "I don't know" and a ticket.
- **LLM judge** for open-ended answers. Each check carries its own ground truth, `reason` before `verdict`, 3 votes. Validate it first against ~10 hand-labelled responses.
- **Screenshot tasks:** each mock screenshot has an expected screen name and an expected checklist item.
- **Runs:** 3 per task (5 if time). Report pass rate and consistent-vs-flaky.
- **Model matrix:** same tasks, same prompt, four models. The Quality tab shows pass rate, average cost per answer and p50 latency per model, with a best-value pick, so model choice is justified by data.
- **Before/after:** score a deliberately naive prompt vs the final prompt. Also run a "bad" agent to prove the eval can fail.

Lessons we are reusing on purpose: grade the outcome not the means; validate the judge before trusting it; one change per run; a perfect score means test the test.

## 6. Timeline (60 min)

| Minutes | Everyone | Lane A (frontend) | Lane B (backend/agent) | Lane C (content/evals) |
|---|---|---|---|---|
| 0–10 | Agree CONTRACT.md, commit fixture, create `.env` locally | A1 scaffold | B1 skeleton serving the fixture | C1 start docs |
| 10–40 | | A2–A5 against the fixture | B2–B5 real agent | C1–C4 content, data, screenshots, eval tasks |
| 40–52 | Integrate: flip UI from fixture to live API | A6–A8 | B6–B9 | C5–C8 eval runs and judge |
| 52–60 | Demo rehearsal x2, freeze, record backup video | | | |

**Fallback:** if the live API fails at minute 50, the UI still runs on the fixture (`?mock=1`). Record a 60-second screen capture as insurance.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Integration at minute 40 breaks | Contract + fixture frozen at minute 10; UI built against the fixture first |
| Cache shows zero hits in the demo | One shared prefix ≥ 4096 tokens; B2 asserts the token count at startup |
| Rate limits (3 devs + eval runs share one key) | Eval runs 3x, concurrency ≤ 3; don't run evals while rehearsing the demo |
| Haiku vision weak on screenshots | B9 tests 3 screenshots at minute 35; switch to Sonnet only for the image path if needed |
| Key leaks into a public repo | `.gitignore` has `.env`; each person creates their own `.env` locally; never paste the key in chat or commit it |

## 8. Repo layout

```
basecamp2026/
  docs/            PLAN.md, CONTRACT.md, TICKETS.md, fixtures/
  backend/         FastAPI app, agent loop, tools
  frontend/        Vite + React + Tailwind
  knowledge/       mock docs per department (markdown)
  data/            booking_codes.json, checklists.json, contacts.json
  screenshots/     mock screenshots for demo and evals
  evals/           tasks.jsonl, graders, judge, run.py
  eval_results/    latest.json (committed so the Quality tab works offline)
```

## 9. Open questions for the team

1. ~~Lane owners~~ Decided: A frontend = G (Giraldo, using Claude Opus 5.5), B backend/agent = Salmaan, C content and evals = Chase.
2. Fictional company name for the mock docs. (Suggest "Northwind Advisory", clearly fictional.)
3. ~~Is the course-issued key allowed for the hackathon?~~ Confirmed authorized. Still watch the shared rate limit (three people plus eval runs).
