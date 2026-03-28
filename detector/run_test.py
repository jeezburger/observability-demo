import json
import time
import os
from unittest.mock import patch
import detector

# File to store results
JSON_FILE = "anomalies.json"

def on_anomaly(event):
    """Callback function that runs whenever an anomaly is detected."""
    print(f"\n[!] ANOMALY FOUND (Source: {event['source']})")
    
    # Load existing anomalies or start a new list
    data = []
    if os.path.exists(JSON_FILE):
        try:
            with open(JSON_FILE, "r") as f:
                data = json.load(f)
        except Exception:
            data = []
            
    # Append the new anomaly and save
    data.append(event)
    with open(JSON_FILE, "w") as f:
        json.dump(data, f, indent=4)
    print(f"[*] Saved event to {JSON_FILE}")

if __name__ == "__main__":
    print("--- Starting AI Observability Test Runner ---")
    print(f"Watching for anomalies... Results will be recorded in {JSON_FILE}")
    
    # Clear old results if any
    if os.path.exists(JSON_FILE):
        os.remove(JSON_FILE)
    
    # Mock data to trigger anomalies immediately for testing
    # Normal data: [0.001, 45.0, 12.0], Abnormal data: [0.95, 5000.0, 95.0]
    
    # We mock everything so it works even without a baseline model file
    with patch('detector.load_or_train_model') as mock_load, \
         patch('detector.get_prometheus_metrics', return_value=[0.95, 5000.0, 95.0]), \
         patch('detector.get_loki_error_count', return_value=150), \
         patch('detector.start_http_server'): # Don't try to bind to real port 8001
         
        # Mock a pre-trained model for the test
        mock_model = mock_load.return_value
        mock_model.decision_function.return_value = [-0.35]
        
        # Start the detector with our callback
        stop_event = detector.start(on_anomaly)
        
        try:
            print("Detector is running. Waiting for 10 seconds of activity...")
            # We wait a few seconds to let threads process
            time.sleep(10)
        except KeyboardInterrupt:
            pass
        finally:
            stop_event.set()
            print(f"\nTest finished. Check {JSON_FILE} for results.")
