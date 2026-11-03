"""Backend tests. A fake client stands in for Anthropic, so no key or network is needed."""
from types import SimpleNamespace as NS

import pytest
from fastapi.testclient import TestClient

from app import agent, config
from app.knowledge import Knowledge
from app.main import app
from app.pricing import cost_usd
from app.state import Store


def block_tool(name, args, id="t1"):
    return NS(type="tool_use", id=id, name=name, input=args)


def resp(*blocks, usage=None):
    u = usage or NS(input_tokens=100, output_tokens=50, cache_creation_input_tokens=0, cache_read_input_tokens=1000)
    return NS(content=list(blocks), usage=u, stop_reason="tool_use")


class FakeClient:
    def __init__(self, *responses):
        self.responses, self.calls = list(responses), []
        self.messages = NS(create=self._create)

    def _create(self, **kw):
        self.calls.append(kw)
        return self.responses.pop(0)


@pytest.fixture(scope="module")
def kn():
    return Knowledge()


def run(client, kn, message="hi", **kw):
    return agent.run_chat(client, kn, Store(), session_id="s", dept="consultants", role="analyst",
                          message=message, **kw)


def test_cost_matches_contract_table():
    # 1M in + 1M out + 1M cache write + 1M cache read on haiku-5-5
    assert cost_usd("claude-haiku-5-5", 1_000_000, 1_000_000, 1_000_000, 1_000_000) == pytest.approx(0.1 + 0.5 + 0.125 + 0.01)


def test_booking_code_tool_then_respond(kn):
    fc = FakeClient(
        resp(block_tool("lookup_booking_code", {"query": "training"})),
        resp(block_tool("respond", {"reply": "Use INT-TRN-001", "steps": ["Open timesheet"],
             "citations": [{"doc": "finance/booking-codes.md", "quote": "Internal training: INT-TRN-001"}],
             "confidence": "high", "screen_identified": None}, id="t2")))
    out = run(fc, kn, "code for training?")
    assert out["reply"] == "Use INT-TRN-001" and out["confidence"] == "high"
    assert out["citations"][0]["doc"] == "finance/booking-codes.md" and out["citations"][0]["quote"]
    assert out["usage"]["cache_read_tokens"] == 2000 and out["usage"]["cost_usd"] > 0
    # the cached prefix is sent as the last system block with cache_control
    assert fc.calls[0]["system"][-1]["cache_control"] == {"type": "ephemeral"}
    # tool result for the lookup reached the model on the second call
    assert "INT-TRN-001" in str(fc.calls[1]["messages"][-1]["content"])


def test_unknown_code_returns_not_found_and_no_guess(kn):
    from app.tools import Ctx, execute
    ctx = Ctx("s", Store().get("s"), Store(), kn, "finance", "analyst")
    import json
    out = json.loads(execute("lookup_booking_code", {"query": "zzz-no-such-client"}, ctx))
    assert out["found"] is False and "guess" in out["message"].lower()


def test_fake_citations_are_dropped_and_bad_quotes_blanked(kn):
    fc = FakeClient(resp(block_tool("respond", {"reply": "x", "steps": [],
        "citations": [{"doc": "made/up.md", "quote": "nope"},
                      {"doc": "finance/booking-codes.md", "quote": "this sentence is not in the doc"}],
        "confidence": "medium", "screen_identified": None})))
    out = run(fc, kn)
    assert [c["doc"] for c in out["citations"]] == ["finance/booking-codes.md"]
    assert out["citations"][0]["quote"] == ""


def test_checklist_tick_and_ticket(kn):
    fc = FakeClient(
        resp(block_tool("tick_checklist", {"item_id": "vpn"}, "a"), block_tool("create_ticket", {"queue": "IT", "summary": "VPN 809"}, "b")),
        resp(block_tool("respond", {"reply": "done", "steps": [], "citations": [], "confidence": "low"}, "c")))
    import base64
    png = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 20).decode()
    out = run(fc, kn, image_b64=png, image_media_type="image/png")
    assert out["checklist_updates"] == [{"id": "vpn", "done": True}]
    assert out["ticket"]["id"].startswith("TKT-") and out["ticket"]["queue"] == "IT"
    img = fc.calls[0]["messages"][0]["content"][0]
    assert img["type"] == "image" and img["source"]["media_type"] == "image/png"


