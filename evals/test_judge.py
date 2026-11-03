"""Offline plumbing tests for the LLM judge (fake client, no network). Run: python3 evals/test_judge.py"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from graders import llm_judge, grade, _judge_prompt
from validate_judge import validate, load_labels

class Block:
    def __init__(s, t): s.text = t
class Msg:
    def __init__(s, t): s.content = [Block(t)]
class FakeClient:
    """Returns scripted replies in order (cycling); records prompts."""
    def __init__(s, replies): s.replies, s.calls = list(replies), []; s.messages = s
    def create(s, **kw):
        s.calls.append(kw); r = s.replies[(len(s.calls) - 1) % len(s.replies)]
        if isinstance(r, Exception): raise r
        return Msg(r)
P = lambda why="ok": json.dumps({"reason": why, "verdict": "pass"}); F = lambda why="bad": json.dumps({"reason": why, "verdict": "fail"})
spec = {"type": "llm_judge", "criterion": "c", "ground_truth": "g"}; resp = {"reply": "hello"}

assert llm_judge(spec, resp, FakeClient([P(), P(), F()]))["pass"] is True          # 2/3 majority
assert llm_judge(spec, resp, FakeClient([F(), P(), F()]))["pass"] is False
assert llm_judge(spec, resp, FakeClient(["not json", "nope", P()]))["pass"] is False  # invalid votes never pass
assert llm_judge(spec, resp, FakeClient([RuntimeError("x"), P(), P()]))["pass"] is True
c = FakeClient([P()]); r = llm_judge({**spec, "judge_model": "m-x"}, resp, c)
assert len(c.calls) == 3 and c.calls[0]["model"] == "m-x" and r["votes"] == ["pass"] * 3
assert "g" in c.calls[0]["messages"][0]["content"] and "hello" in c.calls[0]["messages"][0]["content"]
assert grade(spec, resp, FakeClient([P()]))["pass"] is True
import os; os.environ.pop("ANTHROPIC_API_KEY", None)
r = llm_judge(spec, resp); assert r["pass"] is False and r["skipped"]               # no key, no client: no network
assert '"reason"' in __import__("graders").JUDGE_SYSTEM.split('"verdict"')[0]       # reason precedes verdict in schema

# validation plumbing: an oracle fake that answers from the human label should agree 100%, an always-pass one should not
labels = load_labels(); assert 8 <= len(labels) <= 10, len(labels)
class Oracle(FakeClient):
    def create(s, **kw):
        txt = kw["messages"][0]["content"]
        lab = next(l for l in labels if l["response"]["reply"] in txt); return Msg(P() if lab["human_verdict"] == "pass" else F())
o = validate(labels, Oracle([]), "m"); assert o["agreement"] == 1.0 and o["labelled"] == len(labels)
a = validate(labels, FakeClient([P()]), "m"); assert 0 < a["agreement"] < 1
assert {l["human_verdict"] for l in labels} == {"pass", "fail"}
print("judge plumbing OK (fake client only; no real agreement measured)")
