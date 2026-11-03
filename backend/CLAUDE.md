# backend/ — Lane B (owner: Salmaan)

Adds to the root `CLAUDE.md`. Tickets: B1–B8 in `docs/TICKETS.md`.

## Shape
FastAPI app + Anthropic SDK. Suggested layout:
```
backend/
  app/main.py        # FastAPI app, CORS (localhost:5173), routes
  app/agent.py       # agent loop (while stop_reason == "tool_use")
  app/tools.py       # lookup_booking_code, tick_checklist, find_contact, create_ticket
  app/knowledge.py   # loads knowledge/**/*.md into ONE cached system prefix
  app/pricing.py     # PRICING table from docs/CONTRACT.md + cost_usd()
  app/state.py       # in-memory checklist + tickets per session_id
  requirements.txt   # or pyproject.toml
```

## Rules for the agent
- **One shared cached prefix** holding all departments' docs (each tagged with its path so citations work). The department and role go in the **user turn**, never the cached prefix. Put `cache_control: {"type": "ephemeral"}` on the prefix.
- Log the prefix token count and `cache_creation_input_tokens` / `cache_read_input_tokens` on the first two calls. **Warn, don't fail**, if the prefix is below the model's cache minimum (the minimum for the 5.5 models is unverified; check usage at runtime).
- **Actions are tool calls**; the final reply is prose plus the contract's JSON envelope. Don't stream partial JSON (streaming prose is a P2).
- Tool descriptions must be specific (what it does, input format, what "not found" returns). The agent must **never invent** booking codes, names, dates or policies; unknown means `confidence: "low"` and offer a ticket.
- `POST /api/chat` accepts an optional `model` (default `MODEL` in `.env`). Evals and the UI model switcher depend on this.
- Images arrive as `image_b64` + media type; send them as an image content block. Fill `screen_identified` and `steps`.
- Compute `usage.cost_usd` with the pricing table, and `latency_ms` with a wall-clock timer around the whole request.

## Safety
- Load the key from `.env` only; never log it, echo it, or return it to the client. Return `{ "error": "..." }` with a human message, never raw model or stack traces.
- CORS: allow only `http://localhost:5173` (and the demo host if any).
- `?mock=1` on `/api/chat` returns `docs/fixtures/chat_response.json` so the frontend is never blocked.

## Verify before you say done
Booking-code question calls the tool and returns the real code; unknown project returns not-found and the reply says so; a second identical request shows cache reads; the VPN-error PNG returns the right screen name.

## Off-topic persona (implemented)
Unrelated questions get a deadpan buzzword-consultant one-liner plus a nudge back to onboarding; the envelope sets `off_topic: true` and the backend enforces no ticket, high confidence, no citations. Undocumented *onboarding* questions are not off-topic. Rules live in `RULES` in `app/agent.py`; keep the two cases distinct when editing.
