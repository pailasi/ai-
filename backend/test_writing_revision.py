"""Focused tests for writing help dual retrieval and manuscript scope extraction."""

import unittest

from services import ResearchService


class ManuscriptScopeExtractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.svc = ResearchService()

    def test_extract_full_returns_body(self) -> None:
        body = "Title\n\nAbstract line.\n\nMore."
        out, note = self.svc._extract_scope_from_full_text(body, "full")
        self.assertIn("Abstract line", out)
        self.assertEqual(note, "")

    def test_extract_abstract_basic(self) -> None:
        body = "摘要\n本文提出一种方法。\n\n引言\n近年来"
        out, _note = self.svc._extract_scope_from_full_text(body, "abstract")
        self.assertIn("提出", out)

    def test_map_validate_scope(self) -> None:
        self.assertEqual(self.svc.map_validate_scope_to_rule_section("ending"), "conclusion")
        self.assertEqual(self.svc.map_validate_scope_to_rule_section("full"), "custom")


if __name__ == "__main__":
    unittest.main()
