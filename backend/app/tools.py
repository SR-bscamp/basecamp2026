"""Agent tools. Deterministic lookups, so evals can check them and the model can't invent values."""
import json
from dataclasses import dataclass, field

from .knowledge import Knowledge
from .state import Session, Store


@dataclass
class Ctx:
    session_id: str
    session: Session
    store: Store
    knowledge: Knowledge
    dept: str
    role: str
    checklist_updates: list = field(default_factory=list)
    ticket: dict | None = None


TOOL_SPECS = [
    {
        "name": "lookup_booking_code",
        "description": (
            "Look up an exact booking (time-entry) code in the company's booking-code table. Use it for "
            "ANY question about which code to book time to. Input is free text: a client name, project "
            "name, or part of a code (case-insensitive, e.g. 'training' or 'Acme'). Returns the matching "
            "rows (code, client, project, billable, owner) or found=false when nothing matches. When "
            "nothing matches, say so: never guess or construct a code."),
        "input_schema": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Client, project or code fragment to search for."}},
            "required": ["query"]},
    },
    {
        "name": "tick_checklist",
        "description": (
            "Mark one onboarding checklist item as done for this user. Call it only when the user says "
            "they completed the step or a screenshot shows it is complete. item_id must be an id from the "
            "user's checklist (for example 'vpn' or 'timesheet'). Returns ok=false for unknown ids."),
        "input_schema": {"type": "object", "properties": {
            "item_id": {"type": "string", "description": "Stable checklist item id."}},
            "required": ["item_id"]},
    },
    {
        "name": "find_contact",
        "description": (
            "Find the right person or team for a topic (for example 'VPN', 'benefits', 'expenses'). "
            "Returns name, team and an alias, or found=false."),
        "input_schema": {"type": "object", "properties": {
            "topic": {"type": "string", "description": "What the user needs help with."}},
            "required": ["topic"]},
    },
    {
        "name": "create_ticket",
        "description": (
            "Open a support ticket. Use it when the documents and tools cannot answer the question or the "
            "user needs a human (an access request, a broken account). queue must be 'IT' or 'HR'. "
            "The summary should let the queue owner act without asking follow-up questions."),
        "input_schema": {"type": "object", "properties": {
            "queue": {"type": "string", "enum": ["IT", "HR"]},
            "summary": {"type": "string", "description": "One or two sentences describing the problem."}},
            "required": ["queue", "summary"]},
    },
    {
        "name": "respond",
        "description": (
            "Give the final answer to the user. ALWAYS finish by calling this exactly once, after any other "
            "tools. reply is the main answer in short markdown. steps is an ordered list of concrete actions "
            "(may be empty). citations lists the documents the answer relies on, each with the doc path "
            "exactly as shown in the documents and a short verbatim quote. confidence is 'low' when the "
            "documents do not support the answer. screen_identified names the screen shown in an uploaded "
            "screenshot, otherwise null."),
        "input_schema": {"type": "object", "properties": {
            "reply": {"type": "string"},
            "steps": {"type": "array", "items": {"type": "string"}},
            "citations": {"type": "array", "items": {"type": "object", "properties": {
                "doc": {"type": "string"}, "quote": {"type": "string"}}, "required": ["doc"]}},
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "screen_identified": {"type": ["string", "null"]}},
            "required": ["reply", "steps", "citations", "confidence"]},
    },
]


def _match(query: str, *fields: str) -> bool:
    q = query.strip().lower()
    return bool(q) and any(q in (f or "").lower() for f in fields)


def execute(name: str, args: dict, ctx: Ctx) -> str:
    """Run one non-terminal tool and return a JSON string for the tool_result."""
    k = ctx.knowledge
    if name == "lookup_booking_code":
        q = str(args.get("query", ""))
        rows = [r for r in k.booking_codes if _match(q, r.get("code"), r.get("client"), r.get("project"), r.get("notes"))]
        if not rows:
            return json.dumps({"found": False, "message": f"No booking code matches '{q}'. Do not guess a code."})
        return json.dumps({"found": True, "matches": rows})
    if name == "tick_checklist":
        item_id = str(args.get("item_id", ""))
        valid = {i["id"] for by_role in k.checklists.values() for data in by_role.values()
                 for g in data["groups"] for i in g["items"]}
        if item_id not in valid:
            return json.dumps({"ok": False, "error": f"Unknown checklist item '{item_id}'."})
        ctx.session.done.add(item_id)
        ctx.checklist_updates.append({"id": item_id, "done": True})
        return json.dumps({"ok": True})
    if name == "find_contact":
        topic = str(args.get("topic", ""))
        rows = [c for c in k.contacts if _match(topic, c.get("topic"), c.get("team"))]
        return json.dumps({"found": bool(rows), "contacts": rows})
    if name == "create_ticket":
        queue = args.get("queue") if args.get("queue") in ("IT", "HR") else "IT"
        ctx.ticket = ctx.store.create_ticket(ctx.session_id, queue, str(args.get("summary", "")).strip())
        return json.dumps({"ok": True, "ticket": ctx.ticket})
    return json.dumps({"error": f"Unknown tool '{name}'."})
