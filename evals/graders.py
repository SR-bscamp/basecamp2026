"""Deterministic graders. Each takes (spec, response) and returns {"type","pass","reason"}.

`response` is the POST /api/chat JSON (docs/CONTRACT.md). Tool usage is read from the optional
additive field `tool_calls` (list of names or {"name":...}); if absent it is inferred where possible
(create_ticket <- ticket, tick_checklist <- checklist_updates). lookup_booking_code and find_contact
cannot be inferred: they fail with an explicit reason until the backend returns `tool_calls`.
"""
from __future__ import annotations
import json, os, re
from typing import Any

def response_text(r: dict) -> str:
    parts = [r.get("reply") or "", " ".join(r.get("steps") or []), r.get("screen_identified") or ""]
    return " ".join(parts).lower()

def tool_names(r: dict) -> tuple[set[str], bool]:
    """Returns (names, authoritative). Non-authoritative = inferred from the envelope."""
    calls = r.get("tool_calls")
    if calls is not None:
        return {(c.get("name") if isinstance(c, dict) else str(c)) for c in calls}, True
    names = set()
    if r.get("ticket"): names.add("create_ticket")
    if r.get("checklist_updates"): names.add("tick_checklist")
    return names, False

def _res(spec, ok, reason): return {"type": spec["type"], "pass": bool(ok), "reason": reason}

def response_contains(spec, r):
    t = response_text(r); miss = [v for v in spec["values"] if v.lower() not in t]
    return _res(spec, not miss, f"Found all of {spec['values']}" if not miss else f"Missing {miss}")

def response_contains_any(spec, r):
    t = response_text(r); hit = [v for v in spec["values"] if v.lower() in t]
    return _res(spec, bool(hit), f"Found '{hit[0]}'" if hit else f"None of {spec['values']} found")

def response_not_contains(spec, r):
    t = response_text(r); bad = [v for v in spec["values"] if v.lower() in t]
    return _res(spec, not bad, "none of the forbidden strings present" if not bad else f"Forbidden present: {bad}")

def tool_used(spec, r):
    names, auth = tool_names(r); tool = spec["tool"]
    if tool in names: return _res(spec, True, f"{tool} was called")
    if not auth and tool in ("lookup_booking_code", "find_contact"):
        return _res(spec, False, f"{tool} not verifiable: response has no tool_calls field")
    return _res(spec, False, f"{tool} was not called")

def tool_not_used(spec, r):
    names, _ = tool_names(r); tool = spec["tool"]
    return _res(spec, tool not in names, f"{tool} was not called" if tool not in names else f"{tool} was called")

def confidence_is(spec, r):
    c = r.get("confidence"); return _res(spec, c == spec["value"], f"confidence={c}")

def ticket_created(spec, r):
    has = bool(r.get("ticket")); return _res(spec, has == spec["value"], f"ticket present={has}")

def off_topic_is(spec, r):
    want = bool(spec.get("value", True))
    got = r.get("off_topic")
    return _res(spec, got is want, f"off_topic={got!r}, expected {want}")

def no_ticket(spec, r):
    return _res(spec, r.get("ticket") in (None, {}), f"ticket={r.get('ticket')!r}")

def checklist_ticked(spec, r):
    ok = any(u.get("id") == spec["id"] and u.get("done") for u in r.get("checklist_updates") or [])
    return _res(spec, ok, f"checklist item '{spec['id']}' {'ticked' if ok else 'not ticked'}")

def screen_identified_contains(spec, r):
    s = (r.get("screen_identified") or "").lower(); hit = [v for v in spec["values"] if v.lower() in s]
    ok = bool(hit) if spec.get("mode", "any") == "any" else len(hit) == len(spec["values"])
    return _res(spec, ok, f"screen_identified={r.get('screen_identified')!r}")

