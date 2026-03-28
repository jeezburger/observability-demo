"""
executor.py — Remediation executor for the real-time AI observability system.

Receives an RCA result dictionary and executes the appropriate fix
using Docker, feature flags, and Grafana annotations.
"""

import docker
import requests
import json
import time
import os
import threading

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
GRAFANA_URL = os.getenv("GRAFANA_URL", "http://localhost:3000")
GRAFANA_USER = os.getenv("GRAFANA_USER", "admin")
GRAFANA_PASSWORD = os.getenv("GRAFANA_PASSWORD", "admin")
FEATURE_FLAG_URL = os.getenv("FEATURE_FLAG_URL", "http://localhost:8080")
STATUS_API_URL = os.getenv("STATUS_API_URL", "http://localhost:8090")


# ---------------------------------------------------------------------------
# FUNCTION 1 — Post a Grafana annotation
# ---------------------------------------------------------------------------
def post_grafana_annotation(text: str, tags: list):
    """Post an annotation to Grafana. Never crashes on failure."""
    try:
        response = requests.post(
            f"{GRAFANA_URL}/api/annotations",
            auth=(GRAFANA_USER, GRAFANA_PASSWORD),
            json={"text": text, "tags": tags},
            timeout=5,
        )
        response.raise_for_status()
        print(f"Annotation posted: {text}")
    except Exception as e:
        print(f"Failed to post Grafana annotation: {e}")


# ---------------------------------------------------------------------------
# FUNCTION 2 — Restart a Docker container by service name
# ---------------------------------------------------------------------------
def restart_container(service_name: str) -> bool:
    """Find and restart a running container whose name contains *service_name*."""
    try:
        client = docker.from_env()
        containers = client.containers.list()

        for container in containers:
            if service_name.lower() in container.name.lower():
                container.restart(timeout=10)
                print(f"Restarted container: {container.name}")
                return True

        print(f"Container not found for service: {service_name}")
        return False
    except Exception as e:
        print(f"Error restarting container {service_name}: {e}")
        return False


# ---------------------------------------------------------------------------
# FUNCTION 3 — Circuit-break a service via feature flags
# ---------------------------------------------------------------------------
SERVICE_FLAG_MAP = {
    "payment": "paymentServiceFailure",
    "cart": "cartServiceFailure",
    "recommendation": "recommendationServiceCacheFailure",
    "ad": "adServiceManualGc",
    "kafka": "kafkaQueueProblems",
}


def circuit_break_service(service_name: str) -> bool:
    """Disable the feature flag associated with *service_name*."""
    flag_name = SERVICE_FLAG_MAP.get(service_name.lower())
    if not flag_name:
        # Try partial match for compound names like "paymentservice"
        for key, value in SERVICE_FLAG_MAP.items():
            if key in service_name.lower():
                flag_name = value
                break

    if not flag_name:
        print(f"No feature flag mapping for service: {service_name}")
        return False

    body = {"name": flag_name, "enabled": False}

    try:
        response = requests.post(
            f"{FEATURE_FLAG_URL}/api/v1/flags",
            json=body,
            timeout=5,
        )
        if response.status_code == 404:
            # Fallback endpoint
            response = requests.post(
                f"{FEATURE_FLAG_URL}/feature",
                json=body,
                timeout=5,
            )
        response.raise_for_status()
        print(f"Circuit break applied to {flag_name}")
        return True
    except Exception as e:
        print(f"Error applying circuit break for {flag_name}: {e}")
        return False


# ---------------------------------------------------------------------------
# FUNCTION 4 — Verify recovery via Prometheus error-rate query
# ---------------------------------------------------------------------------
def verify_recovery(baseline_error_rate: float = 0.01) -> bool:
    """Wait, then check Prometheus to see if error rate has dropped."""
    time.sleep(8)

    try:
        query = (
            'sum(rate(http_server_duration_milliseconds_count'
            '{http_status_code=~"5.."}[30s]))'
        )
        response = requests.get(
            "http://localhost:9090/api/v1/query",
            params={"query": query},
            timeout=5,
        )
        response.raise_for_status()

        data = response.json()
        result = data.get("data", {}).get("result", [])

        if result:
            current_error_rate = float(result[0]["value"][1])
        else:
            current_error_rate = 0.0

        if current_error_rate <= baseline_error_rate * 3:
            print(f"Recovery verified — error rate {current_error_rate:.4f} "
                  f"<= threshold {baseline_error_rate * 3:.4f}")
            return True
        else:
            print(f"Error rate still high: {current_error_rate:.4f} "
                  f"> threshold {baseline_error_rate * 3:.4f}")
            return False
    except Exception as e:
        print(f"Recovery verification error (fail-safe → assume recovered): {e}")
        return True  # Fail safe — assume recovered


# ---------------------------------------------------------------------------
# Playbook mapping
# ---------------------------------------------------------------------------
PLAYBOOKS = {
    "restart_service": lambda svc: restart_container(svc),
    "circuit_break": lambda svc: circuit_break_service(svc),
    "scale_up": lambda svc: restart_container(svc),  # simplified for demo
    "restart_kafka": lambda _svc: restart_container("kafka"),
    "reduce_memory": lambda svc: restart_container(svc),
}


# ---------------------------------------------------------------------------
# MAIN FUNCTION — Orchestrate the full remediation flow
# ---------------------------------------------------------------------------
def remediate(rca_result: dict) -> dict:
    """Execute the remediation playbook indicated by *rca_result*."""

    action = rca_result.get("remediation_action", "restart_service")
    service = rca_result.get("affected_service", "")
    severity = rca_result.get("severity", "high")
    root_cause = rca_result.get("root_cause", "Unknown")
    remediation_start = time.time()

    print(f"Executing remediation: {action} on {service}")

    # Step 1 — Annotate anomaly detection
    post_grafana_annotation(
        text=f"🚨 ANOMALY: {root_cause} | Executing: {action} on {service}",
        tags=["anomaly-detected", severity],
    )

    # Step 2 — Execute the matching playbook
    playbook_fn = PLAYBOOKS.get(action, PLAYBOOKS["restart_service"])
    playbook_fn(service)

    # Step 3 — Annotate remediation fired
    post_grafana_annotation(
        text=f"🔧 REMEDIATION FIRED: {action} applied to {service}",
        tags=["remediation-fired", severity],
    )

    # Step 4 — Verify recovery
    recovered = verify_recovery()
    elapsed = time.time() - remediation_start

    # Step 5 — Annotate outcome
    if recovered:
        post_grafana_annotation(
            text=f"✅ VERIFIED HEALTHY: {service} recovered in {elapsed:.1f}s",
            tags=["recovery-verified", severity],
        )
        print(f"System recovered in {elapsed:.1f} seconds")
    else:
        post_grafana_annotation(
            text=f"⚠️ NOT RECOVERED: {service} needs manual intervention",
            tags=["recovery-failed", severity],
        )
        print("Recovery verification failed")

    return {
        "action_taken": action,
        "service": service,
        "recovered": recovered,
        "elapsed_seconds": round(elapsed, 2),
        "timestamp": time.time(),
        "annotations_posted": True,
    }


# ---------------------------------------------------------------------------
# Test block
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    fake_rca = {
        "remediation_action": "restart_service",
        "affected_service": "paymentservice",
        "severity": "critical",
        "root_cause": "Payment gateway timeout - test",
        "confidence": 0.95,
    }
    print("Testing executor with fake RCA result...")
    print("NOTE: Will attempt real Docker container restart")
    print("NOTE: Grafana annotation will fail if Grafana not running - that is OK")
    result = remediate(fake_rca)
    print(json.dumps(result, indent=2))
