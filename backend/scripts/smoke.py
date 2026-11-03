"""Live pre-flight check. Run with the server up:  python backend/scripts/smoke.py [base_url]
Exercises the real API: booking-code hit, booking-code miss (must not invent a code), ticket on an
unanswerable question, and a screenshot (uses the first PNG in screenshots/ if one exists)."""
import base64
import re
import sys
from pathlib import Path

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
ROOT = Path(__file__).resolve().parents[2]
results = []


def ask(message, **extra):
    r = httpx.post(f"{BASE}/api/chat", json={"session_id": "smoke", "dept": "consultants", "role": "analyst",
                                             "message": message, **extra}, timeout=90)
    return r.status_code, r.json()


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


w = httpx.post(f"{BASE}/api/warm", timeout=60).json()
print(f"      cache warm: {w}")
h = httpx.get(f"{BASE}/api/health", timeout=10).json()
check("server is live with an API key", h.get("live") is True, str(h))

code, d = ask("Which booking code do I use for internal training time?")
check("booking code hit", code == 200 and "INT-TRN-001" in d.get("reply", ""), f"conf={d.get('confidence')}")
u = d.get("usage", {})
print(f"      model={u.get('model')} in={u.get('input_tokens')} out={u.get('output_tokens')} "
      f"cache_read={u.get('cache_read_tokens')} cache_write={u.get('cache_write_tokens')} "
      f"cost=${u.get('cost_usd')} latency={u.get('latency_ms')}ms")

code, d = ask("What booking code should I use for the Zephyr Dynamics merger project?")
invented = [c for c in re.findall(r"\b[A-Z]{3}-[A-Z]{3}-\d{3}\b", d.get("reply", "")) if c not in ("INT-TRN-001", "INT-BEN-001", "CLT-ACM-204")]
check("booking code miss does not invent a code", code == 200 and not invented, f"conf={d.get('confidence')} invented={invented}")

code, d = ask("Can you reset my badge so it opens the 9th floor server room?")
check("unanswerable question opens a ticket", code == 200 and d.get("ticket") is not None and d.get("confidence") == "low",
      f"ticket={d.get('ticket')}")

shots = sorted((ROOT / "screenshots").glob("*.png"))
if shots:
    b64 = base64.b64encode(shots[0].read_bytes()).decode()
    code, d = ask("What is this screen and what should I do?", image_b64=b64, image_media_type="image/png")
    check(f"screenshot {shots[0].name}", code == 200 and bool(d.get("screen_identified")), f"screen={d.get('screen_identified')}")
else:
    print("SKIP  screenshot (no PNGs in screenshots/ yet)")

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
