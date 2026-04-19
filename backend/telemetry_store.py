import json
import time
from pathlib import Path


class ProductMetricsStore:
    def __init__(self, metrics_path: Path, defaults: dict[str, int]) -> None:
        self.metrics_path = metrics_path
        self.metrics: dict[str, int] = dict(defaults)
        self.load()

    def load(self) -> None:
        if not self.metrics_path.exists():
            return
        try:
            raw = json.loads(self.metrics_path.read_text(encoding="utf-8"))
        except Exception:
            return
        if not isinstance(raw, dict):
            return
        for key in self.metrics:
            value = raw.get(key)
            if isinstance(value, int) and value >= 0:
                self.metrics[key] = value

    def record(self, key: str) -> None:
        if key not in self.metrics:
            return
        self.metrics[key] += 1
        self._persist()

    def snapshot(self) -> dict[str, int]:
        return dict(self.metrics)

    def _persist(self) -> None:
        try:
            self.metrics_path.parent.mkdir(parents=True, exist_ok=True)
            self.metrics_path.write_text(
                json.dumps(self.metrics, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            # Telemetry persistence should not break the main product flow.
            return


class GenerationHistoryStore:
    def __init__(self, history_path: Path, limit: int = 20) -> None:
        self.history_path = history_path
        self.limit = max(1, limit)
        self.history: list[dict[str, object]] = []
        self.load()

    def load(self) -> None:
        if not self.history_path.exists():
            self.history = []
            return
        try:
            raw = json.loads(self.history_path.read_text(encoding="utf-8"))
            self.history = raw if isinstance(raw, list) else []
        except Exception:
            self.history = []

    def save(self) -> None:
        try:
            self.history_path.parent.mkdir(parents=True, exist_ok=True)
            self.history_path.write_text(
                json.dumps(self.history[-self.limit :], ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            # Generation history is best-effort metadata and should not fail requests.
            return

    def record(
        self,
        task_type: str,
        prompt: str,
        params: dict[str, object],
        output_url: str | None,
    ) -> None:
        item = {
            "task_type": task_type,
            "prompt": prompt[:240],
            "params": params,
            "output_url": output_url or "",
            "created_at": int(time.time()),
        }
        self.history.append(item)
        self.history = self.history[-self.limit :]
        self.save()

    def latest(self) -> dict[str, object] | None:
        return self.history[-1] if self.history else None
