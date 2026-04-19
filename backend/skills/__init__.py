from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


SkillRunner = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass
class SkillContract:
    skill_id: str
    description: str
    required_inputs: list[str]
    runner: SkillRunner

    def validate_input(self, payload: dict[str, Any]) -> None:
        missing = [key for key in self.required_inputs if key not in payload]
        if missing:
            raise ValueError(f"skill '{self.skill_id}' missing required inputs: {', '.join(missing)}")

    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.validate_input(payload)
        raw_output = self.runner(payload)
        return _normalize_skill_output(self.skill_id, raw_output)


def _normalize_skill_output(skill_id: str, output: dict[str, Any]) -> dict[str, Any]:
    # 将不同 skill 的返回统一成一个“可编排”的结构，减少 workflow 判断分支
    if not isinstance(output, dict):
        output = {"summary": str(output)}
    normalized = dict(output)
    degraded = bool(normalized.get("degraded", False))
    error_code = str(normalized.get("error_code", "") or "")
    normalized.setdefault("status", "degraded" if degraded or error_code else "ok")
    normalized.setdefault("error_code", error_code)
    normalized.setdefault("retryable", bool(normalized.get("retryable", False)))
    normalized.setdefault("degraded", degraded)
    normalized.setdefault("summary", _derive_summary(skill_id, normalized))
    normalized.setdefault("artifacts", _derive_artifacts(skill_id, normalized))
    return normalized


def _derive_summary(skill_id: str, output: dict[str, Any]) -> str:
    if isinstance(output.get("summary"), str) and str(output.get("summary", "")).strip():
        return str(output.get("summary", ""))
    if skill_id == "mentor_dispatch_skill":
        plan = output.get("plan", [])
        if isinstance(plan, list) and plan:
            return f"导师已分派 {len(plan)} 条执行要点。"
        return "导师已完成任务分派。"
    if skill_id == "analysis_agent_skill":
        evidence = output.get("evidence", [])
        if isinstance(evidence, list):
            return f"分析完成，命中证据 {len(evidence)} 条。"
        return "分析完成。"
    if skill_id == "writer_agent_skill":
        rewritten_text = str(output.get("rewritten_text", "") or "")
        return f"写作完成，段落长度 {len(rewritten_text)}。"
    if skill_id == "manuscript_validate_skill":
        return str(output.get("summary", "校验完成。"))
    if skill_id == "figure_agent_skill":
        return str(output.get("caption", "配图结果已生成。"))
    if skill_id == "figure_audit_skill":
        if bool(output.get("passed", False)):
            return "配图审计通过。"
        return str(output.get("summary", "配图审计未通过。"))
    if skill_id == "figure_prompt_refine_skill":
        return "已根据审计意见回滚并增强提示词。"
    if skill_id == "citation_agent_skill":
        citations = output.get("citations", [])
        return f"引用包已生成，共 {len(citations) if isinstance(citations, list) else 0} 条。"
    if skill_id == "mentor_review_skill":
        return str(output.get("final_summary", "导师复审已完成。"))
    return "步骤完成。"


def _derive_artifacts(skill_id: str, output: dict[str, Any]) -> list[dict[str, str]]:
    artifacts: list[dict[str, str]] = []
    if skill_id == "figure_agent_skill" and output.get("image_url"):
        artifacts.append({"type": "figure", "value": str(output.get("image_url", ""))})
    if skill_id == "figure_audit_skill":
        artifacts.append({"type": "audit", "value": "pass" if bool(output.get("passed", False)) else "fail"})
    if skill_id == "figure_prompt_refine_skill" and output.get("refined_prompt"):
        artifacts.append({"type": "prompt", "value": str(output.get("refined_prompt", ""))[:500]})
    if skill_id == "writer_agent_skill" and output.get("rewritten_text"):
        artifacts.append({"type": "draft", "value": str(output.get("rewritten_text", ""))[:1200]})
    if skill_id == "citation_agent_skill":
        citations = output.get("citations", [])
        if isinstance(citations, list) and citations:
            artifacts.append({"type": "citations", "value": f"{len(citations)} items"})
    return artifacts


