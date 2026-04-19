import tempfile
import unittest
from pathlib import Path

from document_state_store import DocumentStateStore


class DocumentStateStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)
        self.data_dir = self.base_path / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = self.base_path / "documents_state.json"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_sync_creates_records_and_focus(self):
        (self.data_dir / "paper_a.pdf").write_bytes(b"%PDF-1.4 test")
        (self.data_dir / "paper_b.pdf").write_bytes(b"%PDF-1.4 test")

        store = DocumentStateStore(self.data_dir, self.state_path)
        store.sync_with_files()
        records = store.records()

        self.assertIn("paper_a.pdf", records)
        self.assertIn("paper_b.pdf", records)
        self.assertIn("focus_document", store.state)
        self.assertTrue(self.state_path.exists())

    def test_sync_removes_deleted_files(self):
        file_path = self.data_dir / "paper_a.pdf"
        file_path.write_bytes(b"%PDF-1.4 test")

        store = DocumentStateStore(self.data_dir, self.state_path)
        store.sync_with_files()
        file_path.unlink()
        store.sync_with_files()

        self.assertNotIn("paper_a.pdf", store.records())


if __name__ == "__main__":
    unittest.main()
