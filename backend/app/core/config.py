from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AgriSahayak API"
    environment: str = "development"
    database_url: str = "sqlite:///./agrisahayak.db"
    cors_origins: str = "http://localhost:5173"
    upload_dir: str = "../data/uploads"
    ai_api_url: str = "https://api.groq.com/openai/v1/chat/completions"
    ai_api_key: str = ""
    ai_model: str = "llama-3.1-8b-instant"
    ollama_url: str = "http://127.0.0.1:11434/api/generate"
    ollama_model: str = "llama3.2:3b"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
