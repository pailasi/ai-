from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

from config import settings
from skills import SkillRegistry


class WorkflowEngine:
    def __init__(self, registry: SkillRegistry, data_dir: Path) -> None:
        self.registry = registry
        # 工作流会话持久化：重启服务后仍可读取历史 session
        self.session_path = data_dir / "workflow_sessions.json"
        self.export_dir = data_dir / "workflow_exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self._sessions: dict[str, dict[str, Any]] = {}
        self._load_sessions()

    def run(self, workflow_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if workflow_id != "question_to_submission_paragraph":
            raise ValueError("unsupported workflow_id")
        session_id = uuid.uuid4().hex[:12]
        session = {
            "session_id": session_id,
            "workflow_id": workflow_id,
            "status": "running",
            "current_step": 0,
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "input": payload,
            "steps": [],
            "result": {},
            "pending_action": "",
            "revision_history": [],
            "metrics": {
                "retry_count": 0,
                "degraded_count": 0,
                "error_count": 0,
                "total_duration_ms": 0,
                "figure_attempts": 0,
                "figure_audit_failures": 0,
                "figure_last_audit_reason": "",
            },
        }
        self._sessions[session_id] = session
        # run 会直接执行直到完成/暂停/需要修订
        self._execute_remaining(session_id, payload.get("pause_after_step", -1))
        return self._sessions[session_id]

    def resume(self, session_id: str, overrides: dict[str, Any] | None = None) -> dict[str, Any]:
        if session_id not in self._sessions:
            raise KeyError("session not found")
        session = self._sessions[session_id]
        if overrides:
            session["input"].update(overrides)
            revised_draft = str(overrides.get("revised_draft", "") or "").strip()
            if revised_draft:
                history = session.get("revision_history", [])
                if not isinstance(history, list):
                    history = []
                history.append(
                    {
                        "updated_at": int(time.time()),
                        "draft_length": len(revised_draft),
                        "source": "resume_override",
                    }
                )
                session["revision_history"] = history[-10:]
        session["status"] = "running"
        session["pending_action"] = ""
        # resume 会接着 current_step 继续执行剩余步骤
        self._execute_remaining(session_id, session["input"].get("pause_after_step", -1))
        return session

    def get(self, session_id: str) -> dict[str, Any]:
        if session_id not in self._sessions:
            raise KeyError("session not found")
        return self._sessions[session_id]

    def export(self, session_id: str) -> dict[str, str]:
        session = self.get(session_id)
        if session.get("status") != "completed":
            raise ValueError("workflow session is not completed")
        # 导出时拆分三类工件：段落、图注、证据；并额外生成 bundle 汇总
        result = session.get("result", {})
        lines = [
            f"# Workflow Export: {session['workflow_id']}",
            "",
            "## Mentor Summary",
            str(result.get("mentor_summary", "")),
            "",
            "## Recommendation",
            str(result.get("recommendation", "")),
            "",
            "## Draft Paragraph",
            str(result.get("draft_paragraph", "")),
            "",
            "## Validation Summary",
            str(result.get("validation_summary", "")),
            "",
            "## Figure",
            f"- URL: {result.get('figure_url', '')}",
            f"- Caption: {result.get('figure_caption', '')}",
            "",
            "## Citation Pack",
        ]
        lines.extend(
            [
                "",
                "## Evidence Trace",
            ]
        )
        for item in result.get("evidence_trace", []):
            lines.append(
                f"- {item.get('source', '')} (p.{item.get('page') or 'NA'}) [{item.get('chunk_id', '')}]"
            )
        lines.extend(
            [
                "",
                "## Revision History",
            ]
        )
        for item in session.get("revision_history", []):
            lines.append(
                f"- {item.get('updated_at', 0)} | len={item.get('draft_length', 0)} | {item.get('source', '')}"
            )
        for item in result.get("citations", []):
            page_text = f" (p.{item.get('page')})" if item.get("page") else ""
            chunk_text = f" [{item.get('chunk_id', '')}]" if item.get("chunk_id") else ""
            lines.append(f"- {item.get('source', '')}{page_text}{chunk_text}: {item.get('quote', '')}")
        content = "\n".join(lines)
        base = self.export_dir / session_id
        try:
            base.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        paragraph_path = base / "paragraph.md"
        figure_caption_path = base / "figure_caption.txt"
        evidence_path = base / "evidence.json"
        bundle_path = base / "bundle.md"

        try:
            paragraph_path.write_text(
                f"# Draft Paragraph\n\n{result.get('draft_paragraph', '')}\n",
                encoding="utf-8",
            )
            figure_caption_path.write_text(
                f"{result.get('figure_caption', '')}\n",
                encoding="utf-8",
            )
            evidence_path.write_text(
                json.dumps(result.get("citations", []), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            bundle_path.write_text(content, encoding="utf-8")
        except OSError:
            pass
        return {
            "session_id": session_id,
            "bundle_path": str(bundle_path),
            "paragraph_path": str(paragraph_path),
            "figure_caption_path": str(figure_caption_path),
            "evidence_path": str(evidence_path),
        }

    def workflow_metrics(self) -> dict[str, object]:
        sessions = list(self._sessions.values())
        if not sessions:
            return {
                "total_sessions": 0,
                "completed_sessions": 0,
                "paused_sessions": 0,
                "success_rate": 0.0,
                "avg_duration_ms": 0,
                "avg_retry_count": 0.0,
                "avg_degraded_count": 0.0,
            }
        completed = [item for item in sessions if item.get("status") == "completed"]
        paused = [item for item in sessions if item.get("status") in {"paused", "needs_revision"}]
        avg_duration = int(sum(item.get("metrics", {}).get("total_duration_ms", 0) for item in sessions) / max(1, len(sessions)))
        avg_retry = float(sum(item.get("metrics", {}).get("retry_count", 0) for item in sessions) / max(1, len(sessions)))
        avg_degraded = float(sum(item.get("metrics", {}).get("degraded_count", 0) for item in sessions) / max(1, len(sessions)))
        return {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "paused_sessions": len(paused),
            "success_rate": round(len(completed) / max(1, len(sessions)), 3),
            "avg_duration_ms": avg_duration,
            "avg_retry_count": round(avg_retry, 3),
            "avg_degraded_count": round(avg_degraded, 3),
        }

    def _execute_remaining(self, session_id: str, pause_after_step: int) -> None:
        session = self._sessions[session_id]
        payload = session["input"]
        started_at = time.time()
        data: dict[str, Any] = {"payload": payload}
        self._ensure_metric_defaults(session)
        steps = self._workflow_steps()
        figure_step_index = next((idx for idx, item in enumerate(steps) if item.get("step_id") == "figure"), -1)
        max_figure_attempts = int(payload.get("max_figure_attempts", 0) or 0)
        if max_figure_attempts <= 0:
            max_figure_attempts = int(settings.workflow_figure_max_attempts or 3)
        max_figure_attempts = max(1, min(5, max_figure_attempts))

        index = 0
        while index < len(steps):
            step = steps[index]
            step_id = str(step.get("step_id", ""))
            if index < session["current_step"]:
                prev = session["steps"][index]["output"]
                data[step_id] = prev
                index += 1
                continue
            if pause_after_step >= 0 and index > pause_after_step:
                session["status"] = "paused"
                self._save_sessions()
                return
            step_input = step["input_builder"](data)
            output = self.registry.run(step["skill_id"], step_input)
            output = self._apply_step_gates(step_id, output, data)
            self._upsert_step(session, index, step_id, str(step.get("skill_id", "")), step_input, output)
            data[step_id] = output
            session["current_step"] = index + 1
            session["updated_at"] = int(time.time())
            self._track_step_metrics(session, output)

            if step_id == "figure":
                session["metrics"]["figure_attempts"] = int(session["metrics"].get("figure_attempts", 0)) + 1
                payload["figure_attempts"] = int(session["metrics"].get("figure_attempts", 0))

            if step_id == "validate":
                # 高风险门禁：如果校验出现 high 且未允许高风险导出，则进入 needs_revision
                high_risk_issues = [
                    item
                    for item in output.get("issues", [])
                    if isinstance(item, dict) and str(item.get("severity", "")).lower() == "high"
                ] if isinstance(output, dict) else []
                if high_risk_issues and not bool(payload.get("allow_high_risk_export", False)):
                    self._finalize_needs_revision(
                        session,
                        data,
                        "revise_draft",
                        {"pending_high_risk_issues": high_risk_issues},
                    )
                    return

            if step_id == "figure_audit":
                passed = bool(output.get("passed", False)) if isinstance(output, dict) else False
                if not passed:
                    session["metrics"]["figure_audit_failures"] = int(session["metrics"].get("figure_audit_failures", 0)) + 1
                    session["metrics"]["figure_last_audit_reason"] = str(output.get("summary", "")) if isinstance(output, dict) else ""
                    attempts = int(session["metrics"].get("figure_attempts", 0))
                    if attempts < max_figure_attempts and figure_step_index >= 0:
                        feedback_items = output.get("recommended_feedback", []) if isinstance(output, dict) else []
                        issues = output.get("issues", []) if isinstance(output, dict) else []
                        refined_prompt = self.registry.run(
                            "figure_prompt_refine_skill",
                            {
                                "prompt": str(payload.get("figure_prompt", payload.get("question", ""))),
                                "attempt": attempts,
                                "audit_summary": str(output.get("summary", "")) if isinstance(output, dict) else "",
                                "issues": issues if isinstance(issues, list) else [],
                            },
                        )
                        payload["figure_prompt"] = str(
                            refined_prompt.get("refined_prompt", payload.get("figure_prompt", payload.get("question", "")))
                        )
                        if isinstance(feedback_items, list):
                            existing_feedback = list(payload.get("feedback", []))
                            payload["feedback"] = list(dict.fromkeys(existing_feedback + [str(item) for item in feedback_items]))
                        session["input"] = payload
                        session["current_step"] = figure_step_index
                        session["updated_at"] = int(time.time())
                        index = figure_step_index
                        continue
                    self._finalize_needs_revision(
                        session,
                        data,
                        "revise_figure_prompt",
                        {"pending_figure_audit_issues": output.get("issues", []) if isinstance(output, dict) else []},
                    )
                    return
            index += 1

        self._finalize_success(session, data, started_at)

    def _build_result(self, data: dict[str, Any]) -> dict[str, Any]:
        # 将多 agent 输出收敛为稳定结果结构，便于前端展示和后续导出
        dispatch = data.get("mentor_dispatch", {})
        writing = data.get("analysis", {})
        rewrite = data.get("writer", {})
        validate = data.get("validate", {})
        figure = data.get("figure", {})
        citations = data.get("citations", {}).get("citations", [])
        mentor_review = data.get("mentor_review", {})
        evidence_trace = self._evidence_trace(writing.get("evidence", []))
        risk_notes = list(mentor_review.get("risk_notes", writing.get("risk_notes", [])))
        if bool(data.get("analysis", {}).get("degraded", False)):
            risk_notes.append("分析阶段证据不足，建议补充文献或缩小问题范围后再提交。")
        if bool(data.get("figure", {}).get("degraded", False)):
            risk_notes.append("配图阶段发生降级，建议导出后对图注和图像进行人工复核。")
        figure_audit = data.get("figure_audit", {})
        return {
            "mentor_plan": dispatch.get("plan", []),
            "mentor_constraints": {
                "required_evidence_count": int(dispatch.get("required_evidence_count", 1) or 1),
                "writing_focus": str(dispatch.get("writing_focus", "")),
                "figure_focus": str(dispatch.get("figure_focus", "")),
                "forbidden_claims": list(dispatch.get("forbidden_claims", [])),
            },
            "mentor_summary": mentor_review.get("final_summary", ""),
            "recommendation": writing.get("recommendation", ""),
            "draft_paragraph": rewrite.get("rewritten_text", writing.get("draft_template", "")),
            "validation_summary": validate.get("summary", ""),
            "validation_issues": validate.get("issues", []),
            "figure_url": figure.get("image_url", ""),
            "figure_caption": figure.get("caption", ""),
            "figure_audit": figure_audit,
            "figure_attempts": int(data.get("payload", {}).get("figure_attempts", 0) or 0),
            "citations": citations,
            "evidence_trace": evidence_trace,
            "risk_notes": risk_notes,
            "next_action": mentor_review.get("go_next", ""),
        }

    def _evidence_trace(self, evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not isinstance(evidence, list):
            return []
        trace: list[dict[str, Any]] = []
        for item in evidence:
            if not isinstance(item, dict):
                continue
            source = str(item.get("source", "")).strip()
            if not source:
                continue
            page = item.get("page")
            trace.append(
                {
                    "source": source,
                    "page": int(page) if isinstance(page, int) and page > 0 else None,
                    "chunk_id": str(item.get("chunk_id", "")),
                }
            )
        return trace

    def _step_trace(self, steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for step in steps:
            if not isinstance(step, dict):
                continue
            output = step.get("output", {})
            if not isinstance(output, dict):
                output = {}
            out.append(
                {
                    "step_id": str(step.get("step_id", "")),
                    "status": str(output.get("status", "ok")),
                    "degraded": bool(output.get("degraded", False)),
                    "error_code": str(output.get("error_code", "")),
                    "summary": str(output.get("summary", "")),
                }
            )
        return out

    def _workflow_steps(self) -> list[dict[str, Any]]:
        # 固定流水线，figure 后追加审计步骤用于回滚重试
        return [
            {
                "step_id": "mentor_dispatch",
                "skill_id": "mentor_dispatch_skill",
                "input_builder": lambda data: {
                    "topic": data["payload"].get("topic", ""),
                    "stage": data["payload"].get("stage", "draft"),
                    "question": data["payload"].get("question", ""),
                    "section": data["payload"].get("section", "method"),
                },
            },
            {
                "step_id": "analysis",
                "skill_id": "analysis_agent_skill",
                "input_builder": lambda data: {
                    "topic": data["payload"].get("topic", ""),
                    "stage": data["payload"].get("stage", "draft"),
                    "question": data["payload"].get("question", ""),
                    "reference_documents": data["payload"].get(
                        "reference_documents", data["payload"].get("document_scope", [])
                    ),
                    "required_evidence_count": int(data.get("mentor_dispatch", {}).get("required_evidence_count", 1) or 1),
                },
            },
            {
                "step_id": "writer",
                "skill_id": "writer_agent_skill",
                "input_builder": lambda data: {
                    "text": (
                        data["payload"].get("revised_draft", "")
                        or
                        f"{data.get('mentor_dispatch', {}).get('writing_focus', '')}\n"
                        f"{data.get('analysis', {}).get('draft_template', '')}"
                    ).strip(),
                    "section": data["payload"].get("section", "method"),
                    "focus": data.get("mentor_dispatch", {}).get("writing_focus", ""),
                    "forbidden_claims": data.get("mentor_dispatch", {}).get("forbidden_claims", []),
                },
            },
            {
                "step_id": "validate",
                "skill_id": "manuscript_validate_skill",
                "input_builder": lambda data: {
                    "section": data["payload"].get("section", "method"),
                    "text": data["writer"].get("rewritten_text", ""),
                },
            },
            {
                "step_id": "figure",
                "skill_id": "figure_agent_skill",
                "input_builder": lambda data: {
                    "prompt": (
                        f"{data.get('mentor_dispatch', {}).get('figure_focus', '')} "
                        f"{data['payload'].get('figure_prompt', data['payload'].get('question', ''))}"
                    ).strip(),
                    "template_type": data["payload"].get("template_type", "method_framework"),
                    "style": data["payload"].get("style", "academic"),
                    "detail_level": data["payload"].get("detail_level", "medium"),
                    "language": data["payload"].get("language", "zh"),
                    "feedback": data["payload"].get("feedback", []),
                },
            },
            {
                "step_id": "figure_audit",
                "skill_id": "figure_audit_skill",
                "input_builder": lambda data: {
                    "image_url": data.get("figure", {}).get("image_url", ""),
                    "prompt": str(data["payload"].get("figure_prompt", data["payload"].get("question", ""))),
                    "question": str(data["payload"].get("question", "")),
                    "caption": str(data.get("figure", {}).get("caption", "")),
                    "title": str(data.get("figure", {}).get("title", "")),
                    "figure_type": str(data.get("figure", {}).get("figure_type", "")),
                    "degraded": bool(data.get("figure", {}).get("degraded", False)),
                },
            },
            {
                "step_id": "citations",
                "skill_id": "citation_agent_skill",
                "input_builder": lambda data: {
                    "evidence": data["analysis"].get("evidence", []),
                },
            },
            {
                "step_id": "mentor_review",
                "skill_id": "mentor_review_skill",
                "input_builder": lambda data: {
                    "recommendation": data.get("analysis", {}).get("recommendation", ""),
                    "draft_paragraph": data.get("writer", {}).get("rewritten_text", ""),
                    "validation_summary": data.get("validate", {}).get("summary", ""),
                    "figure_caption": data.get("figure", {}).get("caption", ""),
                },
            },
        ]

    def _apply_step_gates(self, step_id: str, output: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(output, dict):
            return {
                "status": "error",
                "error_code": "INVALID_OUTPUT",
                "retryable": False,
                "degraded": True,
                "summary": f"{step_id} 输出格式非法",
                "artifacts": [],
            }
        normalized = dict(output)
        if step_id == "analysis":
            evidence = normalized.get("evidence", [])
            required = int(data.get("mentor_dispatch", {}).get("required_evidence_count", 1) or 1)
            count = len(evidence) if isinstance(evidence, list) else 0
            if count < required:
                normalized["degraded"] = True
                normalized["status"] = "degraded"
                normalized.setdefault("error_code", "INSUFFICIENT_EVIDENCE")
                normalized.setdefault("retryable", False)
                normalized["summary"] = (
                    f"分析证据不足（{count}/{required}），建议补充文献或缩小问题范围。"
                )
        if step_id == "figure":
            image_url = str(normalized.get("image_url", "") or "").strip()
            if not image_url:
                normalized["degraded"] = True
                normalized["status"] = "degraded"
                normalized.setdefault("error_code", "FIGURE_ARTIFACT_MISSING")
                normalized.setdefault("retryable", True)
                normalized["summary"] = "配图缺少可导出产物，请重试或使用兜底模板。"
                artifacts = normalized.get("artifacts", [])
                if not isinstance(artifacts, list):
                    artifacts = []
                artifacts.append({"type": "figure", "value": "missing"})
                normalized["artifacts"] = artifacts
        if step_id == "figure_audit":
            passed = bool(normalized.get("passed", False))
            if not passed:
                normalized["degraded"] = True
                normalized["status"] = "degraded"
                normalized.setdefault("error_code", "FIGURE_AUDIT_FAILED")
                normalized.setdefault("retryable", True)
                normalized["summary"] = str(normalized.get("summary", "配图审计未通过，建议回滚提示词后重试。"))
        return normalized

    def _upsert_step(
        self,
        session: dict[str, Any],
        index: int,
        step_id: str,
        skill_id: str,
        step_input: dict[str, Any],
        output: dict[str, Any],
    ) -> None:
        record = {"step_id": step_id, "skill_id": skill_id, "input": step_input, "output": output}
        if len(session["steps"]) <= index:
            session["steps"].append(record)
        else:
            session["steps"][index] = record

    def _track_step_metrics(self, session: dict[str, Any], output: dict[str, Any]) -> None:
        if not isinstance(output, dict):
            return
        if bool(output.get("degraded", False)):
            session["metrics"]["degraded_count"] = int(session["metrics"].get("degraded_count", 0)) + 1
        if bool(output.get("retryable", False)) and output.get("error_code"):
            session["metrics"]["retry_count"] = int(session["metrics"].get("retry_count", 0)) + 1
        if output.get("error_code"):
            session["metrics"]["error_count"] = int(session["metrics"].get("error_count", 0)) + 1

    def _finalize_needs_revision(
        self,
        session: dict[str, Any],
        data: dict[str, Any],
        pending_action: str,
        extra_result: dict[str, Any],
    ) -> None:
        session["status"] = "needs_revision"
        session["pending_action"] = pending_action
        session["result"] = self._build_result(data)
        session["result"]["step_trace"] = self._step_trace(session.get("steps", []))
        session["result"]["revision_history"] = list(session.get("revision_history", []))
        session["result"].update(extra_result)
        session["result"]["workflow_metrics"] = dict(session.get("metrics", {}))
        self._save_sessions()

    def _finalize_success(self, session: dict[str, Any], data: dict[str, Any], started_at: float) -> None:
        session["status"] = "completed"
        session["pending_action"] = ""
        session["metrics"]["total_duration_ms"] = int((time.time() - started_at) * 1000)
        session["result"] = self._build_result(data)
        session["result"]["step_trace"] = self._step_trace(session.get("steps", []))
        session["result"]["revision_history"] = list(session.get("revision_history", []))
        session["result"]["workflow_metrics"] = dict(session.get("metrics", {}))
        self._save_sessions()

    def _ensure_metric_defaults(self, session: dict[str, Any]) -> None:
        metrics = session.setdefault("metrics", {})
        metrics.setdefault("retry_count", 0)
        metrics.setdefault("degraded_count", 0)
        metrics.setdefault("error_count", 0)
        metrics.setdefault("total_duration_ms", 0)
        metrics.setdefault("figure_attempts", 0)
        metrics.setdefault("figure_audit_failures", 0)
        metrics.setdefault("figure_last_audit_reason", "")

    def _load_sessions(self) -> None:
        if not self.session_path.exists():
            self._sessions = {}
            return
        try:
            raw = json.loads(self.session_path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                self._sessions = raw
            else:
                self._sessions = {}
        except Exception:
            self._sessions = {}

    def _save_sessions(self) -> None:
        try:
            self.session_path.parent.mkdir(parents=True, exist_ok=True)
            self.session_path.write_text(
                json.dumps(self._sessions, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            return
