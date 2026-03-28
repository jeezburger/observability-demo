"""
status_api.py — In-memory status store for the AI observability system.

Tracks anomaly events, RCA results, and remediation outcomes via a
lightweight FastAPI service on port 8090.  Also serves the JAEGERBOMB
frontend dashboard as static files.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import time
import json
import uvicorn

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Observability Status API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Serve frontend dashboard (must be mounted AFTER API routes below)
# ---------------------------------------------------------------------------


FRONTEND_BASE = Path(__file__).resolve().parent.parent / "frontend-new"
FRONTEND_DIR = FRONTEND_BASE / "dist" if (FRONTEND_BASE / "dist").is_dir() else FRONTEND_BASE


# ---------------------------------------------------------------------------
# In-memory storage
# ---------------------------------------------------------------------------
MAX_EVENTS = 10

events: List[dict] = []

current_status: dict = {
    "is_anomaly": False,
    "last_anomaly_time": 0.0,
    "last_rca_result": {},
    "last_remediation_result": {},
    "system_healthy": True,
}


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------
class EventPayload(BaseModel):
    event_type: str
    data: dict = {}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/event")
def post_event(payload: EventPayload):
    now = time.time()

    if payload.event_type == "anomaly_detected":
        current_status["is_anomaly"] = True
        current_status["last_anomaly_time"] = now
        current_status["system_healthy"] = False
        current_status["last_rca_result"] = payload.data

    elif payload.event_type == "remediation_complete":
        current_status["last_remediation_result"] = payload.data

    elif payload.event_type == "system_healthy":
        current_status["is_anomaly"] = False
        current_status["system_healthy"] = True

    # Append event, keep at most MAX_EVENTS
    events.append({
        "event_type": payload.event_type,
        "data": payload.data,
        "timestamp": now,
    })
    if len(events) > MAX_EVENTS:
        events.pop(0)

    return {"received": True}


@app.get("/status")
def get_status():
    return {
        **current_status,
        "recent_events": events[-MAX_EVENTS:],
        "timestamp": time.time(),
        "uptime_message": (
            "System Healthy" if current_status["system_healthy"]
            else "Anomaly Detected"
        ),
    }

# ---------------------------------------------------------------------------
# Mount frontend static files (after API routes, so API takes priority)
# ---------------------------------------------------------------------------
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


else:
    print(f"Warning: {FRONTEND_DIR} is not a directory. Dashboard UI will not be available.")




# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print(f"Frontend dir: {FRONTEND_DIR}")
    if FRONTEND_DIR.is_dir():
        print(f"Dashboard UI:  http://localhost:8090/")
    print(f"Status API:    http://localhost:8090/status")
    uvicorn.run(app, host="0.0.0.0", port=8090, ws="none")
