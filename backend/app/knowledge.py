"""Loads the mock company docs and structured data. Falls back to backend/stubs/ until Lane C lands content."""
import json
import logging
from pathlib import Path

from . import config

log = logging.getLogger("compass.knowledge")

CACHE_MIN_TOKENS_GUESS = 4096  # Haiku 4.5 minimum; the 5.5 minimums are unverified, so we only warn


def _read_docs(root: Path) -> dict[str, str]:
    return {str(p.relative_to(root)): p.read_text(encoding="utf-8")
            for p in sorted(root.rglob("*.md")) if p.name.lower() != "readme.md"}


def load_docs() -> dict[str, str]:
    docs = _read_docs(config.KNOWLEDGE_DIR) if config.KNOWLEDGE_DIR.exists() else {}
    if not docs:
        log.warning("knowledge/ has no docs yet; using backend/stubs/knowledge")
        docs = _read_docs(config.STUBS_DIR / "knowledge")
    return docs


def load_json(name: str):
    for base in (config.DATA_DIR, config.STUBS_DIR / "data"):
        path = base / name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(name)


def build_prefix(docs: dict[str, str]) -> str:
    """ONE prefix with every department's docs, so the cached block is big enough to hit the cache."""
    parts = [f'<document path="{path}">\n{text.strip()}\n</document>' for path, text in docs.items()]
    return "<documents>\n" + "\n".join(parts) + "\n</documents>"


class Knowledge:
    def __init__(self):
        self.docs = load_docs()
        self.prefix = build_prefix(self.docs)
        self.checklists = load_json("checklists.json")
        self.booking_codes = load_json("booking_codes.json")
        self.contacts = load_json("contacts.json")
        est = len(self.prefix) // 4
        log.info("knowledge: %d docs, ~%d tokens in the cached prefix", len(self.docs), est)
        if est < CACHE_MIN_TOKENS_GUESS:
            log.warning("prefix ~%d tokens is under ~%d: the cache may not engage. Check "
                        "cache_creation_input_tokens on the first call.", est, CACHE_MIN_TOKENS_GUESS)

    def doc_index(self) -> list[dict]:
        return [{"doc": path, "title": path.rsplit("/", 1)[-1].removesuffix(".md").replace("-", " ").title(),
                 "dept": path.split("/")[0] if "/" in path else ""} for path in self.docs]

    def checklist(self, dept: str, role: str) -> dict:
        by_dept = self.checklists.get(dept) or {}
        data = by_dept.get(role) or by_dept.get("default") or next(iter(by_dept.values()), {"groups": []})
        return {"dept": dept, "role": role, "groups": data["groups"]}
