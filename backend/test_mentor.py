import unittest
from unittest.mock import patch

import mentor as mentor_mod


class _FakeResearchService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple, dict]] = []

    def answer_question(self, question: str):
        self.calls.append(("answer_question", (question,), {}))
        return (
            f"答:{question[:40]}",
            ["demo.pdf"],
            [{"text": "chunk", "source": "demo.pdf", "page": 1, "chunk_id": "c1"}],
            {"retrieval_source": "vector", "error_code": "", "error_hint": "", "retryable": False, "degraded": False},
        )

    def writing_help(self, **kwargs: object):
        self.calls.append(("writing_help", (), dict(kwargs)))
        return {
            "recommendation": "建议段落结构……",
            "draft_template": "模板内容" * 5,
            "evidence": [{"source": "demo.pdf", "snippet": "s", "page": 1, "chunk_id": "c1", "evidence_role": "manuscript"}],
            "risk_notes": [],
            "retrieval_source": "vector",
            "error_code": "",
            "error_hint": "",
        }


class MentorUnitTests(unittest.TestCase):
    def test_parse_json_strips_fence(self) -> None:
        raw = '```json\n{"steps": [{"skill_id": "search_literature", "rationale": "x", "args": {}}]}\n```'
        payload = mentor_mod._parse_json_from_llm(raw)
        self.assertIsInstance(payload.get("steps"), list)
        self.assertEqual(payload["steps"][0]["skill_id"], "search_literature")

    def test_normalize_plan_filters_unknown(self) -> None:
        raw_steps = [
            {"skill_id": "search_literature", "rationale": "a", "args": {}},
            {"skill_id": "not_a_skill", "rationale": "b", "args": {}},
        ]
        out = mentor_mod._normalize_plan_payload(raw_steps)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["skill_id"], "search_literature")

    @patch.object(mentor_mod, "_call_text_model")
    def test_run_mentor_session_happy_path(self, mock_lm) -> None:
        mock_lm.side_effect = [
            '{"steps":['
            '{"skill_id":"search_literature","rationale":"检索","args":{"question":"Q1"}},'
            '{"skill_id":"analyze_writing","rationale":"写作","args":{"question":"Q2"}}'
            "]}",
            "导师总评：先检索再写作，顺序合理。",
        ]
        fake = _FakeResearchService()
        data = mentor_mod.run_mentor_session(
            fake,
            goal="完成方法章节",
            topic="T",
            section="method",
            stage="draft",
            reference_documents=[],
        )
        self.assertEqual(data["status"], "completed")
        self.assertEqual(len(data["plan"]), 2)
        self.assertEqual(len(data["steps"]), 2)
        self.assertTrue(data["summary"].startswith("导师总评"))
        self.assertEqual(fake.calls[0][0], "answer_question")
        self.assertIn("用户整体任务目标", fake.calls[0][1][0])
        self.assertEqual(fake.calls[1][0], "writing_help")
        cached = mentor_mod.get_session(data["session_id"])
        self.assertIsNotNone(cached)
        assert cached is not None
        self.assertEqual(cached.goal, "完成方法章节")

    @patch.object(mentor_mod, "_call_text_model")
    def test_run_mentor_fallback_plan(self, mock_lm) -> None:
        mock_lm.side_effect = ["not-json", "still-not-json", "降级后总结。"]
        fake = _FakeResearchService()
        data = mentor_mod.run_mentor_session(fake, goal="仅触发默认规划", topic="", section="method", stage="draft")
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["plan_source"], "fallback")
        self.assertGreaterEqual(len(data["plan"]), 1)
        self.assertEqual(fake.calls[0][0], "answer_question")

    def test_compare_methods_skipped_without_methods(self) -> None:
        fake = _FakeResearchService()
        plan = [{"skill_id": "compare_methods", "rationale": "对比", "args": {"question": "q"}}]
        steps = mentor_mod.mentor_execute(fake, plan, "g", "", "method", "draft", [])
        self.assertEqual(steps[0]["status"], "skipped")
        self.assertIn("method_a", steps[0]["detail"])


if __name__ == "__main__":
    unittest.main()
