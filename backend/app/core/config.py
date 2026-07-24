from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central app configuration, loaded from environment variables (.env)."""

    app_name: str = "BGalaxy API"
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://bgalaxy:bgalaxy@localhost:5432/bgalaxy"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # Outgoing email (invite notifications). Leave smtp_host empty to skip
    # actually sending — the invite link is still returned in the API
    # response so it can be copied manually during local development.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "BGalaxy <no-reply@bgalaxy.local>"
    # Preferred over SMTP in production — Resend uses HTTPS, so it isn't
    # blocked by hosts (like Render's free tier) that block outbound SMTP
    # ports. Leave empty to fall back to smtp_host below.
    resend_api_key: str = ""

    # Google Sign-In (OAuth) — leave empty to hide the Google button
    google_client_id: str = ""

    # The very first developer — this email is auto-promoted to is_developer=True
    # the first time it logs in, so there's always at least one account that
    # can reach /developer and grant access to others. Leave empty to disable.
    initial_developer_email: str = ""
    frontend_url: str = "http://localhost:5173"

    # AI Ziyo (Google Gemini API — free tier, no card required)
    gemini_api_key: str = ""
    rafiq_model: str = "gemini-flash-lite-latest"

    # Group video calls (LiveKit Cloud — free tier, no self-hosted media server needed)
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_url: str = ""  # e.g. wss://your-project.livekit.cloud

    class Config:
        env_file = ".env"


settings = Settings()
