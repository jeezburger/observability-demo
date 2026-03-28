"""
rca_pipeline.py - Real-time AI Root Cause Analysis Pipeline

Takes an anomaly event from the detection layer and returns a complete
root cause analysis by correlating Jaeger traces, Loki logs, and LLM reasoning.
"""

import requests
import json
import re
import time
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
JAEGER_URL = os.getenv("JAEGER_URL", "http://localhost:16686")
LOKI_URL = os.getenv("LOKI_URL", "http://localhost:3100")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3:mini")


# ---------------------------------------------------------------------------
# Fault type classification
# ---------------------------------------------------------------------------
def get_fault_type(service_name: str, error_message: str) -> str:
    """Classify the fault based on service name and error message patterns."""
    svc = service_name.lower()
    err = error_message.lower()

    if "payment" in svc and "timeout" in err:
        return "payment_gateway_timeout"
    if "payment" in svc:
        return "payment_service_failure"
    if "cart" in svc:
        return "cart_service_failure"
    if "recommendation" in svc:
        return "recommendation_cache_failure"
    if "kafka" in svc:
        return "kafka_queue_problem"
    if "ad" in svc and "memory" in err:
        return "memory_pressure"
    return "unknown_service_degradation"


# ---------------------------------------------------------------------------
# FUNCTION 1 – Query Jaeger for error traces
# ---------------------------------------------------------------------------
def query_jaeger(anomaly_timestamp: float) -> dict:
    """Query Jaeger HTTP API for error traces near the anomaly timestamp."""
    try:
        params = {
            "service": "frontend",
            "tags": json.dumps({"error": "true"}),
            "start": int((anomaly_timestamp - 30) * 1_000_000),
            "end": int(anomaly_timestamp * 1_000_000),
            "limit": 5,
        }
        resp = requests.get(f"{JAEGER_URL}/api/traces", params=params, timeout=2)
        resp.raise_for_status()
        data = resp.json()

        trace = data["data"][0]
        trace_id = trace["traceID"]
        processes = trace["processes"]

        # Find the span with the longest duration that has an error tag
        error_spans = []
        for span in trace["spans"]:
            for tag in span.get("tags", []):
                if tag["key"] == "error" and tag["value"] in (True, "true"):
                    error_spans.append(span)
                    break

        if not error_spans:
            return {}

        guilty_span = max(error_spans, key=lambda s: s["duration"])

        # Extract error tag value
        error_tag = ""
        for tag in guilty_span.get("tags", []):
            if tag["key"] == "error":
                error_tag = str(tag["value"])

        # Extract log messages
        log_messages = []
        for log_entry in guilty_span.get("logs", []):
            for field in log_entry.get("fields", []):
                if field["key"] == "message":
                    log_messages.append(field["value"])

        error_message = "; ".join(log_messages) if log_messages else error_tag

        # Resolve service name from processID
        process_id = guilty_span.get("processID", "")
        service_name = processes.get(process_id, {}).get("serviceName", "unknown")

        return {
            "trace_id": trace_id,
            "guilty_service": service_name,
            "operation_name": guilty_span.get("operationName", "unknown"),
            "duration_ms": guilty_span["duration"] / 1000,
            "error_message": error_message,
            "raw_span": guilty_span,
        }

    except Exception as exc:
        print(f"[jaeger] query failed: {exc}")
        return {}


# ---------------------------------------------------------------------------
# FUNCTION 2 – Fetch logs from Loki
# ---------------------------------------------------------------------------
def fetch_logs(service_name: str, anomaly_timestamp: float) -> list:
    """Query Loki for recent error logs from the given service."""
    try:
        if service_name:
            query = f'{{container=~".*{service_name}.*"}} |= "error"'
        else:
            query = '{job=~".+"} |= "error"'

        params = {
            "query": query,
            "start": int((anomaly_timestamp - 60) * 1_000_000_000),
            "end": int(anomaly_timestamp * 1_000_000_000),
            "limit": 10,
        }
        resp = requests.get(
            f"{LOKI_URL}/loki/api/v1/query_range", params=params, timeout=2
        )
        resp.raise_for_status()
        data = resp.json()

        log_lines = []
        for stream in data.get("data", {}).get("result", []):
            for value_pair in stream.get("values", []):
                log_lines.append(value_pair[1])

        # newest first (values are already timestamp-descending from Loki)
        return log_lines

    except Exception as exc:
        print(f"[loki] query failed: {exc}")
        return []


