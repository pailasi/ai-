import tempfile
import unittest
from pathlib import Path

from telemetry_store import GenerationHistoryStore, ProductMetricsStore


class ProductMetricsStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)
        self.metrics_path = self.base_path / "product_metrics.json"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_record_and_reload(self):
        defaults = {"chat_requests": 0, "figure_requests": 0}
        store = ProductMetricsStore(self.metrics_path, defaults)
        store.record("chat_requests")
        store.record("chat_requests")
        store.record("unknown")
        self.assertEqual(store.snapshot()["chat_requests"], 2)
        self.assertEqual(store.snapshot()["figure_requests"], 0)

        reloaded = ProductMetricsStore(self.metrics_path, defaults)
        self.assertEqual(reloaded.snapshot()["chat_requests"], 2)


class GenerationHistoryStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)
        self.history_path = self.base_path / "generation_history.json"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_record_keeps_latest_with_limit(self):
        store = GenerationHistoryStore(self.history_path, limit=2)
        store.record("diagram", "p1", {"style": "academic"}, "/generated/1.png")
        store.record("diagram", "p2", {"style": "academic"}, "/generated/2.png")
        store.record("figure", "p3", {"style": "minimal"}, "/generated/3.png")

        self.assertEqual(len(store.history), 2)
        self.assertEqual(store.history[0]["prompt"], "p2")
        self.assertEqual(store.latest()["prompt"], "p3")

        reloaded = GenerationHistoryStore(self.history_path, limit=2)
        self.assertEqual(len(reloaded.history), 2)
        self.assertEqual(reloaded.latest()["prompt"], "p3")


if __name__ == "__main__":
    unittest.main()
