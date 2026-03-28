import { useState, useEffect } from 'react';

const STATUS_API = 'http://localhost:8090';

export function useStatus(interval = 2000) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${STATUS_API}/status`);
        if (!res.ok) throw new Error('offline');
        const data = await res.json();
        setStatus(data);
        setError(false);
      } catch (err) {
        setError(true);
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, interval);
    return () => clearInterval(timer);
  }, [interval]);

  const postEvent = async (eventType, data) => {
    try {
      await fetch(`${STATUS_API}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, data }),
      });
      return true;
    } catch (err) {
      console.error('Failed to post event:', err);
      return false;
    }
  };

  return { status, error, postEvent };
}
