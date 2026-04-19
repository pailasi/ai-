import tempfile
import unittest
from pathlib import Path

from workflows.engine import WorkflowEngine


class _FakeRegistry:
    def __init__(self):
        self.validate_calls = 0
        self.figure_calls = 0
        self.figure_audit_calls = 0
        self.audit_failures_before_pass = 0

    def run(self, skill_id, payload):
        if skill_id == "mentor_dispatch_skill":
            return {
                "plan": ["analysis", "writer", "validate", "figure", "citation", "review"],
                "analysis_focus": "focus analysis",
                "writing_focus": "focus writing",
                "figure_focus": "focus figure",
                "required_evidence_count": 2,
                "forbidden_claims": ["absolute claim"],
                "status": "ok",
            }
        if skill_id == "analysis_agent_skill":
            return {
                "recommendation": "analysis recommendation",
                "evidence": [{"source": "demo.pdf", "snippet": "evidence"}],
                "draft_template": "draft template",
                "risk_notes": [],
                "status": "ok",
            }
        if skill_id == "writer_agent_skill":
            return {
                "rewritten_text": payload.get("text", ""),
                "notes": ["writer note"],
                "status": "ok",
            }
        if skill_id == "manuscript_validate_skill":
            self.validate_calls += 1
            text = str(payload.get("text", ""))
            if self.validate_calls == 1 and "[1]" not in text:
                return {
                    "summary": "has high risk",
                    "issues": [{"severity": "high", "category": "evidence", "message": "missing", "suggestion": "add", "rewrite_example": "x"}],
                    "high_risk_count": 1,
                    "can_export": False,
                    "next_action": "revise",
                    "status": "ok",
                }
            return {
                "summary": "validated",
                "issues": [],
                "high_risk_count": 0,
                "can_export": True,
                "next_action": "export",
                "status": "ok",
            }
        if skill_id == "figure_agent_skill":
            self.figure_calls += 1
            return {
                "title": "figure",
                "caption": f"figure caption {self.figure_calls}",
                "figure_type": "method_framework",
                "image_url": "/generated/fallback.svg",
                "sources": [],
                "status": "ok",
            }
        if skill_id == "figure_audit_skill":
            self.figure_audit_calls += 1
            if self.figure_audit_calls <= self.audit_failures_before_pass:
                return {
                    "passed": False,
                    "summary": "audit failed",
                    "issues": [{"code": "LOW_PROMPT_ALIGNMENT", "severity": "medium", "message": "misaligned"}],
                    "recommended_feedback": ["elements"],
                    "error_code": "FIGURE_AUDIT_FAILED",
                    "retryable": True,
                    "degraded": True,
                }
            return {
                "passed": True,
                "summary": "audit passed",
                "issues": [],
                "recommended_feedback": [],
                "status": "ok",
            }
        if skill_id == "figure_prompt_refine_skill":
            return {
                "refined_prompt": f"{payload.get('prompt', '')} retry attempt {payload.get('attempt', 0)}",
                "status": "ok",
            }
        if skill_id == "citation_agent_skill":
            return {"citations": [{"source": "demo.pdf", "quote": "q"}], "status": "ok"}
        if skill_id == "mentor_review_skill":
            return {
                "final_summary": "mentor summary",
                "go_next": "export",
                "risk_notes": [],
                "status": "ok",
            }
        raise KeyError(skill_id)


class WorkflowEngineTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)
        self.registry = _FakeRegistry()
        self.engine = WorkflowEngine(self.registry, self.base_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_run_resume_and_export_flow(self):
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
            },
        )
        self.assertEqual(session["status"], "needs_revision")
        self.assertEqual(session["pending_action"], "revise_draft")

        resumed = self.engine.resume(
            session["session_id"],
            {"revised_draft": "revised paragraph with metrics [1]"},
        )
        self.assertEqual(resumed["status"], "completed")
        self.assertIn("mentor_constraints", resumed["result"])
        self.assertIn("evidence_trace", resumed["result"])
        self.assertIn("step_trace", resumed["result"])
        self.assertGreaterEqual(len(resumed.get("revision_history", [])), 1)
        exported = self.engine.export(session["session_id"])
        self.assertIn("bundle_path", exported)
        self.assertIn("evidence_path", exported)

    def test_pause_after_step(self):
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
                "pause_after_step": 1,
            },
        )
        self.assertEqual(session["status"], "paused")
        self.assertEqual(session["current_step"], 2)

    def test_export_requires_completed_status(self):
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
                "pause_after_step": 0,
            },
        )
        with self.assertRaises(ValueError):
            self.engine.export(session["session_id"])

    def test_load_saved_sessions_and_metrics(self):
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
            },
        )
        self.engine.resume(session["session_id"], {"revised_draft": "revised [1]"})
        reloaded = WorkflowEngine(self.registry, self.base_path)
        fetched = reloaded.get(session["session_id"])
        self.assertEqual(fetched["status"], "completed")
        metrics = reloaded.workflow_metrics()
        self.assertGreaterEqual(metrics["total_sessions"], 1)
        self.assertGreaterEqual(metrics["completed_sessions"], 1)

    def test_unsupported_workflow_id(self):
        with self.assertRaises(ValueError):
            self.engine.run("unknown_workflow", {"topic": "t"})

    def test_figure_audit_retry_until_pass(self):
        self.registry.audit_failures_before_pass = 1
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
                "revised_draft": "revised paragraph with metrics [1]",
                "max_figure_attempts": 3,
            },
        )
        self.assertEqual(session["status"], "completed")
        self.assertEqual(session["metrics"]["figure_attempts"], 2)
        self.assertEqual(session["metrics"]["figure_audit_failures"], 1)
        self.assertGreaterEqual(session["metrics"]["retry_count"], 1)
        self.assertIn("workflow_metrics", session["result"])
        self.assertEqual(session["result"]["workflow_metrics"]["figure_attempts"], 2)

    def test_figure_audit_stops_after_max_attempts(self):
        self.registry.audit_failures_before_pass = 10
        session = self.engine.run(
            "question_to_submission_paragraph",
            {
                "topic": "topic",
                "stage": "draft",
                "question": "question",
                "section": "method",
                "revised_draft": "revised paragraph with metrics [1]",
                "max_figure_attempts": 3,
            },
        )
        self.assertEqual(session["status"], "needs_revision")
        self.assertEqual(session["pending_action"], "revise_figure_prompt")
        self.assertEqual(session["metrics"]["figure_attempts"], 3)
        self.assertEqual(session["metrics"]["figure_audit_failures"], 3)
        self.assertIn("pending_figure_audit_issues", session["result"])


if __name__ == "__main__":
    unittest.main()
