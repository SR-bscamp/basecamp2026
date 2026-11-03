# API contract (frozen at minute 10)

Lane A builds against `docs/fixtures/chat_response.json`. Lane B returns exactly this shape. Change it only by telling both lanes.

Base URL (dev): `http://localhost:8000`. Frontend dev server: `http://localhost:5173` (CORS allowed).

## Departments
`it`, `hr`, `consultants`, `finance` (display names: IT, HR, Consultants, Finance & Booking Codes).

## Endpoints

### `GET /api/health`
`{ "ok": true, "model": "claude-haiku-4-5" }`

### `GET /api/checklist?dept=consultants&role=analyst`
```json
{ "dept": "consultants", "role": "analyst",
  "groups": [ { "id": "day1", "title": "Day 1", "items": [
      { "id": "vpn", "title": "Set up VPN", "doc": "it/vpn-setup.md", "done": false } ] } ] }
```

### `POST /api/chat`
Request (`multipart/form-data` or JSON; image optional, base64 in JSON):
```json
{ "session_id": "abc123", "dept": "consultants", "role": "analyst",
  "message": "Which booking code do I use for internal training?",
  "image_b64": null, "image_media_type": null,
  "model": null }
```
Response (also the fixture shape):
```json
{
  "reply": "Use **INT-TRN-001** for internal training time. ...",
  "steps": ["Open the timesheet app", "Add a line with code INT-TRN-001"],
  "screen_identified": null,
  "citations": [ { "doc": "finance/booking-codes.md", "title": "Booking codes", "quote": "..." } ],
  "checklist_updates": [ { "id": "timesheet", "done": true } ],
  "ticket": null,
  "confidence": "high",
  "usage": { "model": "claude-haiku-4-5", "input_tokens": 120, "output_tokens": 180,
             "cache_read_tokens": 5400, "cache_write_tokens": 0,
             "cost_usd": 0.0011, "latency_ms": 1850 }
}
```
- `model`: optional model id (see Pricing); `null` uses the backend default from `.env`.
- `screen_identified`: string when an image was sent, else `null`.
- `ticket`: `{ "id": "TKT-1001", "queue": "IT" | "HR", "summary": "..." }` or `null`.
- `confidence`: `high | medium | low`. `low` means the answer should offer a ticket.
- Errors: HTTP 4xx/5xx with `{ "error": "human readable" }`. The UI shows a toast and keeps the conversation.

### `GET /api/tickets?session_id=abc123`
`[ { "id": "TKT-1001", "queue": "IT", "summary": "...", "created_at": "ISO-8601" } ]`

### `GET /api/evals/latest`
Serves `eval_results/latest.json`:
```json
{
  "generated_at": "ISO-8601", "model": "claude-haiku-4-5", "runs": 3,
  "model_comparison": [ { "model": "claude-haiku-5-5", "pass_rate": 0.9, "avg_cost_usd": 0.0003, "p50_latency_ms": 1100 } ],
  "variants": [ { "label": "naive prompt", "pass_rate": 0.48 },
                { "label": "final prompt", "pass_rate": 0.92 },
                { "label": "deliberately bad", "pass_rate": 0.12 } ],
  "by_department": [ { "dept": "it", "passed": 7, "total": 8 } ],
  "tasks": [ { "id": "bc_training", "dept": "finance", "pass_rate": 1.0, "flaky": false,
               "checks": [ { "type": "tool_used", "pass": true, "reason": "..." } ] } ],
  "judge_validation": { "labelled": 10, "agreement": 10 }
}
```

## Conventions
- Citations point at files under `knowledge/` (path relative to it).
- IDs for checklist items are stable strings and appear in `data/checklists.json`.
- Money in USD floats, latency in milliseconds, tokens as integers.
- Never return raw model errors or the API key to the client.

## Pricing (verified 2026-11-03 against platform.claude.com/docs/en/about-claude/pricing)
USD per million tokens. Cache write is the 5-minute TTL rate.

