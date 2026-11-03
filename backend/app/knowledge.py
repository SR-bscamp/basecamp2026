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


def load_docs(knowledge_dir: Path | None = None) -> dict[str, str]:
    root = knowledge_dir or config.KNOWLEDGE_DIR
    docs = _read_docs(root) if root.exists() else {}
    if not docs:
        log.warning("knowledge/ has no docs yet; using backend/stubs/knowledge")
        docs = _read_docs(config.STUBS_DIR / "knowledge")
    return docs


def load_json(name: str, data_dir: Path | None = None):
    for base in (data_dir or config.DATA_DIR, config.STUBS_DIR / "data"):
        path = base / name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(name)


def _unwrap_list(raw, key: str) -> list:
    """Accept a bare list or an object like {"_note": "...", "<key>": [...]}."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw.get(key), list):
        return raw[key]
    return next((v for k, v in raw.items() if not k.startswith("_") and isinstance(v, list)), [])


def _normalize_checklists(raw) -> dict:
    """Return {dept: {role: {"groups": [...]}}} from either the nested shape or a flat list of {dept, role, groups}."""
    entries = raw.get("checklists") if isinstance(raw, dict) else raw
    if isinstance(entries, list):
        out: dict = {}
        for e in entries:
            out.setdefault(e["dept"], {})[e["role"]] = {"groups": e["groups"]}
        return out
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def build_prefix(docs: dict[str, str]) -> str:
    """ONE prefix with every department's docs, so the cached block is big enough to hit the cache."""
    parts = [f'<document path="{path}">\n{text.strip()}\n</document>' for path, text in docs.items()]
    return "<documents>\n" + "\n".join(parts) + "\n</documents>"


class Knowledge:
    def __init__(self, knowledge_dir: Path | None = None, data_dir: Path | None = None):
        self.docs = load_docs(knowledge_dir)
        self.prefix = build_prefix(self.docs)
        self.checklists = _normalize_checklists(load_json("checklists.json", data_dir))
        self.booking_codes = _unwrap_list(load_json("booking_codes.json", data_dir), "codes")
        self.contacts = _unwrap_list(load_json("contacts.json", data_dir), "contacts")
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
