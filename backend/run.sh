#!/usr/bin/env bash
# One command to start the backend:  ./backend/run.sh   (from anywhere)
# Creates .venv on first run (needs Python 3.10+; uses uv when available), then serves on :8000.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.11 .venv && uv pip install -q -r requirements.txt --python .venv/bin/python
  else
    python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
  fi
fi
[ -f ../.env ] || echo "WARNING: no .env at the repo root: /api/chat will only work with ?mock=1"
exec .venv/bin/uvicorn app.main:app --reload --port 8000
