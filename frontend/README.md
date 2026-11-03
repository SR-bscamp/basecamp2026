# Compass frontend (Lane A)

Vite + React + TypeScript (strict) + Tailwind v4. Design note: [DESIGN.md](DESIGN.md).

```bash
cp .env.example .env.local   # VITE_USE_FIXTURE=1 runs with no backend
npm install
npm run dev                  # http://localhost:5173
```

- `VITE_USE_FIXTURE=1`: every call reads `docs/fixtures/chat_response.json` and `eval_results/latest.json` (checklist from `src/fixtures/checklists.ts`).
- `VITE_USE_FIXTURE=0`: talks to `VITE_API_BASE` (default `http://localhost:8000`) per `docs/CONTRACT.md`.
- Keys: `⌘K` palette (switch dept, open Quality, ask), `⌘.` Under the hood drawer, Enter to send, paste or drop a screenshot into chat.
- Live without an API key: run the backend (`uvicorn app.main:app --app-dir backend --port 8000`), set `VITE_USE_FIXTURE=0`, then switch on **Mock answers** in Under the hood (sends `?mock=1`). The nav pill shows Live / No API key / Backend offline / Mock answers.
