"""
Vercel Serverless Entry Point for FastAPI backend.

NOTE: Vercel functions are stateless and have a 60s timeout.
- Background warmup tasks are disabled (no persistent state between calls)
- In-memory caches reset on every cold start
- APScheduler jobs are disabled (no long-running processes)
- Heavy scanner endpoints (run_full_scan) may timeout on cold starts
"""
import os
import sys
import logging

# ---------------------------------------------------------------------------
# Make sure the backend root is on sys.path so imports like `from app.main`
# and `import symbols` resolve correctly inside Vercel's /var/task directory.
# ---------------------------------------------------------------------------
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Disable background warmup before importing app to avoid
# "no running event loop" error in serverless cold-start
os.environ.setdefault("VERCEL", "1")

# ---------------------------------------------------------------------------
# Import the FastAPI app
# ---------------------------------------------------------------------------
from app.main import app  # noqa: E402 – must be after sys.path patch

# Vercel expects the ASGI app to be named `app` in this module.
# The import above already satisfies that — no extra work needed.
