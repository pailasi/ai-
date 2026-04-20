from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatExcerpt(BaseModel):
    source: str
    text: str
    page: int | None = None
    chunk_id: str = ""


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = Field(default_factory=list)
    excerpts: list[ChatExcerpt] = Field(default_factory=list)
    retrieval_source: Literal["vector", "keyword", "fallback", "none"] = "none"
    error_code: str = ""
    error_hint: str = ""
    retryable: bool = False
    degraded: bool = False
    model_provider: str = ""
    model_name: str = ""
    fallback_chain: list[dict[str, str]] = Field(default_factory=list)


class DiagramRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    style: Literal["academic", "minimal", "presentation"] = "academic"
    detail_level: Literal["low", "medium", "high"] = "medium"
    language: Literal["zh", "en"] = "zh"
    width: int | None = Field(default=None, ge=512, le=2400)
    height: int | None = Field(default=None, ge=512, le=2400)
    feedback: list[Literal["layout", "elements", "text", "style"]] = Field(default_factory=list)


class DiagramResponse(BaseModel):
    mermaid_code: str
    image_url: str | None = None
    error_code: str = ""
    error_hint: str = ""
    retryable: bool = False
    degraded: bool = False
    model_provider: str = ""
    model_name: str = ""
    fallback_chain: list[dict[str, str]] = Field(default_factory=list)


class FigureRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    template_type: Literal["method_framework", "experiment_flow", "comparison", "ablation"] = "method_framework"
    style: Literal["academic", "minimal", "presentation"] = "academic"
    detail_level: Literal["low", "medium", "high"] = "medium"
    language: Literal["zh", "en"] = "zh"
    width: int | None = Field(default=None, ge=512, le=2400)
    height: int | None = Field(default=None, ge=512, le=2400)
    feedback: list[Literal["layout", "elements", "text", "style"]] = Field(default_factory=list)


class FigureResponse(BaseModel):
    title: str
    caption: str
    figure_type: str
    image_url: str
    sources: list[str] = Field(default_factory=list)
    error_code: str = ""
    error_hint: str = ""
    retryable: bool = False
    degraded: bool = False
    model_provider: str = ""
    model_name: str = ""
    fallback_chain: list[dict[str, str]] = Field(default_factory=list)


class IngestResponse(BaseModel):
    indexed_files: int
    chunks: int
    message: str


class FocusDocumentRequest(BaseModel):
    source: str = Field(..., min_length=1, max_length=400)


class FocusDocumentResponse(BaseModel):
    source: str


class WritingHelpRequest(BaseModel):
    topic: str = Field(default="", max_length=300)
    stage: Literal["proposal", "draft", "submission"] = "draft"
    question: str = Field(..., min_length=1, max_length=2000)
    reference_documents: list[str] = Field(default_factory=list)
    document_scope: list[str] = Field(default_factory=list)
    manuscript_source: str | None = Field(default=None, max_length=400)


class WritingEvidence(BaseModel):
    source: str
    snippet: str
    page: int | None = None
    chunk_id: str = ""
    evidence_role: Literal["manuscript", "reference"] = "manuscript"


class WritingHelpResponse(BaseModel):
    recommendation: str
    evidence: list[WritingEvidence] = Field(default_factory=list)
    draft_template: str
    risk_notes: list[str] = Field(default_factory=list)
    retrieval_source: Literal["vector", "keyword", "fallback", "none"] = "none"
    error_code: str = ""
    error_hint: str = ""


class MethodCompareRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    method_a: str = Field(..., min_length=1, max_length=200)
    method_b: str = Field(..., min_length=1, max_length=200)
    reference_documents: list[str] = Field(default_factory=list)
    document_scope: list[str] = Field(default_factory=list)


class ReasoningEvidence(BaseModel):
    evidence_id: str
    source: str
    page: int | None = None
    chunk_id: str = ""
    snippet: str
    score: float = 0.0


class ReasoningCompareItem(BaseModel):
    dimension: str
    claim: str
    evidence_ids: list[str] = Field(default_factory=list)


class ReasoningValidateIssue(BaseModel):
    severity: str
    message: str
    claim_ref: str = ""


class ReasoningSupportedClaim(BaseModel):
    text: str
    evidence_ids: list[str] = Field(default_factory=list)


class MethodCompareResponse(BaseModel):
    status: Literal["ok", "insufficient_evidence", "risk_detected"]
    summary: str
    retrieve_evidence: list[ReasoningEvidence] = Field(default_factory=list)
    comparisons: list[ReasoningCompareItem] = Field(default_factory=list)
    validation_issues: list[ReasoningValidateIssue] = Field(default_factory=list)
    supported_claims: list[ReasoningSupportedClaim] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    retrieval_source: Literal["vector", "keyword", "fallback", "none"] = "none"
    error_code: str = ""
    error_hint: str = ""
    retryable: bool = False
    degraded: bool = False


WritingValidateScope = Literal[
    "abstract",
    "introduction",
    "method",
    "experiment",
    "conclusion",
    "ending",
    "full",
    "custom",
]


class WritingValidateRequest(BaseModel):
    validate_scope: WritingValidateScope = "custom"
    section: Literal["abstract", "introduction", "method", "experiment", "conclusion", "custom"] | None = None
    text: str | None = Field(default=None, max_length=120000)
    reference_documents: list[str] = Field(default_factory=list)
    use_llm_review: bool = True


class ValidationIssue(BaseModel):
    category: str
    severity: Literal["high", "medium", "low"]
    message: str
    suggestion: str
    rewrite_example: str
    original_text: str = ""


class WritingValidateResponse(BaseModel):
    summary: str
    issues: list[ValidationIssue] = Field(default_factory=list)
    high_risk_count: int = 0
    can_export: bool = True
    next_action: str = ""
    extraction_note: str = ""
    validate_scope: str = ""
    llm_review_used: bool = False
    validated_text: str = ""


class WritingRewriteRequest(BaseModel):
    section: Literal["abstract", "introduction", "method", "experiment", "conclusion", "custom"] = "custom"
    text: str = Field(..., min_length=20, max_length=12000)
    focus: str = Field(default="", max_length=500)


class WritingRewriteResponse(BaseModel):
    rewritten_text: str
    notes: list[str] = Field(default_factory=list)
    error_code: str = ""
    error_hint: str = ""
    retryable: bool = False
    degraded: bool = False
    model_provider: str = ""
    model_name: str = ""
    fallback_chain: list[dict[str, str]] = Field(default_factory=list)


class DocumentItem(BaseModel):
    source: str
    updated_at: int
    ingested: bool
    is_focus: bool = False


class MentorRunRequest(BaseModel):
    goal: str = Field(..., min_length=1, max_length=4000)
    topic: str = Field(default="", max_length=300)
    section: Literal["abstract", "introduction", "method", "experiment", "conclusion", "custom"] = "method"
    stage: Literal["proposal", "draft", "submission"] = "draft"
    reference_documents: list[str] = Field(default_factory=list)


class MentorSessionResponse(BaseModel):
    session_id: str
    status: Literal["running", "completed", "failed"] = "running"
    goal: str = ""
    topic: str = ""
    section: str = ""
    stage: str = ""
    reference_documents: list[str] = Field(default_factory=list)
    plan_source: str = ""
    plan: list[dict[str, Any]] = Field(default_factory=list)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    summary: str = ""
    error: str = ""