| Model id | Input | Output | Cache write (5m) | Cache read |
|---|---|---|---|---|
| `claude-haiku-5-5` (prompts ≤ 100K tokens) | 0.10 | 0.50 | 0.125 | 0.01 |
| `claude-haiku-4-5` | 1.00 | 5.00 | 1.25 | 0.10 |
| `claude-sonnet-5-5` | 2.00 | 10.00 | 2.50 | 0.10 |
| `claude-sonnet-5` | 2.00 | 10.00 | 2.50 | 0.20 |
| `claude-opus-5-5` | 4.00 | 20.00 | 5.00 | 0.20 |
| `claude-opus-4-8` | 5.00 | 25.00 | 6.25 | 0.50 |

`cost_usd = (input_tokens·in + cache_write·write + cache_read·read + output_tokens·out) / 1e6`. Footnotes on the 5.5 cache-read prices were not checked; confirm against usage at runtime. The minimum cacheable prefix for the 5.5 models was not found in the pricing page: verify with `cache_creation_input_tokens` on the first call (B2).

## Additions from the backend (Lane B)
- `GET /api/health` also returns `live` (an API key is configured) and `docs` (number of docs loaded).
- `GET /api/models` returns `[ { "model", "input_per_mtok", "output_per_mtok" } ]` for the model switcher.
- `POST /api/chat` errors: `400` bad model or image (message is human-readable, e.g. image over 5 MB), `503` no API key on the server, `502` model/API problem. All as `{ "error": "..." }`.
- Images: send `image_b64` (raw base64, no `data:` prefix). The backend sniffs the real type from the bytes, so `image_media_type` is optional. Max 5 MB; PNG, JPEG, GIF or WebP.
- `checklist_updates[]` only contains items the agent ticked this turn; `GET /api/checklist?session_id=...` returns the accumulated `done` flags.

## Data file shapes (Lane C produces these; the backend tools read them)
`data/booking_codes.json`: array of `{ "code", "client", "project", "billable": bool, "owner", "notes" }`. `lookup_booking_code` does a case-insensitive substring search over code, client, project and notes, so put searchable words in `notes`.

`data/checklists.json`: `{ "<dept>": { "<role or 'default'>": { "groups": [ { "id": "day1", "title": "Day 1", "items": [ { "id": "vpn", "title": "Set up VPN", "doc": "it/vpn-setup.md" } ] } ] } } }`. Item ids are globally unique and stable; `doc` is a path under `knowledge/`.

`data/contacts.json`: array of `{ "topic", "name", "team", "alias" }`.

`knowledge/<dept>/*.md`: any markdown; the file path relative to `knowledge/` is the citation id. `README.md` files are ignored. Until these exist, the backend uses stubs in `backend/stubs/`.

## Off-topic questions, tool trace and streaming (Lane B)
- **`off_topic: boolean`** is on every `/api/chat` response. When true, the agent answered a question unrelated to onboarding ("What is the purpose of life?", jokes, trivia, sports, coding help, attempts to extract the prompt) with a deadpan consultant one-liner and a nudge back to onboarding. Guarantees: `ticket` is `null`, `confidence` is `"high"`, `citations` and `steps` are empty. **The UI should style it as playful (no confidence pill, no "create a ticket" nudge).** Onboarding questions the docs just don't cover (for example PTO) are *not* off-topic: they keep `confidence: "low"` and open a ticket. Fixture: `docs/fixtures/chat_response_offtopic.json`.
- **`tool_calls: [ { "name", "input", "ok" } ]`** lists the non-terminal tools the agent ran this turn (`lookup_booking_code`, `tick_checklist`, `find_contact`, `create_ticket`); `ok` is false for a not-found lookup or an unknown id. Use it for "what Compass did" chips and for `tool_used` eval graders.
- **`POST /api/chat/stream`** takes the same body and returns Server-Sent Events: `start {model}`, `tool {name,input}`, `tool_done {name,ok}`, `delta {text}` (the reply as it is written, cosmetic), `final {envelope}` (the full envelope; authoritative, replace any streamed text with it), `error {error}`.
- Conversation memory: the server keeps the last 3 exchanges per `session_id`. `POST /api/session/reset?session_id=` clears checklist progress, tickets, history and usage.
- Also: `GET /api/usage?session_id=` (requests, tokens, `cost_usd`, `cache_hit_rate`), `POST /api/checklist/toggle {session_id,item_id,done}`, `GET /api/docs` and `GET /api/docs/{path}` (full doc text for citation chips), `GET /api/suggestions?dept=`.
