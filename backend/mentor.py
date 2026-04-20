"""
Agent-style mentor: plan with LLM, execute ResearchService skills, synthesize guidance.

Session store is in-process only; use a single worker or external store for production scale-out.
"""

from __future__ import annotations

import json
import re
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from config import settings
from services import ResearchService

# skill_id -> description for planner (cost hint guides step count)
SKILL_REGISTRY: list[dict[str, str]] = [
    {
        "skill_id": "search_literature",
        "description": "基于知识库检索并回答具体问题（便宜）。对应 answer_question。",
    },
    {
        "skill_id": "analyze_writing",
        "description": "结合当前论文与参考文献的写作分析与模板建议（中等）。对应 writing_help。",
    },
    {
        "skill_id": "write_draft",
        "description": "对给定段落做学术化改写（中等）。对应 rewrite_paragraph；需要较长 text。",
    },
    {
        "skill_id": "validate_text",
        "description": "规则+模型审稿校验稿件片段（中等偏贵）。对应 validate_manuscript。",
    },
    {
        "skill_id": "generate_figure",
        "description": "生成论文配图 PNG（昂贵）。对应 generate_figure。",
    },
    {
        "skill_id": "audit_figure",
        "description": "审计上一张配图与提示词/图注一致性（便宜）。需先有 generate_figure 的 image_url。",
    },
    {
        "skill_id": "generate_diagram",
        "description": "生成 Mermaid 流程图（中等）。对应 generate_diagram。",
    },
    {
        "skill_id": "compare_methods",
        "description": "对比两种方法并绑定证据（较贵）。对应 compare_methods；必须在 args 提供 method_a、method_b。",
    },
]

ALLOWED_SKILLS = frozenset(item["skill_id"] for item in SKILL_REGISTRY)
MAX_PLAN_STEPS = 8
_MAX_SESSIONS = 128

_SECTION_CN: dict[str, str] = {
    "abstract": "摘要",
    "introduction": "引言",
    "method": "方法",
    "experiment": "实验",
    "conclusion": "结论",
    "custom": "自定义章节",
}


def _grounded_search_question(goal: str, topic: str, section: str, explicit: str) -> str:
    """Turn high-level mentor goals into a concrete RAG question so the model does not defer to the user."""
    sub = (explicit or "").strip() or (goal or "").strip()
    sub = sub[:1800]
    goal_s = (goal or "").strip()[:1200]
    topic_s = (topic or "").strip()[:300]
    ctx = _SECTION_CN.get((section or "").strip(), "稿件")
    topic_line = f"用户填写的研究主题：{topic_s}\n" if topic_s else ""
    return (
        "系统将附上来自知识库检索到的「文献片段」。你必须只依据这些片段作答，使用中文、专业语气。\n"
        "不要反问用户「请提供文献请上传 PDF」等：文献已由系统侧提供；若片段不足以支撑结论，必须明确写出「根据当前片段无法推出……」，"
        "并尽量列出片段中仍可用于写作的事实、定义或可引用表述。\n\n"
        f"{topic_line}"
        f"用户整体任务目标：{goal_s}\n"
        f"默认写作语境章节（用于对齐侧重）：{ctx}。\n\n"
        "请完成：先给出 3～8 条与任务相关的证据要点（可带片段中的术语），再给出 2～5 句可直接改写进摘要/正文中文草稿句（若证据不足则说明缺口）。\n"
        f"任务子句：{sub}"
    )[:2000]


def _mentor_writing_question(goal: str, topic: str, section: str, explicit: str) -> str:
    base = (explicit or "").strip() or (goal or "").strip()
    base = base[:1800]
    goal_s = (goal or "").strip()[:1000]
    topic_s = (topic or "").strip()[:280]
    ctx = _SECTION_CN.get((section or "").strip(), "稿件")
    topic_line = f"研究主题：{topic_s}\n" if topic_s else ""
    return (
        "请结合系统检索到的稿件与参考文献片段（由 writing_help 内部完成检索）给出可执行建议。\n"
        "不要向用户索取「请先上传文献」类话术（若当前未设论文，用 error_hint 式结论在结果字段说明即可）。\n\n"
        f"{topic_line}"
        f"用户整体目标：{goal_s}\n"
        f"侧重章节语境：{ctx}。\n\n"
        f"请围绕下面写作需求输出结构建议、证据风险与可复用模板句式：\n{base}"
    )[:2000]


_sessions: dict[str, "MentorSession"] = {}


