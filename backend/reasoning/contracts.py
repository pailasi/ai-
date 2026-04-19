from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class EvidenceItem:
    evidence_id: str
    source: str
    page: int | None
    chunk_id: str
    snippet: str
    score: float


@dataclass
class RetrieveOutput:
    query: str
    evidence: list[EvidenceItem] = field(default_factory=list)


@dataclass
class CompareItem:
    dimension: str
    claim: str
    evidence_ids: list[str] = field(default_factory=list)


@dataclass
class CompareOutput:
    comparisons: list[CompareItem] = field(default_factory=list)
    missing_dimensions: list[str] = field(default_factory=list)


@dataclass
class ValidateIssue:
    severity: str
    message: str
    claim_ref: str


@dataclass
class ValidateOutput:
    status: str  # ok | insufficient_evidence | risk_detected
    issues: list[ValidateIssue] = field(default_factory=list)


@dataclass
class ConcludeClaim:
    text: str
    evidence_ids: list[str] = field(default_factory=list)


@dataclass
class ConcludeOutput:
    summary: str
    supported_claims: list[ConcludeClaim] = field(default_factory=list)
    uncertainties: list[str] = field(default_factory=list)


def validate_chain_consistency(
    retrieve_out: RetrieveOutput,
    compare_out: CompareOutput,
    validate_out: ValidateOutput,
    conclude_out: ConcludeOutput,
) -> list[str]:
    errors: list[str] = []
    allowed_ids = {item.evidence_id for item in retrieve_out.evidence if item.evidence_id}

    for item in compare_out.comparisons:
        if not item.evidence_ids:
            errors.append(f"compare claim has no evidence ids: {item.claim}")
            continue
        unknown = [eid for eid in item.evidence_ids if eid not in allowed_ids]
        if unknown:
            errors.append(f"compare claim references unknown evidence ids: {unknown}")

    for claim in conclude_out.supported_claims:
        if not claim.evidence_ids:
            errors.append(f"conclude claim has no evidence ids: {claim.text}")
            continue
        unknown = [eid for eid in claim.evidence_ids if eid not in allowed_ids]
        if unknown:
            errors.append(f"conclude claim references unknown evidence ids: {unknown}")

    if validate_out.status == "insufficient_evidence" and conclude_out.supported_claims:
        errors.append("insufficient_evidence status cannot have supported claims")

    return errors

