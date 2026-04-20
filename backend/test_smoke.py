import asyncio
import importlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.datastructures import UploadFile


class _FakeCollection:
    def __init__(self):
        self._count = 0

    def upsert(self, documents, metadatas, ids):
        self._count += len(documents)

    def count(self):
        return self._count

    def query(self, query_texts, n_results):
        return {
            "documents": [["Mocked context chunk"]],
            "metadatas": [[{"source": "demo.pdf", "page": 2, "chunk_id": "demo_p2_0"}]],
        }


class _FakeChromaClient:
    def get_or_create_collection(self, name, embedding_function):
        return _FakeCollection()


class _FakeEmbeddingFunction:
    def __init__(self, model_name):
        self.model_name = model_name


class SmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base = Path(__file__).resolve().parent

        os.environ["DATA_DIR"] = str(base / "data")
        os.environ["DIAGRAM_DIR"] = str(base / "diagrams")
        os.environ["CHROMA_DIR"] = str(base / "chroma_db")
        os.environ["IMG_API_KEY"] = ""
        os.environ["CODEX_API_KEY"] = ""
        os.environ["GPT_API_KEY"] = ""
        os.environ["GOOGLE_API_KEY"] = ""
        os.environ["GLM_API_KEY"] = ""
        os.environ["OPEN_API_KEY"] = ""

        cls.embedding_patcher = patch(
            "chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction",
            _FakeEmbeddingFunction,
        )
        cls.client_patcher = patch(
            "chromadb.PersistentClient",
            lambda path: _FakeChromaClient(),
        )
        cls.multipart_patcher = patch(
            "fastapi.dependencies.utils.ensure_multipart_is_installed",
            lambda: None,
        )
        cls.embedding_patcher.start()
        cls.client_patcher.start()
        cls.multipart_patcher.start()

        cls.main = importlib.import_module("main")
        cls.client = TestClient(cls.main.app)

    @classmethod
    def tearDownClass(cls):
        cls.embedding_patcher.stop()
        cls.client_patcher.stop()
        cls.multipart_patcher.stop()

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_status_endpoint(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertIn("google_api_configured", result)
        self.assertIn("glm_api_configured", result)
        self.assertIn("img_api_configured", result)
        self.assertIn("open_api_configured", result)
        self.assertIn("text_primary_provider", result)
        self.assertIn("text_fallback_provider", result)
        self.assertIn("mermaid_renderer_available", result)
        self.assertIn("vector_store_ready", result)
        self.assertIn("generation_health", result)
        self.assertIn("routing_policy", result)
        self.assertIn("last_routing_trace", result)
        self.assertIn("retrieval_mode", result)
        self.assertIn("product_metrics", result)
        self.assertIn("stability_metric_definitions", result)
        self.assertIn("stability_gate_targets", result)
        self.assertIn("error_code_actions", result)
        self.assertIn("knowledge_base_ready", result)
        self.assertIn("last_retrieval_source", result)
        self.assertTrue(isinstance(result["retrieval_mode"], str) and len(result["retrieval_mode"]) > 0)

    def test_documents_endpoint(self):
        response = self.client.get("/api/documents")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("documents", data)

    def test_ingest_marks_document_indexed_in_document_records(self):
        service = self.main.research_service
        doc_records = {"demo.pdf": {"ingested": False, "updated_at": 0}}
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            (temp_path / "demo.pdf").write_bytes(b"%PDF-1.4 test")
            with patch.object(service, "data_dir", temp_path), \
            patch.object(service, "_extract_pages", return_value=[(1, "A valid chunk of text")]), \
            patch.object(service, "_document_records", return_value=doc_records), \
            patch.object(service, "_save_local_index"), \
            patch.object(service, "_save_doc_state"), \
            patch.object(service, "_sync_vector_store"):
                indexed_files, chunks = service.ingest_all()

        self.assertEqual(indexed_files, 1)
        self.assertGreaterEqual(chunks, 1)
        self.assertTrue(doc_records["demo.pdf"]["ingested"])

    def test_upload_rejects_large_file(self):
        with patch.object(self.main.settings, "max_upload_size_mb", 1):
            upload = UploadFile(filename="oversized.pdf", file=io.BytesIO(b"x" * (1024 * 1024 + 1)))
            with self.assertRaises(HTTPException) as context:
                from api.routers.documents import upload_document

                asyncio.run(upload_document(upload))
        self.assertEqual(context.exception.status_code, 413)

    def test_fallback_diagram(self):
        with patch.object(self.main.research_service, "_resolve_mmdc_command", return_value=None):
            code, image_url, meta = self.main.research_service.generate_diagram("Collect data and summarize")
        self.assertIn("flowchart TD", code)
        self.assertIsNone(image_url)
        self.assertIn("degraded", meta)

    def test_diagram_endpoint_accepts_advanced_options(self):
        payload = {
            "prompt": "绘制一个论文方法流程图",
            "style": "academic",
            "detail_level": "high",
            "language": "zh",
            "width": 1600,
            "height": 900,
        }
        response = self.client.post("/api/diagram", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("mermaid_code", data)
        self.assertIn("image_url", data)

    def test_writing_help_endpoint(self):
        payload = {
            "topic": "RAG for scientific writing",
            "stage": "draft",
            "question": "How should I structure the method section?",
            "document_scope": [],
        }
        response = self.client.post("/api/writing/help", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("recommendation", data)
        self.assertIn("draft_template", data)
        self.assertIn("risk_notes", data)
        self.assertIn("retrieval_source", data)
        if data.get("evidence"):
            self.assertIn("page", data["evidence"][0])
            self.assertIn("chunk_id", data["evidence"][0])

    def test_method_compare_endpoint(self):
        payload = {
            "question": "Compare two retrieval methods for writing assistant quality.",
            "method_a": "Dense retrieval",
            "method_b": "Hybrid retrieval",
            "document_scope": [],
        }
        response = self.client.post("/api/reasoning/method-compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("summary", data)
        self.assertIn("retrieve_evidence", data)
        self.assertIn("comparisons", data)
        self.assertIn("validation_issues", data)
        self.assertIn("supported_claims", data)
        self.assertIn("uncertainties", data)
        self.assertIn("degraded", data)
        self.assertIn("error_code", data)

    def test_method_compare_insufficient_evidence(self):
        payload = {
            "question": "Compare methods with missing evidence.",
            "method_a": "Method A",
            "method_b": "Method B",
            "document_scope": ["non-existing.pdf"],
        }
        with patch.object(self.main.research_service, "_query_context", return_value=[]):
            response = self.client.post("/api/reasoning/method-compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "insufficient_evidence")
        self.assertTrue(data["degraded"])
        self.assertEqual(data["error_code"], "INSUFFICIENT_EVIDENCE")

    def test_writing_rewrite_endpoint(self):
        payload = {
            "section": "method",
            "text": "我们提出了一个方法，但是表达还不够严谨，需要改写并强调实验设置和可复现细节。",
            "focus": "学术化表达并补充可验证信息",
        }
        response = self.client.post("/api/writing/rewrite", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("rewritten_text", data)
        self.assertIn("notes", data)

    def test_chat_response_has_error_fields(self):
        response = self.client.post("/api/chat", json={"question": "summarize this paper"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("error_code", data)
        self.assertIn("error_hint", data)
        self.assertIn("retryable", data)
        self.assertIn("degraded", data)
        self.assertIn("retrieval_source", data)
        self.assertIn("model_provider", data)
        self.assertIn("model_name", data)
        self.assertIn("fallback_chain", data)
        if data.get("excerpts"):
            self.assertIn("page", data["excerpts"][0])
            self.assertIn("chunk_id", data["excerpts"][0])

    def test_writing_validate_endpoint(self):
        payload = {
            "validate_scope": "custom",
            "text": "我们的方法非常好，可以显著提升效果。它很强，而且最好。"
                    "该段落没有具体指标和对比实验设置，写得也比较主观。",
        }
        response = self.client.post("/api/writing/validate", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("summary", data)
        self.assertIn("issues", data)
        self.assertIn("high_risk_count", data)
        self.assertIn("can_export", data)
        self.assertIn("next_action", data)
        self.assertGreaterEqual(len(data["issues"]), 1)
        self.assertIn("validated_text", data)

    def test_figure_templates_endpoint(self):
        response = self.client.get("/api/figure/templates")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("templates", data)
        self.assertGreaterEqual(len(data["templates"]), 4)

    def test_figure_endpoint_returns_structured_error_fields(self):
        payload = {
            "prompt": "generate a method framework figure",
            "template_type": "method_framework",
            "feedback": ["layout"],
        }
        response = self.client.post("/api/figure", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("error_code", data)
        self.assertIn("error_hint", data)
        self.assertIn("retryable", data)
        self.assertIn("degraded", data)
        self.assertIn("model_provider", data)
        self.assertIn("model_name", data)
        self.assertIn("fallback_chain", data)

    def test_figure_prefers_img_provider_when_configured(self):
        service = self.main.research_service
        with patch.object(service, "img_api_key", "mock-img-key"),             patch.object(service, "img_base_url", "https://img.example.com"),             patch.object(service, "codex_api_key", "mock-codex-key"),             patch.object(service, "_visual_context", return_value={"excerpts": [], "sources": []}),             patch.object(service, "_structure_generation_prompt", return_value={"prompt_text": "draw a figure", "must_have": [], "forbidden": []}),             patch.object(service, "_build_figure_prompt", return_value="draw a figure"),             patch.object(service, "_generate_image_img", return_value=(b"fake-image", "png")) as img_mock,             patch.object(service, "_generate_image_codex", side_effect=AssertionError("codex should not be used")):
            result = service.generate_figure("generate a method framework figure")

        self.assertTrue(img_mock.called)
        self.assertEqual(result["error_code"], "")
        self.assertFalse(result["degraded"])

    def test_visual_context_uses_focus_paper_even_for_generic_prompt(self):
        service = self.main.research_service
        records = [
            {"source": "focus.pdf", "text": "focus chunk 1", "page": 1, "id": "focus_1"},
            {"source": "other.pdf", "text": "other chunk", "page": 2, "id": "other_1"},
        ]
        with patch.object(service, "_ensure_collection", return_value=records), \
            patch.object(service, "get_focus_document", return_value="focus.pdf"), \
            patch.object(service, "_query_context", return_value=[]):
            context = service._visual_context("draw a clean architecture figure", limit=3)  # pylint: disable=protected-access

        self.assertTrue(context["use_kb"])
        self.assertTrue(len(context["excerpts"]) >= 1)
        self.assertEqual(context["excerpts"][0]["source"], "focus.pdf")
        self.assertIn("focus.pdf", context["sources"])

    def test_find_image_asset_supports_gemini_inline_data(self):
        service = self.main.research_service
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": "image/png",
                                    "data": "ZmFrZS1pbWFnZS1ieXRlcw==",
                                }
                            }
                        ]
                    }
                }
            ]
        }
        kind, value = service._find_image_asset(payload)  # pylint: disable=protected-access
        self.assertEqual(kind, "base64")
        self.assertEqual(value, "ZmFrZS1pbWFnZS1ieXRlcw==")

    def test_img_generation_falls_back_to_gemini_compatible_call(self):
        service = self.main.research_service
        with patch.object(service, "_generate_image_openai_compatible", side_effect=RuntimeError("openai route failed")), \
            patch.object(service, "_generate_image_gemini_compatible", return_value=(b"img", "png")) as gemini_mock:
            image_bytes, ext = service._generate_image_img("gemini-image-model", "draw pipeline")  # pylint: disable=protected-access

        self.assertEqual(image_bytes, b"img")
        self.assertEqual(ext, "png")
        self.assertTrue(gemini_mock.called)

    def test_gemini_img_query_only_auth_mode(self):
        service = self.main.research_service
        captured_calls: list[dict[str, object]] = []

        class _FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "candidates": [
                        {"content": {"parts": [{"inlineData": {"data": "ZmFrZQ=="}}]}},
                    ]
                }

        def _fake_post(url, headers, json, timeout):  # pylint: disable=redefined-builtin,unused-argument
            captured_calls.append({"url": url, "headers": headers})
            return _FakeResponse()

        with patch.object(service, "img_gemini_auth_mode", "query_only"), \
            patch.object(service, "_gemini_image_endpoints", return_value=["https://img.example.com/models/gemini-3.1-flash-image:generateContent"]), \
            patch("services.requests.post", side_effect=_fake_post):
            image_bytes, ext = service._generate_image_gemini_compatible(  # pylint: disable=protected-access
                provider_name="IMG",
                base_url="https://img.example.com",
                api_key="test-key",
                model_name="gemini-3.1-flash-image",
                prompt="draw pipeline",
                timeout_seconds=10,
            )

        self.assertEqual(image_bytes, b"fake")
        self.assertEqual(ext, "png")
        self.assertEqual(len(captured_calls), 1)
        self.assertIn("?key=", str(captured_calls[0]["url"]))
        self.assertNotIn("Authorization", dict(captured_calls[0]["headers"]))

    def test_status_endpoint_reports_img_provider(self):
        with patch.object(self.main.settings, "img_api_key", "mock-img-key"),             patch.object(self.main.settings, "img_figure_model", "mock-img-model"),             patch.object(self.main.settings, "codex_api_key", ""),             patch.dict(os.environ, {"GPT_API_KEY": ""}, clear=False):
            response = self.client.get("/api/status")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["img_api_configured"])
        self.assertEqual(data["figure_provider"], "img")
        self.assertEqual(data["figure_model"], "mock-img-model")

    def test_text_provider_order_is_respected(self):
        service = self.main.research_service
        with patch.object(service, "text_provider_order", ["openrouter", "google", "codex"]), \
            patch.object(service, "open_api_key", "mock-openrouter-key"), \
            patch.object(service, "client", object()), \
            patch.object(service, "codex_api_key", "mock-codex-key"), \
            patch.object(service, "_generate_content_openrouter", return_value=SimpleNamespace(text="OpenRouter route")) as openrouter_mock, \
            patch.object(service, "_generate_content", side_effect=AssertionError("google should not be used")), \
            patch.object(service, "_generate_content_codex", side_effect=AssertionError("codex should not be used")):
            response, provider, _, attempts = service._generate_text_with_fallback("", "test prompt")

        self.assertEqual(provider, "openrouter")
        self.assertEqual(response.text, "OpenRouter route")
        self.assertEqual(attempts[0]["provider"], "openrouter")
        self.assertTrue(openrouter_mock.called)

    def test_disabled_provider_is_skipped(self):
        service = self.main.research_service
        with patch.object(service, "text_provider_order", ["codex", "openrouter"]), \
            patch.object(service, "disabled_providers", {"codex"}), \
            patch.object(service, "open_api_key", "mock-openrouter-key"), \
            patch.object(service, "codex_api_key", "mock-codex-key"), \
            patch.object(service, "_generate_content_openrouter", return_value=SimpleNamespace(text="OpenRouter route")) as openrouter_mock, \
            patch.object(service, "_generate_content_codex", side_effect=AssertionError("codex should not be used")):
            response, provider, _, attempts = service._generate_text_with_fallback("", "test prompt")

        self.assertEqual(provider, "openrouter")
        self.assertEqual(response.text, "OpenRouter route")
        self.assertEqual(attempts[0]["provider"], "openrouter")
        self.assertTrue(openrouter_mock.called)

    def test_status_redacts_debug_fields_in_production(self):
        with patch.object(self.main.settings, "app_env", "production"), patch.object(
            self.main.settings, "status_include_debug", True
        ):
            response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("vector_store_error", data)

    def test_api_key_protection_when_configured(self):
        with patch.object(self.main.settings, "api_access_key", "unit-test-key"):
            blocked = self.client.get("/api/status")
            self.assertEqual(blocked.status_code, 401)

            allowed = self.client.get("/api/status", headers={"X-API-Key": "unit-test-key"})
            self.assertEqual(allowed.status_code, 200)

    def test_fallback_chat_without_key(self):
        with patch.object(self.main.research_service, "_query_context", return_value=[]), \
            patch.object(self.main.research_service, "get_focus_document", return_value=None):
            answer, sources, excerpts, meta = self.main.research_service.answer_question("What is the paper about?")
        self.assertTrue(isinstance(answer, str) and len(answer) > 0)
        self.assertEqual(sources, [])
        self.assertEqual(excerpts, [])
        self.assertIn("error_code", meta)

    def test_chat_falls_back_to_openrouter_when_google_fails(self):
        service = self.main.research_service
        with patch.object(service, "_query_context", return_value=[]), \
            patch.object(service, "get_focus_document", return_value=None), \
            patch.object(service, "client", object()), \
            patch.object(service, "codex_api_key", ""), \
            patch.object(service, "open_api_key", "mock-openrouter-key"), \
            patch.object(service, "_generate_content", side_effect=RuntimeError("Google 503")), \
            patch.object(service, "_generate_content_openrouter", return_value=SimpleNamespace(text="OpenRouter fallback answer")):
            answer, _, _, meta = service.answer_question("Summarize this paper")

        self.assertEqual(answer, "OpenRouter fallback answer")
        self.assertEqual(meta.get("model_provider"), "openrouter")

    def test_text_timeout_retries_and_recovers(self):
        service = self.main.research_service
        with patch.object(service, "text_provider_order", ["google"]), \
            patch.object(service, "client", object()), \
            patch.object(self.main.settings, "text_request_retry_attempts", 2), \
            patch.object(self.main.settings, "text_request_retry_backoff_seconds", 0.0), \
            patch.object(service, "_generate_content", side_effect=[RuntimeError("timeout"), SimpleNamespace(text="Recovered answer")]):
            response, provider, model_name, attempts = service._generate_text_with_fallback("", "test prompt")

        self.assertEqual(provider, "google")
        self.assertEqual(model_name, "models/gemma-3-1b-it")
        self.assertEqual(response.text, "Recovered answer")
        self.assertEqual(len(attempts), 2)
        self.assertEqual(attempts[0]["status"], "error")
        self.assertEqual(attempts[1]["status"], "ok")

    def test_chat_fallback_does_not_expose_raw_model_error(self):
        service = self.main.research_service
        excerpts = [{"source": "demo.pdf", "text": "This paper studies retrieval-augmented generation.", "page": 1, "chunk_id": "demo_1"}]
        with patch.object(service, "_query_context", return_value=excerpts), \
            patch.object(service, "client", object()), \
            patch.object(service, "open_api_key", "mock-openrouter-key"), \
            patch.object(service, "_generate_content", side_effect=RuntimeError("Google 503")), \
            patch.object(service, "_generate_content_openrouter", side_effect=RuntimeError("OpenRouter 401")):
            answer, _, _, _ = service.answer_question("What is this paper about?")

        self.assertNotIn("模型错误", answer)

    def test_query_context_defaults_to_focus_paper_when_selected(self):
        service = self.main.research_service
        records = [
            {"source": "focus.pdf", "text": "focus chunk 1", "page": 1, "id": "focus_1"},
            {"source": "focus.pdf", "text": "focus chunk 2", "page": 2, "id": "focus_2"},
            {"source": "other.pdf", "text": "other chunk", "page": 1, "id": "other_1"},
        ]
        with patch.object(service, "_ensure_collection", return_value=records), \
            patch.object(service, "get_focus_document", return_value="focus.pdf"), \
            patch.object(service, "_query_semantic", return_value=[]), \
            patch.object(service, "_rank_records", return_value=[]):
            excerpts = service._query_context("这个方法有什么创新点？", limit=2)  # pylint: disable=protected-access

        self.assertGreaterEqual(len(excerpts), 1)
        self.assertEqual(excerpts[0]["source"], "focus.pdf")
        self.assertEqual(service.last_retrieval_source, "fallback")


if __name__ == "__main__":
    unittest.main()
