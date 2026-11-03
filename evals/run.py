"""Eval runner. Live: python evals/run.py --runs 1 [--model M | --models A,B,...] [--label "final prompt"]
Mock (offline plumbing check, never writes latest.json): python evals/run.py --mock good|bad

Live mode calls POST {base-url}/api/chat (concurrency <= 3) and writes eval_results/latest.json.
Mock results are tagged "_mock": true and refuse to overwrite latest.json.
"""
from __future__ import annotations
import argparse, base64, json, statistics, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from graders import grade_all  # noqa: E402

MEDIA = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
MAX_CONC = 3

def load_tasks(path=ROOT / "evals" / "tasks.jsonl", only=None):
    tasks = [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]
    return [t for t in tasks if not only or t["id"] in only]

def call_live(task, model, base_url):
    body = {"session_id": f"eval-{task['id']}", "dept": task["dept"], "role": task.get("role") or "analyst",
            "message": task["query"], "image_b64": None, "image_media_type": None, "model": model}
    if task.get("image"):
        p = ROOT / task["image"]
        body["image_b64"] = base64.b64encode(p.read_bytes()).decode()
        body["image_media_type"] = MEDIA[p.suffix.lower()]
    req = urllib.request.Request(base_url.rstrip("/") + "/api/chat", json.dumps(body).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as f: return json.load(f)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return {"_error": f"{type(e).__name__}: {e}"}

def call_mock(task, mode):
    """Spec-driven fake agent for offline plumbing checks only. 'good' satisfies the graders, 'bad' invents."""
    if mode == "bad":
        return {"reply": "Use code CLI-ZEP-9999. Parental leave is 16 weeks.", "steps": [], "screen_identified": "unknown" if task.get("image") else None,
                "citations": [], "checklist_updates": [], "ticket": None, "confidence": "high", "off_topic": False, "tool_calls": [],
                "usage": {"model": "mock", "input_tokens": 1, "output_tokens": 1, "cache_read_tokens": 0, "cache_write_tokens": 0, "cost_usd": 0.0, "latency_ms": 1}}
    text, ticket, conf, ticks, screen, tools, off = [], None, "high", [], None, [], False
    for g in task["graders"]:
        t = g["type"]
        if t == "response_contains": text += g["values"]
        elif t == "response_contains_any": text.append(g["values"][0])
        elif t == "tool_used": tools.append(g["tool"])
        elif t == "confidence_is": conf = g["value"]
        elif t == "ticket_created" and g["value"]: ticket = {"id": "TKT-1", "queue": "HR", "summary": "mock"}
        elif t == "off_topic_is": off = bool(g.get("value", True))
        elif t == "checklist_ticked": ticks.append({"id": g["id"], "done": True})
        elif t == "screen_identified_contains": screen = g["values"][0]
    return {"reply": " ".join(text), "steps": [], "screen_identified": screen, "citations": [], "checklist_updates": ticks,
            "ticket": ticket, "confidence": conf, "off_topic": off, "tool_calls": tools,
            "usage": {"model": "mock", "input_tokens": 100, "output_tokens": 50, "cache_read_tokens": 0, "cache_write_tokens": 0, "cost_usd": 0.0001, "latency_ms": 100}}

def run_model(tasks, model, runs, caller):
    jobs = [(t, i) for t in tasks for i in range(runs)]
    def one(job):
        t, _ = job; r = caller(t, model)
        if "_error" in r:
            return t, [{"type": "api_call", "pass": False, "reason": r["_error"]}], None
        return t, grade_all(t["graders"], r), r.get("usage") or {}
    with ThreadPoolExecutor(max_workers=MAX_CONC) as ex: results = list(ex.map(one, jobs))
    per_task = {}
    for t, checks, usage in results: per_task.setdefault(t["id"], {"task": t, "runs": []})["runs"].append((checks, usage))
    out = []
    for tid, d in per_task.items():
        passes = [all(c["pass"] for c in checks) for checks, _ in d["runs"]]
        rate = sum(passes) / len(passes)
        shown = next((c for (c, _), p in zip(d["runs"], passes) if not p), d["runs"][-1][0])
        out.append({"id": tid, "dept": d["task"]["dept"], "pass_rate": round(rate, 4), "flaky": 0 < rate < 1, "checks": shown,
                    "_usages": [u for _, u in d["runs"] if u]})
    return out

def summarize(task_results):
    usages = [u for t in task_results for u in t["_usages"]]
    costs = [u.get("cost_usd", 0.0) for u in usages]; lats = [u.get("latency_ms", 0) for u in usages]
    return {"pass_rate": round(statistics.mean(t["pass_rate"] for t in task_results), 4),
            "avg_cost_usd": round(statistics.mean(costs), 6) if costs else 0.0,
            "p50_latency_ms": int(statistics.median(lats)) if lats else 0}

def by_department(task_results):
    d = {}
    for t in task_results:
        x = d.setdefault(t["dept"], {"dept": t["dept"], "passed": 0, "total": 0}); x["total"] += 1; x["passed"] += t["pass_rate"] == 1.0
    return list(d.values())

def load_judge_validation(mock=False):
    """Real result of evals/validate_judge.py if it was ever run; otherwise the honest default (nothing validated)."""
    default = {"labelled": 0, "agreement": 0}
    try: d = json.loads((ROOT / "eval_results" / "judge_validation.json").read_text())
    except (OSError, json.JSONDecodeError): return default
    return default if mock else {"labelled": d["labelled"], "agreement": d["agreement"]}

def merge_existing(path, new):
    """Keep earlier REAL measurements (variants / model_comparison) when updating; never merge fixture data."""
    try: old = json.loads(Path(path).read_text())
    except (OSError, json.JSONDecodeError): return new
    if old.get("_fixture") or old.get("_mock"): return new
    for key, ident in (("variants", "label"), ("model_comparison", "model")):
        have = {x[ident]: x for x in old.get(key, [])}; have.update({x[ident]: x for x in new[key]}); new[key] = list(have.values())
    return new

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", help="model id for the main run (default: backend default)")
    ap.add_argument("--models", help="comma-separated model matrix; the --model (or first) entry is the headline run")
    ap.add_argument("--runs", type=int, default=1)
    ap.add_argument("--label", default="final prompt", help="variant label recorded for this run (the backend prompt must match it)")
    ap.add_argument("--tasks", help="comma-separated task ids")
    ap.add_argument("--base-url", default="http://localhost:8000")
    ap.add_argument("--mock", choices=["good", "bad"], help="offline fake agent; writes eval_results/mock_latest.json only")
    ap.add_argument("--out"); ap.add_argument("--merge", action="store_true", help="merge earlier real variants/model_comparison")
    a = ap.parse_args(argv)
    tasks = load_tasks(only=set(a.tasks.split(",")) if a.tasks else None)
    models = a.models.split(",") if a.models else [a.model]
    caller = (lambda t, m: call_mock(t, a.mock)) if a.mock else (lambda t, m: call_live(t, m, a.base_url))
    headline = a.model or models[0]
    comp, head = [], None
    for m in models:
        tr = run_model(tasks, m, a.runs, caller); s = summarize(tr)
        comp.append({"model": m or "backend-default", **s})
        if m == headline: head = tr
    head = head or tr
    out_path = Path(a.out) if a.out else ROOT / "eval_results" / ("mock_latest.json" if a.mock else "latest.json")
    if a.mock and out_path.name == "latest.json": sys.exit("refusing to write mock results to latest.json")
    hs = summarize(head)
    res = {"generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "model": headline or "backend-default", "runs": a.runs,
           "model_comparison": comp, "variants": [{"label": a.label, "pass_rate": hs["pass_rate"]}],
           "by_department": by_department(head),
           "tasks": [{k: v for k, v in t.items() if k != "_usages"} for t in head],
           "judge_validation": load_judge_validation(a.mock)}
    if a.mock: res["_mock"] = True
    elif a.merge: res = merge_existing(out_path, res)
    out_path.write_text(json.dumps(res, indent=2) + "\n")
    print(f"wrote {out_path}  pass_rate={hs['pass_rate']}")
    return res

if __name__ == "__main__":
    main()