def _parse_json_from_llm(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        return {}
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = cleaned.replace("```", "").strip()
    try:
        payload = json.loads(cleaned)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return {}
    try:
        payload = json.loads(match.group(0))
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def _call_text_model(rs: ResearchService, prompt: str) -> str:
    preferred = (
        (settings.analysis_model or "").strip()
        or (settings.codex_text_model or "").strip()
        or (settings.google_model or "").strip()
        or "gpt-4.1-mini"
    )
    response, _, _, _ = rs._generate_text_with_fallback(preferred, prompt)
    if response is None:
        return ""
    return (getattr(response, "text", None) or "").strip()


def _registry_prompt_block() -> str:
    lines = []
    for row in SKILL_REGISTRY:
        lines.append(f"- {row['skill_id']}: {row['description']}")
    return "\n".join(lines)


def _default_plan(goal: str) -> list[dict[str, Any]]:
    return [
        {
            "skill_id": "search_literature",
            "rationale": "先检索与目标相关的文献证据。",
            "args": {"question": goal[:2000]},
        },
        {
            "skill_id": "analyze_writing",
            "rationale": "在证据基础上给出写作层面的建议与模板。",
            "args": {"question": goal[:2000]},
        },
    ]


def mentor_plan(
    rs: ResearchService,
    goal: str,
    topic: str,
    section: str,
    stage: str,
    reference_documents: list[str],
) -> tuple[list[dict[str, Any]], str]:
    """Returns normalized steps (skill_id, rationale, args) and a short debug note."""
    ref_note = ", ".join(reference_documents[:6]) if reference_documents else "（无）"
    prompt = (
        "你是 Sci-Copilot 的任务规划器。根据用户目标，从下列 skill 中挑选最少且足够的步骤，按合理顺序排列。\n"
        "要求：\n"
        "1. 只输出一个 JSON 对象，不要 markdown 代码围栏。\n"
        "2. 字段 steps: 数组；每项含 skill_id（字符串）、rationale（一句中文）、args（对象，可选）。\n"
        "3. args 中可包含该步专用参数；未列出的参数将由系统用 topic/section/stage/goal 补全。\n"
        "3b. search_literature / analyze_writing 的 args.question 可省略：系统会把 goal 改写成面向检索片段的具体指令。\n"
        "4. compare_methods 必须在 args 中包含 method_a、method_b（非空字符串）和 question；否则不要选该 skill。\n"
        "5. write_draft 需要 args.text（>=20 字符）；若无法从用户目标得到，可省略该步或用 analyze_writing 代替。\n"
        "6. 最多 8 步；尽量优先便宜步骤，避免无必要重复。\n"
        f"7. 用户目标 goal: {goal}\n"
        f"8. topic: {topic or '（空则使用当前论文推断）'}\n"
        f"9. section: {section}; stage: {stage}\n"
        f"10. 参考文献 scope 提示: {ref_note}\n\n"
        "可用 skill：\n"
        f"{_registry_prompt_block()}\n"
    )
    raw = _call_text_model(rs, prompt)
    steps = _normalize_plan_payload(_parse_json_from_llm(raw).get("steps"))
    note = "llm"
    if not steps:
        raw2 = _call_text_model(
            rs,
            prompt + "\n\n你上一次没有输出合法 JSON。请严格输出：{\"steps\":[{\"skill_id\":\"...\",\"rationale\":\"...\",\"args\":{}}]}",
        )
        steps = _normalize_plan_payload(_parse_json_from_llm(raw2).get("steps"))
        note = "llm_retry" if steps else "fallback"
    if not steps:
        steps = _default_plan(goal)
        note = "fallback"
    return steps, note


def _normalize_plan_payload(raw_steps: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_steps, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw_steps:
        if not isinstance(item, dict):
            continue
        sid = str(item.get("skill_id", "")).strip()
        if sid not in ALLOWED_SKILLS:
            continue
        rationale = str(item.get("rationale", "")).strip() or "（未给出理由）"
        args = item.get("args")
        if args is None:
            args_dict: dict[str, Any] = {}
        elif isinstance(args, dict):
            args_dict = dict(args)
        else:
            args_dict = {}
        out.append({"skill_id": sid, "rationale": rationale, "args": args_dict})
        if len(out) >= MAX_PLAN_STEPS:
            break
    return out


def _merge_run_context(
    args: dict[str, Any],
    goal: str,
    topic: str,
    section: str,
    stage: str,
    reference_documents: list[str],
) -> dict[str, Any]:
    merged = {
        "goal": goal,
        "topic": topic,
        "section": section,
        "stage": stage,
        "reference_documents": reference_documents,
    }
    merged.update(args)
    return merged


def _trim_skill_result(skill_id: str, result: dict[str, Any]) -> dict[str, Any]:
    if skill_id == "search_literature":
        return {
            "answer": str(result.get("answer", ""))[:12000],
            "sources": result.get("sources") or [],
            "excerpt_count": len(result.get("excerpts") or []),
            "retrieval_source": result.get("retrieval_source", ""),
            "error_code": result.get("error_code", ""),
        }
    if skill_id == "analyze_writing":
        ev = result.get("evidence") or []
        return {
            "recommendation": str(result.get("recommendation", ""))[:8000],
            "draft_template": str(result.get("draft_template", ""))[:6000],
            "risk_notes": result.get("risk_notes") or [],
            "evidence_count": len(ev) if isinstance(ev, list) else 0,
            "retrieval_source": result.get("retrieval_source", ""),
            "error_code": result.get("error_code", ""),
        }
    if skill_id == "write_draft":
        return {
            "rewritten_text": str(result.get("rewritten_text", ""))[:12000],
            "notes": result.get("notes") or [],
            "error_code": result.get("error_code", ""),
        }
    if skill_id == "validate_text":
        issues = result.get("issues") or []
        return {
            "summary": str(result.get("summary", ""))[:4000],
            "high_risk_count": result.get("high_risk_count", 0),
            "issue_count": len(issues) if isinstance(issues, list) else 0,
            "can_export": result.get("can_export", False),
            "next_action": str(result.get("next_action", ""))[:2000],
        }
    if skill_id == "generate_figure":
        return {
            "title": str(result.get("title", ""))[:500],
            "caption": str(result.get("caption", ""))[:2000],
            "image_url": str(result.get("image_url", "")),
            "figure_type": str(result.get("figure_type", "")),
            "sources": result.get("sources") or [],
            "error_code": result.get("error_code", ""),
            "degraded": bool(result.get("degraded", False)),
        }
    if skill_id == "audit_figure":
        return {
            "passed": bool(result.get("passed", False)),
            "summary": str(result.get("summary", ""))[:2000],
            "issues": result.get("issues") or [],
        }
    if skill_id == "generate_diagram":
        return {
            "mermaid_code": str(result.get("mermaid_code", ""))[:12000],
            "image_url": result.get("image_url"),
            "error_code": result.get("error_code", ""),
        }
    if skill_id == "compare_methods":
        return {
            "status": str(result.get("status", "")),
            "summary": str(result.get("summary", ""))[:8000],
            "uncertainties": result.get("uncertainties") or [],
            "evidence_count": len(result.get("retrieve_evidence") or []),
            "error_code": result.get("error_code", ""),
        }
    return {k: result[k] for k in list(result.keys())[:40]}


def _dispatch_skill(
    rs: ResearchService,
    skill_id: str,
    merged: dict[str, Any],
    runtime: dict[str, Any],
) -> tuple[dict[str, Any] | None, str | None]:
    """Returns (trimmed_result, skip_reason). skip_reason set => skill skipped."""
    goal = str(merged.get("goal", "")).strip()
    topic = str(merged.get("topic", "")).strip()
    section = str(merged.get("section", "method") or "method").strip()
    stage = str(merged.get("stage", "draft") or "draft").strip()
    refs_raw = merged.get("reference_documents") or []
    refs = [str(x).strip() for x in refs_raw if str(x).strip()] if isinstance(refs_raw, list) else []

    if skill_id == "search_literature":
        explicit_q = str(merged.get("question", "")).strip()
        q = _grounded_search_question(goal, topic, section, explicit_q)
        answer, sources, excerpts, meta = rs.answer_question(q)
        full = {
            "answer": answer,
            "sources": sources,
            "excerpts": excerpts,
            "retrieval_source": meta.get("retrieval_source", ""),
            "error_code": meta.get("error_code", ""),
        }
        return _trim_skill_result(skill_id, full), None

    if skill_id == "analyze_writing":
        explicit_q = str(merged.get("question", "")).strip()
        q = _mentor_writing_question(goal, topic, section, explicit_q)
        res = rs.writing_help(
            topic=topic,
            stage=stage if stage in {"proposal", "draft", "submission"} else "draft",
            question=q,
            reference_documents=refs or None,
            manuscript_source=merged.get("manuscript_source"),
        )
        return _trim_skill_result(skill_id, dict(res)), None

    if skill_id == "write_draft":
        text = str(merged.get("text", "")).strip()
        if len(text) < 20:
            prev = runtime.get("last_draft_template", "")
            if len(prev) >= 20:
                text = prev[:12000]
        if len(text) < 20:
            return None, "缺少 args.text（>=20 字符），且无可用的写作模板草稿。"
        sec = section if section in {
            "abstract",
            "introduction",
            "method",
            "experiment",
            "conclusion",
            "custom",
        } else "custom"
        focus = str(merged.get("focus", "")).strip()
        res = rs.rewrite_paragraph(section=sec, text=text[:12000], focus=focus)
        return _trim_skill_result(skill_id, dict(res)), None

    if skill_id == "validate_text":
        vs = str(merged.get("validate_scope", "method") or "method").strip()
        if vs not in {
            "abstract",
            "introduction",
            "method",
            "experiment",
            "conclusion",
            "ending",
            "full",
            "custom",
        }:
            vs = "method"
        sec_val = merged.get("section")
        sec_s = str(sec_val).strip() if sec_val is not None else ""
        section_payload = sec_s if sec_s in {
            "abstract",
            "introduction",
            "method",
            "experiment",
            "conclusion",
            "custom",
        } else None
        text_val = merged.get("text")
        text_s = str(text_val).strip() if text_val is not None else None
        res = rs.validate_manuscript(
            validate_scope=vs,
            section=section_payload,
            text=text_s,
            reference_documents=refs or None,
            use_llm_review=bool(merged.get("use_llm_review", True)),
        )
        return _trim_skill_result(skill_id, dict(res)), None

    if skill_id == "generate_figure":
        prompt = str(merged.get("prompt", "")).strip() or goal
        res = rs.generate_figure(
            prompt=prompt[:2000],
            template_type=str(merged.get("template_type", "method_framework") or "method_framework"),
            style=str(merged.get("style", "academic") or "academic"),
            detail_level=str(merged.get("detail_level", "medium") or "medium"),
            language=str(merged.get("language", "zh") or "zh"),
            width=merged.get("width"),
            height=merged.get("height"),
            feedback=merged.get("feedback"),
        )
        runtime["last_figure"] = dict(res)
        return _trim_skill_result(skill_id, dict(res)), None

    if skill_id == "audit_figure":
        fig = runtime.get("last_figure") or {}
        image_url = str(merged.get("image_url", "") or fig.get("image_url", "") or "").strip()
        prompt = str(merged.get("prompt", "")).strip() or str(fig.get("caption", "")) or goal
        if not image_url:
            return None, "缺少配图 image_url：请先执行 generate_figure。"
        res = rs.audit_figure(
            image_url=image_url,
            prompt=prompt,
            question=str(merged.get("question", "")).strip(),
            caption=str(merged.get("caption", fig.get("caption", ""))),
            title=str(merged.get("title", fig.get("title", ""))),
            figure_type=str(merged.get("figure_type", fig.get("figure_type", ""))),
            degraded=bool(fig.get("degraded", False)),
        )
        return _trim_skill_result(skill_id, dict(res)), None

    if skill_id == "generate_diagram":
        prompt = str(merged.get("prompt", "")).strip() or goal
        mmd, image_url, meta = rs.generate_diagram(
            prompt=prompt[:2000],
            style=str(merged.get("style", "academic") or "academic"),
            detail_level=str(merged.get("detail_level", "medium") or "medium"),
            language=str(merged.get("language", "zh") or "zh"),
            width=merged.get("width"),
            height=merged.get("height"),
            feedback=merged.get("feedback"),
        )
        meta = meta or {}
        full = {
            "mermaid_code": mmd,
            "image_url": image_url,
            "error_code": meta.get("error_code", ""),
            "error_hint": meta.get("error_hint", ""),
            "degraded": bool(meta.get("degraded", False)),
            "retryable": bool(meta.get("retryable", False)),
        }
        return _trim_skill_result("generate_diagram", full), None

    if skill_id == "compare_methods":
        method_a = str(merged.get("method_a", "")).strip()
        method_b = str(merged.get("method_b", "")).strip()
        question = str(merged.get("question", "")).strip() or goal
        if not method_a or not method_b:
            return None, "compare_methods 需要 args.method_a 与 args.method_b。"
        res = rs.compare_methods(
            question=question[:2000],
            method_a=method_a[:200],
            method_b=method_b[:200],
            reference_documents=refs or None,
        )
        return _trim_skill_result(skill_id, dict(res)), None

    return None, f"未知 skill：{skill_id}"


def mentor_execute(
    rs: ResearchService,
    plan_steps: list[dict[str, Any]],
    goal: str,
    topic: str,
    section: str,
    stage: str,
    reference_documents: list[str],
) -> list[dict[str, Any]]:
    runtime: dict[str, Any] = {}
    executed: list[dict[str, Any]] = []
    for step in plan_steps:
        sid = step["skill_id"]
        merged = _merge_run_context(step.get("args") or {}, goal, topic, section, stage, reference_documents)
        trimmed, skip = _dispatch_skill(rs, sid, merged, runtime)
        if skip:
            executed.append(
                {
                    "skill_id": sid,
                    "rationale": step.get("rationale", ""),
                    "status": "skipped",
                    "detail": skip,
                    "result": None,
                }
            )
            continue
        if sid == "analyze_writing" and trimmed:
            dt = trimmed.get("draft_template") if isinstance(trimmed, dict) else None
            if isinstance(dt, str) and len(dt) >= 20:
                runtime["last_draft_template"] = dt
        executed.append(
            {
                "skill_id": sid,
                "rationale": step.get("rationale", ""),
                "status": "ok",
                "detail": "",
                "result": trimmed,
            }
        )
    return executed


def mentor_synthesize(rs: ResearchService, goal: str, steps: list[dict[str, Any]]) -> str:
    lines = [f"用户目标：{goal}", "", "各步结果摘要："]
    for idx, st in enumerate(steps, start=1):
        lines.append(f"{idx}. [{st.get('skill_id')}] status={st.get('status')}")
        if st.get("status") == "skipped":
            lines.append(f"   跳过原因：{st.get('detail')}")
            continue
        res = st.get("result")
        if isinstance(res, dict):
            snippet = json.dumps(res, ensure_ascii=False)[:2400]
            lines.append(f"   {snippet}")
    prompt = (
        "你是 Sci-Copilot 的科研写作导师。根据下列执行摘要，用中文给出整体指导：\n"
        "1) 对目标完成度做判断；2) 列出主要风险或缺口；3) 给出可执行的下一步（条列）。\n"
        "语气专业、直接，不要寒暄。\n\n"
        + "\n".join(lines)
    )
    text = _call_text_model(rs, prompt)
    if not text:
        return "文本模型不可用，无法生成导师总评。请检查 API 配置后重试；你可先查看各步结果摘要自行判断。"
    return text[:16000]


@dataclass
class MentorSession:
    session_id: str
    status: str
    goal: str
    topic: str
    section: str
    stage: str
    reference_documents: list[str] = field(default_factory=list)
    plan_source: str = ""
    plan: list[dict[str, Any]] = field(default_factory=list)
    steps: list[dict[str, Any]] = field(default_factory=list)
    summary: str = ""
    created_at: float = field(default_factory=time.time)
    error: str = ""

    def to_response(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "status": self.status,
            "goal": self.goal,
            "topic": self.topic,
            "section": self.section,
            "stage": self.stage,
            "reference_documents": self.reference_documents,
            "plan_source": self.plan_source,
            "plan": self.plan,
            "steps": self.steps,
            "summary": self.summary,
            "error": self.error,
        }


def _store_session(sess: MentorSession) -> None:
    if len(_sessions) >= _MAX_SESSIONS:
        oldest = sorted(_sessions.items(), key=lambda kv: kv[1].created_at)[: max(1, _MAX_SESSIONS // 4)]
        for key, _ in oldest:
            _sessions.pop(key, None)
    _sessions[sess.session_id] = sess


def get_session(session_id: str) -> MentorSession | None:
    return _sessions.get(session_id)


def run_mentor_session(
    rs: ResearchService,
    goal: str,
    topic: str = "",
    section: str = "method",
    stage: str = "draft",
    reference_documents: list[str] | None = None,
) -> dict[str, Any]:
    refs = list(reference_documents or [])
    session_id = uuid.uuid4().hex
    sess = MentorSession(
        session_id=session_id,
        status="running",
        goal=goal,
        topic=topic,
        section=section,
        stage=stage,
        reference_documents=refs,
    )
    _store_session(sess)
    try:
        plan, plan_note = mentor_plan(rs, goal, topic, section, stage, refs)
        sess.plan = plan
        sess.plan_source = plan_note
        sess.steps = mentor_execute(rs, plan, goal, topic, section, stage, refs)
        sess.summary = mentor_synthesize(rs, goal, sess.steps)
        sess.status = "completed"
    except Exception as exc:  # noqa: BLE001 — surface as session error
        sess.status = "failed"
        sess.error = str(exc)
        sess.summary = f"导师执行失败：{exc}"
    _store_session(sess)
    return sess.to_response()
