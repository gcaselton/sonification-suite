import csv
import sys
from datetime import datetime, timezone
from paths import ROOT_DIR

# fcntl package is only available on unix systems
if sys.platform != "win32":
    import fcntl


ANALYTICS_DIR = ROOT_DIR / "analytics"
LOCK_FILE = ANALYTICS_DIR / "analytics.lock"


def log_event(
    session_id: str,
    country: str,
    event: str,
    sonification_type: str,
):
    """
    Log an analytics event in the current month's analytics file.
    Uses a file lock to ensure multiple Uvicorn workers don't attempt
    simultaneous writes.

    """

    try:
        
        if sys.platform == "win32":
            return # Development environment - don't need analytics
        
        ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc)
        csv_file = ANALYTICS_DIR / f"{now.strftime('%Y-%m')}.csv"

        row = {
            "timestamp": now.isoformat(),
            "session_id": session_id,
            "country": country,
            "event": event,
            "sonification_type": sonification_type,
        }

        # Open/create the lock file
        with open(LOCK_FILE, "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)

            file_exists = csv_file.exists()

            with open(csv_file, "a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=row.keys())

                if not file_exists:
                    writer.writeheader()

                writer.writerow(row)

            fcntl.flock(lock, fcntl.LOCK_UN)

    except Exception as e:
        print(f"Analytics error: {e}")