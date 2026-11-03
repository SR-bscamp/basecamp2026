"""In-memory per-session state: checklist progress and tickets. Fine for a demo."""
import itertools
from datetime import datetime, timezone

_ticket_numbers = itertools.count(1001)


class Session:
    def __init__(self):
        self.done: set[str] = set()
        self.tickets: list[dict] = []


class Store:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def get(self, session_id: str) -> Session:
        return self.sessions.setdefault(session_id, Session())

    def create_ticket(self, session_id: str, queue: str, summary: str) -> dict:
        ticket = {"id": f"TKT-{next(_ticket_numbers)}", "queue": queue, "summary": summary,
                  "created_at": datetime.now(timezone.utc).isoformat()}
        self.get(session_id).tickets.append(ticket)
        return ticket