# ---- LLM judge (P1) -------------------------------------------------------------------------------------
# Each check carries its own ground truth (the judge never sees the docs). Output schema puts `reason`
# BEFORE `verdict` so the model reasons first. 3 votes, majority wins. Model is configurable via
# spec["judge_model"] or env JUDGE_MODEL. Live calls happen only when ANTHROPIC_API_KEY is set (or a client
# is injected, which is how the unit tests run offline).
DEFAULT_JUDGE_MODEL = "claude-haiku-5-5"
JUDGE_SYSTEM = ("You are a strict grader of an onboarding assistant's answer. You see only the answer and the ground truth "
                "given to you. Judge whether the answer satisfies the criterion given the ground truth. An answer that "
                "contradicts the ground truth, invents facts not in it, or is evasive about the criterion FAILS. "
                'Reply with JSON only, keys in this order: {"reason": "<one or two sentences>", "verdict": "pass" | "fail"}.')

def judge_model(spec: dict) -> str:
    return spec.get("judge_model") or os.environ.get("JUDGE_MODEL") or DEFAULT_JUDGE_MODEL

def make_judge_client():
    """Real Anthropic client, or None when no key / SDK (callers then report the judge as unavailable)."""
    if not os.environ.get("ANTHROPIC_API_KEY"): return None
    try:
        import anthropic
    except ImportError:
        return None
    return anthropic.Anthropic()

def _judge_prompt(spec: dict, r: dict) -> str:
    return (f"CRITERION: {spec['criterion']}\nGROUND TRUTH: {spec['ground_truth']}\n\n"
            f"ANSWER TO GRADE:\n{r.get('reply') or ''}\n" + ("STEPS: " + " | ".join(r["steps"]) + "\n" if r.get("steps") else ""))

def _parse_verdict(text: str) -> tuple[str | None, str]:
    m = re.search(r"\{.*\}", text, re.S)
    try:
        d = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        d = {}
    v = str(d.get("verdict", "")).strip().lower()
    return (v if v in ("pass", "fail") else None), str(d.get("reason", ""))

def llm_judge(spec, r, client=None):
    """spec: {"type":"llm_judge","criterion":..., "ground_truth":..., "votes":3 (optional), "judge_model":... (optional)}"""
    client = client or make_judge_client()
    if client is None:
        return {"type": "llm_judge", "pass": False, "skipped": True, "reason": "judge unavailable: no ANTHROPIC_API_KEY (or injected client)"}
    votes, reasons = [], []
    for _ in range(int(spec.get("votes", 3))):
        try:
            msg = client.messages.create(model=judge_model(spec), max_tokens=300, system=JUDGE_SYSTEM,
                                         messages=[{"role": "user", "content": _judge_prompt(spec, r)}])
            v, why = _parse_verdict("".join(getattr(b, "text", "") for b in msg.content))
        except Exception as e:  # network / API errors count as an invalid vote, never as a pass
            v, why = None, f"{type(e).__name__}"
        votes.append(v); reasons.append(why)
    passes = votes.count("pass"); n = len(votes)
    ok = passes * 2 > n  # strict majority of ALL votes; invalid votes count against passing
    return {"type": "llm_judge", "pass": ok, "votes": votes, "reason": f"{passes}/{n} pass votes. " + (next((w for w in reasons if w), ""))}

GRADERS = {f.__name__: f for f in (response_contains, response_contains_any, response_not_contains, tool_used,
           tool_not_used, confidence_is, ticket_created, off_topic_is, no_ticket, checklist_ticked, screen_identified_contains)}

def grade(spec: dict[str, Any], response: dict, judge_client=None) -> dict:
    if spec["type"] == "llm_judge": return llm_judge(spec, response, judge_client)
    fn = GRADERS.get(spec["type"])
    if fn is None: return {"type": spec["type"], "pass": False, "reason": "unknown grader type"}
    return fn(spec, response)

def grade_all(specs, response, judge_client=None): return [grade(s, response, judge_client) for s in specs]
