import unittest

from skills import SkillContract, SkillRegistry, build_default_registry


class _DummyResearchService:
    def mentor_dispatch(self, **kwargs):
        return {"plan": ["dispatch"]}

    def writing_help(self, **kwargs):
        return {"recommendation": "ok", "evidence": []}

    def generate_figure(self, **kwargs):
        return {"image_url": "/generated/fig.svg", "caption": "cap"}

    def audit_figure(self, **kwargs):
        return {"passed": True, "summary": "ok"}

    def refine_figure_prompt_from_audit(self, **kwargs):
        return "refined prompt"

    def rewrite_paragraph(self, **kwargs):
        return {"rewritten_text": "rewritten"}

    def validate_manuscript(self, **kwargs):
        return {"summary": "ok", "issues": [], "high_risk_count": 0}

    def mentor_review(self, **kwargs):
        return {"final_summary": "review", "go_next": "export", "risk_notes": []}


class SkillRegistryTests(unittest.TestCase):
    def test_contract_validate_input(self):
        contract = SkillContract(
            skill_id="demo",
            description="demo",
            required_inputs=["a", "b"],
            runner=lambda payload: {"ok": True},
        )
        with self.assertRaises(ValueError):
            contract.run({"a": 1})

    def test_registry_unknown_skill(self):
        registry = SkillRegistry()
        with self.assertRaises(KeyError):
            registry.run("missing", {})

    def test_citation_skill_mapping_and_envelope(self):
        registry = build_default_registry(_DummyResearchService())
        result = registry.run(
            "citation_agent_skill",
            {
                "evidence": [
                    {"source": "paper.pdf", "snippet": "a long quote", "page": 3, "chunk_id": "p3_0"},
                ]
            },
        )
        self.assertIn("citations", result)
        self.assertEqual(result["citations"][0]["source"], "paper.pdf")
        self.assertIn("status", result)
        self.assertIn("summary", result)
        self.assertIn("artifacts", result)

    def test_figure_audit_and_prompt_refine_skills(self):
        registry = build_default_registry(_DummyResearchService())
        audit_result = registry.run(
            "figure_audit_skill",
            {"image_url": "/generated/fig.svg", "prompt": "method flow", "caption": "caption"},
        )
        self.assertIn("passed", audit_result)
        self.assertIn("summary", audit_result)
        refine_result = registry.run(
            "figure_prompt_refine_skill",
            {"prompt": "old prompt", "attempt": 1, "issues": []},
        )
        self.assertIn("refined_prompt", refine_result)


if __name__ == "__main__":
    unittest.main()