# ---------------------------------------------------------------------------
# FUNCTION 3 – Warm up the Ollama model
# ---------------------------------------------------------------------------
def warmup_model():
    """Send a trivial prompt to ensure the model is loaded in memory."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": "Say OK", "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        print("Model warmed up and ready")
    except Exception as exc:
        print(f"[ollama] warmup failed: {exc}")


# ---------------------------------------------------------------------------
# FUNCTION 4 – Call the LLM for root-cause reasoning
# ---------------------------------------------------------------------------
def call_llm(fault_type: str, trace_context: dict, logs: list) -> dict:
    """Ask the LLM to produce a structured root-cause analysis."""
    prompt = f"""Return a single JSON object. No markdown. No backticks. No extra keys. No explanation.

Use EXACTLY these 5 keys, no others:
{{"root_cause":"one sentence","affected_service":"{trace_context.get('guilty_service','unknown')}","severity":"critical","remediation_action":"restart_service","confidence":0.95}}

Now fill in root_cause and confidence only. Keep all other values exactly as shown.
Fault: {fault_type}
Error: {str(trace_context.get('error_message','unknown'))[:80]}
Logs: {' | '.join(logs[:2])}"""

    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 80, "top_k": 1},
            },
            timeout=15,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")

        parsed = parse_llm_response(raw)
        if parsed:
            return parsed

    except Exception as exc:
        print(f"[llm] call failed: {exc}")

    # Safe default if parsing or request fails
    return {
        "root_cause": "Unable to determine root cause automatically",
        "affected_service": trace_context.get("guilty_service", "unknown"),
        "severity": "warning",
        "remediation_action": "restart_service",
        "confidence": 0.0,
    }


def parse_llm_response(raw: str) -> dict:
    """Parse and sanitize LLM JSON output, handling common formatting issues."""
    # Step 1: Strip markdown fences
    raw = raw.strip()
    raw = re.sub(r'^```json', '', raw).strip()
    raw = re.sub(r'^```', '', raw).strip()
    raw = re.sub(r'```$', '', raw).strip()

    # Step 2: Extract the outermost { } block
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        return {}
    json_str = match.group()

    # Step 3: Fix unquoted keys - wrap any word: pattern that isn't quoted
    json_str = re.sub(r'(?<!")(\b\w[\w ]*\b)(?!")(\s*:)', r'"\1"\2', json_str)

    # Step 4: Normalize remediation_action to allowed values
    allowed = ["restart_service", "circuit_break", "scale_up", "restart_kafka", "reduce_memory"]
    for val in allowed:
        if val.replace("_", " ") in json_str.lower() or val in json_str.lower():
            json_str = re.sub(
                r'"remediation_action"\s*:\s*"[^"]*"',
                f'"remediation_action": "{val}"',
                json_str,
            )
            break

    # Step 5: Parse
    try:
        return json.loads(json_str)
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# MAIN ENTRY POINT – called by main.py
# ---------------------------------------------------------------------------
def analyze(anomaly_event: dict) -> dict:
    """Run the full RCA pipeline for a detected anomaly event."""
    timestamp = anomaly_event.get("timestamp", time.time())

    print("Starting RCA analysis...")
    start_time = time.time()

    # Step 1: Query Jaeger for correlated traces
    trace_context = query_jaeger(timestamp)
    if trace_context:
        print(f"  → Guilty service identified: {trace_context['guilty_service']}")
    else:
        print("  → No error trace found in Jaeger")

    # Step 2: Fetch related logs from Loki
    logs = fetch_logs(trace_context.get("guilty_service", ""), timestamp)
    print(f"  → Collected {len(logs)} log lines")

    # Step 3: Classify the fault type
    fault_type = get_fault_type(
        trace_context.get("guilty_service", ""),
        trace_context.get("error_message", ""),
    )
    print(f"  → Fault type: {fault_type}")

    # Step 4: Ask LLM for structured root-cause reasoning
    llm_result = call_llm(fault_type, trace_context, logs)

    # Merge trace context into the result
    result = {**llm_result}
    result.update(
        {
            k: v
            for k, v in trace_context.items()
            if k != "raw_span"  # skip bulky raw span in output
        }
    )
    result["rca_duration_seconds"] = round(time.time() - start_time, 3)
    result["fault_type"] = fault_type

    print(f"  → RCA complete in {result['rca_duration_seconds']}s")
    print(json.dumps(result, indent=2))

    return result


# ---------------------------------------------------------------------------
# Standalone test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import time

    print("Testing RCA pipeline with fake anomaly event...")

    fake_event = {
        "timestamp": time.time() - 10,
        "metric_vector": [0.52, 2100.0, 78.0],
        "anomaly_score": -0.34,
        "source": "metrics",
        "confidence": "high",
    }

    warmup_model()
    result = analyze(fake_event)
    print("\nFINAL RCA RESULT:")
    print(json.dumps(result, indent=2))
