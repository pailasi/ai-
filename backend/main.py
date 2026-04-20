from api import create_app
from api.dependencies import research_service, settings

app = create_app()

__all__ = [
    "app",
    "research_service",
    "settings",
]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=False)
