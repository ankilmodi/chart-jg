"""
Scanner-specific configuration loaded from environment variables.
"""
from pydantic_settings import BaseSettings


class ScannerSettings(BaseSettings):
    # Scanner
    SCAN_HOUR: int = 9
    SCAN_MINUTE: int = 30
    CAPITAL: float = 100000.0
    MAX_POSITIONS: int = 5
    MAX_RISK_PCT: float = 1.0
    MIN_RR_RATIO: float = 2.0
    VIX_THRESHOLD: float = 18.0
    VIX_REJECT: float = 20.0

    # Cache TTL seconds
    SCANNER_CACHE_TTL: int = 300

    # Optional API keys (fallback sources)
    TWELVEDATA_API_KEY: str = ""
    ALPHAVANTAGE_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


scanner_settings = ScannerSettings()
