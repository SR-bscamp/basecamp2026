"""Compass API. Contract: docs/CONTRACT.md."""
import json
import logging

import anthropic
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from . import config, suggestions
from .agent import RULES, VARIANTS, agent_events, run_chat
from .knowledge import Knowledge
from .pricing import PRICING
from .state import Store
from .tools import TOOL_SPECS

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("compass")

app = FastAPI(title="Compass API")
app.add_middleware(CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

knowledge = Knowledge()
store = Store()
client = config.make_client()
prefix_tokens: int | None = None

if client is None:
    log.warning("ANTHROPIC_API_KEY is not set: /api/chat works only with ?mock=1")
else:
    try:  # exact size of the cacheable region (tools + system), via the free token-counting endpoint
        prefix_tokens = client.messages.count_tokens(
            model=config.DEFAULT_MODEL, tools=TOOL_SPECS, messages=[{"role": "user", "content": "hi"}],
            system=[{"type": "text", "text": RULES}, {"type": "text", "text": knowledge.prefix}]).input_tokens
        log.info("cacheable prefix (tools + rules + docs): %d tokens on %s", prefix_tokens, config.DEFAULT_MODEL)
    except Exception:
        log.warning("could not count prefix tokens; check cache_creation_input_tokens on the first call")


class ChatRequest(BaseModel):
    session_id: str = "demo"
    dept: str = "consultants"
    role: str = "analyst"
    message: str
    image_b64: str | None = None
    image_media_type: str | None = None
    model: str | None = None
    variant: str | None = None  # prompt variant for evals: final (default), naive, bad


class ToggleRequest(BaseModel):
    session_id: str = "demo"
    item_id: str
    done: bool = True


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


def _api_error(e: Exception) -> JSONResponse:
    """Map model/API failures to friendly messages. Never leak raw errors or keys to the client."""
    if isinstance(e, anthropic.RateLimitError):
        return _error(429, "Compass is getting a lot of questions right now. Give it a few seconds and try again.")
    if isinstance(e, anthropic.AuthenticationError):
        return _error(500, "The server's API key was rejected. Ask the backend owner to check .env.")
    if isinstance(e, (anthropic.APIConnectionError, anthropic.APITimeoutError)):
        return _error(503, "Couldn't reach the AI service. Check the network and try again.")
    if isinstance(e, anthropic.APIStatusError) and e.status_code in (500, 502, 503, 529):
        return _error(503, "The AI service is overloaded at the moment. Please try again shortly.")
    return _error(502, "The assistant hit a problem answering that. Please try again.")


def _chat_kwargs(req: ChatRequest) -> dict:
    return dict(session_id=req.session_id, dept=req.dept, role=req.role, message=req.message,
                image_b64=req.image_b64, image_media_type=req.image_media_type, model=req.model,
                variant=req.variant)


@app.get("/api/health")
def health():
    return {"ok": True, "model": config.DEFAULT_MODEL, "live": client is not None,
            "docs": len(knowledge.docs), "prefix_tokens": prefix_tokens, "variants": list(VARIANTS)}


@app.get("/api/models")
def models():
    return [{"model": m, "input_per_mtok": p[0], "output_per_mtok": p[1]} for m, p in PRICING.items()]


@app.get("/api/suggestions")
def get_suggestions(dept: str = "consultants"):
    return suggestions.get(dept)


@app.get("/api/checklist")
def checklist(dept: str = "consultants", role: str = "analyst", session_id: str | None = None):
    data = knowledge.checklist(dept, role)
    done = store.get(session_id).done if session_id else set()
    groups = [{**g, "items": [{**i, "done": i["id"] in done} for i in g["items"]]} for g in data["groups"]]
    return {"dept": dept, "role": role, "groups": groups}


@app.post("/api/checklist/toggle")
def checklist_toggle(req: ToggleRequest):
    valid = {i["id"] for by_role in knowledge.checklists.values() for d in by_role.values()
             for g in d["groups"] for i in g["items"]}
    if req.item_id not in valid:
        return _error(400, f"Unknown checklist item '{req.item_id}'.")
    done = store.get(req.session_id).done
    (done.add if req.done else done.discard)(req.item_id)
    return {"id": req.item_id, "done": req.done}


@app.post("/api/chat")
def chat(req: ChatRequest, mock: int = Query(0)):
    if mock:
        return json.loads(config.FIXTURE_CHAT.read_text(encoding="utf-8"))
    if client is None:
        return _error(503, "The server has no API key configured. Add ANTHROPIC_API_KEY to .env and restart.")
    try:
        envelope = run_chat(client, knowledge, store, **_chat_kwargs(req))
    except ValueError as e:
        return _error(400, str(e))
    except Exception as e:  # never leak raw model/stack errors to the client
        log.exception("chat failed")
        return _api_error(e)
    u = envelope["usage"]
    log.info("chat model=%s in=%d out=%d cache_read=%d cost=$%.5f %dms tools=%s", u["model"], u["input_tokens"],
             u["output_tokens"], u["cache_read_tokens"], u["cost_usd"], u["latency_ms"],
             [t["name"] for t in envelope["tool_calls"]])
    return envelope


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    """Server-Sent Events: start, tool, tool_done, delta (reply text as it is written), final, error.
    The `final` event carries the full contract envelope and is authoritative; deltas are cosmetic."""
    if client is None:
        return _error(503, "The server has no API key configured. Add ANTHROPIC_API_KEY to .env and restart.")

    def gen():
        try:
            for ev in agent_events(client, knowledge, store, stream=True, **_chat_kwargs(req)):
                yield _sse(ev["type"], ev)
        except ValueError as e:
            yield _sse("error", {"type": "error", "error": str(e)})
        except Exception as e:
            log.exception("chat stream failed")
            yield _sse("error", {"type": "error", "error": json.loads(_api_error(e).body)["error"]})

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/warm")
def warm():
    """Write the prompt cache (max_tokens=1) so the first real question is a cache hit. Cache TTL is 5 minutes."""
    if client is None:
        return _error(503, "The server has no API key configured.")
    try:
        r = client.messages.create(
            model=config.DEFAULT_MODEL, max_tokens=1, tools=TOOL_SPECS, messages=[{"role": "user", "content": "hi"}],
            system=[{"type": "text", "text": RULES},
                    {"type": "text", "text": knowledge.prefix, "cache_control": {"type": "ephemeral"}}])
    except Exception as e:
        log.exception("warm failed")
        return _api_error(e)
    u = r.usage
    return {"ok": True, "model": config.DEFAULT_MODEL, "cache_write_tokens": getattr(u, "cache_creation_input_tokens", 0) or 0,
            "cache_read_tokens": getattr(u, "cache_read_input_tokens", 0) or 0}


@app.get("/api/tickets")
def tickets(session_id: str = "demo"):
    return store.get(session_id).tickets


@app.get("/api/usage")
def usage(session_id: str = "demo"):
    return store.get(session_id).usage_summary()


@app.post("/api/session/reset")
def session_reset(session_id: str = "demo"):
    store.reset(session_id)
    return {"ok": True}


@app.get("/api/docs")
def docs_index():
    return knowledge.doc_index()


@app.get("/api/docs/{path:path}")
def doc_content(path: str):
    text = knowledge.docs.get(path)  # only docs we loaded; no filesystem paths from the client
    if text is None:
        return _error(404, "Document not found.")
    return {"doc": path, "title": path.rsplit("/", 1)[-1].removesuffix(".md").replace("-", " ").title(), "content": text}


@app.get("/api/evals/latest")
def evals_latest():
    return json.loads(config.EVAL_RESULTS.read_text(encoding="utf-8"))
