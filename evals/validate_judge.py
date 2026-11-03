"""Validate the LLM judge against hand-labelled responses (evals/judge_labels.jsonl).

  python evals/validate_judge.py              # LIVE: needs ANTHROPIC_API_KEY; writes eval_results/judge_validation.json
  python evals/validate_judge.py --model M    # choose the judge model (default: JUDGE_MODEL env or graders.DEFAULT_JUDGE_MODEL)
  python evals/validate_judge.py --dry-run    # live, but print only (no file written)

`validate(labels, client, model)` is importable so tests can inject a fake client.
run.py copies eval_results/judge_validation.json into latest.json's `judge_validation` when that file exists;
otherwise it stays {"labelled": 0, "agreement": 0}. Never hand-edit the output file.
"""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from graders import llm_judge, make_judge_client, judge_model  # noqa: E402

def load_labels(path=ROOT / "evals" / "judge_labels.jsonl"):
    return [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]

def validate(labels, client, model=None):
    rows, agree = [], 0
    for lab in labels:
        spec = {"type": "llm_judge", "criterion": lab["criterion"], "ground_truth": lab["ground_truth"]}
        if model: spec["judge_model"] = model
        res = llm_judge(spec, lab["response"], client)
        judged = "pass" if res["pass"] else "fail"
        ok = judged == lab["human_verdict"]; agree += ok
        rows.append({"id": lab["id"], "human": lab["human_verdict"], "judge": judged, "agree": ok, "votes": res.get("votes")})
    n = len(labels)
    return {"labelled": n, "agreement": round(agree / n, 4) if n else 0, "rows": rows}

def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument("--model"); ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--labels")
    a = ap.parse_args(argv)
    client = make_judge_client()
    if client is None: sys.exit("ANTHROPIC_API_KEY not set (or anthropic SDK missing): cannot run the judge. Nothing written.")
    labels = load_labels(a.labels) if a.labels else load_labels()
    out = validate(labels, client, a.model)
    out.update(judge_model=a.model or judge_model({}), generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    for r in out["rows"]: print(f"{r['id']:24s} human={r['human']:4s} judge={r['judge']:4s} {'ok' if r['agree'] else 'DISAGREE'}")
    print(f"agreement {out['agreement']} on {out['labelled']} labelled")
    if not a.dry_run:
        (ROOT / "eval_results" / "judge_validation.json").write_text(json.dumps(out, indent=2) + "\n")
    return out

if __name__ == "__main__":
    main()
