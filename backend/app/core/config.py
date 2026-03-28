import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Trello Clone API"
    # It will read this from the .env file, otherwise fallback to sqlite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./trellodb.sqlite")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()