import json
import os
from pathlib import Path


class DocumentStateStore:
    """Persist document ingest/focus state outside ResearchService core logic."""

    def __init__(self, data_dir: Path, state_path: Path) -> None:
        self.data_dir = data_dir
        self.state_path = state_path
        self.state: dict[str, object] = {}
        self.load()

    def load(self) -> None:
        if self.state_path.exists():
            try:
                raw = json.loads(self.state_path.read_text(encoding="utf-8"))
                self.state = raw if isinstance(raw, dict) else {}
            except Exception:
                self.state = {}
        else:
            self.state = {}
        if "focus_document" not in self.state:
            self.state["focus_document"] = None
        if "documents" not in self.state or not isinstance(self.state.get("documents"), dict):
            legacy = {
                key: value
                for key, value in self.state.items()
                if key not in {"focus_document", "documents"} and isinstance(value, dict)
            }
            self.state = {
                "focus_document": self.state.get("focus_document"),
                "documents": legacy,
            }

    def sync_with_files(self, persist: bool = True) -> None:
        current_files = {f.name for f in self.data_dir.glob("*.pdf")}
        records = self.records()
        changed = False

        for file_name in list(records.keys()):
            if file_name not in current_files:
                del records[file_name]
                changed = True

        for file_name in current_files:
            updated_at = int(os.path.getmtime(self.data_dir / file_name))
            if file_name not in records:
                records[file_name] = {"ingested": False, "updated_at": updated_at}
                changed = True
            else:
                if records[file_name].get("updated_at") != updated_at:
                    records[file_name]["updated_at"] = updated_at
                    changed = True
                records[file_name].setdefault("ingested", False)

        focus = self.state.get("focus_document")
        if focus not in records:
            self.state["focus_document"] = next(iter(sorted(current_files)), None)
            changed = True
        if persist and changed:
            self.save()

    def save(self) -> None:
        self.state_path.write_text(
            json.dumps(self.state, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def records(self) -> dict[str, dict[str, object]]:
        documents = self.state.setdefault("documents", {})
        if not isinstance(documents, dict):
            documents = {}
            self.state["documents"] = documents
        return documents

