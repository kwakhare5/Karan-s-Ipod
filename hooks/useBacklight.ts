import { useState, useCallback, useEffect, useRef } from 'react';

export type BacklightTimeout = 5 | 10 | 20 | 0; // 0 = always on

export const BACKLIGHT_OPTIONS: { value: BacklightTimeout; label: string }[] = [
    { value: 5, label: '5 Seconds' },
    { value: 10, label: '10 Seconds' },
    { value: 20, label: '20 Seconds' },
    { value: 0, label: 'Always On' },
];

export const useBacklight = () => {
    const [timeout, setTimeout_] = useState<BacklightTimeout>(() => {
        const saved = localStorage.getItem('backlight_timeout');
        return saved ? (parseInt(saved) as BacklightTimeout) : 0;
    });
    const [isDimmed, setIsDimmed] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        setIsDimmed(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (timeout > 0) {
            timerRef.current = globalThis.setTimeout(() => {
                setIsDimmed(true);
            }, timeout * 1000);
        }
    }, [timeout]);

    const setBacklightTimeout = useCallback((newTimeout: BacklightTimeout) => {
        setTimeout_(newTimeout);
        localStorage.setItem('backlight_timeout', String(newTimeout));
        setIsDimmed(false);
    }, []);

    // Reset timer on any user interaction
    useEffect(() => {
        const events = ['click', 'keydown', 'mousemove', 'touchstart', 'wheel'];
        const handler = () => resetTimer();
        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        resetTimer(); // Initial
        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);

    return {
        isDimmed,
        timeout,
        setBacklightTimeout,
        resetTimer,
    };
};
