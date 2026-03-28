import time
import requests

prompt = """Return a single JSON object. No markdown. No backticks. No extra keys.

Use EXACTLY these 5 keys:
{"root_cause":"one sentence","affected_service":"paymentservice","severity":"critical","remediation_action":"restart_service","confidence":0.95}

Fill in root_cause only. Keep all other values exactly as shown.
Fault: payment_gateway_timeout
Error: timeout
Logs: ERROR: timeout | ERROR: retry failed"""

print("Sending prompt...")
t0 = time.time()

response = requests.post(
    'http://localhost:11434/api/generate',
    json={
        'model': 'phi3:mini',
        'prompt': prompt,
        'stream': False,
        'options': {
            'temperature': 0.1,
            'num_predict': 80,
            'top_k': 1
        }
    },
    timeout=20
)

elapsed = time.time() - t0
raw = response.json()['response']
print(f"LLM responded in {elapsed:.2f} seconds")
print(f"Raw response: {repr(raw)}")