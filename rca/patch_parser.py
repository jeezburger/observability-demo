"""
patch_parser.py - Standalone copy of the LLM response parser for testing.

This is the same parse_llm_response function used in rca_pipeline.py,
extracted here for independent testing and validation.
"""

import re
import json


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


if __name__ == "__main__":
    # Test with the exact problematic output from phi3
    test_cases = [
        # Case 1: Wrapped in ```json fences with unquoted key
        '```json\n{\n  "root_cause": "Payment gateway timeout",\n  dependent on: ["network"],\n  "remediation_action": "restart paymentgateway service",\n  "affected_service": "paymentservice",\n  "severity": "critical",\n  "confidence": 0.92\n}\n```',
        # Case 2: Clean JSON
        '{"root_cause":"timeout","affected_service":"paymentservice","severity":"critical","remediation_action":"restart_service","confidence":0.95}',
        # Case 3: JSON with extra text
        'Here is the result:\n{"root_cause":"timeout","affected_service":"paymentservice","severity":"critical","remediation_action":"circuit break the gateway","confidence":0.9}\nDone.',
    ]

    for i, raw in enumerate(test_cases, 1):
        print(f"\n=== Test Case {i} ===")
        print(f"Input: {repr(raw[:80])}...")
        result = parse_llm_response(raw)
        print(f"Output: {json.dumps(result, indent=2)}")
