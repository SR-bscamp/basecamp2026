# Frontend feedback for Lane A (G): read this before your next change

## Straight talk
**It looks like AI slop. It's ugly, and it is not demo-ready.**

It is the default AI-generated dashboard: near-black background, one violet accent, a soft glow, the same rounded card with a hairline border on every surface, pill badges and tiny uppercase labels everywhere, unicode glyphs standing in for icons (`◆ ⌖ ⎘ ⚙ ✉ ↗`), no real typographic point of view, and everything at the same visual weight. Judges have seen this exact look a hundred times. It is competent and completely forgettable, and this is the part of the product everyone judges first.

The structure and the code are fine: keep the components, the contract types and the fixture toggle. **The visual design needs to be thrown out and redone.**

## What to do, in this order
1. **Use the `frontend-design` skill before you touch any code.** Invoke it in Claude Code and follow it. Do not skip this step.
2. **Commit to a bold, distinctive direction** that is genuinely different from "dark dashboard with an accent colour". Pick one, no hedging. Write it in `frontend/DESIGN.md` in 10 lines or fewer, replacing the current note.
3. **Fix the specific tells:**
   - **Icons:** replace every unicode glyph with a proper SVG icon set (Lucide or Phosphor) or custom marks.
   - **Type:** choose a real display + text typeface pairing and use scale, weight and tracking to build hierarchy.
   - **Hierarchy:** one hero per screen at a drastically different size from everything else, with real whitespace. Strip the cards, borders and pills down to the few that earn their place.
   - **Identity:** each department should feel different (layout, imagery, texture), not just a different accent hex.
   - **Moments:** design the picker, the first load, the ring completing and a checked item, not just the happy path.
   - **Chat answer card:** stop stacking pills. Make the answer, the steps and the citations read as one designed object.
4. **Time-box it: 20 minutes.** Redo only what judges see in the 3-minute demo: the department picker, the main screen (checklist + chat) and the Quality tab. Don't polish anywhere else.
5. **Don't break behaviour.** Keep every P0 working and keep `VITE_USE_FIXTURE=1` working.

## Backend integration checklist (the API is live and verified)
Full details are in `docs/CONTRACT.md` (see "Additions from the backend" and "Off-topic questions, tool trace and streaming"). Run the backend per the README and set `VITE_USE_FIXTURE=0` to test live.
- [ ] **Off-topic answers:** `off_topic: true` means a playful deflection ("What is the purpose of life?" gets "create shareholder value"). Style it as fun: **no confidence pill, no "create a ticket" nudge.** Fixture: `docs/fixtures/chat_response_offtopic.json`.
- [ ] **Streaming:** use `POST /api/chat/stream` (SSE). Show tool events as live status ("Looking up booking codes…"), type the reply as `delta` arrives, and replace it with the `final` envelope.
- [ ] **Tool trace:** show `tool_calls` (what Compass actually did) in the answer or the Under the hood drawer.
- [ ] **Session:** pass `session_id` on `GET /api/checklist`, persist manual ticks with `POST /api/checklist/toggle`, and have the reset button call `POST /api/session/reset`.
- [ ] **Models:** the backend accepts `claude-haiku-5-5`, `claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-opus-5-5`, `claude-opus-4-8` (list at `GET /api/models`). The hard-coded fallback default `claude-haiku-4-5` in `App.tsx` should be `claude-haiku-5-5`; the real default comes from `/api/health`.
- [ ] **Extras:** suggestions from `GET /api/suggestions?dept=`, full doc text for citation chips from `GET /api/docs/{path}`, session totals and cache hit rate from `GET /api/usage`.
