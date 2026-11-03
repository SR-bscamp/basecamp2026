"""Settings. Loads the repo-root .env and refuses to inherit gateway settings from the shell."""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]  # repo root (backend/app/config.py -> ../..)

# The shell may export gateway settings for other tools (e.g. Claude Code). If those leak into
# this process the SDK would send our key to the wrong endpoint. Drop them, then let .env
# set them back only if the team really wants a gateway.
for _k in ("ANTHROPIC_BASE_URL", "ANTHROPIC_CUSTOM_HEADERS", "ANTHROPIC_AUTH_TOKEN"):
    os.environ.pop(_k, None)
load_dotenv(ROOT / ".env", override=True)

API_KEY = os.getenv("ANTHROPIC_API_KEY") or None
BASE_URL = os.getenv("ANTHROPIC_BASE_URL") or None
DEFAULT_MODEL = os.getenv("MODEL") or "claude-haiku-5-5"
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

KNOWLEDGE_DIR = ROOT / "knowledge"
DATA_DIR = ROOT / "data"
STUBS_DIR = Path(__file__).resolve().parents[1] / "stubs"
FIXTURE_CHAT = ROOT / "docs" / "fixtures" / "chat_response.json"
EVAL_RESULTS = ROOT / "eval_results" / "latest.json"

MAX_AGENT_STEPS = 6
MAX_TOKENS = 1500


def make_client():
    """Anthropic client, or None when no key is configured (mock mode still works)."""
    if not API_KEY:
        return None
    import anthropic

    return anthropic.Anthropic(api_key=API_KEY, base_url=BASE_URL, timeout=60.0, max_retries=2)
