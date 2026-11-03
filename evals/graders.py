"""Deterministic graders. Each takes (spec, response) and returns {"type","pass","reason"}.

`response` is the POST /api/chat JSON (docs/CONTRACT.md). Tool usage is read from the optional
additive field `tool_calls` (list of names or {"name":...}); if absent it is inferred where possible
(create_ticket <- ticket, tick_checklist <- checklist_updates). lookup_booking_code and find_contact
cannot be inferred: they fail with an explicit reason until the backend returns `tool_calls`.
"""
from __future__ import annotations
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

def checklist_ticked(spec, r):
    ok = any(u.get("id") == spec["id"] and u.get("done") for u in r.get("checklist_updates") or [])
    return _res(spec, ok, f"checklist item '{spec['id']}' {'ticked' if ok else 'not ticked'}")

def screen_identified_contains(spec, r):
    s = (r.get("screen_identified") or "").lower(); hit = [v for v in spec["values"] if v.lower() in s]
    ok = bool(hit) if spec.get("mode", "any") == "any" else len(hit) == len(spec["values"])
    return _res(spec, ok, f"screen_identified={r.get('screen_identified')!r}")

GRADERS = {f.__name__: f for f in (response_contains, response_contains_any, response_not_contains, tool_used,
           tool_not_used, confidence_is, ticket_created, checklist_ticked, screen_identified_contains)}

def grade(spec: dict[str, Any], response: dict) -> dict:
    fn = GRADERS.get(spec["type"])
    if fn is None: return {"type": spec["type"], "pass": False, "reason": "unknown grader type (llm_judge is P1, not implemented)"}
    return fn(spec, response)

def grade_all(specs, response): return [grade(s, response) for s in specs]
