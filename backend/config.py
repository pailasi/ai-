from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    # 应用基础配置
    app_name: str = "Sci-Copilot"
    app_env: str = "development"
    api_prefix: str = "/api"
    host: str = "127.0.0.1"
    port: int = 8000
    # Codex/OpenAI 兼容 API（优先）
    codex_api_key: str = ""
    codex_base_url: str = "https://api.openai.com/v1"
    codex_text_model: str = "gpt-4.1-mini"
    codex_figure_model: str = "gpt-image-1"
    codex_request_timeout_seconds: int = 30
    img_api_key: str = ""
    img_base_url: str = ""
    img_figure_model: str = ""
    img_request_timeout_seconds: int = 30
    img_gemini_auth_mode: str = "auto"
    # 文本模型主链路（Google，兼容保留）
    google_api_key: str = ""
    google_model: str = "models/gemma-3-1b-it"
    analysis_model: str = ""
    mentor_model: str = ""
    diagram_model: str = ""
    # 图片模型链路（GLM）
    figure_model: str = ""
    workflow_figure_max_attempts: int = 3
    google_use_system_proxy: bool = False
    google_proxy_url: str = ""
    google_request_timeout_seconds: int = 6
    glm_api_key: str = ""
    glm_model: str = "glm-4v-flash"  # 智谱文本模型名通常不带 models/ 前缀
    glm_proxy_url: str = ""
    glm_request_timeout_seconds: int = 30
    # 文本兜底链路（OpenRouter）
    open_api_key: str = ""
    open_model: str = "google/gemini-2.5-flash"
    open_request_timeout_seconds: int = 15
    text_request_retry_attempts: int = 2
    text_request_retry_backoff_seconds: float = 1.0
    # Provider routing policy (global, env-driven)
    text_provider_order: str = "codex,google,openrouter"
    figure_provider_order: str = "img,codex,glm"
    text_model_map: str = "{}"
    figure_model_map: str = "{}"
    disable_providers: str = ""
    # 向量检索与本地数据目录
    enable_vector_store: bool = True
    embeddings_model: str = "all-MiniLM-L6-v2"
    auto_ingest_on_startup: bool = True
    data_dir: Path = BASE_DIR / "data"
    diagram_dir: Path = BASE_DIR / "diagrams"
    figure_dir: Path = BASE_DIR / "diagrams"
    chroma_dir: Path = BASE_DIR / "chroma_db"
    cors_origins: list[str] = ["http://localhost:8000", "http://127.0.0.1:8000"]
    max_upload_size_mb: int = 25
    api_access_key: str = ""
    status_include_debug: bool = True

    # Load defaults from .env.example first, then override with backend/.env.
    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env.example", BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
