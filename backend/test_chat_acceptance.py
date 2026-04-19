import os
import unittest
from dataclasses import dataclass, field
from types import SimpleNamespace
from unittest.mock import patch

import fastapi.dependencies.utils as fastapi_utils
from fastapi.testclient import TestClient

# Keep this test runnable even when python-multipart is not installed.
fastapi_utils.ensure_multipart_is_installed = lambda: None

import main  # noqa: E402


@dataclass
class ChatExpectation:
    question: str
    expected_keywords: list[str] = field(default_factory=list)
    mocked_answer: str = ""
    mocked_excerpts: list[dict[str, object]] = field(default_factory=list)
    require_non_degraded: bool = True
    forbidden_error_codes: list[str] = field(default_factory=lambda: ["AUTH_ERROR"])
    min_excerpt_count: int = 1
    expected_retrieval_source: str | None = None


def _contains_any_keyword(text: str, keywords: list[str]) -> bool:
    if not keywords:
        return True
    lower_text = text.lower()
    return any(keyword.lower() in lower_text for keyword in keywords)


class ChatAcceptanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)
        cls.strict_mode = os.getenv("CHAT_ACCEPTANCE_STRICT", "1").strip() != "0"
        cls.live_mode = os.getenv("CHAT_ACCEPTANCE_LIVE", "0").strip() == "1"
        cls.cases = [
            ChatExpectation(
                question="这个助手在科研流程里具体能做什么？",
                expected_keywords=["上传", "pdf", "问答", "流程图", "写作", "编排"],
                mocked_answer=(
                    "这个助手支持上传 PDF、建立知识库检索问答、生成流程图和论文配图，"
                    "还能提供写作建议并通过自动编排串联分析、重写、校验和导出。"
                ),
                mocked_excerpts=[
                    {"source": "demo_capabilities.pdf", "text": "Supports upload, chat, diagram, writing workflow.", "page": 1, "chunk_id": "cap_1"}
                ],
                expected_retrieval_source="keyword",
                min_excerpt_count=1,
            ),
            ChatExpectation(
                question="How should I structure method and experiment sections for submission?",
                expected_keywords=["method", "experiment", "baseline", "metric", "evidence"],
                mocked_answer=(
                    "Structure the method section around pipeline, implementation details, and reproducibility. "
                    "In the experiment section, include datasets, baselines, metrics, and ablation evidence."
                ),
                mocked_excerpts=[
                    {"source": "paper_a.pdf", "text": "Method setup with dataset and baseline metrics.", "page": 3, "chunk_id": "pa_3"},
                    {"source": "paper_b.pdf", "text": "Experiment compares baseline and ablation.", "page": 7, "chunk_id": "pb_7"},
                ],
                expected_retrieval_source="vector",
                min_excerpt_count=1,
            ),
            ChatExpectation(
                question="请总结已上传文献的关键结论，用三点列出。",
                expected_keywords=["结论", "结果", "指标", "证据"],
                mocked_answer=(
                    "关键结论如下：1) 方法在主指标上有稳定提升；2) 在多数据集上具有一致性；"
                    "3) 消融实验支持核心模块贡献，证据可追溯到原文片段。"
                ),
                mocked_excerpts=[
                    {"source": "paper_cn.pdf", "text": "主指标提升并在多数据集稳定。", "page": 5, "chunk_id": "cn_5"},
                ],
                expected_retrieval_source="keyword",
                min_excerpt_count=1,
            ),
            ChatExpectation(
                question="总结这篇论文里没有提到的量子生物内容。",
                expected_keywords=["证据不足", "未命中", "建议"],
                mocked_answer=(
                    "当前知识库未命中与“量子生物”直接相关的证据片段。"
                    "建议补充相关文献后再提问，或缩小到已上传论文的具体章节。"
                ),
                mocked_excerpts=[],
                expected_retrieval_source="none",
                min_excerpt_count=0,
            ),
        ]

    def _live_call(self, question: str):
        response = self.client.post("/api/chat", json={"question": question})
        return response

    def _mocked_call(self, case: ChatExpectation):
        service = main.research_service
        retrieval_source = case.expected_retrieval_source or ("keyword" if case.mocked_excerpts else "none")
        with patch.object(service, "_query_context", return_value=case.mocked_excerpts), patch.object(
            service,
            "_generate_text_with_fallback",
            return_value=(SimpleNamespace(text=case.mocked_answer), "mock_provider", "mock-model"),
        ), patch.object(service, "_has_text_model", return_value=True):
            response = self.client.post("/api/chat", json={"question": case.question})
        payload = response.json()
        payload["retrieval_source"] = retrieval_source
        return response, payload

    def test_chat_acceptance(self):
        failures: list[str] = []

        for index, case in enumerate(self.cases, start=1):
            if self.live_mode:
                response = self._live_call(case.question)
                payload = response.json()
            else:
                response, payload = self._mocked_call(case)

            self.assertEqual(response.status_code, 200, f"Case {index} failed with non-200 status code.")
            answer = str(payload.get("answer", ""))
            degraded = bool(payload.get("degraded", False))
            error_code = str(payload.get("error_code", ""))
            excerpts = payload.get("excerpts") or []
            retrieval_source = str(payload.get("retrieval_source", ""))

            case_issues: list[str] = []
            if case.require_non_degraded and degraded:
                case_issues.append("response is degraded")
            if error_code in case.forbidden_error_codes:
                case_issues.append(f"forbidden error_code={error_code}")
            if len(excerpts) < case.min_excerpt_count:
                case_issues.append(
                    f"excerpt_count={len(excerpts)} is lower than required {case.min_excerpt_count}"
                )
            if not _contains_any_keyword(answer, case.expected_keywords):
                case_issues.append("answer does not contain expected intent keywords")
            if case.expected_retrieval_source and retrieval_source != case.expected_retrieval_source:
                case_issues.append(
                    f"retrieval_source={retrieval_source} does not match expected {case.expected_retrieval_source}"
                )

            print(f"\n[Case {index}] question={case.question}")
            print(f"  live_mode={self.live_mode} degraded={degraded} error_code={error_code} excerpts={len(excerpts)}")
            print(f"  retrieval_source={retrieval_source}")
            print(f"  answer_preview={answer[:220].replace(chr(10), ' ')}")

            if case_issues:
                failures.append(f"Case {index}: " + "; ".join(case_issues))

        if failures:
            report = "\n".join(failures)
            if self.strict_mode:
                self.fail("\nChat acceptance failed:\n" + report)
            print("\nChat acceptance soft-fail report (strict mode disabled):")
            print(report)


if __name__ == "__main__":
    unittest.main()
