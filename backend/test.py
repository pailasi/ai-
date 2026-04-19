import os
from typing import Any

import requests


def _build_proxy() -> dict[str, str]:
    proxy_url = os.getenv("DEBUG_PROXY_URL", "").strip()
    if not proxy_url:
        return {}
    return {"http": proxy_url, "https": proxy_url}


def _safe_json_text(payload: Any) -> str:
    text = str(payload)
    return text[:1200] + ("..." if len(text) > 1200 else "")


def debug_apis() -> None:
    proxy = _build_proxy()
    google_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    open_api_key = os.getenv("OPEN_API_KEY", "").strip()
    google_model = os.getenv("DEBUG_GOOGLE_MODEL", "models/gemini-1.5-flash").strip()
    open_model = os.getenv("DEBUG_OPEN_MODEL", "google/gemini-2.5-flash").strip()

    print("--- Google 调试 ---")
    if not google_api_key:
        print("跳过 Google：未设置 GOOGLE_API_KEY。")
    else:
        model_name = google_model.replace("models/", "")
        google_url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{model_name}:generateContent?key={google_api_key}"
        )
        try:
            response = requests.post(
                google_url,
                json={"contents": [{"parts": [{"text": "hi"}]}]},
                proxies=proxy or None,
                timeout=10,
            )
            print(f"Google 状态码: {response.status_code}")
            print(_safe_json_text(response.text))
        except Exception as exc:
            print(f"Google 连接失败: {exc}")

    print("\n--- OpenRouter 调试 ---")
    if not open_api_key:
        print("跳过 OpenRouter：未设置 OPEN_API_KEY。")
    else:
        headers = {
            "Authorization": f"Bearer {open_api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Sci-Copilot-Debug",
        }
        payload = {
            "model": open_model,
            "messages": [{"role": "user", "content": "hi"}],
        }
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
                proxies=proxy or None,
                timeout=10,
            )
            print(f"OpenRouter 状态码: {response.status_code}")
            print(_safe_json_text(response.text))
        except Exception as exc:
            print(f"OpenRouter 连接失败: {exc}")


if __name__ == "__main__":
    debug_apis()