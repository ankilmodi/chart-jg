import logging
import traceback
from app.scanner.scanner import run_full_scan, _scan_cache

logging.basicConfig(level=logging.ERROR)

try:
    res = run_full_scan(force=True)
    print("Result length:", len(res))
    from app.scanner.scanner import _scan_cache
    print("Cache length:", len(_scan_cache or []))
except Exception as e:
    print(traceback.format_exc())
