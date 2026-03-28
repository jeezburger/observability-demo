import requests

response = requests.post(
    'http://localhost:11434/api/generate',
    json={
        'model': 'phi3:mini',
        'prompt': 'SRE AI. Return ONLY JSON, no markdown, no backticks, no explanation.\n\nFault: payment_gateway_timeout\nService: paymentservice\nError: timeout\nLogs: ERROR: timeout | ERROR: retry failed\n\nJSON: {"root_cause":"...","affected_service":"...","severity":"critical","remediation_action":"restart_service","confidence":0.95}',
        'stream': False,
        'options': {'temperature': 0.1}
    },
    timeout=15
)

raw = response.json()['response']
print('=== RAW RESPONSE START ===')
print(repr(raw))
print('=== RAW RESPONSE END ===')