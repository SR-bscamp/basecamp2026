"""Suggested questions per department for the UI chips. data/suggestions.json (Lane C) overrides these."""
import json

from . import config

DEFAULTS = {
    "it": ["My VPN shows error 809. What do I do?", "How do I set up MFA?", "I forgot my laptop password."],
    "hr": ["When do I need to enroll in benefits?", "How much PTO do I get?", "Who do I contact about payroll?"],
    "consultants": ["What should I do in my first week?", "Which booking code do I use for internal training?",
                    "Which booking code is for Acme Retail?"],
    "finance": ["Which booking code is for bench time?", "When are timesheets due?",
                "What code do I use for the Zephyr Dynamics project?"],
}


def get(dept: str) -> list[str]:
    path = config.DATA_DIR / "suggestions.json"
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get(dept):
                return data[dept]
        except (ValueError, OSError):
            pass
    return DEFAULTS.get(dept, [])