class SkillRegistry:
    def __init__(self) -> None:
        self._skills: dict[str, SkillContract] = {}

    def register(self, contract: SkillContract) -> None:
        self._skills[contract.skill_id] = contract

    def get(self, skill_id: str) -> SkillContract:
        if skill_id not in self._skills:
            raise KeyError(f"unknown skill: {skill_id}")
        return self._skills[skill_id]

    def run(self, skill_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        # workflow 统一通过 registry 执行 skill，屏蔽具体实现细节
        return self.get(skill_id).run(payload)

    def list_skills(self) -> list[dict[str, Any]]:
        return [
            {
                "skill_id": item.skill_id,
                "description": item.description,
                "required_inputs": item.required_inputs,
            }
            for item in self._skills.values()
        ]


def build_default_registry(research_service: Any) -> SkillRegistry:
    # 这里把 ResearchService 能力装配成可编排技能（skill_id -> runner）
    registry = SkillRegistry()

    registry.register(
        SkillContract(
            skill_id="mentor_dispatch_skill",
            description="Mentor agent dispatches analysis/writing/figure tasks",
            required_inputs=["topic", "stage", "question", "section"],
            runner=lambda payload: research_service.mentor_dispatch(
                topic=str(payload["topic"]),
                stage=str(payload["stage"]),
                question=str(payload["question"]),
                section=str(payload["section"]),
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="analysis_agent_skill",
            description="Analysis agent: answer paper question with evidence and template",
            required_inputs=["topic", "stage", "question"],
            runner=lambda payload: research_service.writing_help(
                topic=str(payload["topic"]),
                stage=str(payload["stage"]),
                question=str(payload["question"]),
                reference_documents=list(payload.get("reference_documents", payload.get("document_scope", []))),
                required_evidence_count=int(payload.get("required_evidence_count", 1) or 1),
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="figure_agent_skill",
            description="Figure agent: generate paper figure with template and metadata",
            required_inputs=["prompt"],
            runner=lambda payload: research_service.generate_figure(
                prompt=str(payload["prompt"]),
                template_type=str(payload.get("template_type", "method_framework")),
                style=str(payload.get("style", "academic")),
                detail_level=str(payload.get("detail_level", "medium")),
                language=str(payload.get("language", "zh")),
                width=payload.get("width"),
                height=payload.get("height"),
                feedback=list(payload.get("feedback", [])),
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="figure_audit_skill",
            description="Figure audit skill: verify generated image quality and expectation fit",
            required_inputs=["image_url", "prompt"],
            runner=lambda payload: research_service.audit_figure(
                image_url=str(payload["image_url"]),
                prompt=str(payload["prompt"]),
                question=str(payload.get("question", "")),
                caption=str(payload.get("caption", "")),
                title=str(payload.get("title", "")),
                figure_type=str(payload.get("figure_type", "")),
                degraded=bool(payload.get("degraded", False)),
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="figure_prompt_refine_skill",
            description="Prompt refine skill: regenerate upstream figure prompt from audit feedback",
            required_inputs=["prompt", "attempt"],
            runner=lambda payload: {
                "refined_prompt": research_service.refine_figure_prompt_from_audit(
                    prompt=str(payload["prompt"]),
                    attempt=int(payload.get("attempt", 1) or 1),
                    audit_summary=str(payload.get("audit_summary", "")),
                    issues=list(payload.get("issues", [])),
                )
            },
        )
    )

    registry.register(
        SkillContract(
            skill_id="writer_agent_skill",
            description="Writer agent: model-driven rewrite with actionable notes",
            required_inputs=["text"],
            runner=lambda payload: research_service.rewrite_paragraph(
                section=str(payload.get("section", "method")),
                text=str(payload["text"]),
                focus=str(payload.get("focus", "")),
                forbidden_claims=[str(item) for item in list(payload.get("forbidden_claims", [])) if str(item).strip()],
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="citation_agent_skill",
            description="Citation agent: build a lightweight citation pack from evidence",
            required_inputs=["evidence"],
            runner=lambda payload: {
                "citations": [
                    {
                        "source": item.get("source", ""),
                        "quote": item.get("snippet", "")[:160],
                        "page": item.get("page"),
                        "chunk_id": item.get("chunk_id", ""),
                    }
                    for item in list(payload.get("evidence", []))
                ]
            },
        )
    )

    registry.register(
        SkillContract(
            skill_id="manuscript_validate_skill",
            description="Validate manuscript section and return structured issues",
            required_inputs=["section", "text"],
            runner=lambda payload: research_service.validate_manuscript(
                section=str(payload["section"]),
                text=str(payload["text"]),
            ),
        )
    )

    registry.register(
        SkillContract(
            skill_id="mentor_review_skill",
            description="Mentor agent reviews all agent outputs and provides final guidance",
            required_inputs=["recommendation", "draft_paragraph", "validation_summary", "figure_caption"],
            runner=lambda payload: research_service.mentor_review(
                recommendation=str(payload["recommendation"]),
                draft_paragraph=str(payload["draft_paragraph"]),
                validation_summary=str(payload["validation_summary"]),
                figure_caption=str(payload["figure_caption"]),
            ),
        )
    )

    return registry
