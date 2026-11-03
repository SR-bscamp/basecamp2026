"""Compass API. Contract: docs/CONTRACT.md."""
import json
import logging

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import config
from .agent import run_chat
from .knowledge import Knowledge
from .pricing import PRICING
from .state import Store

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("compass")

app = FastAPI(title="Compass API")
app.add_middleware(CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

knowledge = Knowledge()
store = Store()
client = config.make_client()
if client is None:
    log.warning("ANTHROPIC_API_KEY is not set: /api/chat works only with ?mock=1")


class ChatRequest(BaseModel):
    session_id: str = "demo"
    dept: str = "consultants"
    role: str = "analyst"
    message: str
    image_b64: str | None = None
    image_media_type: str | None = None
    model: str | None = None


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@app.get("/api/health")
def health():
    return {"ok": True, "model": config.DEFAULT_MODEL, "live": client is not None,
            "docs": len(knowledge.docs)}


@app.get("/api/models")
def models():
    return [{"model": m, "input_per_mtok": p[0], "output_per_mtok": p[1]} for m, p in PRICING.items()]


@app.get("/api/checklist")
def checklist(dept: str = "consultants", role: str = "analyst", session_id: str | None = None):
    data = knowledge.checklist(dept, role)
    done = store.get(session_id).done if session_id else set()
    groups = [{**g, "items": [{**i, "done": i["id"] in done} for i in g["items"]]} for g in data["groups"]]
    return {"dept": dept, "role": role, "groups": groups}


@app.post("/api/chat")
def chat(req: ChatRequest, mock: int = Query(0)):
    if mock:
        return json.loads(config.FIXTURE_CHAT.read_text(encoding="utf-8"))
    if client is None:
        return _error(503, "The server has no API key configured. Add ANTHROPIC_API_KEY to .env and restart.")
    try:
        return run_chat(client, knowledge, store, session_id=req.session_id, dept=req.dept, role=req.role,
                        message=req.message, image_b64=req.image_b64,
                        image_media_type=req.image_media_type, model=req.model)
    except ValueError as e:
        return _error(400, str(e))
    except Exception:  # never leak raw model/stack errors to the client
        log.exception("chat failed")
        return _error(502, "The assistant hit a problem answering that. Please try again.")


@app.get("/api/tickets")
def tickets(session_id: str = "demo"):
    return store.get(session_id).tickets


@app.get("/api/evals/latest")
def evals_latest():
    return json.loads(config.EVAL_RESULTS.read_text(encoding="utf-8"))