def test_unknown_checklist_item_rejected(kn):
    from app.tools import Ctx, execute
    import json
    ctx = Ctx("s", Store().get("s"), Store(), kn, "it", "analyst")
    assert json.loads(execute("tick_checklist", {"item_id": "nope"}, ctx))["ok"] is False
    assert ctx.checklist_updates == []


def test_plain_text_end_turn_is_forced_into_respond(kn):
    fc = FakeClient(
        NS(content=[NS(type="text", text="thinking out loud")], usage=NS(input_tokens=1, output_tokens=1), stop_reason="end_turn"),
        resp(block_tool("respond", {"reply": "final", "steps": [], "citations": [], "confidence": "medium"})))
    out = run(fc, kn)
    assert out["reply"] == "final"
    assert fc.calls[1]["tool_choice"] == {"type": "tool", "name": "respond"}


def test_forced_respond_failure_still_returns_safe_low_confidence(kn):
    text_only = lambda: NS(content=[NS(type="text", text="plain")], usage=NS(input_tokens=1, output_tokens=1), stop_reason="end_turn")  # noqa: E731
    out = run(FakeClient(text_only(), text_only()), kn)
    assert out["reply"] == "plain" and out["confidence"] == "low"


def test_step_cap_forces_respond(kn, monkeypatch):
    monkeypatch.setattr(config, "MAX_AGENT_STEPS", 2)
    loop = lambda i: resp(block_tool("find_contact", {"topic": "vpn"}, f"t{i}"))  # noqa: E731
    fc = FakeClient(loop(1), loop(2), resp(block_tool("respond", {"reply": "capped", "steps": [], "citations": [], "confidence": "low"})))
    out = run(fc, kn)
    assert out["reply"] == "capped" and fc.calls[2]["tool_choice"]["name"] == "respond"


def test_image_type_sniffed_from_bytes_and_limits(kn):
    import base64
    png = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 20).decode()
    assert agent.prepare_image(png)[1] == "image/png"
    jpg = base64.b64encode(b"\xff\xd8\xff" + b"0" * 20).decode()
    assert agent.prepare_image(jpg)[1] == "image/jpeg"
    with pytest.raises(ValueError):
        agent.prepare_image(base64.b64encode(b"not an image").decode())
    with pytest.raises(ValueError):
        agent.prepare_image(base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 5_100_000).decode())


def test_mislabelled_image_is_sent_with_detected_type(kn):
    import base64
    png = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 20).decode()
    fc = FakeClient(resp(block_tool("respond", {"reply": "ok", "steps": [], "citations": [], "confidence": "high", "screen_identified": "VPN error"})))
    out = run(fc, kn, image_b64=png, image_media_type="image/jpeg")
    assert fc.calls[0]["messages"][0]["content"][0]["source"]["media_type"] == "image/png"
    assert out["screen_identified"] == "VPN error"


def test_unsupported_model_rejected(kn):
    with pytest.raises(ValueError):
        run(FakeClient(), kn, model="gpt-4")


def test_http_endpoints_and_mock():
    c = TestClient(app)
    assert c.get("/api/health").json()["ok"] is True
    assert len(c.get("/api/models").json()) >= 4
    cl = c.get("/api/checklist?dept=it&role=whatever").json()
    assert cl["groups"] and cl["groups"][0]["items"][0]["done"] is False
    mock = c.post("/api/chat?mock=1", json={"message": "x"}).json()
    assert {"reply", "steps", "citations", "checklist_updates", "usage", "confidence"} <= set(mock)
    assert c.get("/api/evals/latest").json()["variants"]


def test_chat_without_key_is_a_clean_503(monkeypatch):
    import app.main as m
    monkeypatch.setattr(m, "client", None)
    r = TestClient(app).post("/api/chat", json={"message": "x"})
    assert r.status_code == 503 and "error" in r.json()


def test_gateway_env_is_not_inherited(monkeypatch):
    import importlib, os
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://gateway.invalid")
    monkeypatch.setenv("ANTHROPIC_CUSTOM_HEADERS", "x: y")
    importlib.reload(config)
    assert "ANTHROPIC_CUSTOM_HEADERS" not in os.environ and config.BASE_URL is None
