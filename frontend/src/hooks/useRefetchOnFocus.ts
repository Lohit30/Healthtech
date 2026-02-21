import { useEffect } from 'react';

/**
 * Re-runs `fetchFn` whenever the browser tab becomes visible.
 * This ensures stale data is refreshed after the user switches
 * between dashboards or browser tabs.
 */
export function useRefetchOnFocus(fetchFn: () => void) {
    useEffect(() => {
        const handler = () => {
            if (document.visibilityState === 'visible') fetchFn();
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [fetchFn]);
}
