import unittest
from unittest.mock import patch, MagicMock
import time
import json
import threading

# Import the module under test
import detector

class TestDetector(unittest.TestCase):
    def setUp(self):
        # Reset global state of detector module
        detector.last_anomaly_time = 0.0

    @patch('detector.get_prometheus_metrics')
    @patch('detector.get_loki_error_count')
    @patch('detector.start_http_server') # Avoid port conflicts
    @patch('detector.time.sleep', side_effect=lambda x: None) # mock sleep for speed but allow threads to switch
    def test_detector_integration(self, mock_sleep, mock_http, mock_loki, mock_prometheus):
        """Integration test for detector module."""
        print("\n--- Testing AI Observability Detector ---", flush=True)
        
        # 1. Setup mock data
        normal_metrics = [0.001, 45.0, 12.0]
        anomaly_metrics = [0.52, 2100.0, 78.0]
        
        # We need enough samples for the entire test
        # 180 (train) + 10 (normal) + 5 (anomaly) = 195
        mock_prometheus.side_effect = [normal_metrics] * 180 + [normal_metrics] * 10 + [anomaly_metrics] * 10
        
        # Loki counts should also be mocked. The watcher checks count > mean + 3*std.
        # Mean of 10 samples of 2 = 2. Std = 0. Spike to 50 will trigger.
        mock_loki.side_effect = [2] * 200 + [50] * 10
        
        # 2. Test Model Training
        print("Test 1: IsolationForest Training...", flush=True)
        try:
            # Training calls get_prometheus_metrics 180 times
            model = detector.train_baseline()
            self.assertIsNotNone(model)
            print("PASS: Model trained on normal data", flush=True)
        except Exception as e:
            print(f"FAIL: Training failed: {e}", flush=True)
            self.fail(f"Training failed: {e}")

        # 3. Test Anomaly Callback
        print("Test 2: Anomaly Detection and Callback...", flush=True)
        
        recorded_events = []
        def test_callback(event):
            recorded_events.append(event)
            
        # Temporarily restore real sleep for the main loop of start
        # Wait, if we use side_effect=None, it returns None.
        # But maybe we need a tiny bit of real sleep?
        
        stop_event = detector.start(test_callback)
        
        # Give the threads some time (they will spin very fast due to mocked sleep)
        # 10s timeout
        start_time = time.time()
        while len(recorded_events) < 1 and (time.time() - start_time) < 10:
            # We use real time.sleep here because we didn't patch this thread's sleep!
            # Python 3 patches globally if you patch 'detector.time.sleep'.
            # Wait, detector has 'import time', so detector.time is the time module.
            # Patching 'detector.time.sleep' replaces it!
            # So the threads in detector will use the mock, but THIS thread will use real time.sleep.
            time.sleep(0.01) 
            
        stop_event.set()
        
        if len(recorded_events) > 0:
            print(f"PASS: Callback fired ({len(recorded_events)} events recorded)", flush=True)
            print(f"First event source: {recorded_events[0]['source']}", flush=True)
            
            # 4. Verify Event Dictionary (Requirement 195)
            print("Test 3: Event Dictionary Structure...", flush=True)
            event = recorded_events[0]
            expected_keys = ["timestamp", "anomaly_score", "source", "confidence"]
            if event["source"] == "metrics":
                expected_keys.append("metric_vector")
            else:
                expected_keys.append("log_error_count")
                
            missing_keys = [k for k in expected_keys if k not in event]
            if not missing_keys:
                print(f"PASS: Dictionary structure correct for {event['source']} anomaly", flush=True)
            else:
                print(f"FAIL: Missing keys in event: {missing_keys}", flush=True)
                self.fail(f"Missing keys: {missing_keys}")
        else:
            print("FAIL: No anomaly detected within 10s timeout", flush=True)
            self.fail("Anomaly detection timeout")

if __name__ == "__main__":
    # Run tests
    suite = unittest.TestLoader().loadTestsFromTestCase(TestDetector)
    result = unittest.TextTestRunner(verbosity=0).run(suite)
    
    if result.wasSuccessful():
        # Final output required by prompt
        print("\nPASS")
    else:
        print("\nFAIL")
