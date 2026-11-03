"""In-memory per-session state: checklist progress, tickets, chat history, usage. Fine for a demo."""
import itertools
from datetime import datetime, timezone

_ticket_numbers = itertools.count(1001)


class Session:
    def __init__(self):
        self.done: set[str] = set()
        self.tickets: list[dict] = []
        self.history: list[dict] = []  # alternating user/assistant plain-text messages
        self.usage = {"requests": 0, "input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0,
                      "cache_write_tokens": 0, "cost_usd": 0.0}

    def add_usage(self, u: dict) -> None:
        self.usage["requests"] += 1
        for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens"):
            self.usage[k] += u.get(k, 0)
        self.usage["cost_usd"] = round(self.usage["cost_usd"] + u.get("cost_usd", 0.0), 6)

    def usage_summary(self) -> dict:
        u = dict(self.usage)
        denom = u["input_tokens"] + u["cache_read_tokens"] + u["cache_write_tokens"]
        u["cache_hit_rate"] = round(u["cache_read_tokens"] / denom, 3) if denom else 0.0
        return u


class Store:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def get(self, session_id: str) -> Session:
        return self.sessions.setdefault(session_id, Session())

    def reset(self, session_id: str) -> None:
        self.sessions[session_id] = Session()

    def create_ticket(self, session_id: str, queue: str, summary: str) -> dict:
        ticket = {"id": f"TKT-{next(_ticket_numbers)}", "queue": queue, "summary": summary,
                  "created_at": datetime.now(timezone.utc).isoformat()}
        self.get(session_id).tickets.append(ticket)
        return ticket
