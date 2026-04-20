import requests
import json
import math
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
import base64
from urllib.parse import quote_plus
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from pathlib import Path
from types import SimpleNamespace
from zhipuai import ZhipuAI

import fitz
import chromadb
from chromadb.utils import embedding_functions
from google import genai
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings
from document_state_store import DocumentStateStore
from reasoning.contracts import (
    CompareItem,
    CompareOutput,
    ConcludeClaim,
    ConcludeOutput,
    EvidenceItem,
    RetrieveOutput,
    ValidateIssue,
    ValidateOutput,
    validate_chain_consistency,
)
from telemetry_store import GenerationHistoryStore, ProductMetricsStore


class ResearchService:
    def __init__(self) -> None:
        self.data_dir = settings.data_dir
        self.diagram_dir = settings.diagram_dir
        self.figure_dir = settings.figure_dir
        self.chroma_dir = settings.chroma_dir
        for directory in (self.data_dir, self.diagram_dir, self.figure_dir, self.chroma_dir):
            directory.mkdir(parents=True, exist_ok=True)

        if settings.google_proxy_url:
            self._set_proxy_env(settings.google_proxy_url)
        elif not settings.google_use_system_proxy:
            self._disable_proxy_env()

        # 文本模型主链路：Google
        self.client = genai.Client(api_key=settings.google_api_key) if settings.google_api_key else None
        self.glm_client = ZhipuAI(api_key=settings.glm_api_key) if settings.glm_api_key else None
        # 统一 Codex/OpenAI 兼容 API（优先）
        self.codex_api_key = settings.codex_api_key.strip() or os.getenv("GPT_API_KEY", "").strip()
        self.codex_base_url = (
            settings.codex_base_url.strip()
            or os.getenv("GPT_BASE_URL", "").strip()
            or "https://api.openai.com/v1"
        ).rstrip("/")
        self.img_api_key = settings.img_api_key.strip()
        self.img_base_url = settings.img_base_url.strip().rstrip("/")
        self.img_gemini_auth_mode = str(settings.img_gemini_auth_mode or "auto").strip().lower()
        # 文本模型兜底链路：OpenRouter（仅在 Google 不可用时使用）
        self.open_api_key = settings.open_api_key.strip()
        self.openrouter_url = "https://openrouter.ai/api/v1/chat/completions"
        self.text_provider_order = self._parse_provider_order(
            settings.text_provider_order,
            ("codex", "google", "openrouter"),
        )
        self.figure_provider_order = self._parse_provider_order(
            settings.figure_provider_order,
            ("img", "codex", "glm"),
        )
        self.disabled_providers = self._parse_disable_providers(settings.disable_providers)
        self.text_model_overrides = self._parse_model_map(settings.text_model_map)
        self.figure_model_overrides = self._parse_model_map(settings.figure_model_map)
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._ingest_lock = threading.Lock()
        self._indexing = False
        self._last_ingest_started_at: float | None = None
        self._last_ingest_finished_at: float | None = None
        self._last_ingest_files = 0
        self._last_ingest_chunks = 0
        self._last_ingest_error = ""
        self.local_index_path = self.data_dir / "local_index.json"
        self.doc_state_path = self.data_dir / "documents_state.json"
        self.generation_history_path = self.data_dir / "generation_history.json"
        self.metrics_path = self.data_dir / "product_metrics.json"
        self.local_index: list[dict[str, object]] = []
        self.doc_state_store = DocumentStateStore(self.data_dir, self.doc_state_path)
        self.doc_state: dict[str, object] = self.doc_state_store.state
        self._metrics_defaults: dict[str, int] = {
            "chat_requests": 0,
            "writing_help_requests": 0,
            "writing_validate_requests": 0,
            "writing_rewrite_requests": 0,
            "diagram_requests": 0,
            "figure_requests": 0,
        }
        self.metrics_store = ProductMetricsStore(self.metrics_path, self._metrics_defaults)
        self.generation_store = GenerationHistoryStore(self.generation_history_path, limit=20)
        self.vector_error = ""
        self._vector_store_enabled = bool(settings.enable_vector_store)
        self._vector_collection = None
        self._vector_collection_name = "sci_copilot_chunks"
        self.model_error = ""
        self.last_generation_error = ""
        self.last_error_payload: dict[str, object] = {"error_code": "", "error_hint": "", "retryable": False, "degraded": False}
        self.last_success_at: int | None = None
        self.last_retrieval_source: str = "none"
        self.last_routing_trace: dict[str, object] = {
            "task": "",
            "attempts": [],
            "active_provider": "",
            "active_model": "",
            "fallback_reason": "",
        }
        self._last_img_attempt_meta: dict[str, str] = {
            "protocol": "",
            "endpoint": "",
            "auth_mode": "",
        }
        self._load_local_index()
        self._sync_doc_state_with_files(persist=False)
        self._init_vector_store()

    def _disable_proxy_env(self) -> None:
        for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
            os.environ.pop(key, None)
        os.environ["NO_PROXY"] = "*"
        os.environ["no_proxy"] = "*"

    def _set_proxy_env(self, proxy_url: str) -> None:
        for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
            os.environ[key] = proxy_url

    def _parse_provider_order(self, raw: str, defaults: tuple[str, ...]) -> list[str]:
        allowed = {"codex", "google", "openrouter", "img", "glm"}
        items = [item.strip().lower() for item in str(raw or "").split(",") if item.strip()]
        if not items:
            items = list(defaults)
        deduped: list[str] = []
        for item in items:
            if item in allowed and item not in deduped:
                deduped.append(item)
        return deduped or list(defaults)

    def _parse_disable_providers(self, raw: str) -> set[str]:
        return {item.strip().lower() for item in str(raw or "").split(",") if item.strip()}

    def _parse_model_map(self, raw: str) -> dict[str, list[str]]:
        try:
            payload = json.loads(str(raw or "{}"))
        except Exception:
            return {}
        if not isinstance(payload, dict):
            return {}
        normalized: dict[str, list[str]] = {}
        for key, value in payload.items():
            provider = str(key).strip().lower()
            values: list[str] = []
            if isinstance(value, str):
                if value.strip():
                    values = [value.strip()]
            elif isinstance(value, list):
                values = [str(item).strip() for item in value if str(item).strip()]
            if provider and values:
                normalized[provider] = values
        return normalized

    def _provider_enabled(self, provider: str) -> bool:
        return str(provider).lower() not in self.disabled_providers

    def _provider_models_with_override(
        self,
        provider: str,
        defaults: list[str],
        override_map: dict[str, list[str]],
    ) -> list[str]:
        preferred = override_map.get(str(provider).lower(), [])
        candidates = [item for item in preferred if item]
        candidates.extend(defaults)
        deduped: list[str] = []
        for item in candidates:
            if item and item not in deduped:
                deduped.append(item)
        return deduped

    def _text_provider_available(self, provider: str) -> bool:
        normalized = str(provider).lower()
        if normalized == "codex":
            return bool(self.codex_api_key)
        if normalized == "google":
            return self.client is not None
        if normalized == "openrouter":
            return bool(self.open_api_key)
        return False

    def _figure_provider_available(self, provider: str) -> bool:
        normalized = str(provider).lower()
        if normalized == "img":
            return bool(self.img_api_key)
        if normalized == "codex":
            return bool(self.codex_api_key)
        if normalized == "glm":
            return self.glm_client is not None
        return False

    def _text_models_for_provider(self, provider: str, preferred_model: str = "") -> list[str]:
        normalized = str(provider).lower()
        if normalized == "codex":
            defaults = self._codex_chat_candidate_models(preferred_model)
        elif normalized == "google":
            defaults = self._candidate_models(preferred_model)
        elif normalized == "openrouter":
            defaults = self._openrouter_candidate_models(preferred_model)
        else:
            defaults = []
        return self._provider_models_with_override(normalized, defaults, self.text_model_overrides)

    def _figure_models_for_provider(self, provider: str) -> list[str]:
        normalized = str(provider).lower()
        if normalized == "img":
            defaults = [self._img_image_model()]
        elif normalized == "codex":
            defaults = [self._codex_image_model()]
        elif normalized == "glm":
            defaults = [(settings.figure_model or "cogview-3-plus").strip()]
        else:
            defaults = []
        return self._provider_models_with_override(normalized, defaults, self.figure_model_overrides)

    def _build_text_candidates(self, preferred_model: str) -> list[tuple[str, str]]:
        candidates: list[tuple[str, str]] = []
        for provider in self.text_provider_order:
            if not self._provider_enabled(provider) or not self._text_provider_available(provider):
                continue
            for model_name in self._text_models_for_provider(provider, preferred_model):
                candidates.append((provider, model_name))
        return candidates

    def _build_figure_candidates(self) -> list[tuple[str, str]]:
        candidates: list[tuple[str, str]] = []
        for provider in self.figure_provider_order:
            if not self._provider_enabled(provider) or not self._figure_provider_available(provider):
                continue
            for model_name in self._figure_models_for_provider(provider):
                candidates.append((provider, model_name))
        return candidates

    def _candidate_models(self, preferred: str = "") -> list[str]:
        configured = (preferred or settings.google_model or "").strip()
        aliases = {"gemma3": ["models/gemma-3-1b-it"], "gemma-3": ["models/gemma-3-1b-it"]}
        if not configured:
            return ["models/gemma-3-1b-it"]
        if configured in aliases:
            return aliases[configured]
        if configured.startswith("models/"):
            return [configured]
        return [configured, f"models/{configured}"]

    def _codex_chat_candidate_models(self, preferred: str = "") -> list[str]:
        # Codex 通道优先使用专用文本模型，避免误用 Google 风格 models/* 名称
        primary = (settings.codex_text_model or "gpt-4.1-mini").strip()
        candidates: list[str] = [primary]
        preferred_name = str(preferred or "").strip()
        if preferred_name and not preferred_name.startswith("models/"):
            candidates.append(preferred_name)
        deduped: list[str] = []
        for item in candidates:
            if item and item not in deduped:
                deduped.append(item)
        return deduped or ["gpt-4.1-mini"]

    def _codex_image_model(self) -> str:
        configured = (settings.codex_figure_model or settings.figure_model or "").strip()
        if configured:
            return configured
        return "gpt-image-1"

    def _img_image_model(self) -> str:
        configured = (settings.img_figure_model or "").strip()
        if configured:
            return configured
        return self._codex_image_model()

    def _image_generation_urls(self, base_url: str) -> list[str]:
        normalized = str(base_url or "").strip().rstrip("/")
        if not normalized:
            return []
        candidates: list[str] = []
        if normalized.endswith("/v1"):
            candidates.append(f"{normalized}/images/generations")
        else:
            candidates.append(f"{normalized}/v1/images/generations")
            candidates.append(f"{normalized}/images/generations")
        deduped: list[str] = []
        for item in candidates:
            if item and item not in deduped:
                deduped.append(item)
        return deduped

    def _find_image_asset(self, payload: object) -> tuple[str, str] | None:
        if isinstance(payload, dict):
            for key in ("b64_json", "b64", "image_base64", "base64", "bytesBase64Encoded", "bytes_base64_encoded"):
                value = str(payload.get(key, "") or "").strip()
                if value:
                    return ("base64", value)
            for key in ("url", "image_url"):
                value = str(payload.get(key, "") or "").strip()
                if value:
                    return ("url", value)
            inline_data = payload.get("inlineData")
            if isinstance(inline_data, dict):
                inline_value = str(inline_data.get("data", "") or "").strip()
                if inline_value:
                    return ("base64", inline_value)
            for key in (
                "data",
                "images",
                "output",
                "result",
                "inlineData",
                "inline_data",
                "predictions",
                "generatedImages",
                "candidates",
                "content",
                "parts",
                "response",
            ):
                found = self._find_image_asset(payload.get(key))
                if found:
                    return found
            return None
        if isinstance(payload, list):
            for item in payload:
                found = self._find_image_asset(item)
                if found:
                    return found
        return None

    def _extract_image_result(
        self,
        payload: object,
        provider_name: str,
        model_name: str,
    ) -> tuple[bytes, str]:
        asset = self._find_image_asset(payload)
        if not asset:
            raise RuntimeError(f"{provider_name} image response did not include image data: {model_name}")
        asset_kind, asset_value = asset
        if asset_kind == "base64":
            try:
                return self._decode_base64_image(asset_value), "png"
            except Exception as exc:
                raise RuntimeError(f"{provider_name} base64 image decode failed: {model_name}") from exc

        img_resp = requests.get(asset_value, timeout=20)
        img_resp.raise_for_status()
        return img_resp.content, "png"

    def _generate_image_openai_compatible(
        self,
        provider_name: str,
        base_url: str,
        api_key: str,
        model_name: str,
        prompt: str,
        timeout_seconds: int,
    ) -> tuple[bytes, str]:
        candidate_urls = self._image_generation_urls(base_url)
        if not api_key:
            raise RuntimeError(f"{provider_name} API key is missing")
        if not candidate_urls:
            raise RuntimeError(f"{provider_name} BASE_URL is missing")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "prompt": prompt,
            "size": "1536x1024",
            "n": 1,
        }

        last_error: Exception | None = None
        for index, endpoint in enumerate(candidate_urls):
            try:
                response = requests.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=timeout_seconds,
                )
                response.raise_for_status()
                if provider_name == "IMG":
                    self._last_img_attempt_meta = {
                        "protocol": "openai_compatible",
                        "endpoint": endpoint,
                        "auth_mode": "bearer",
                    }
                return self._extract_image_result(response.json(), provider_name, model_name)
            except requests.HTTPError as exc:
                last_error = exc
                status_code = exc.response.status_code if exc.response is not None else None
                if status_code == 404 and index < len(candidate_urls) - 1:
                    continue
                raise
            except ValueError as exc:
                last_error = exc
                raise RuntimeError(f"{provider_name} image endpoint returned a non-JSON response") from exc

        if last_error is not None:
            raise RuntimeError(f"{provider_name} image generation request failed: {last_error}") from last_error
        raise RuntimeError(f"{provider_name} image generation request failed")

    def _gemini_auth_modes(self) -> tuple[str, ...]:
        mode = str(self.img_gemini_auth_mode or "auto").strip().lower()
        if mode == "query_only":
            return ("query",)
        if mode == "bearer_only":
            return ("bearer",)
        if mode == "query_first":
            return ("query", "bearer")
        if mode == "bearer_first":
            return ("bearer", "query")
        return ("query", "bearer")

    def _decode_base64_image(self, raw_value: str) -> bytes:
        normalized = str(raw_value or "").strip()
        if "," in normalized and normalized.lower().startswith("data:"):
            normalized = normalized.split(",", 1)[1].strip()
        padding = (-len(normalized)) % 4
        if padding:
            normalized += "=" * padding
        return base64.b64decode(normalized)

    def _gemini_image_endpoints(self, base_url: str, model_name: str) -> list[str]:
        normalized = str(base_url or "").strip().rstrip("/")
        if not normalized:
            return []
        model_path = str(model_name or "").strip()
        if model_path.startswith("models/"):
            model_path = model_path.split("/", 1)[1]
        model_path = model_path.lstrip("/")
        candidates = [
            f"{normalized}/models/{model_path}:generateContent",
            f"{normalized}/v1beta/models/{model_path}:generateContent",
            f"{normalized}/v1/models/{model_path}:generateContent",
            f"{normalized}/models/{model_path}:predict",
            f"{normalized}/v1beta/models/{model_path}:predict",
            f"{normalized}/v1/models/{model_path}:predict",
        ]
        deduped: list[str] = []
        for item in candidates:
            if item not in deduped:
                deduped.append(item)
        return deduped

    def _generate_image_gemini_compatible(
        self,
        provider_name: str,
        base_url: str,
        api_key: str,
        model_name: str,
        prompt: str,
        timeout_seconds: int,
    ) -> tuple[bytes, str]:
        if not api_key:
            raise RuntimeError(f"{provider_name} API key is missing")
        endpoints = self._gemini_image_endpoints(base_url, model_name)
        if not endpoints:
            raise RuntimeError(f"{provider_name} BASE_URL is missing")

        request_payloads = (
            {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseModalities": ["IMAGE"]},
            },
            {
                "instances": [{"prompt": prompt}],
                "parameters": {"sampleCount": 1},
            },
        )
        errors: list[str] = []
        auth_modes = self._gemini_auth_modes()
        for endpoint in endpoints:
            for payload in request_payloads:
                for mode in auth_modes:
                    request_url = endpoint if mode == "bearer" else f"{endpoint}?key={quote_plus(api_key)}"
                    headers = {"Content-Type": "application/json"}
                    if mode == "bearer":
                        headers["Authorization"] = f"Bearer {api_key}"
                    redacted_url = endpoint if mode == "bearer" else f"{endpoint}?key=***"
                    self._last_img_attempt_meta = {
                        "protocol": "gemini_compatible",
                        "endpoint": endpoint,
                        "auth_mode": mode,
                    }
                    try:
                        response = requests.post(
                            request_url,
                            headers=headers,
                            json=payload,
                            timeout=timeout_seconds,
                        )
                        response.raise_for_status()
                        self._last_img_attempt_meta = {
                            "protocol": "gemini_compatible",
                            "endpoint": endpoint,
                            "auth_mode": mode,
                        }
                        return self._extract_image_result(response.json(), provider_name, model_name)
                    except Exception as exc:
                        errors.append(f"{redacted_url} -> {exc}")
        raise RuntimeError(" | ".join(errors) if errors else f"{provider_name} Gemini-compatible request failed")

    def _generate_content_codex(
        self,
        model_name: str,
        contents: str,
        timeout_seconds: int | None = None,
    ):
        timeout_seconds = timeout_seconds or settings.codex_request_timeout_seconds
        headers = {
            "Authorization": f"Bearer {self.codex_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": contents}],
        }
        response = requests.post(
            f"{self.codex_base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError(f"Codex 未返回候选结果：{model_name}")
        message = choices[0].get("message", {})
        content = message.get("content", "")
        if isinstance(content, list):
            content = "".join(
                str(item.get("text", "")) if isinstance(item, dict) else str(item)
                for item in content
            )
        text = str(content).strip()
        if not text:
            raise RuntimeError(f"Codex 返回空内容：{model_name}")
        return SimpleNamespace(text=text)

    def _generate_image_codex(
        self,
        model_name: str,
        prompt: str,
        timeout_seconds: int | None = None,
    ) -> tuple[bytes, str]:
        timeout_seconds = timeout_seconds or settings.codex_request_timeout_seconds
        return self._generate_image_openai_compatible(
            provider_name="Codex",
            base_url=self.codex_base_url,
            api_key=self.codex_api_key,
            model_name=model_name,
            prompt=prompt,
            timeout_seconds=timeout_seconds,
        )

    def _generate_image_img(
        self,
        model_name: str,
        prompt: str,
        timeout_seconds: int | None = None,
    ) -> tuple[bytes, str]:
        timeout_seconds = timeout_seconds or settings.img_request_timeout_seconds
        openai_error: Exception | None = None
        try:
            return self._generate_image_openai_compatible(
                provider_name="IMG",
                base_url=self.img_base_url,
                api_key=self.img_api_key,
                model_name=model_name,
                prompt=prompt,
                timeout_seconds=timeout_seconds,
            )
        except Exception as exc:
            openai_error = exc

        try:
            return self._generate_image_gemini_compatible(
                provider_name="IMG",
                base_url=self.img_base_url,
                api_key=self.img_api_key,
                model_name=model_name,
                prompt=prompt,
                timeout_seconds=timeout_seconds,
            )
        except Exception as gemini_exc:
            raise RuntimeError(
                f"IMG image generation failed. openai_compatible={openai_error}; gemini_compatible={gemini_exc}"
            ) from gemini_exc

    def _run_figure_candidate(
        self,
        provider: str,
        model_name: str,
        prompt: str,
    ) -> tuple[bytes, str]:
        normalized = str(provider).lower()
        if normalized == "img":
            return self._generate_image_img(model_name, prompt)
        if normalized == "codex":
            return self._generate_image_codex(model_name, prompt)
        if normalized == "glm":
            if self.glm_client is None:
                raise RuntimeError("GLM client is not configured")
            response = self.glm_client.images.generations(
                model=model_name,
                prompt=prompt,
            )
            remote_url = response.data[0].url
            img_resp = requests.get(remote_url, timeout=20)
            img_resp.raise_for_status()
            return img_resp.content, "png"
        raise RuntimeError(f"unsupported figure provider: {provider}")

    def _generate_content(
self, model_name: str, contents: str, timeout_seconds: int | None = None):
        timeout_seconds = timeout_seconds or settings.google_request_timeout_seconds
        future = self.executor.submit(self.client.models.generate_content, model=model_name, contents=contents)
        try:
            return future.result(timeout=timeout_seconds)
        except FuturesTimeoutError as exc:
            future.cancel()
            raise RuntimeError(f"模型请求超时：{model_name}，超过 {timeout_seconds} 秒。") from exc

    def _openrouter_candidate_models(self, preferred: str = "") -> list[str]:
        configured = (preferred or settings.open_model or "").strip()
        if not configured:
            return ["google/gemini-2.5-flash"]
        return [configured]

    def _generate_content_openrouter(
        self,
        model_name: str,
        contents: str,
        timeout_seconds: int | None = None,
    ):
        timeout_seconds = timeout_seconds or settings.open_request_timeout_seconds
        headers = {
            "Authorization": f"Bearer {self.open_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": settings.app_name,
        }
        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": contents}],
        }
        response = requests.post(self.openrouter_url, headers=headers, json=payload, timeout=timeout_seconds)
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError(f"OpenRouter 未返回候选结果：{model_name}")
        message = choices[0].get("message", {})
        content = message.get("content", "")
        if isinstance(content, list):
            content = "".join(
                str(item.get("text", "")) if isinstance(item, dict) else str(item)
                for item in content
            )
        text = str(content).strip()
        if not text:
            raise RuntimeError(f"OpenRouter 返回空内容：{model_name}")
        return SimpleNamespace(text=text)

    def _has_text_model(self) -> bool:
        for provider in self.text_provider_order:
            if self._provider_enabled(provider) and self._text_provider_available(provider):
                return True
        return False

    def _is_retryable_text_error(self, error: object) -> bool:
        text = str(error).lower()
        retryable_signatures = (
            "timeout",
            "timed out",
            "超时",
            "429",
            "503",
            "connection reset",
            "connection aborted",
            "temporarily unavailable",
            "eof",
        )
        return any(signature in text for signature in retryable_signatures)

    def _generate_text_with_fallback(self, google_preferred_model: str, prompt: str):
        candidates = self._build_text_candidates(google_preferred_model)
        attempts: list[dict[str, str]] = []
        errors: list[str] = []
        max_retry_attempts = max(1, int(settings.text_request_retry_attempts or 1))
        base_backoff_seconds = max(0.0, float(settings.text_request_retry_backoff_seconds or 0.0))
        if not candidates:
            self.model_error = "no available text provider"
            self.last_routing_trace = {
                "task": "text",
                "attempts": [],
                "active_provider": "",
                "active_model": "",
                "fallback_reason": self.model_error,
            }
            return None, "", "", attempts
        for provider, model_name in candidates:
            for attempt_index in range(1, max_retry_attempts + 1):
                try:
                    if provider == "codex":
                        response = self._generate_content_codex(model_name, prompt)
                    elif provider == "google":
                        response = self._generate_content(model_name, prompt)
                    elif provider == "openrouter":
                        response = self._generate_content_openrouter(model_name, prompt)
                    else:
                        continue
                    attempts.append(
                        {
                            "provider": provider,
                            "model": model_name,
                            "status": "ok",
                            "error": "",
                            "attempt": str(attempt_index),
                        }
                    )
                    self.last_routing_trace = {
                        "task": "text",
                        "attempts": attempts,
                        "active_provider": provider,
                        "active_model": model_name,
                        "fallback_reason": "",
                    }
                    return response, provider, model_name, attempts
                except Exception as exc:
                    error_text = f"{provider}[{model_name}] {exc}"
                    attempts.append(
                        {
                            "provider": provider,
                            "model": model_name,
                            "status": "error",
                            "error": str(exc),
                            "attempt": str(attempt_index),
                        }
                    )
                    should_retry = (
                        attempt_index < max_retry_attempts
                        and self._is_retryable_text_error(exc)
                    )
                    if should_retry:
                        if base_backoff_seconds > 0:
                            time.sleep(base_backoff_seconds * (2 ** (attempt_index - 1)))
                        continue
                    errors.append(error_text)
                    break

        if errors:
            self.model_error = " | ".join(errors)
        self.last_routing_trace = {
            "task": "text",
            "attempts": attempts,
            "active_provider": "",
            "active_model": "",
            "fallback_reason": self.model_error,
        }
        return None, "", "", attempts

    def save_upload(self, filename: str, content: bytes) -> tuple[Path, bool]:
        target = self.data_dir / Path(filename).name
        replaced = target.exists()
        target.write_bytes(content)
        self._sync_doc_state_with_files(persist=False)
        record = self._document_records().setdefault(target.name, {})
        record["ingested"] = False
        record["updated_at"] = int(target.stat().st_mtime)
        if not self.doc_state.get("focus_document"):
            self.doc_state["focus_document"] = target.name
        self._save_doc_state()
        return target, replaced

    def count_pdf_files(self) -> int:
        return len(list(self.data_dir.glob("*.pdf")))

    def schedule_background_ingest(self) -> None:
        def runner() -> None:
            try:
                self.ingest_all()
            except Exception:
                pass

        self.executor.submit(runner)

    def index_state(self) -> dict[str, object]:
        return {
            "indexing": self._indexing,
            "last_ingest_started_at": self._last_ingest_started_at,
            "last_ingest_finished_at": self._last_ingest_finished_at,
            "last_indexed_files": self._last_ingest_files,
            "last_chunk_count": self._last_ingest_chunks,
            "last_ingest_error": self._last_ingest_error,
        }

    def _paper_chunk_splitter(self) -> RecursiveCharacterTextSplitter:
        return RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=220,
            separators=[
                "\n\n",
                "\n",
                "。",
                "！",
                "？",
                ". ",
                "．",
                "; ",
                ", ",
                " ",
                "",
            ],
            length_function=len,
        )

    def _preprocess_pdf_page_text(self, raw: str) -> str:
        """Normalize PDF line wraps and hyphenation before chunking."""
        if not raw or not str(raw).strip():
            return ""
        text = str(raw).replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"([A-Za-z])-\n([A-Za-z])", r"\1\2", text)
        text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
        text = re.sub(r"[ \t\f\v]+", " ", text)
        return text.strip()

    def ingest_all(self) -> tuple[int, int]:
        with self._ingest_lock:
            self._indexing = True
            self._last_ingest_error = ""
            self._last_ingest_started_at = time.time()
            try:
                files = sorted(self.data_dir.glob("*.pdf"))
                splitter = self._paper_chunk_splitter()
                total_chunks = 0
                records: list[dict[str, object]] = []
                doc_records = self._document_records()

                for pdf_path in files:
                    page_items = self._extract_pages(pdf_path)
                    if not page_items:
                        record = doc_records.setdefault(
                            pdf_path.name,
                            {"updated_at": int(pdf_path.stat().st_mtime)},
                        )
                        record["ingested"] = False
                        record["updated_at"] = int(pdf_path.stat().st_mtime)
                        continue
                    has_chunks = False
                    for page_no, page_text in page_items:
                        cleaned = self._preprocess_pdf_page_text(page_text)
                        if not cleaned:
                            continue
                        for index, chunk in enumerate(splitter.split_text(cleaned)):
                            normalized = self._normalize_chunk(chunk)
                            if not normalized:
                                continue
                            chunk_id = f"{pdf_path.stem}_p{page_no}_{index}"
                            records.append(
                                {
                                    "id": chunk_id,
                                    "source": pdf_path.name,
                                    "text": normalized,
                                    "page": page_no,
                                }
                            )
                            total_chunks += 1
                            has_chunks = True
                    record = doc_records.setdefault(
                        pdf_path.name,
                        {"updated_at": int(pdf_path.stat().st_mtime)},
                    )
                    record["ingested"] = has_chunks
                    record["updated_at"] = int(pdf_path.stat().st_mtime)

                self.local_index = records
                self._save_local_index(records)
                self._save_doc_state()
                self._sync_vector_store(records)
                self.vector_error = "" if records else "知识库里还没有可检索的 PDF 内容。"
                self._last_ingest_files = len(files)
                self._last_ingest_chunks = total_chunks
                return len(files), total_chunks
            except Exception as exc:
                self._last_ingest_error = str(exc)
                raise
            finally:
                self._indexing = False
                self._last_ingest_finished_at = time.time()

    def answer_question(self, question: str) -> tuple[str, list[str], list[dict[str, object]], dict[str, object]]:
        self._record_metric("chat_requests")
        focus_document = self.get_focus_document()
        focus_state = self._document_records().get(focus_document, {}) if focus_document else {}
        if focus_document and not bool(focus_state.get("ingested", False)):
            meta = self._error_meta("INSUFFICIENT_EVIDENCE", degraded=True, retryable=False)
            meta["retrieval_source"] = "none"
            self.last_error_payload = meta
            return (
                f"?????{focus_document}????????????????????????????????????????????????",
                [focus_document],
                [],
                meta,
            )
        # 先检索证据，再拼 prompt 走文本模型；meta 保留诊断字段给前端状态面板
        excerpts = self._query_context(question)
        sources = self._unique_sources(excerpts)
        context = "\n\n".join(item["text"] for item in excerpts) if excerpts else "当前没有命中的文献片段。"
        self.last_error_payload = self._ok_meta()

        if not self._has_text_model():
            fallback = self._fallback_summary(question, excerpts)
            if fallback:
                meta = self._error_meta("TEXT_PROVIDER_UNAVAILABLE", degraded=True, retryable=True)
                meta["retrieval_source"] = self.last_retrieval_source
                self.last_error_payload = meta
                return fallback, sources, excerpts, meta
            meta = self._error_meta("CONFIG_MISSING", degraded=True, retryable=False)
            meta["retrieval_source"] = self.last_retrieval_source
            self.last_error_payload = meta
            return (
                "知识库已经可用，但文本模型当前不可用。请检查 backend/.env 中的 CODEX_API_KEY/GOOGLE_API_KEY/OPEN_API_KEY，"
                "并确认模型名与账号权限匹配后再重试。",
                sources,
                excerpts,
                meta,
            )

        prompt = (
            "你是 Sci-Copilot 的论文研读助手。默认使用中文回答，语气专业、直接，不要摆出 AI 助手口吻。\n"
            "如果用户提到‘这篇文章/这篇论文/本文/我上传的文件’，默认优先围绕当前焦点文献作答。\n"
            "请先给结论，再补方法、结果和意义；如果证据不足，请明确说明。\n\n"
            f"文献片段：\n{context}\n\n问题：\n{question}"
        )
        response, provider, model_name, attempts = self._generate_text_with_fallback(settings.analysis_model, prompt)
        if response is not None:
            answer = (response.text or "").strip()
            if self._is_low_quality_answer(answer):
                answer = self._fallback_summary(question, excerpts) or answer or "模型没有返回有效内容。"
            self.model_error = ""
            meta = self._ok_meta()
            meta["retrieval_source"] = self.last_retrieval_source
            meta["model_provider"] = provider
            meta["model_name"] = model_name
            meta["fallback_chain"] = attempts
            self.last_error_payload = meta
            self.last_success_at = int(time.time())
            return answer, sources, excerpts, meta

        fallback = self._fallback_summary(question, excerpts)
        if fallback:
            meta = self._classify_error(self.model_error, degraded=True)
            meta["retrieval_source"] = self.last_retrieval_source
            meta["fallback_chain"] = self.last_routing_trace.get("attempts", [])
            self.last_error_payload = meta
            return fallback, sources, excerpts, meta
        meta = self._classify_error(self.model_error, degraded=True)
        meta["retrieval_source"] = self.last_retrieval_source
        meta["fallback_chain"] = self.last_routing_trace.get("attempts", [])
        self.last_error_payload = meta
        return (
            "当前在线文本模型暂时不可用。建议先检查 key/模型权限与网络代理，再重试。",
            sources,
            excerpts,
            meta,
        )

    def map_validate_scope_to_rule_section(self, validate_scope: str) -> str:
        m = {
            "abstract": "abstract",
            "introduction": "introduction",
            "method": "method",
            "experiment": "experiment",
            "conclusion": "conclusion",
            "ending": "conclusion",
            "full": "custom",
            "custom": "custom",
        }
        return m.get(validate_scope, "custom")

    def _records_for_pdf_source(self, source: str) -> list[dict[str, object]]:
        records = self._ensure_collection()
        return [item for item in records if str(item.get("source", "")) == source]

    def _query_manuscript_chunks(self, search_query: str, manuscript: str, limit: int) -> list[dict[str, object]]:
        records = self._records_for_pdf_source(manuscript)
        if not records:
            return []
        semantic = self._query_semantic(search_query, limit=limit, source_filter=manuscript)
        if semantic:
            self.last_retrieval_source = "vector"
            return semantic
        ranked = self._rank_records(search_query, records, limit=limit)
        out = [
            {
                "source": str(item["source"]),
                "text": str(item["text"])[:520],
                "page": int(item["page"]) if isinstance(item.get("page"), int) else None,
                "chunk_id": str(item.get("id", "")),
            }
            for item in ranked
        ]
        if out:
            self.last_retrieval_source = "keyword"
            return out
        fb = self._fallback_focus_chunks(records, limit=limit)
        if fb:
            self.last_retrieval_source = "fallback"
        return fb

    def _query_reference_chunks(self, search_query: str, refs: list[str], limit_total: int) -> list[dict[str, object]]:
        if not refs:
            return []
        ref_set = {str(r).strip() for r in refs if str(r).strip()}
        pool = self._query_semantic(search_query, limit=max(limit_total * 5, 20), source_filter=None)
        out: list[dict[str, object]] = []
        seen: set[tuple[str, str]] = set()
        for item in pool:
            src = str(item.get("source", ""))
            if src not in ref_set:
                continue
            cid = str(item.get("chunk_id", ""))
            key = (src, cid)
            if key in seen:
                continue
            seen.add(key)
            out.append(item)
            if len(out) >= limit_total:
                self.last_retrieval_source = "vector"
                return out
        records = self._ensure_collection()
        for src in ref_set:
            scoped = [r for r in records if str(r.get("source", "")) == src]
            ranked = self._rank_records(search_query, scoped, limit=4)
            for item in ranked:
                cid = str(item.get("id", ""))
                key = (str(item.get("source", "")), cid)
                if key in seen:
                    continue
                seen.add(key)
                out.append(
                    {
                        "source": str(item["source"]),
                        "text": str(item["text"])[:520],
                        "page": int(item["page"]) if isinstance(item.get("page"), int) else None,
                        "chunk_id": cid,
                    }
                )
                if len(out) >= limit_total:
                    self.last_retrieval_source = "keyword"
                    return out
        self.last_retrieval_source = "keyword" if out else "none"
        return out[:limit_total]

    def writing_help(
        self,
        topic: str,
        stage: str,
        question: str,
        reference_documents: list[str] | None = None,
        manuscript_source: str | None = None,
        required_evidence_count: int = 1,
    ) -> dict[str, object]:
        self._record_metric("writing_help_requests")
        ms_raw = (manuscript_source or "").strip() or (self.get_focus_document() or "")
        manuscript = Path(ms_raw).name if ms_raw else ""
        if not topic or not topic.strip():
            topic = Path(manuscript).stem if manuscript else "当前研究"
        search_query = f"{topic}\n{question}".strip()
        refs = [Path(r).name for r in (reference_documents or []) if str(r).strip()]
        refs = [r for r in refs if r and r != manuscript]
        if not manuscript:
            return {
                "recommendation": "请先在文献库中设置「当前论文」（正在撰写的那篇 PDF），再使用写作帮助。",
                "evidence": [],
                "draft_template": self._writing_template(stage, question),
                "risk_notes": ["未设置当前论文，无法从你的稿件中检索上下文。"],
                "retrieval_source": "none",
                "error_code": "NO_MANUSCRIPT",
                "error_hint": "在「文献库」中选择或上传首稿并设为当前论文后再试。",
            }
        m_chunks = self._query_manuscript_chunks(search_query, manuscript, limit=4)
        r_chunks = self._query_reference_chunks(search_query, refs, limit_total=4) if refs else []
        evidence: list[dict[str, object]] = []
        for item in m_chunks:
            evidence.append(
                {
                    "source": str(item["source"]),
                    "snippet": str(item["text"])[:220],
                    "page": item.get("page"),
                    "chunk_id": str(item.get("chunk_id", "")),
                    "evidence_role": "manuscript",
                }
            )
        for item in r_chunks:
            evidence.append(
                {
                    "source": str(item["source"]),
                    "snippet": str(item["text"])[:220],
                    "page": item.get("page"),
                    "chunk_id": str(item.get("chunk_id", "")),
                    "evidence_role": "reference",
                }
            )
        evidence_for_prompt: list[dict[str, object]] = []
        for item in m_chunks[:3]:
            evidence_for_prompt.append(
                {
                    "source": str(item["source"]),
                    "snippet": str(item["text"])[:220],
                    "page": item.get("page"),
                    "chunk_id": str(item.get("chunk_id", "")),
                    "evidence_role": "manuscript",
                }
            )
        for item in r_chunks[:3]:
            evidence_for_prompt.append(
                {
                    "source": str(item["source"]),
                    "snippet": str(item["text"])[:220],
                    "page": item.get("page"),
                    "chunk_id": str(item.get("chunk_id", "")),
                    "evidence_role": "reference",
                }
            )
        recommendation = self._writing_recommendation(topic, stage, question, evidence_for_prompt)
        risk_notes = self._writing_risk_notes(evidence, question)
        if len(evidence) < max(1, required_evidence_count):
            risk_notes.insert(0, f"导师约束：至少需要 {required_evidence_count} 条证据，当前仅 {len(evidence)} 条。")
        rs = self.last_retrieval_source
        return {
            "recommendation": recommendation,
            "evidence": evidence[:8],
            "draft_template": self._writing_template(stage, question),
            "risk_notes": risk_notes,
            "retrieval_source": rs,
            "error_code": "",
            "error_hint": "",
        }

    def compare_methods(
        self,
        question: str,
        method_a: str,
        method_b: str,
        reference_documents: list[str] | None = None,
    ) -> dict[str, object]:
        self._record_metric("writing_help_requests")
        search_query = f"{question}\n{method_a}\n{method_b}".strip()
        refs = [Path(r).name for r in (reference_documents or []) if str(r).strip()]
        focus = self.get_focus_document() or ""
        refs = [r for r in refs if r != focus]
        if refs:
            excerpts = self._query_reference_chunks(search_query, refs, limit_total=8)
        else:
            excerpts = self._query_context(search_query, limit=8)

        retrieve_output = RetrieveOutput(
            query=search_query,
            evidence=[
                EvidenceItem(
                    evidence_id=f"e{idx + 1}",
                    source=str(item.get("source", "")),
                    page=item.get("page") if isinstance(item.get("page"), int) else None,
                    chunk_id=str(item.get("chunk_id", "")),
                    snippet=str(item.get("text", ""))[:220],
                    score=round(max(0.0, 1.0 - (idx * 0.08)), 3),
                )
                for idx, item in enumerate(excerpts)
            ],
        )
        compare_output = self._build_method_comparisons(retrieve_output, method_a, method_b)
        validate_output = self._validate_method_comparisons(retrieve_output, compare_output)
        conclude_output = self._conclude_method_comparisons(
            retrieve_output, compare_output, validate_output, method_a, method_b
        )
        contract_errors = validate_chain_consistency(
            retrieve_output, compare_output, validate_output, conclude_output
        )
        if contract_errors:
            validate_output.status = "risk_detected"
            validate_output.issues.extend(
                [ValidateIssue(severity="high", message=msg, claim_ref="contract") for msg in contract_errors]
            )
            conclude_output.supported_claims = []
            conclude_output.uncertainties.append("推理契约校验未通过，请先修复证据映射。")

        degraded = validate_output.status != "ok"
        meta = self._ok_meta() if not degraded else self._error_meta("UNKNOWN_ERROR", degraded=True, retryable=True)
        if validate_output.status == "insufficient_evidence":
            meta = self._error_meta("INSUFFICIENT_EVIDENCE", degraded=True, retryable=False)
        return {
            "status": validate_output.status,
            "summary": conclude_output.summary,
            "retrieve_evidence": [
                {
                    "evidence_id": item.evidence_id,
                    "source": item.source,
                    "page": item.page,
                    "chunk_id": item.chunk_id,
                    "snippet": item.snippet,
                    "score": item.score,
                }
                for item in retrieve_output.evidence
            ],
            "comparisons": [
                {"dimension": item.dimension, "claim": item.claim, "evidence_ids": item.evidence_ids}
                for item in compare_output.comparisons
            ],
            "validation_issues": [
                {"severity": item.severity, "message": item.message, "claim_ref": item.claim_ref}
                for item in validate_output.issues
            ],
            "supported_claims": [
                {"text": item.text, "evidence_ids": item.evidence_ids}
                for item in conclude_output.supported_claims
            ],
            "uncertainties": conclude_output.uncertainties,
            "retrieval_source": self.last_retrieval_source,
            "error_code": str(meta.get("error_code", "")),
            "error_hint": str(meta.get("error_hint", "")),
            "retryable": bool(meta.get("retryable", False)),
            "degraded": bool(meta.get("degraded", False)),
        }

    def _concat_pdf_text(self, pdf_path: Path) -> str:
        parts = self._extract_pages(pdf_path)
        return "\n\n".join(text for _, text in parts).strip()

    def _extract_scope_from_full_text(self, full_text: str, scope: str) -> tuple[str, str]:
        """Return (body, extraction_note). Empty body means failure."""
        text = full_text.strip()
        if not text:
            return "", "未能从 PDF 读出文本。"
        if scope == "full":
            return text, ""

        if scope == "abstract":
            m_start = re.search(r"(?:^|\n)\s*(摘要|Abstract)\b", text, re.I)
            if not m_start:
                return "", "未检测到「摘要/Abstract」标题，无法自动截取。"
            start = m_start.end()
            rest = text[start:]
            m_end = re.search(
                r"(?:\n\s*(?:关键词|Keywords|引言|Introduction|第1章|1\s+Introduction|\d+\s*\.?\s*引言))",
                rest,
                re.I,
            )
            end_off = m_end.start() if m_end else len(rest)
            chunk = rest[:end_off].strip()
            note = "摘要边界按标题启发式识别，若排版特殊请核对。" if len(chunk) < 80 else ""
            return chunk, note

        if scope == "introduction":
            m_start = re.search(r"(?:^|\n)\s*(?:引言|前言|Introduction)\b", text, re.I)
            if not m_start:
                return "", "未检测到「引言/Introduction」标题。"
            start = m_start.end()
            rest = text[start:]
            m_end = re.search(
                r"(?:\n\s*(?:相关工作|Related\s+Work|背景|Background|方法|Methodology|模型))", rest, re.I
            )
            end_off = m_end.start() if m_end else len(rest)
            chunk = rest[:end_off].strip()
            note = "" if len(chunk) > 100 else "引言段偏短，边界可能偏差。"
            return chunk, note

        if scope == "method":
            m_start = re.search(
                r"(?:^|\n)\s*(?:\d+\s*)?(?:方法|方法论|模型|Method|Methodology|Approach)\b",
                text,
                re.I,
            )
            if not m_start:
                return "", "未检测到「方法/Method」类标题，无法自动截取。"
            start = m_start.end()
            rest = text[start:]
            m_end = re.search(
                r"(?:\n\s*(?:实验|Experiment|Experiments|结果|Results|评测|Evaluation|结论|Conclusion))",
                rest,
                re.I,
            )
            end_off = m_end.start() if m_end else len(rest)
            chunk = rest[:end_off].strip()
            note = "方法节边界为启发式，双栏排版可能导致串段。" if len(chunk) < 120 else ""
            return chunk, note

        if scope == "experiment":
            m_start = re.search(
                r"(?:^|\n)\s*(?:实验|Experiment|Experiments|评测|Evaluation|Empirical)\b",
                text,
                re.I,
            )
            if not m_start:
                return "", "未检测到「实验/Experiment」类标题。"
            start = m_start.end()
            rest = text[start:]
            m_end = re.search(
                r"(?:\n\s*(?:结论|讨论|Conclusion|Discussion|局限性|Limitation|参考文献|References))",
                rest,
                re.I,
            )
            end_off = m_end.start() if m_end else len(rest)
            chunk = rest[:end_off].strip()
            note = "" if len(chunk) > 150 else "实验节内容偏短，章节边界请人工核对。"
            return chunk, note

        if scope in {"ending", "conclusion"}:
            m_start = re.search(
                r"(?:^|\n)\s*(?:结论|讨论|总结|Conclusion|Discussion)\b",
                text,
                re.I,
            )
            if not m_start:
                return "", "未检测到「结论/讨论」类标题，无法自动截取结尾段。"
            start = m_start.end()
            rest = text[start:]
            m_end = re.search(r"(?:\n\s*(?:参考文献|References|致谢|Acknowledgment|附录|Appendix))", rest, re.I)
            end_off = m_end.start() if m_end else len(rest)
            chunk = rest[:end_off].strip()
            note = ""
            return chunk, note

        return text, ""

    def _gather_validate_reference_snippets(self, normalized: str, refs: list[str]) -> str:
        if not refs:
            return ""
        q = normalized[:1800]
        chunks = self._query_reference_chunks(q, [Path(r).name for r in refs], limit_total=6)
        lines = []
        for item in chunks:
            lines.append(f"- {item.get('source')} p.{item.get('page')}: {str(item.get('text', ''))[:200]}")
        return "\n".join(lines)

    @staticmethod
    def _extract_match_context(text: str, match: re.Match, window: int = 40) -> str:
        """Extract a context window around a regex match for display."""
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return f"{prefix}{text[start:end].strip()}{suffix}"

    def _rule_validate_section(
        self, rule_section: str, validate_scope: str, normalized: str
    ) -> list[dict[str, str]]:
        issues: list[dict[str, str]] = []
        min_len = 800 if validate_scope == "full" else 120
        if len(normalized) < min_len:
            issues.append(
                self._validation_issue(
                    "structure",
                    "high",
                    "当前截取片段长度过短，信息可能不足或章节识别失败。",
                    "补充内容或检查 PDF 排版与章节标题；必要时换用「全文」校验。",
                    "本研究针对XX问题，提出XX方法，并在XX数据集上验证其有效性。",
                )
            )
        tone_match = re.search(r"[我你他她它]|觉得|非常|特别|超级", normalized)
        if tone_match:
            original = self._extract_match_context(normalized, tone_match)
            issues.append(
                self._validation_issue(
                    "academic_tone",
                    "medium",
                    "文本存在口语化表达，不符合论文写作风格。",
                    "使用客观叙述，避免主观词和口语词。",
                    "实验结果表明，该方法在准确率与稳定性方面均优于基线方法。",
                    original_text=original,
                )
            )
        claim_match = re.search(r"显著提升|明显优于|最好", normalized)
        if claim_match and not re.search(r"\d+(\.\d+)?%|p<|p <", normalized):
            original = self._extract_match_context(normalized, claim_match)
            issues.append(
                self._validation_issue(
                    "evidence",
                    "high",
                    "结论性表述缺少量化指标或统计证据。",
                    "在结论句后补充具体指标、对比对象和统计显著性。",
                    "与基线相比，本方法在F1上提升3.2%，并在95%置信区间内保持稳定。",
                    original_text=original,
                )
            )
        if rule_section in {"method", "experiment"} and not re.search(
            r"数据|dataset|baseline|参数|设置|实验", normalized.lower()
        ):
            issues.append(
                self._validation_issue(
                    "completeness",
                    "medium",
                    "方法/实验段缺少数据集、参数或对比设置描述。",
                    "补充实验设置（数据集、超参数、评估指标、对比方法）。",
                    "实验在XX数据集上进行，学习率设为1e-4，批大小为32，并与A/B/C三种方法比较。",
                )
            )
        if not re.search(r"\[\d+\]|\([A-Za-z].*?,\s?\d{4}\)|et al\.", normalized):
            issues.append(
                self._validation_issue(
                    "citation",
                    "low",
                    "当前片段未检测到引用标记。",
                    "为关键论断补充引用（如[1]或Author, Year）。",
                    "近年来，检索增强生成在科研问答中表现稳定 [3]。",
                )
            )
        if not issues:
            issues.append(
                self._validation_issue(
                    "quality",
                    "low",
                    "规则检查未发现明显结构性问题，建议结合下方模型审稿意见继续润色。",
                    "保持术语前后一致，缩短长句，增强可读性。",
                    '为提升可读性，可将复合长句拆分为"方法描述+结果解释"两句。',
                )
            )
        return issues

    def _looks_like_english_instruction_text(self, text: str) -> bool:
        """Heuristic: long reviewer-facing text that is mostly Latin letters, few CJK."""
        s = (text or "").strip()
        if len(s) < 22:
            return False
        cjk = len(re.findall(r"[\u4e00-\u9fff]", s))
        latin = len(re.findall(r"[a-zA-Z]", s))
        return cjk < 10 and latin > max(35, len(s) // 3)

    def _validation_payload_needs_zh_repair(self, payload: dict) -> bool:
        if self._looks_like_english_instruction_text(str(payload.get("summary", ""))):
            return True
        for item in payload.get("issues") or []:
            if not isinstance(item, dict):
                continue
            if self._looks_like_english_instruction_text(str(item.get("message", ""))):
                return True
            if self._looks_like_english_instruction_text(str(item.get("suggestion", ""))):
                return True
        return False

    def _repair_validation_payload_zh(self, payload: dict) -> dict | None:
        """Second pass: force summary / message / suggestion to zh-CN; keep example/original language."""
        try:
            slim = json.dumps(payload, ensure_ascii=False)
        except (TypeError, ValueError):
            return None
        if len(slim) > 14000:
            slim = slim[:14000]
        fix_prompt = (
            "下面是论文校验模型输出的 JSON。请将 summary、以及每条 issue 的 message、suggestion "
            "改写为通顺的**简体中文**（面向中文界面作者）。"
            "保留 rewrite_example、original_text 字段内容**原样不变**（勿英译中），以便作者粘贴英文示例或原文。"
            "不要增删 issues 条目，不要改名 JSON 字段。只输出合法 JSON，不要 markdown。"
            f"\n\n{slim}"
        )
        response, _, _, _ = self._generate_text_with_fallback(
            settings.analysis_model, fix_prompt
        )
        if response is None:
            return None
        repaired = self._parse_json_object((response.text or "").strip())
        if isinstance(repaired, dict) and isinstance(repaired.get("issues"), list) and repaired["issues"]:
            return repaired
        return None

    def _llm_validate_section(
        self,
        validate_scope: str,
        rule_section: str,
        normalized: str,
        ref_snippets: str,
    ) -> tuple[list[dict[str, str]], bool]:
        if not self._has_text_model():
            return [], False
        prompt = (
            "你是严谨的中英文学术论文审稿助理。Sci-Copilot 界面为中文作者：输出 JSON 时，"
            "**summary、每条 issue 的 message、suggestion 三个字段必须为简体中文**（说明「问题在哪、怎么改」）；"
            "不得以英文段落撰写上述解释性字段——即便待审论文本身是英文。"
            "rewrite_example 可与正文语种一致（英文稿给英文示例句便于粘贴）；original_text 仅原样摘录论文片段，语种随原文。"
            "结合「参考文献摘录」判断论证是否克制、术语是否一致、是否有需补证据的断言。"
            "输出严格 JSON（不要 markdown 代码块）："
            "summary(str 一句总评)、issues(array of objects: category, severity 取 high|medium|low, message, suggestion, rewrite_example, original_text)。"
            "**语言要求（违反则视为不合格输出）**："
            "① summary、message、suggestion：**一律简体中文**，具体可操作；仅在必要时夹英文术语、文献题名。"
            "② suggestion 禁止仅用英文陈述改法；若你先用英文打了草稿，必须在输出前改写为中文。"
            "③ rewrite_example：若正文主体为英文则给英文示例句，若为中文则给中文示例句，便于直接替换；不要只为示例而把 message/suggestion 写成英文。"
            "④ original_text 保持原语种摘录；专业术语、缩写、公式保留原形。"
            "**字段硬性要求**：每一条 issue 的 rewrite_example **必须为非空字符串**——至少给出一句可粘贴进论文的示例（或一句最短补写）；禁止省略该字段或填空字符串。"
            "其中 original_text 规则：如果问题针对论文某个具体句子或段落，original_text 填写原文中对应的那段文字（原样摘录，30~120字）；"
            "如果是全局性、笼统的建议（如整体结构、术语统一等），original_text 留空字符串。"
            "输出前自检：summary、每条 message、suggestion 是否均为中文。"
            "issues 至少 1 条、至多 8 条；若无严重问题，仍需给出改进型建议。\n\n"
            f"校验范围标签：{validate_scope}（规则映射章节：{rule_section}）\n\n"
            f"参考文献摘录：\n{ref_snippets or '（未提供参考文献检索结果）'}\n\n"
            f"待审阅正文：\n{normalized[:8000]}\n"
        )
        response, _, _, _ = self._generate_text_with_fallback(
            settings.analysis_model, prompt
        )
        if response is None:
            return [], False
        payload = self._parse_json_object((response.text or "").strip())
        if not payload:
            return [], False
        if self._validation_payload_needs_zh_repair(payload):
            repaired = self._repair_validation_payload_zh(payload)
            if isinstance(repaired, dict):
                payload = repaired
        out: list[dict[str, str]] = []
        raw_issues = payload.get("issues", [])
        if isinstance(raw_issues, list):
            for item in raw_issues[:8]:
                if not isinstance(item, dict):
                    continue
                sev = str(item.get("severity", "low")).lower()
                if sev not in {"high", "medium", "low"}:
                    sev = "low"
                rewrite_ex = ""
                for key in (
                    "rewrite_example",
                    "example",
                    "rewrite_sample",
                    "sample_rewrite",
                    "改写示例",
                    "示例",
                ):
                    raw_ex = item.get(key)
                    if isinstance(raw_ex, str) and raw_ex.strip():
                        rewrite_ex = raw_ex.strip()
                        break
                if not rewrite_ex:
                    rewrite_ex = "（模型未返回示例句，请根据建议自行补写一句；或重新执行校验。）"
                out.append(
                    self._validation_issue(
                        str(item.get("category", "llm_review")),
                        sev,
                        str(item.get("message", ""))[:400] or "模型审稿意见",
                        str(item.get("suggestion", ""))[:400],
                        rewrite_ex[:400],
                        original_text=str(item.get("original_text", ""))[:200],
                    )
                )
        return out, True

    def validate_manuscript(
        self,
        section: str,
        text: str | None = None,
        validate_scope: str | None = None,
        reference_documents: list[str] | None = None,
        use_llm_review: bool = True,
    ) -> dict[str, object]:
        self._record_metric("writing_validate_requests")
        refs = [Path(r).name for r in (reference_documents or []) if str(r).strip()]
        focus = self.get_focus_document()
        extraction_note = ""
        vs = validate_scope if validate_scope is not None else "custom"
        extracted_scope_key = vs

        if text and len(text.strip()) >= 20:
            normalized = text.strip()
            rule_section = section or "custom"
            if rule_section == "custom" and validate_scope:
                rule_section = self.map_validate_scope_to_rule_section(validate_scope)
            extracted_scope_key = rule_section
        else:
            if not focus:
                return {
                    "summary": "未设置当前论文，无法从 PDF 截取待校验正文。",
                    "issues": [
                        self._validation_issue(
                            "config",
                            "high",
                            "请先上传首稿 PDF 并设为当前论文，再使用按章节校验。",
                            "在文献库中选择你的稿件并等待索引完成。",
                            "",
                        )
                    ],
                    "high_risk_count": 1,
                    "can_export": False,
                    "next_action": "设置当前论文后重试。",
                    "extraction_note": "",
                    "validate_scope": vs,
                    "llm_review_used": False,
                    "validated_text": "",
                }
            pdf_path = self.data_dir / focus
            if not pdf_path.is_file():
                return {
                    "summary": "当前论文文件不存在。",
                    "issues": [
                        self._validation_issue(
                            "config",
                            "high",
                            f"找不到文件：{focus}",
                            "重新上传或切换当前论文。",
                            "",
                        )
                    ],
                    "high_risk_count": 1,
                    "can_export": False,
                    "next_action": "检查文献库文件。",
                    "extraction_note": "",
                    "validate_scope": vs,
                    "llm_review_used": False,
                    "validated_text": "",
                }
            doc_records = self._document_records().get(focus, {})
            if not bool(doc_records.get("ingested", False)):
                return {
                    "summary": "当前论文尚未完成索引。",
                    "issues": [
                        self._validation_issue(
                            "config",
                            "high",
                            "请等待索引完成或点击重新索引后再校验。",
                            "",
                            "",
                        )
                    ],
                    "high_risk_count": 1,
                    "can_export": False,
                    "next_action": "完成索引后重试。",
                    "extraction_note": "",
                    "validate_scope": vs,
                    "llm_review_used": False,
                    "validated_text": "",
                }
            full_body = self._concat_pdf_text(pdf_path)
            vs_key = vs if vs in {"abstract", "method", "ending", "full", "introduction", "experiment", "conclusion"} else "full"
            extracted_scope_key = vs_key
            chunk, extract_note = self._extract_scope_from_full_text(full_body, vs_key)
            extraction_note = extract_note
            if not chunk.strip():
                return {
                    "summary": "无法从 PDF 截取所选范围的文本。",
                    "issues": [
                        self._validation_issue(
                            "structure",
                            "high",
                            extract_note or "章节边界识别失败。",
                            "尝试「全文」校验或检查 PDF 是否为可复制文本。",
                            "",
                        )
                    ],
                    "high_risk_count": 1,
                    "can_export": False,
                    "next_action": "换用全文或修正 PDF。",
                    "extraction_note": extraction_note,
                    "validate_scope": vs_key,
                    "llm_review_used": False,
                    "validated_text": "",
                }
            normalized = chunk.strip()
            rule_section = self.map_validate_scope_to_rule_section(vs_key)

        ref_snippets = ""
        if refs:
            focus_name = Path(focus).name if focus else ""
            refs = [r for r in refs if r != focus_name]
            ref_snippets = self._gather_validate_reference_snippets(normalized, refs)

        rule_issues = self._rule_validate_section(rule_section, extracted_scope_key, normalized)
        llm_issues: list[dict[str, str]] = []
        llm_used = False
        if use_llm_review:
            llm_issues, llm_used = self._llm_validate_section(
                extracted_scope_key,
                rule_section,
                normalized,
                ref_snippets,
            )

        merged = rule_issues + llm_issues
        summary_tail = f"（含模型审稿）" if llm_used else "（规则检查）"
        return {
            "summary": f"{rule_section} / {extracted_scope_key} 共识别 {len(merged)} 条意见{summary_tail}。",
            "issues": merged,
            "high_risk_count": len([i for i in merged if str(i.get("severity", "")).lower() == "high"]),
            "can_export": not any(str(i.get("severity", "")).lower() == "high" for i in merged),
            "next_action": "优先处理 high 级别问题，再结合参考文献核对论断。",
            "extraction_note": extraction_note,
            "validate_scope": extracted_scope_key,
            "llm_review_used": llm_used,
            "validated_text": normalized[:12000],
        }

    def rewrite_paragraph(self, section: str, text: str, focus: str = "", forbidden_claims: list[str] | None = None) -> dict[str, object]:
        self._record_metric("writing_rewrite_requests")
        fallback = self._fallback_rewrite(section, text, focus)
        if not self._has_text_model():
            return {**fallback, **self._error_meta("CONFIG_MISSING", degraded=True, retryable=False)}
        forbidden_claims = [item.strip() for item in (forbidden_claims or []) if item and item.strip()]
        forbidden_text = "；".join(forbidden_claims) if forbidden_claims else "无"
        prompt = (
            "你是 Sci-Copilot 的写作代理，请把用户段落重写成投稿论文风格。"
            "输出严格 JSON（不要 markdown 代码块），字段：rewritten_text(str), notes(list[str])。\n\n"
            f"章节：{section}\n"
            f"改写重点：{focus or '增强学术表达、补充可验证描述'}\n"
            f"禁止断言：{forbidden_text}\n"
            f"原文：{text[:1800]}\n"
        )
        response, provider, model_name, attempts = self._generate_text_with_fallback(settings.analysis_model, prompt)
        if response is not None:
            payload = self._parse_json_object((response.text or "").strip())
            rewritten_text = str(payload.get("rewritten_text", "")).strip()
            notes = payload.get("notes", [])
            if rewritten_text:
                if not isinstance(notes, list):
                    notes = []
                return {
                    "rewritten_text": rewritten_text,
                    "notes": [str(item) for item in notes[:4]],
                    "model_provider": provider,
                    "model_name": model_name,
                    "fallback_chain": attempts,
                    **self._ok_meta(),
                }
        meta = self._classify_error(self.model_error, degraded=True)
        meta["model_provider"] = ""
        meta["model_name"] = ""
        meta["fallback_chain"] = self.last_routing_trace.get("attempts", [])
        return {**fallback, **meta}

    def generate_diagram(
        self,
        prompt: str,
        style: str = "academic",
        detail_level: str = "medium",
        language: str = "zh",
        width: int | None = None,
        height: int | None = None,
        feedback: list[str] | None = None,
    ) -> tuple[str, str | None, dict[str, object]]:
        self._record_metric("diagram_requests")
        # 先启发式生成可用 Mermaid，再尝试模型增强，最后再做语法兜底
        feedback = feedback or []
        structured = self._structure_generation_prompt(prompt, style, detail_level, language, feedback)
        visual_context = self._visual_context(prompt)
        heuristic_mermaid = self._prompt_to_mermaid(structured["prompt_text"], visual_context)
        generated_mermaid = self._generate_mermaid(
            structured["prompt_text"],
            visual_context,
            style=style,
            detail_level=detail_level,
            language=language,
        )
        mermaid_code = heuristic_mermaid or generated_mermaid
        mermaid_code = self._normalize_mermaid(mermaid_code)
        if not self._is_valid_mermaid(mermaid_code) or not self._diagram_matches_requirements(mermaid_code, structured["must_have"]):
            retry_prompt = self._retry_prompt_text(structured["prompt_text"], structured["must_have"])
            retried_mermaid = self._generate_mermaid(
                retry_prompt,
                visual_context,
                style=style,
                detail_level=detail_level,
                language=language,
            )
            if retried_mermaid:
                mermaid_code = self._normalize_mermaid(retried_mermaid)
        if not self._is_valid_mermaid(mermaid_code):
            mermaid_code = heuristic_mermaid or self._fallback_mermaid(prompt, visual_context)
            mermaid_code = self._normalize_mermaid(mermaid_code)
        image_path = self._render_mermaid(mermaid_code, width=width, height=height)
        image_url = f"/generated/{image_path.name}" if image_path else None
        degraded = not bool(image_url)
        meta = self._ok_meta()
        if degraded:
            meta = self._error_meta("RENDERER_UNAVAILABLE", degraded=True, retryable=False)
        meta["model_provider"] = str(self.last_routing_trace.get("active_provider", ""))
        meta["model_name"] = str(self.last_routing_trace.get("active_model", ""))
        meta["fallback_chain"] = self.last_routing_trace.get("attempts", [])
        self._record_generation(
            task_type="diagram",
            prompt=prompt,
            params={
                "style": style,
                "detail_level": detail_level,
                "language": language,
                "feedback": feedback,
                "width": width,
                "height": height,
            },
            output_url=image_url,
        )
        self.last_error_payload = meta
        if image_url:
            self.last_success_at = int(time.time())
        return mermaid_code, image_url, meta

    def generate_figure(
        self,
        prompt: str,
        template_type: str = "method_framework",
        style: str = "academic",
        detail_level: str = "medium",
        language: str = "zh",
        width: int | None = None,
        height: int | None = None,
        feedback: list[str] | None = None,
    ) -> dict[str, object]:
        self._record_metric("figure_requests")
        # ?????? IMG?????? Codex/OpenAI-compatible API????? GLM?
        feedback = feedback or []
        structured = self._structure_generation_prompt(prompt, style, detail_level, language, feedback)
        if not self._build_figure_candidates():
            self.last_routing_trace = {
                "task": "figure",
                "attempts": [],
                "active_provider": "",
                "active_model": "",
                "fallback_reason": "no available figure provider",
            }
            return self._figure_fallback_result(
                prompt=prompt,
                template_type=template_type,
                style=style,
                detail_level=detail_level,
                language=language,
                visual_context=self._visual_context(prompt, limit=5),
                error_meta=self._error_meta("FIGURE_PROVIDER_UNAVAILABLE", degraded=True, retryable=True),
            )

        visual_context = self._visual_context(prompt, limit=5)
        context_text = "\n\n".join(item["text"] for item in visual_context["excerpts"])

        try:
            enriched_prompt = self._build_figure_prompt(
                structured["prompt_text"],
                context_text=context_text,
                template_type=template_type,
                style=style,
                detail_level=detail_level,
                language=language,
            )

            figure_model_name = ""
            task_id = f"ai_fig_{uuid.uuid4().hex[:8]}"
            local_filename = f"{task_id}.png"
            local_path = self.figure_dir / local_filename
            image_url = ""
            active_provider = ""
            provider_errors: list[str] = []
            routing_attempts: list[dict[str, str]] = []
            self._last_img_attempt_meta = {"protocol": "", "endpoint": "", "auth_mode": ""}
            for candidate_provider, candidate_model in self._build_figure_candidates():
                try:
                    image_bytes, _ = self._run_figure_candidate(candidate_provider, candidate_model, enriched_prompt)
                    try:
                        local_path.parent.mkdir(parents=True, exist_ok=True)
                        local_path.write_bytes(image_bytes)
                        image_url = f"/generated/{local_filename}"
                    except OSError:
                        image_url = ""
                    figure_model_name = candidate_model
                    active_provider = candidate_provider
                    attempt_meta = (
                        dict(self._last_img_attempt_meta)
                        if candidate_provider == "img"
                        else {"protocol": "", "endpoint": "", "auth_mode": ""}
                    )
                    routing_attempts.append(
                        {
                            "provider": candidate_provider,
                            "model": candidate_model,
                            "status": "ok",
                            "error": "",
                            "protocol": str(attempt_meta.get("protocol", "")),
                            "endpoint": str(attempt_meta.get("endpoint", "")),
                            "auth_mode": str(attempt_meta.get("auth_mode", "")),
                        }
                    )
                    break
                except Exception as exc:
                    provider_errors.append(f"{candidate_provider}[{candidate_model}] {exc}")
                    attempt_meta = (
                        dict(self._last_img_attempt_meta)
                        if candidate_provider == "img"
                        else {"protocol": "", "endpoint": "", "auth_mode": ""}
                    )
                    routing_attempts.append(
                        {
                            "provider": candidate_provider,
                            "model": candidate_model,
                            "status": "error",
                            "error": str(exc),
                            "protocol": str(attempt_meta.get("protocol", "")),
                            "endpoint": str(attempt_meta.get("endpoint", "")),
                            "auth_mode": str(attempt_meta.get("auth_mode", "")),
                        }
                    )

            if not active_provider:
                raise RuntimeError(" | ".join(provider_errors) or "no available figure provider")

            if not self._figure_matches_requirements(structured["must_have"], template_type):
                retry_prompt = self._retry_prompt_text(enriched_prompt, structured["must_have"])
                if active_provider == "img":
                    retry_bytes, _ = self._generate_image_img(figure_model_name, retry_prompt)
                    try:
                        local_path.write_bytes(retry_bytes)
                        image_url = f"/generated/{local_filename}"
                    except OSError:
                        image_url = ""
                elif active_provider == "codex":
                    retry_bytes, _ = self._generate_image_codex(figure_model_name, retry_prompt)
                    try:
                        local_path.write_bytes(retry_bytes)
                        image_url = f"/generated/{local_filename}"
                    except OSError:
                        image_url = ""
                elif active_provider == "glm" and self.glm_client:
                    retry_bytes, _ = self._run_figure_candidate(active_provider, figure_model_name, retry_prompt)
                    try:
                        local_path.write_bytes(retry_bytes)
                        image_url = f"/generated/{local_filename}"
                    except OSError:
                        image_url = ""

            result = {
                "title": self._figure_template_title(template_type, prompt),
                "image_url": image_url,
                "caption": self._figure_template_caption(template_type, prompt, visual_context["sources"]),
                "figure_type": template_type,
                "sources": visual_context["sources"],
                "model_provider": active_provider,
                "model_name": figure_model_name,
                "fallback_chain": routing_attempts,
                "error_code": "",
                "error_hint": "",
                "retryable": False,
                "degraded": False,
            }
            self.last_routing_trace = {
                "task": "figure",
                "attempts": routing_attempts,
                "active_provider": active_provider,
                "active_model": figure_model_name,
                "fallback_reason": "",
            }
            self.last_generation_error = ""
            self.last_error_payload = self._ok_meta()
            self.last_success_at = int(time.time())
            self._record_generation(
                task_type="figure",
                prompt=prompt,
                params={
                    "style": style,
                    "detail_level": detail_level,
                    "language": language,
                    "template_type": template_type,
                    "feedback": feedback,
                    "width": width,
                    "height": height,
                    "provider": active_provider,
                    "model": figure_model_name,
                },
                output_url=result["image_url"],
            )
            return result
        except Exception as e:
            self.model_error = str(e)
            self.last_generation_error = str(e)
            meta = self._classify_error(e, degraded=True)
            meta["fallback_chain"] = self.last_routing_trace.get("attempts", [])
            self.last_error_payload = meta
            self.last_routing_trace = {
                "task": "figure",
                "attempts": self.last_routing_trace.get("attempts", []),
                "active_provider": "",
                "active_model": "",
                "fallback_reason": str(e),
            }
            return self._figure_fallback_result(
                prompt=prompt,
                template_type=template_type,
                style=style,
                detail_level=detail_level,
                language=language,
                visual_context=visual_context,
                error_meta=meta,
            )

    def audit_figure(

        self,
        image_url: str,
        prompt: str,
        question: str = "",
        caption: str = "",
        title: str = "",
        figure_type: str = "",
        degraded: bool = False,
    ) -> dict[str, object]:
        issues: list[dict[str, str]] = []
        normalized_image_url = str(image_url or "").strip()
        normalized_prompt = str(prompt or "").strip()
        normalized_caption = str(caption or "").strip()
        normalized_title = str(title or "").strip()
        normalized_question = str(question or "").strip()

        if not normalized_image_url:
            issues.append(
                {
                    "code": "FIGURE_MISSING",
                    "severity": "high",
                    "message": "生成结果缺少 image_url，无法进入导出。",
                    "suggestion": "回滚到提示词生成环节并重试。",
                }
            )
        if degraded:
            issues.append(
                {
                    "code": "FIGURE_DEGRADED",
                    "severity": "medium",
                    "message": "配图步骤已降级，当前产物稳定性不足。",
                    "suggestion": "增加模板约束并重新生成配图。",
                }
            )
        if len(normalized_caption) < 12:
            issues.append(
                {
                    "code": "CAPTION_TOO_SHORT",
                    "severity": "medium",
                    "message": "图注过短，难以判断是否覆盖用户预期。",
                    "suggestion": "补充图注中目标流程、关键模块与输出关系。",
                }
            )

        prompt_terms = self._audit_prompt_terms(f"{normalized_prompt} {normalized_question}")
        text_surface = f"{normalized_title} {normalized_caption}".lower()
        missed_terms = [item for item in prompt_terms if item not in text_surface]
        if prompt_terms and len(missed_terms) >= max(2, len(prompt_terms) // 2):
            issues.append(
                {
                    "code": "LOW_PROMPT_ALIGNMENT",
                    "severity": "low",
                    "message": "图注/标题与请求关键词重合度较低，存在偏题风险。",
                    "suggestion": "在提示词中显式要求覆盖关键元素并指定布局关系。",
                }
            )

        recommended_feedback = ["elements", "layout"] if any(item["severity"] == "high" for item in issues) else []
        passed = len([item for item in issues if item["severity"] == "high"]) == 0
        return {
            "passed": passed,
            "summary": "配图审计通过，可继续后续步骤。" if passed else "配图审计未通过，已建议回滚提示词后重试。",
            "issues": issues,
            "recommended_feedback": recommended_feedback,
            "figure_type": figure_type,
            "error_code": "" if passed else "FIGURE_AUDIT_FAILED",
            "retryable": not passed,
            "degraded": not passed,
        }

    def generation_health(self) -> dict[str, object]:
        return {
            "history_count": len(self.generation_store.history),
            "last_generation_error": self.last_generation_error,
            "last_generation": self.generation_store.latest(),
            "last_success_at": self.last_success_at or 0,
        }

    def product_metrics(self) -> dict[str, int]:
        return self.metrics_store.snapshot()

    def retrieval_mode(self) -> str:
        if self._vector_store_enabled and self._vector_collection is not None:
            return "vector_semantic+keyword_fallback"
        if self._vector_store_enabled:
            return "vector_init_failed+keyword_fallback"
        return "keyword_chunk_match"

    def vector_store_available(self) -> bool:
        return bool(self._vector_store_enabled and self._vector_collection is not None)

    def list_documents(self) -> list[dict[str, object]]:
        self._sync_doc_state_with_files(persist=False)
        items: list[dict[str, object]] = []
        focus = self.get_focus_document()
        for file_path in sorted(self.data_dir.glob("*.pdf"), key=lambda item: item.stat().st_mtime, reverse=True):
            state = self._document_records().get(file_path.name, {})
            items.append(
                {
                    "source": file_path.name,
                    "updated_at": int(file_path.stat().st_mtime),
                    "ingested": bool(state.get("ingested", False)),
                    "is_focus": file_path.name == focus,
                }
            )
        return items

    def get_focus_document(self) -> str | None:
        focus = self.doc_state.get("focus_document")
        if isinstance(focus, str) and focus:
            return focus
        return None

    def set_focus_document(self, source: str) -> str:
        self._sync_doc_state_with_files(persist=False)
        records = self._document_records()
        if source not in records:
            raise FileNotFoundError(source)
        self.doc_state["focus_document"] = source
        self._save_doc_state()
        return source

    def figure_templates(self) -> list[dict[str, str]]:
        return [
            {
                "id": "method_framework",
                "name": "方法框架图",
                "description": "适合展示输入、核心模块与输出的整体方法结构。",
            },
            {
                "id": "experiment_flow",
                "name": "实验流程图",
                "description": "适合描述数据准备、训练、评估的实验流程。",
            },
            {
                "id": "comparison",
                "name": "对比图",
                "description": "适合展示模型/方法之间的结果对比。",
            },
            {
                "id": "ablation",
                "name": "消融说明图",
                "description": "适合呈现模块去除后的性能变化与贡献分析。",
            },
        ]

    def mmdc_available(self) -> bool:
        return self._resolve_mmdc_command() is not None

    def knowledge_base_ready(self) -> bool:
        return bool(self._ensure_collection())

    def _visual_context(self, prompt: str, limit: int = 5) -> dict[str, object]:
        records = self._ensure_collection()
        focus_source = self.get_focus_document()
        focus_records = (
            [item for item in records if str(item.get("source", "")) == focus_source]
            if focus_source
            else []
        )
        # If a focus paper is selected, visual generation should default to that paper.
        use_kb = self._should_use_knowledge_for_visual(prompt) or bool(focus_records)
        excerpts = self._query_context(prompt, limit=limit) if use_kb else []
        if use_kb and not excerpts and focus_records:
            excerpts = self._fallback_focus_chunks(focus_records, limit=limit)
            self.last_retrieval_source = "fallback"
        sources = self._unique_sources(excerpts)
        return {"use_kb": use_kb, "excerpts": excerpts, "sources": sources}

    def _query_context(self, question: str, limit: int = 4) -> list[dict[str, object]]:
        records = self._ensure_collection()
        if not records:
            self.last_retrieval_source = "none"
            return []

        explicit_source = self._match_explicit_source(question, records)
        active_focus = explicit_source or self.get_focus_document()
        scoped_records = records
        if active_focus:
            scoped_records = [item for item in records if item.get("source") == active_focus]
            if not scoped_records:
                self.last_retrieval_source = "none"
                return []

        semantic_hits = self._query_semantic(question, limit=limit, source_filter=active_focus)
        if semantic_hits:
            self.last_retrieval_source = "vector"
            return semantic_hits

        ranked = self._rank_records(question, scoped_records, limit=limit)
        if ranked:
            self.last_retrieval_source = "keyword"
            return [
                {
                    "source": str(item["source"]),
                    "text": str(item["text"])[:520],
                    "page": int(item["page"]) if isinstance(item.get("page"), int) else None,
                    "chunk_id": str(item.get("id", "")),
                }
                for item in ranked
            ]

        if active_focus:
            fallback = self._fallback_focus_chunks(scoped_records, limit=limit)
            if fallback:
                self.last_retrieval_source = "fallback"
                return fallback

        if active_focus:
            self.last_retrieval_source = "none"
            return []

        if self._looks_like_document_question(question):
            latest_source = self._latest_source(records)
            if latest_source:
                fallback = [item for item in records if item.get("source") == latest_source][: min(limit, 3)]
                self.last_retrieval_source = "fallback"
                return [
                    {
                        "source": str(item["source"]),
                        "text": str(item["text"])[:520],
                        "page": int(item["page"]) if isinstance(item.get("page"), int) else None,
                        "chunk_id": str(item.get("id", "")),
                    }
                    for item in fallback
                ]

        self.last_retrieval_source = "none"
        return []

    def _is_focus_task_question(self, question: str) -> bool:
        lowered = question.lower()
        patterns = (
            "??", "??", "??", "???", "??", "??", "??", "??", "??", "??",
            "summarize", "summary", "method", "workflow", "experiment", "result", "conclusion",
        )
        return any(pattern in question or pattern in lowered for pattern in patterns)

    def _fallback_focus_chunks(self, scoped_records: list[dict[str, object]], limit: int = 4) -> list[dict[str, object]]:
        if not scoped_records:
            return []

        sorted_records = sorted(
            scoped_records,
            key=lambda item: (
                int(item.get("page", 0)) if isinstance(item.get("page"), int) else 0,
                str(item.get("id", "")),
            ),
        )
        selected = sorted_records[: max(1, min(limit, 4))]
        return [
            {
                "source": str(item["source"]),
                "text": str(item["text"])[:520],
                "page": int(item["page"]) if isinstance(item.get("page"), int) else None,
                "chunk_id": str(item.get("id", "")),
            }
            for item in selected
        ]

    def _init_vector_store(self) -> None:
        if not self._vector_store_enabled:
            return
        try:
            client = chromadb.PersistentClient(path=str(self.chroma_dir))
            embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=settings.embeddings_model)
            self._vector_collection = client.get_or_create_collection(
                name=self._vector_collection_name,
                embedding_function=embedding_fn,
            )
            self.vector_error = ""
        except Exception as exc:
            self._vector_collection = None
            self.vector_error = f"向量检索初始化失败：{exc}"

    def _sync_vector_store(self, records: list[dict[str, object]]) -> None:
        if not self._vector_store_enabled or self._vector_collection is None:
            return
        try:
            self._vector_collection.upsert(
                ids=[str(item["id"]) for item in records],
                documents=[str(item["text"]) for item in records],
                metadatas=[
                    {
                        "source": str(item.get("source", "")),
                        "page": int(item.get("page", 0)) if isinstance(item.get("page"), int) else 0,
                        "chunk_id": str(item.get("id", "")),
                    }
                    for item in records
                ],
            )
            self.vector_error = ""
        except Exception as exc:
            self.vector_error = f"向量索引写入失败：{exc}"

    def _query_semantic(self, question: str, limit: int = 4, source_filter: str | None = None) -> list[dict[str, object]]:
        if not self._vector_store_enabled or self._vector_collection is None:
            return []
        try:
            result = self._vector_collection.query(query_texts=[question], n_results=max(limit * 5, 12))
        except Exception as exc:
            self.vector_error = f"???????{exc}"
            return []
        docs = result.get("documents", [[]])
        metas = result.get("metadatas", [[]])
        if not docs or not isinstance(docs[0], list):
            return []
        out: list[dict[str, object]] = []
        for idx, item_text in enumerate(docs[0]):
            meta = metas[0][idx] if metas and isinstance(metas[0], list) and idx < len(metas[0]) and isinstance(metas[0][idx], dict) else {}
            source = str(meta.get("source", ""))
            if source_filter and source != source_filter:
                continue
            page = meta.get("page")
            out.append(
                {
                    "source": source,
                    "text": str(item_text)[:520],
                    "page": int(page) if isinstance(page, int) and page > 0 else None,
                    "chunk_id": str(meta.get("chunk_id", "")),
                }
            )
            if len(out) >= limit:
                break
        return [item for item in out if item.get("text")]

    def _should_use_knowledge_for_visual(self, prompt: str) -> bool:
        records = self._ensure_collection()
        if not records:
            return False
        patterns = (
            "我上传的", "上传的文件", "上传的论文", "这篇文章", "这篇论文", "本文", "根据论文", "根据文件",
            "基于论文", "基于文件", "整体流程图", "论文配图", "方法图", "架构图",
        )
        return any(pattern in prompt for pattern in patterns) or self._resolve_focus_source(prompt, records) is not None

    def _match_explicit_source(self, text: str, records: list[dict[str, object]]) -> str | None:
        normalized = text.strip().lower()
        sources = list({item.get("source", "") for item in records if item.get("source")})
        for source in sources:
            source_lower = source.lower()
            source_stem = Path(source).stem.lower()
            if source_lower and source_lower in normalized:
                return source
            if source_stem and source_stem in normalized:
                return source
        return None

    def _resolve_focus_source(self, text: str, records: list[dict[str, object]]) -> str | None:
        explicit = self._match_explicit_source(text, records)
        if explicit:
            return explicit
        if self._looks_like_document_question(text):
            return self.get_focus_document() or self._latest_source(records)
        return None

    def _looks_like_document_question(self, text: str) -> bool:
        patterns = ("这篇文章", "这篇论文", "本文", "这篇", "总结这篇", "概括这篇", "我上传的", "上传的文件", "上传的论文")
        lowered = text.lower()
        return any(pattern in text for pattern in patterns) or (("summary" in lowered or "summarize" in lowered) and ("paper" in lowered or "article" in lowered))

    def _unique_sources(self, excerpts: list[dict[str, object]]) -> list[str]:
        seen: list[str] = []
        for item in excerpts:
            source = item.get("source")
            if source and source not in seen:
                seen.append(source)
        return seen

    def _latest_source(self, records: list[dict[str, object]]) -> str | None:
        pdf_paths = sorted(self.data_dir.glob("*.pdf"), key=lambda path: path.stat().st_mtime, reverse=True)
        available_sources = {item.get("source") for item in records}
        for path in pdf_paths:
            if path.name in available_sources:
                return path.name
        return records[0].get("source") if records else None

    def _is_low_quality_answer(self, text: str) -> bool:
        normalized = text.strip()
        if not normalized:
            return True
        return any(pattern in normalized for pattern in ("请提供问题", "请补充问题", "我将根据", "请补充上下文", "我无法确定"))

    def _fallback_summary(self, question: str, excerpts: list[dict[str, object]]) -> str:
        if not excerpts:
            return ""
        source = excerpts[0].get("source", "当前文献")
        lead = excerpts[0].get("text", "")
        tail = excerpts[1].get("text", "") if len(excerpts) > 1 else ""
        if self._looks_like_document_question(question):
            return (
                f"《{source}》的核心内容可以先概括为三点：\n"
                f"1. 研究关注的问题集中在：{lead[:120]}\n"
                f"2. 方法或流程的关键信息包括：{tail[:120] or lead[120:240]}\n"
                "3. 如果你愿意，我可以继续把它整理成‘研究目标 / 方法 / 结果 / 结论’的论文摘要格式。"
            )
        return f"我先基于《{source}》里命中的片段回答你：\n{lead[:220]}"

    def _generate_mermaid(
        self,
        prompt: str,
        visual_context: dict[str, object],
        style: str = "academic",
        detail_level: str = "medium",
        language: str = "zh",
    ) -> str:
        if not self._has_text_model():
            return self._fallback_mermaid(prompt, visual_context)

        context_text = "\n\n".join(item["text"] for item in visual_context["excerpts"]) if visual_context["excerpts"] else ""
        context_instruction = "请优先基于文献片段抽取方法步骤、实验流程或系统流程，再输出 Mermaid 流程图。" if visual_context["use_kb"] else "请根据请求直接生成一张清晰的 Mermaid 流程图。"
        prompt_text = (
            "你是论文流程图助手。只输出合法 Mermaid flowchart 语法，不要输出 Markdown 代码块。\n"
            f"{self._diagram_style_instruction(style, detail_level, language)}\n"
            f"{context_instruction}\n\n"
        )
        if context_text:
            prompt_text += f"文献片段：\n{context_text}\n\n"
        prompt_text += f"绘图需求：{prompt}"

        response, provider, model_name, attempts = self._generate_text_with_fallback(settings.diagram_model, prompt_text)
        if response is not None:
            cleaned = self._sanitize_mermaid((response.text or "").strip())
            if cleaned and self._is_valid_mermaid(self._normalize_mermaid(cleaned)):
                self.model_error = ""
                self.last_generation_error = ""
                self.last_routing_trace = {
                    "task": "diagram",
                    "attempts": attempts,
                    "active_provider": provider,
                    "active_model": model_name,
                    "fallback_reason": "",
                }
                return cleaned
        if self.model_error:
            self.last_generation_error = self.model_error
        self.last_routing_trace = {
            "task": "diagram",
            "attempts": self.last_routing_trace.get("attempts", []),
            "active_provider": "",
            "active_model": "",
            "fallback_reason": self.model_error,
        }
        return self._fallback_mermaid(prompt, visual_context)

    def _prompt_to_mermaid(self, prompt: str, visual_context: dict[str, object]) -> str:
        separators = ("->", "=>", "→", "然后", "接着")
        if any(separator in prompt for separator in separators):
            parts = re.split(r"\s*(?:->|=>|→|然后|接着)\s*", prompt)
            steps = [part.strip(" -\n\t") for part in parts if part.strip(" -\n\t")]
            if len(steps) >= 2:
                return self._steps_to_mermaid(steps)
        if bool(visual_context.get("use_kb")):
            steps = self._extract_steps_from_excerpts(visual_context["excerpts"])
            if len(steps) >= 2:
                return self._steps_to_mermaid(steps)
        return ""

    def _extract_steps_from_excerpts(self, excerpts: list[dict[str, object]]) -> list[str]:
        text = " ".join(item.get("text", "") for item in excerpts)
        candidates = re.split(r"[；;。.!?\n]", text)
        keywords = (
            "collect", "prepare", "extract", "analy", "measure", "evaluate", "store", "test",
            "采集", "制备", "提取", "分析", "评估", "训练", "推理", "验证", "比较", "输入", "输出",
        )
        steps: list[str] = []
        for candidate in candidates:
            sentence = re.sub(r"\s+", " ", candidate).strip()
            if len(sentence) < 8:
                continue
            lowered = sentence.lower()
            if not any(keyword in lowered or keyword in sentence for keyword in keywords):
                continue
            steps.append(sentence[:28])
            if len(steps) >= 6:
                break
        return steps

    def _steps_to_mermaid(self, steps: list[str]) -> str:
        lines = ["flowchart TD"]
        node_names: list[str] = []
        for index, step in enumerate(steps):
            prefix = chr(ord("A") + (index % 26))
            suffix = index // 26
            node_name = f"{prefix}{suffix}" if suffix else prefix
            node_names.append(node_name)
            lines.append(f'    {node_name}["{step.replace(chr(34), chr(39))}"]')
        for current, nxt in zip(node_names, node_names[1:]):
            lines.append(f"    {current} --> {nxt}")
        return "\n".join(lines)

    def _normalize_mermaid(self, mermaid_code: str) -> str:
        text = self._sanitize_mermaid(mermaid_code)
        text = text.replace("graph TD", "flowchart TD").replace("graph LR", "flowchart LR")
        if not text.startswith(("flowchart ", "graph ")):
            text = f"flowchart TD\n{text}"
        lines = [re.sub(r"\s+", " ", raw.strip()) for raw in text.splitlines() if raw.strip()]
        return "\n".join(lines) or self._fallback_mermaid("研究流程", {"use_kb": False, "sources": []})

    def _fallback_mermaid(self, prompt: str, visual_context: dict[str, object]) -> str:
        if visual_context.get("use_kb"):
            label = visual_context["sources"][0] if visual_context["sources"] else "上传文献"
            return "flowchart TD\n    A[\"读取 %s\"] --> B[\"提取方法与实验步骤\"]\n    B --> C[\"整理关键流程节点\"]\n    C --> D[\"生成整体流程图\"]" % label
        label = prompt.strip().replace('"', "'")[:24] or "研究流程"
        return "flowchart TD\n    A[\"%s\"] --> B[\"明确任务\"]\n    B --> C[\"整理输入\"]\n    C --> D[\"执行核心处理\"]\n    D --> E[\"得到结果\"]" % label

    def _render_svg_spec(self, prompt: str, visual_context: dict[str, object]) -> dict[str, object]:
        figure_type = self._select_figure_type(prompt)
        labels = self._extract_visual_labels(prompt, visual_context["excerpts"], max_items=6)
        title = self._figure_title(prompt, visual_context["sources"], figure_type)
        caption = self._figure_caption(visual_context["sources"], figure_type)

        if figure_type == "comparison":
            columns = labels[:3] or ["研究对象", "核心方法", "结果表现"]
            details = self._extract_support_points(visual_context["excerpts"], count=6)
            return {"figure_type": figure_type, "title": title, "caption": caption, "columns": columns, "details": details}
        if figure_type == "cycle":
            center = labels[0] if labels else "研究主题"
            satellites = labels[1:6] or ["数据准备", "特征建模", "训练优化", "评估分析"]
            return {"figure_type": figure_type, "title": title, "caption": caption, "center": center, "satellites": satellites}
        if figure_type == "architecture":
            nodes = labels[:5] or ["输入数据", "特征提取", "核心模块", "任务头", "结果输出"]
            return {"figure_type": figure_type, "title": title, "caption": caption, "nodes": nodes}
        nodes = labels[:6] or ["问题定义", "数据准备", "模型构建", "训练优化", "评估分析", "结果输出"]
        return {"figure_type": "pipeline", "title": title, "caption": caption, "nodes": nodes}

    def _select_figure_type(self, prompt: str) -> str:
        lowered = prompt.lower()
        if any(keyword in prompt for keyword in ("对比图", "比较图", "比较", "差异")):
            return "comparison"
        if any(keyword in prompt for keyword in ("循环", "闭环", "反馈")):
            return "cycle"
        if any(keyword in prompt for keyword in ("架构图", "框架图", "模块图", "系统图")):
            return "architecture"
        if any(keyword in prompt for keyword in ("流程图", "步骤图", "pipeline", "workflow")):
            return "pipeline"
        if any(keyword in lowered for keyword in ("transformer", "cnn", "bert")):
            return "architecture"
        return "pipeline"

    def _extract_visual_labels(self, prompt: str, excerpts: list[dict[str, object]], max_items: int = 6) -> list[str]:
        labels: list[str] = []
        for part in re.split(r"[，,；;。:\n]", prompt):
            part = re.sub(r"\s+", " ", part).strip(" -")
            if 2 <= len(part) <= 18 and part not in labels and "上传" not in part and "画" not in part:
                labels.append(part)
        for sentence in self._extract_support_points(excerpts, count=max_items * 2):
            if 4 <= len(sentence) <= 18 and sentence not in labels:
                labels.append(sentence)
            if len(labels) >= max_items:
                break
        if len(labels) < max_items:
            source = excerpts[0]["source"].rsplit(".", 1)[0] if excerpts else ""
            if source and source not in labels:
                labels.insert(0, source[:18])
        return labels[:max_items]

    def _extract_support_points(self, excerpts: list[dict[str, object]], count: int = 6) -> list[str]:
        text = " ".join(item.get("text", "") for item in excerpts)
        sentences = []
        for item in re.split(r"[；;。.!?\n]", text):
            cleaned = re.sub(r"\s+", " ", item).strip()
            if 8 <= len(cleaned) <= 34:
                sentences.append(cleaned)
            if len(sentences) >= count:
                break
        return sentences

    def _figure_title(self, prompt: str, sources: list[str], figure_type: str) -> str:
        if sources:
            stem = Path(sources[0]).stem
            suffix = {"pipeline": "方法流程图", "architecture": "方法框架图", "comparison": "实验对比图", "cycle": "研究闭环图"}[figure_type]
            return f"{stem} {suffix}"
        short_prompt = re.sub(r"\s+", " ", prompt).strip()
        return short_prompt[:24] or "论文配图"

    def _figure_caption(self, sources: list[str], figure_type: str) -> str:
        labels = {"pipeline": "流程图", "architecture": "框架图", "comparison": "对比图", "cycle": "闭环图"}
        if sources:
            return f"基于《{sources[0]}》抽取的{labels[figure_type]}，可作为论文插图初稿继续微调。"
        return f"根据需求生成的{labels[figure_type]}，可作为论文配图或汇报图示的初稿。"

    def _render_svg(self, spec: dict[str, object]) -> str:
        figure_type = str(spec["figure_type"])
        if figure_type == "comparison":
            return self._render_comparison_svg(spec)
        if figure_type == "cycle":
            return self._render_cycle_svg(spec)
        if figure_type == "architecture":
            return self._render_architecture_svg(spec)
        return self._render_pipeline_svg(spec)

    def _render_pipeline_svg(self, spec: dict[str, object]) -> str:
        nodes = [str(node)[:20] for node in spec.get("nodes", [])][:6]
        width, height = 1280, 680
        box_w, box_h, gap = 170, 92, 28
        total_w = len(nodes) * box_w + max(0, len(nodes) - 1) * gap
        start_x, y = (width - total_w) / 2, 290
        cards, arrows = [], []
        for index, node in enumerate(nodes):
            x = start_x + index * (box_w + gap)
            cards.append(self._svg_card(x, y, box_w, box_h, node, f"{index + 1:02d}"))
            if index < len(nodes) - 1:
                arrows.append(self._svg_arrow(x + box_w, y + box_h / 2, x + box_w + gap, y + box_h / 2))
        return self._wrap_svg(spec["title"], spec["caption"], "\n".join(cards + arrows), width, height)

    def _render_architecture_svg(self, spec: dict[str, object]) -> str:
        nodes = [str(node)[:20] for node in spec.get("nodes", [])][:5]
        defaults = ["输入数据", "特征提取", "核心模块", "任务头", "结果输出"]
        while len(nodes) < 5:
            nodes.append(defaults[len(nodes)])
        width, height = 1280, 760
        cards = [
            self._svg_card(90, 280, 180, 100, nodes[0], "Input"),
            self._svg_card(340, 180, 210, 90, nodes[1], "Stage 1"),
            self._svg_card(340, 310, 210, 90, nodes[2], "Core"),
            self._svg_card(340, 440, 210, 90, nodes[3], "Stage 2"),
            self._svg_card(880, 280, 220, 100, nodes[4], "Output"),
        ]
        bridge = [
            '<rect x="620" y="200" width="180" height="320" rx="28" fill="rgba(138,125,255,0.12)" stroke="rgba(184,247,255,0.16)" />',
            f'<text x="710" y="270" text-anchor="middle" fill="#b8f7ff" font-size="24" font-weight="700">{self._escape(spec["title"])}</text>',
            self._svg_multiline_text("研究主干 / 方法核心", 710, 332, 18, "#dbeaff"),
            self._svg_arrow(270, 330, 340, 225), self._svg_arrow(270, 330, 340, 355), self._svg_arrow(270, 330, 340, 485),
            self._svg_arrow(550, 225, 620, 250), self._svg_arrow(550, 355, 620, 355), self._svg_arrow(550, 485, 620, 460), self._svg_arrow(800, 355, 880, 330),
        ]
        return self._wrap_svg(spec["title"], spec["caption"], "\n".join(cards + bridge), width, height)

    def _render_comparison_svg(self, spec: dict[str, object]) -> str:
        columns = [str(item)[:18] for item in spec.get("columns", [])][:3]
        defaults = ["研究对象", "方法设计", "结果表现"]
        while len(columns) < 3:
            columns.append(defaults[len(columns)])
        details = [str(item)[:26] for item in spec.get("details", [])][:6]
        width, height, column_w, start_x = 1280, 760, 300, 120
        cards = []
        for index, column in enumerate(columns):
            x = start_x + index * 340
            cards.append(f'<rect x="{x}" y="210" width="{column_w}" height="380" rx="28" fill="rgba(10,23,44,0.84)" stroke="rgba(184,247,255,0.12)" />')
            cards.append(f'<text x="{x + column_w / 2}" y="270" text-anchor="middle" fill="#b8f7ff" font-size="26" font-weight="700">{self._escape(column)}</text>')
            bullet_text = "\n".join(details[index * 2:index * 2 + 2]) or "待补充细节"
            cards.append(self._svg_multiline_text(bullet_text, x + column_w / 2, 360, 18, "#dbeaff"))
        return self._wrap_svg(spec["title"], spec["caption"], "\n".join(cards), width, height)

    def _render_cycle_svg(self, spec: dict[str, object]) -> str:
        center = str(spec.get("center", "研究主题"))[:20]
        satellites = [str(item)[:18] for item in spec.get("satellites", [])][:5]
        width, height, cx, cy, radius = 1280, 760, 640, 390, 210
        parts = [
            f'<circle cx="{cx}" cy="{cy}" r="116" fill="rgba(138,125,255,0.16)" stroke="rgba(184,247,255,0.18)" />',
            f'<text x="{cx}" y="{cy - 8}" text-anchor="middle" fill="#b8f7ff" font-size="28" font-weight="700">{self._escape(center)}</text>',
            self._svg_multiline_text("研究主轴", cx, cy + 34, 18, "#dbeaff"),
        ]
        for index, label in enumerate(satellites):
            angle = (math.pi * 2 / max(1, len(satellites))) * index - math.pi / 2
            x = cx + math.cos(angle) * radius
            y = cy + math.sin(angle) * radius
            parts.append(f'<circle cx="{x}" cy="{y}" r="76" fill="rgba(10,23,44,0.9)" stroke="rgba(184,247,255,0.12)" />')
            parts.append(self._svg_arrow(cx, cy, x, y))
            parts.append(self._svg_multiline_text(label, x, y + 6, 18, "#edf6ff"))
        return self._wrap_svg(spec["title"], spec["caption"], "\n".join(parts), width, height)

    def _wrap_svg(self, title: str, caption: str, content: str, width: int, height: int) -> str:
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
            '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#071428" /><stop offset="100%" stop-color="#0d1f37" /></linearGradient><linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#77dfff" /><stop offset="100%" stop-color="#ffd089" /></linearGradient><marker id="arrow" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9fefff" /></marker></defs>'
            f'<rect width="{width}" height="{height}" rx="36" fill="url(#bg)" />'
            f'<rect x="26" y="26" width="{width - 52}" height="{height - 52}" rx="28" fill="none" stroke="rgba(184,247,255,0.12)" />'
            f'<text x="{width / 2}" y="92" text-anchor="middle" fill="#edf6ff" font-size="34" font-weight="700">{self._escape(title)}</text>'
            f'<text x="{width / 2}" y="132" text-anchor="middle" fill="#8fa2c8" font-size="18">{self._escape(caption)}</text>'
            f'{content}</svg>'
        )

    def _svg_card(self, x: float, y: float, w: float, h: float, title: str, tag: str) -> str:
        return (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="26" fill="rgba(10,23,44,0.84)" stroke="rgba(184,247,255,0.12)" />'
            f'<text x="{x + 18}" y="{y + 24}" fill="#8fa2c8" font-size="13" letter-spacing="1.2">{self._escape(tag)}</text>'
            f'<text x="{x + w / 2}" y="{y + 52}" text-anchor="middle" fill="#edf6ff" font-size="24" font-weight="700">{self._escape(title)}</text>'
            f'<text x="{x + w / 2}" y="{y + 78}" text-anchor="middle" fill="#77dfff" font-size="14">Paper Figure Block</text>'
        )

    def _svg_arrow(self, x1: float, y1: float, x2: float, y2: float) -> str:
        return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="url(#stroke)" stroke-width="4" marker-end="url(#arrow)" />'

    def _svg_multiline_text(self, text: str, x: float, y: float, font_size: int, color: str) -> str:
        parts = [self._escape(part[:18]) for part in re.split(r"[，,；;\n]", text) if part.strip()][:3] or [self._escape(text[:18])]
        tspans = "".join(f'<tspan x="{x}" dy="{0 if index == 0 else font_size + 6}">{part}</tspan>' for index, part in enumerate(parts))
        return f'<text x="{x}" y="{y}" text-anchor="middle" fill="{color}" font-size="{font_size}">{tspans}</text>'

    def _escape(self, text: str) -> str:
        return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

    def _ensure_collection(self) -> list[dict[str, object]]:
        if self.local_index:
            if self._vector_store_enabled and self._vector_collection is not None:
                self._sync_vector_store(self.local_index)
            if not self._vector_store_enabled or self._vector_collection is not None:
                self.vector_error = ""
            return self.local_index
        self._load_local_index()
        if self.local_index:
            if self._vector_store_enabled and self._vector_collection is not None:
                self._sync_vector_store(self.local_index)
            if not self._vector_store_enabled or self._vector_collection is not None:
                self.vector_error = ""
            return self.local_index
        self.vector_error = "知识库还没有建立，请先上传 PDF 并构建知识库。"
        return []

    def _render_mermaid(self, mermaid_code: str, width: int | None = None, height: int | None = None) -> Path | None:
        mmdc_command = self._resolve_mmdc_command()
        if not mmdc_command:
            return None
        task_id = f"diag_{uuid.uuid4().hex[:8]}"
        mmd_path = self.diagram_dir / f"{task_id}.mmd"
        png_path = self.diagram_dir / f"{task_id}.png"
        try:
            mmd_path.write_text(mermaid_code, encoding="utf-8")
            render_width = str(width or 1600)
            command = [*mmdc_command, "-i", str(mmd_path), "-o", str(png_path), "-t", "neutral", "-b", "transparent", "-s", "2", "-w", render_width]
            if height:
                command.extend(["-H", str(height)])
            result = subprocess.run(command, capture_output=True, text=True, check=False)
            return png_path if result.returncode == 0 and png_path.exists() else None
        except OSError:
            return None
        finally:
            if mmd_path.exists():
                os.remove(mmd_path)

    def _resolve_mmdc_command(self) -> list[str] | None:
        for candidate in ("mmdc.cmd", "mmdc", "mmdc.ps1"):
            resolved = shutil.which(candidate)
            if not resolved:
                continue
            if resolved.lower().endswith(".ps1"):
                return ["powershell", "-ExecutionPolicy", "Bypass", "-File", resolved]
            return [resolved]
        return None

    def _extract_pages(self, pdf_path: Path) -> list[tuple[int, str]]:
        text_parts: list[tuple[int, str]] = []
        with fitz.open(pdf_path) as document:
            for idx, page in enumerate(document):
                text_parts.append((idx + 1, page.get_text()))
        return text_parts

    def _load_local_index(self) -> None:
        if not self.local_index_path.exists():
            self.local_index = []
            return
        try:
            raw = json.loads(self.local_index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self.local_index = []
            return
        self.local_index = [
            item
            for item in raw
            if isinstance(item, dict) and item.get("id") and item.get("text") and item.get("source")
        ] if isinstance(raw, list) else []

    def _save_local_index(self, records: list[dict[str, object]]) -> None:
        temp_path = self.local_index_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_path.replace(self.local_index_path)

    def _normalize_chunk(self, chunk: str) -> str:
        return re.sub(r"\s+", " ", chunk).strip()[:4000]

    def _rank_records(self, question: str, records: list[dict[str, object]], limit: int = 4) -> list[dict[str, object]]:
        question_terms = self._tokenize(question)
        if not question_terms:
            return records[:limit]
        scored: list[tuple[int, int, dict[str, object]]] = []
        for item in records:
            text = str(item.get("text", ""))
            if not text:
                continue
            text_terms = self._tokenize(text)
            overlap = len(question_terms & text_terms)
            substring_hits = sum(1 for term in question_terms if len(term) > 1 and term in text)
            score = overlap * 4 + substring_hits
            if score > 0:
                scored.append((score, len(text), item))
        scored.sort(key=lambda row: (-row[0], row[1]))
        return [item for _, _, item in scored[:limit]]

    def _fallback_rewrite(self, section: str, text: str, focus: str) -> dict[str, object]:
        normalized = re.sub(r"\s+", " ", text).strip()
        prefix = f"本{section}段落经过学术化重写，重点为：{focus or '增强表达严谨性'}。"
        rewritten = f"{prefix}{normalized[:1000]}"
        return {
            "rewritten_text": rewritten,
            "notes": ["建议补充定量指标与引用标记。", "建议将长句拆分为方法与结果两部分。"],
        }

    def _load_metrics(self) -> None:
        self.metrics_store.load()

    def _record_metric(self, key: str) -> None:
        self.metrics_store.record(key)

    def _tokenize(self, text: str) -> set[str]:
        ascii_terms = {token.lower() for token in re.findall(r"[A-Za-z0-9_]{2,}", text)}
        chinese_terms = {token for token in re.findall(r"[\u4e00-\u9fff]{2,}", text)}
        return ascii_terms | chinese_terms

    def _sanitize_mermaid(self, mermaid_code: str) -> str:
        return mermaid_code.replace("```mermaid", "").replace("```", "").strip()

    def _audit_prompt_terms(self, text: str) -> list[str]:
        if not text:
            return []
        candidates = [term.strip().lower() for term in re.split(r"[，,；;。\n\s]+", text) if term.strip()]
        deduped: list[str] = []
        for term in candidates:
            if len(term) < 2:
                continue
            if term in {"figure", "diagram", "the", "and", "for", "with"}:
                continue
            if term not in deduped:
                deduped.append(term)
            if len(deduped) >= 6:
                break
        return deduped

    def _ok_meta(self) -> dict[str, object]:
        return {"error_code": "", "error_hint": "", "retryable": False, "degraded": False}

    def _error_meta(self, code: str, degraded: bool, retryable: bool) -> dict[str, object]:
        hints = {
            "MODEL_TIMEOUT": "模型响应超时，请稍后重试或切换更轻量模型。",
            "MODEL_NOT_FOUND": "当前模型不可用，请检查模型名称与权限配置。",
            "AUTH_ERROR": "模型密钥或权限异常，请检查 .env 配置。",
            "TEXT_PROVIDER_UNAVAILABLE": "文本模型暂不可用，系统已使用降级回答。请检查 CODEX/Google/OpenRouter key、模型权限和网络代理。",
            "FIGURE_PROVIDER_UNAVAILABLE": "Figure provider is unavailable. Returned a fallback figure. Check IMG/CODEX/GLM configuration and network access.",
            "CONFIG_MISSING": "缺少关键模型配置，请补充 .env 后重试。",
            "INSUFFICIENT_EVIDENCE": "证据不足，建议补充文献或缩小对比范围后重试。",
            "NETWORK_ERROR": "网络或代理异常，请检查代理和外网连接。",
            "RENDERER_UNAVAILABLE": "渲染器不可用，已返回可编辑结构结果。",
            "UNKNOWN_ERROR": "服务出现异常，请稍后重试并查看状态页。",
        }
        return {
            "error_code": code,
            "error_hint": hints.get(code, hints["UNKNOWN_ERROR"]),
            "retryable": retryable,
            "degraded": degraded,
        }

    def _classify_error(self, error: object, degraded: bool = False) -> dict[str, object]:
        text = str(error).lower()
        if "timeout" in text or "超时" in text:
            return self._error_meta("MODEL_TIMEOUT", degraded=degraded, retryable=True)
        if "404" in text or "not found" in text or "模型不存在" in text:
            return self._error_meta("MODEL_NOT_FOUND", degraded=degraded, retryable=False)
        if "401" in text or "403" in text or "api key" in text or "unauthorized" in text:
            return self._error_meta("TEXT_PROVIDER_UNAVAILABLE", degraded=degraded, retryable=True)
        if "proxy" in text or "connection" in text or "network" in text:
            return self._error_meta("NETWORK_ERROR", degraded=degraded, retryable=True)
        return self._error_meta("UNKNOWN_ERROR", degraded=degraded, retryable=True)

    def _parse_json_object(self, text: str) -> dict[str, object]:
        cleaned = text.strip()
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

    def _structure_generation_prompt(
        self,
        prompt: str,
        style: str,
        detail_level: str,
        language: str,
        feedback: list[str],
    ) -> dict[str, object]:
        separators = r"[，,；;。\n]"
        raw_terms = [term.strip() for term in re.split(separators, prompt) if term.strip()]
        must_have = raw_terms[:4]
        forbidden: list[str] = []
        relation = "按研究流程形成因果顺序"
        if "elements" in feedback:
            relation += "，必须完整覆盖用户指定核心元素"
        if "layout" in feedback:
            relation += "，布局应更清晰区分阶段"
        if "text" in feedback:
            relation += "，文本标签更精准简短"
        if "style" in feedback:
            relation += f"，整体风格更贴近 {style}"
        prompt_text = (
            f"{prompt}\n"
            f"约束：关系={relation}；语言={language}；复杂度={detail_level}；"
            f"必须元素={','.join(must_have) if must_have else '无'}；"
            f"禁止元素={','.join(forbidden) if forbidden else '无'}。"
        )
        return {"prompt_text": prompt_text, "must_have": must_have, "forbidden": forbidden}

    def _retry_prompt_text(self, prompt_text: str, must_have: list[str]) -> str:
        req = ",".join(must_have) if must_have else "关键节点"
        return f"{prompt_text}\n请严格满足必须元素：{req}。若缺失请补全后重新输出。"

    def _diagram_matches_requirements(self, mermaid_code: str, must_have: list[str]) -> bool:
        if not must_have:
            return True
        lowered = mermaid_code.lower()
        hits = sum(1 for item in must_have if item and item.lower() in lowered)
        return hits >= max(1, min(2, len(must_have)))

    def _figure_matches_requirements(self, must_have: list[str], template_type: str) -> bool:
        if not must_have:
            return True
        if template_type in {"comparison", "ablation"}:
            return len(must_have) >= 2
        return len(must_have) >= 1

    def _figure_fallback_result(
        self,
        prompt: str,
        template_type: str,
        style: str,
        detail_level: str,
        language: str,
        visual_context: dict[str, object],
        error_meta: dict[str, object],
    ) -> dict[str, object]:
        spec = self._render_svg_spec(prompt, visual_context)
        svg_text = self._render_svg(spec)
        task_id = f"fallback_fig_{uuid.uuid4().hex[:8]}"
        svg_path = self.figure_dir / f"{task_id}.svg"
        output_url = f"/generated/{svg_path.name}"
        try:
            svg_path.parent.mkdir(parents=True, exist_ok=True)
            svg_path.write_text(svg_text, encoding="utf-8")
        except OSError:
            output_url = ""
        self._record_generation(
            task_type="figure",
            prompt=prompt,
            params={
                "style": style,
                "detail_level": detail_level,
                "language": language,
                "template_type": template_type,
                "fallback": True,
            },
            output_url=output_url or None,
        )
        return {
            "title": self._figure_template_title(template_type, prompt),
            "caption": f"{self._figure_template_caption(template_type, prompt, visual_context.get('sources', []))}（已使用兜底模板生成）",
            "figure_type": template_type,
            "image_url": output_url,
            "sources": visual_context.get("sources", []),
            "model_provider": str(error_meta.get("model_provider", "")),
            "model_name": str(error_meta.get("model_name", "")),
            "fallback_chain": error_meta.get("fallback_chain", self.last_routing_trace.get("attempts", [])),
            "error_code": str(error_meta.get("error_code", "")),
            "error_hint": str(error_meta.get("error_hint", "")),
            "retryable": bool(error_meta.get("retryable", False)),
            "degraded": True,
        }

    def _is_valid_mermaid(self, mermaid_code: str) -> bool:
        lines = [line.strip() for line in mermaid_code.splitlines() if line.strip()]
        if not lines:
            return False
        if not lines[0].startswith(("flowchart ", "graph ")):
            return False
        has_node = any("[" in line and "]" in line for line in lines[1:])
        has_edge = any("-->" in line for line in lines[1:])
        return has_node and has_edge

    def _diagram_style_instruction(self, style: str, detail_level: str, language: str) -> str:
        style_map = {
            "academic": "使用学术论文风格，节点术语严谨。",
            "minimal": "使用极简风格，节点短句、减少冗余。",
            "presentation": "使用汇报风格，强调阶段与结论。",
        }
        detail_map = {
            "low": "节点数控制在 4-5 个。",
            "medium": "节点数控制在 5-7 个。",
            "high": "节点数控制在 7-9 个，并给关键分支。",
        }
        language_hint = "节点默认中文。" if language == "zh" else "Use English node labels."
        return f"{style_map.get(style, style_map['academic'])}{detail_map.get(detail_level, detail_map['medium'])}{language_hint}"

    def _build_figure_prompt(
        self,
        prompt: str,
        context_text: str,
        template_type: str,
        style: str,
        detail_level: str,
        language: str,
    ) -> str:
        style_map = {
            "academic": "期刊论文插图风格，信息层级清晰，留白合理",
            "minimal": "极简科研插图风格，强调核心概念",
            "presentation": "汇报展示风格，视觉冲击力更强",
        }
        detail_map = {
            "low": "元素数量少，突出主流程",
            "medium": "信息密度适中，包含关键模块关系",
            "high": "信息完整，包含输入处理输出与关键注释",
        }
        language_hint = "图中文字使用中文。" if language == "zh" else "All labels must be in English."
        return (
            f"科研论文配图任务。{style_map.get(style, style_map['academic'])}；"
            f"{detail_map.get(detail_level, detail_map['medium'])}。图模板：{self._figure_template_hint(template_type)}。{language_hint}\n"
            f"需求：{prompt}\n"
            f"文献背景（可选）：{context_text[:320]}"
        )

    def _figure_template_hint(self, template_type: str) -> str:
        hints = {
            "method_framework": "方法框架图，强调模块关系与信息流",
            "experiment_flow": "实验流程图，强调步骤先后与评估环节",
            "comparison": "对比图，强调不同方法在同一指标上的差异",
            "ablation": "消融图，强调模块贡献与性能变化趋势",
        }
        return hints.get(template_type, hints["method_framework"])

    def _figure_template_title(self, template_type: str, prompt: str) -> str:
        names = {
            "method_framework": "方法框架图",
            "experiment_flow": "实验流程图",
            "comparison": "结果对比图",
            "ablation": "消融分析图",
        }
        prefix = names.get(template_type, "论文插图")
        return f"{prefix} - {prompt[:18]}"

    def _figure_template_caption(self, template_type: str, prompt: str, sources: list[str]) -> str:
        template_desc = {
            "method_framework": "展示方法模块及其信息流关系",
            "experiment_flow": "展示实验流程与评估步骤",
            "comparison": "展示关键方法在核心指标上的对比",
            "ablation": "展示模块消融后性能变化与贡献",
        }
        source_hint = f"参考文献：{sources[0]}。" if sources else "当前基于用户输入与通用科研表达生成。"
        return f"{template_desc.get(template_type, '展示研究图示结构')}需求为“{prompt[:40]}”。{source_hint}"

    def _writing_recommendation(
        self,
        topic: str,
        stage: str,
        question: str,
        evidence: list[dict[str, str]],
    ) -> str:
        stage_guides: dict[str, list[str]] = {
            "proposal": [
                "先定义研究边界：明确任务对象、输入输出和评估指标。",
                "把创新点限制在 1-2 条可验证主张，避免泛化承诺。",
                "补出计划实验设置：数据来源、对比基线与预期指标。",
            ],
            "draft": [
                "先写方法主线：输入 -> 关键模块 -> 输出，避免跳步描述。",
                "每个结论句后补 1 条可追溯证据（来源+页码+片段）。",
                "在段落末尾补可复现信息：数据集、超参数或评估协议。",
            ],
            "submission": [
                "首句给贡献结论，随后给量化结果和对比对象。",
                "补齐局限性与适用边界，避免绝对化表述。",
                "统一术语和图注，保证正文-图表-引用一致。",
            ],
        }
        guides = stage_guides.get(stage, stage_guides["draft"])

        evidence_lines: list[str] = []
        for idx, item in enumerate(evidence[:4], start=1):
            source = str(item.get("source", "")).strip()
            snippet = str(item.get("snippet", "")).strip()
            page = item.get("page")
            role = str(item.get("evidence_role", "manuscript") or "manuscript")
            role_label = "你的稿件" if role == "manuscript" else "参考文献"
            trace = f"{source}" + (f" p.{page}" if isinstance(page, int) and page > 0 else "")
            if snippet:
                evidence_lines.append(f"- 证据{idx}（{role_label}｜{trace}）：{snippet[:90]}")

        if evidence_lines:
            evidence_block = "可直接引用的证据锚点：\n" + "\n".join(evidence_lines)
        else:
            evidence_block = "当前未命中稳定证据：请确认「当前论文」已索引，并在参考文献多选中勾选对比文献。"

        return (
            f"围绕“{topic}”回答“{question[:80]}”，建议按这个顺序写：\n"
            f"1) {guides[0]}\n"
            f"2) {guides[1]}\n"
            f"3) {guides[2]}\n\n"
            f"{evidence_block}\n\n"
            "落地写法：先写 1 句问题定义，再写 2-3 句方法细节，最后写 1 句带证据的结果/意义。"
        )

    def _writing_template(self, stage: str, question: str) -> str:
        if stage == "proposal":
            return (
                "研究问题：________。\n"
                "现有方法不足：________。\n"
                "本文拟解决：________。\n"
                "预期贡献：1) ________ 2) ________。"
            )
        if stage == "submission":
            return (
                "结论先行：本文提出 ________，在 ________ 上优于 ________。\n"
                "证据：主要指标提升 ________，并在消融实验中验证 ________。\n"
                "意义：该结果表明 ________。"
            )
        return (
            f"针对问题“{question[:60]}”，本文采用 ________ 方法。\n"
            "首先，________；其次，________；最后，________。\n"
            "实验结果显示，________，说明 ________。"
        )

    def _writing_risk_notes(self, evidence: list[dict[str, str]], question: str) -> list[str]:
        notes: list[str] = []
        if len(evidence) < 2:
            notes.append("当前证据片段较少，建议补充更多文献后再写核心结论。")
        if any(token in question.lower() for token in ("state-of-the-art", "sota", "最优")):
            notes.append("涉及 SOTA 表述时建议附上可核验的最新基线和指标来源。")
        notes.append("写作时避免绝对化措辞，优先使用“在当前实验设置下”。")
        return notes

    def _build_method_comparisons(
        self, retrieve_output: RetrieveOutput, method_a: str, method_b: str
    ) -> CompareOutput:
        if not retrieve_output.evidence:
            return CompareOutput(comparisons=[], missing_dimensions=["evidence", "metric", "limitation"])
        dims = ["evidence", "metric", "limitation"]
        comparisons: list[CompareItem] = []
        all_ids = [item.evidence_id for item in retrieve_output.evidence[:4]]
        for dim in dims:
            claim = (
                f"在 {dim} 维度上，建议对 {method_a} 与 {method_b} 做并列比较，并保留证据可追溯性。"
            )
            comparisons.append(CompareItem(dimension=dim, claim=claim, evidence_ids=all_ids))
        return CompareOutput(comparisons=comparisons, missing_dimensions=[])

    def _validate_method_comparisons(
        self, retrieve_output: RetrieveOutput, compare_output: CompareOutput
    ) -> ValidateOutput:
        if len(retrieve_output.evidence) < 2:
            return ValidateOutput(
                status="insufficient_evidence",
                issues=[
                    ValidateIssue(
                        severity="high",
                        message="当前可用证据不足（少于 2 条），无法形成稳定方法对比结论。",
                        claim_ref="global",
                    )
                ],
            )
        issues: list[ValidateIssue] = []
        for item in compare_output.comparisons:
            if not item.evidence_ids:
                issues.append(
                    ValidateIssue(
                        severity="high",
                        message=f"{item.dimension} 维度缺少证据绑定。",
                        claim_ref=item.dimension,
                    )
                )
        return ValidateOutput(status="risk_detected" if issues else "ok", issues=issues)

    def _conclude_method_comparisons(
        self,
        retrieve_output: RetrieveOutput,
        compare_output: CompareOutput,
        validate_output: ValidateOutput,
        method_a: str,
        method_b: str,
    ) -> ConcludeOutput:
        if validate_output.status == "insufficient_evidence":
            return ConcludeOutput(
                summary="证据不足，当前只建议补充文献后再执行方法对比。",
                supported_claims=[],
                uncertainties=["需要至少 2 条可追溯证据。"],
            )
        if validate_output.status == "risk_detected":
            return ConcludeOutput(
                summary="检测到高风险对比项，需先修复证据绑定后再输出结论。",
                supported_claims=[],
                uncertainties=[issue.message for issue in validate_output.issues[:3]],
            )
        top_ids = [item.evidence_id for item in retrieve_output.evidence[:2]]
        return ConcludeOutput(
            summary=f"已完成 {method_a} 与 {method_b} 的结构化对比，可基于证据继续生成投稿段落。",
            supported_claims=[
                ConcludeClaim(
                    text=f"{method_a} 与 {method_b} 在证据、指标和局限性三个维度已建立并列对照。",
                    evidence_ids=top_ids,
                )
            ],
            uncertainties=["建议在最终结论中补充具体实验指标与引用格式。"],
        )

    def _validation_issue(
        self,
        category: str,
        severity: str,
        message: str,
        suggestion: str,
        rewrite_example: str,
        original_text: str = "",
    ) -> dict[str, str]:
        return {
            "category": category,
            "severity": severity,
            "message": message,
            "suggestion": suggestion,
            "rewrite_example": rewrite_example,
            "original_text": original_text,
        }

    def _load_generation_history(self) -> None:
        self.generation_store.load()

    def _save_generation_history(self) -> None:
        self.generation_store.save()

    def _record_generation(
        self,
        task_type: str,
        prompt: str,
        params: dict[str, object],
        output_url: str | None,
    ) -> None:
        self.generation_store.record(task_type, prompt, params, output_url)

    def _load_doc_state(self) -> None:
        self.doc_state_store.load()
        self.doc_state = self.doc_state_store.state

    def _sync_doc_state_with_files(self, persist: bool = True) -> None:
        self.doc_state_store.sync_with_files(persist=persist)
        self.doc_state = self.doc_state_store.state

    def _save_doc_state(self) -> None:
        self.doc_state_store.save()
        self.doc_state = self.doc_state_store.state

    def _document_records(self) -> dict[str, dict[str, object]]:
        records = self.doc_state_store.records()
        self.doc_state = self.doc_state_store.state
        return records

research_service = ResearchService()
