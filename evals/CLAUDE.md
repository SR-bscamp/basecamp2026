# evals/ — Lane C (owner: Chase)

Adds to the root `CLAUDE.md`. Tickets: C4–C7 in `docs/TICKETS.md` (content tickets C1–C3 live in `knowledge/`, `data/`, `screenshots/`).

## The flex we're building
A real eval suite plus a **model comparison** that shows how model choice changes pass rate, cost and latency. The Quality tab renders `eval_results/latest.json`, so its shape must match `docs/CONTRACT.md` exactly.

## Design rules (learned the hard way in the Basecamp exercises)
1. **Grade the outcome, not the means.** "Was a tool called?" is a weak check on its own; check the actual answer. Use `tool_used` only where the tool call *is* the requirement (e.g. booking lookup).
2. **Negation matters.** Add `response_not_contains` / `tool_not_used` for "never invent a booking code" and "don't open a ticket for an answerable question".
3. **Abstain tasks:** questions with no doc support must produce "I don't know", `confidence: "low"` and a ticket.
4. **LLM judge** (P1): each check carries its own ground truth (the judge can't see the docs), `reason` before `verdict` in the schema, 3 votes with majority. Before trusting it, validate against ~6–10 hand-labelled responses and record the agreement in `judge_validation`.
5. **Run each task 3 times** (1 run first, 3 when time allows). Separate consistently failing tasks from flaky ones.
6. **Prove the eval can fail:** include a deliberately bad prompt variant; it must score low.
7. **One change per run** when comparing prompts; keep the iteration log.
8. **Never hand-edit results.** `eval_results/latest.json` is overwritten by `evals/run.py`; drop `_fixture` only when it contains real results.

## Files
```
evals/
  tasks.jsonl     # ~12 tasks first: id, dept, query, optional image, graders
  graders.py      # response_contains, tool_used, response_not_contains, tool_not_used, llm_judge
  run.py          # runs tasks (concurrency <= 3), writes eval_results/latest.json
  judge_labels.jsonl   # hand-labelled examples for judge validation
```

## Model matrix (ticket C5b)
Run the same final prompt on `claude-haiku-5-5`, `claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-opus-5-5` (add `claude-sonnet-5` if time). Per model report: pass rate, average cost per answer (pricing table in `docs/CONTRACT.md`), p50 latency, and write them to `model_comparison`. The backend default model should be the best pass rate per dollar.

## Content lane notes (knowledge/, data/, screenshots/)
- Fictional company "Northwind Advisory"; no real organizations, people or numbers.
- Facts must be concrete and checkable (codes, dates, steps, links), consistent with `data/checklists.json` ids and `data/booking_codes.json`.
- Mock docs together should reach roughly 5–6K tokens so caching shows up. Screenshots must be clearly legible; `screenshots/expected.json` maps each PNG to its expected screen name and checklist item.

## Rate limits
One shared key. Concurrency <= 3. Don't run evals while others rehearse the demo.
