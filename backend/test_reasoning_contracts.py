import unittest

from reasoning.contracts import (
    CompareItem,
    CompareOutput,
    ConcludeClaim,
    ConcludeOutput,
    EvidenceItem,
    RetrieveOutput,
    ValidateOutput,
    validate_chain_consistency,
)


class ReasoningContractTests(unittest.TestCase):
    def test_consistency_ok(self):
        retrieve = RetrieveOutput(
            query="compare methods",
            evidence=[
                EvidenceItem("e1", "a.pdf", 1, "a_1", "snippet a", 0.9),
                EvidenceItem("e2", "b.pdf", 2, "b_2", "snippet b", 0.8),
            ],
        )
        compare = CompareOutput(
            comparisons=[CompareItem("metric", "Method A outperforms baseline", ["e1", "e2"])],
            missing_dimensions=[],
        )
        validate = ValidateOutput(status="ok", issues=[])
        conclude = ConcludeOutput(
            summary="A is better with evidence.",
            supported_claims=[ConcludeClaim("A outperforms baseline", ["e1"])],
            uncertainties=[],
        )
        self.assertEqual(validate_chain_consistency(retrieve, compare, validate, conclude), [])

    def test_insufficient_evidence_cannot_support_claims(self):
        retrieve = RetrieveOutput(query="q", evidence=[EvidenceItem("e1", "a.pdf", 1, "a_1", "x", 0.9)])
        compare = CompareOutput(comparisons=[CompareItem("metric", "claim", ["e1"])])
        validate = ValidateOutput(status="insufficient_evidence", issues=[])
        conclude = ConcludeOutput(
            summary="not enough evidence",
            supported_claims=[ConcludeClaim("claim", ["e1"])],
            uncertainties=["need more papers"],
        )
        errors = validate_chain_consistency(retrieve, compare, validate, conclude)
        self.assertTrue(any("insufficient_evidence" in item for item in errors))


if __name__ == "__main__":
    unittest.main()

