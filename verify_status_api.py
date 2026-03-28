import subprocess, time, requests, json, sys

proc = subprocess.Popen(
    ['python3', 'remediation/status_api.py'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
time.sleep(3)

try:
    health = requests.get('http://localhost:8090/health', timeout=3)
    print(f"GET /health: {health.status_code} - {health.json()}")

    status = requests.get('http://localhost:8090/status', timeout=3)
    data = status.json()
    print(f"GET /status: {status.status_code}")
    print(f"  Keys present: {list(data.keys())}")

    event_resp = requests.post(
        'http://localhost:8090/event',
        json={
            "event_type": "anomaly_detected",
            "data": {
                "root_cause": "Test anomaly",
                "affected_service": "paymentservice",
                "severity": "critical",
                "remediation_action": "restart_service",
                "confidence": 0.95
            }
        },
        timeout=3
    )
    print(f"POST /event: {event_resp.status_code} - {event_resp.json()}")

    status2 = requests.get('http://localhost:8090/status', timeout=3)
    data2 = status2.json()
    print(f"Status after event - is_anomaly: {data2.get('is_anomaly')}")
    print(f"Status after event - system_healthy: {data2.get('system_healthy')}")

    if (health.status_code == 200 and
        status.status_code == 200 and
        event_resp.status_code == 200 and
        data2.get('is_anomaly') == True):
        print("PASS - Status API working correctly")
    else:
        print("FAIL - Something not working correctly")

except Exception as e:
    print(f"FAIL - Error: {e}")
finally:
    proc.terminate()
