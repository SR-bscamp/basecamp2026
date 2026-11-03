"""The Compass agent loop. One shared cached prefix; the agent finishes by calling `respond`."""
import base64
import binascii
import time

from . import config
from .knowledge import Knowledge
from .pricing import PRICING, cost_usd
from .state import Store
from .tools import TOOL_SPECS, Ctx, execute

RULES = """You are Compass, an onboarding copilot for new hires at Northwind Advisory (a fictional firm).
You help people get set up in their first weeks, using ONLY the company documents below and your tools.

Grounding rules (these matter more than being helpful):
- Answer only from the documents and tool results. Never invent booking codes, names, dates, links, policies or numbers.
- Use lookup_booking_code for any booking-code question. If it finds nothing, say so plainly; never construct a code.
- Cite the documents you used (exact doc path from the <document path="..."> tag, plus a short verbatim quote).
- If the documents and tools cannot answer, say you don't know, set confidence to "low", and call create_ticket
  (IT for systems, access and devices; HR for people, benefits and policy) so a human can follow up.
- The user's department and role are given with each question. Prefer that department's documents, but you may use any.
- Be concise and warm. Steps should be concrete actions the person can do right now.

Screenshots: if an image is attached, name the screen you see (screen_identified), explain what it means,
give the next steps, and cite the matching document. Call tick_checklist only when the screenshot shows a step is complete.

Always finish by calling the respond tool exactly once."""


def _usage_totals(responses: list) -> dict:
    t = {"input": 0, "output": 0, "cw": 0, "cr": 0}
    for r in responses:
        u = r.usage
        t["input"] += getattr(u, "input_tokens", 0) or 0
        t["output"] += getattr(u, "output_tokens", 0) or 0
        t["cw"] += getattr(u, "cache_creation_input_tokens", 0) or 0
        t["cr"] += getattr(u, "cache_read_input_tokens", 0) or 0
    return t


def _clean_citations(raw: list, knowledge: Knowledge) -> list:
    """Drop citations that point at docs that don't exist; drop quotes that aren't actually in the doc."""
    out = []
    for c in raw or []:
        doc = c.get("doc", "")
        text = knowledge.docs.get(doc)
        if text is None:
            continue
        quote = c.get("quote") or ""
        norm = lambda s: " ".join(s.split()).lower()  # noqa: E731
        out.append({"doc": doc, "title": doc.rsplit("/", 1)[-1].removesuffix(".md").replace("-", " ").title(),
                    "quote": quote if quote and norm(quote) in norm(text) else ""})
    return out


MAX_IMAGE_BYTES = 5_000_000  # API limit is 5 MB per image


def prepare_image(image_b64: str) -> tuple[str, str]:
    """Return (base64, media_type) detected from the bytes, so a mislabelled PNG can't cause a 400."""
    try:
        raw = base64.b64decode(image_b64, validate=False)
    except (binascii.Error, ValueError):
        raise ValueError("That image could not be read. Please upload a PNG, JPEG, GIF or WebP.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("That image is too large (max 5 MB). Please crop or shrink the screenshot and try again.")
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        media = "image/png"
    elif raw[:3] == b"\xff\xd8\xff":
        media = "image/jpeg"
    elif raw[:6] in (b"GIF87a", b"GIF89a"):
        media = "image/gif"
    elif raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        media = "image/webp"
    else:
        raise ValueError("Unsupported image type. Please upload a PNG, JPEG, GIF or WebP.")
    return image_b64, media


def _force_respond(client, model, system, messages, responses):
    """Re-ask with respond forced, so every request ends in a structured answer."""
    resp = client.messages.create(model=model, max_tokens=config.MAX_TOKENS, system=system, tools=TOOL_SPECS,
                                  messages=messages, tool_choice={"type": "tool", "name": "respond"})
    responses.append(resp)
    for b in resp.content:
        if b.type == "tool_use" and b.name == "respond":
            return dict(b.input)
    return None


def run_chat(client, knowledge: Knowledge, store: Store, *, session_id: str, dept: str, role: str,
             message: str, image_b64: str | None = None, image_media_type: str | None = None,
             model: str | None = None) -> dict:
    model = model or config.DEFAULT_MODEL
    if model not in PRICING:
        raise ValueError(f"Unsupported model '{model}'. Choose one of: {', '.join(PRICING)}")
    t0 = time.perf_counter()
    ctx = Ctx(session_id, store.get(session_id), store, knowledge, dept, role)

    content = []
    if image_b64:
        image_b64, detected = prepare_image(image_b64)  # trust the bytes, not the client's label
        content.append({"type": "image", "source": {"type": "base64", "media_type": detected, "data": image_b64}})
    content.append({"type": "text", "text": f"[Department: {dept} | Role: {role}]\n{message}"})
    messages = [{"role": "user", "content": content}]

    system = [{"type": "text", "text": RULES},
              {"type": "text", "text": knowledge.prefix, "cache_control": {"type": "ephemeral"}}]

    responses, final = [], None
    for _ in range(config.MAX_AGENT_STEPS):
        resp = client.messages.create(model=model, max_tokens=config.MAX_TOKENS, system=system,
                                      tools=TOOL_SPECS, messages=messages)
        responses.append(resp)
        calls = [b for b in resp.content if b.type == "tool_use"]
        if not calls:
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            if text:
                messages.append({"role": "assistant", "content": [{"type": "text", "text": text}]})
            messages.append({"role": "user", "content": "Give your final answer now by calling the respond tool."})
            final = _force_respond(client, model, system, messages, responses) or {
                "reply": text or "Sorry, I couldn't produce an answer.", "steps": [], "citations": [],
                "confidence": "low", "screen_identified": None}
            break
        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for call in calls:
            if call.name == "respond":
                final = dict(call.input)
                results.append({"type": "tool_result", "tool_use_id": call.id, "content": "ok"})
            else:
                results.append({"type": "tool_result", "tool_use_id": call.id,
                                "content": execute(call.name, dict(call.input), ctx)})
        if final is not None:
            break
        messages.append({"role": "user", "content": results})

    if final is None:  # step cap reached: last message is the user's tool_results, so force the answer
        final = _force_respond(client, model, system, messages, responses) or {
            "reply": "I couldn't finish that request. Please try rephrasing.", "steps": [],
            "citations": [], "confidence": "low", "screen_identified": None}

    t = _usage_totals(responses)
    return {
        "reply": final.get("reply", ""),
        "steps": final.get("steps") or [],
        "screen_identified": final.get("screen_identified") if image_b64 else None,
        "citations": _clean_citations(final.get("citations"), knowledge),
        "checklist_updates": ctx.checklist_updates,
        "ticket": ctx.ticket,
        "confidence": final.get("confidence", "low"),
        "usage": {"model": model, "input_tokens": t["input"], "output_tokens": t["output"],
                  "cache_read_tokens": t["cr"], "cache_write_tokens": t["cw"],
                  "cost_usd": round(cost_usd(model, t["input"], t["output"], t["cw"], t["cr"]), 6),
                  "latency_ms": int((time.perf_counter() - t0) * 1000)},
    }
