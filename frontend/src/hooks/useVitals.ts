import { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch } from '../auth';
import { Alert, VitalsData, generateAlerts } from '../utils/vitalsUtils';

const POLL_INTERVAL_MS = 3000;

/**
 * Polls /api/vitals (admin/doctor) or /api/vitals/mine (patient) every 3 seconds.
 * Returns live vitals and derived alerts.
 */
export function useVitals(mode: 'all' | 'mine' = 'all') {
    const [vitals, setVitals] = useState<VitalsData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const poll = useCallback(async () => {
        try {
            const url = mode === 'mine' ? '/api/vitals/mine' : '/api/vitals';
            const res = await authFetch(url);
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setError(d.error ?? 'Failed to fetch vitals');
                return;
            }
            const data = await res.json();
            // /mine returns a single object; wrap it for uniform handling
            const arr: VitalsData[] = Array.isArray(data) ? data : [data];
            setVitals(arr);
            setAlerts(generateAlerts(arr));
            setError(null);
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        poll(); // immediate first fetch
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [poll]);

    return { vitals, alerts, loading, error };
}
