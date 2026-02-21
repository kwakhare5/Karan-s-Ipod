
import React, { useRef, useEffect, useCallback } from 'react';

interface UseClickWheelProps {
  onScroll: (direction: 'cw' | 'ccw') => void;
  onSelect?: () => void;  // Center button press
  onBack?: () => void;    // Left/Back button
  onForward?: () => void; // Right/Forward button
  enabled: boolean;
}

export const useClickWheel = ({ onScroll, onSelect, onBack, onForward, enabled }: UseClickWheelProps) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const onScrollRef = useRef(onScroll);
  const onSelectRef = useRef(onSelect);
  const onBackRef = useRef(onBack);
  const onForwardRef = useRef(onForward);

  const stateRef = useRef({
    isDragging: false,
    lastAngle: 0,
    accumulatedDelta: 0,
    lastScrollTime: 0,
    lastKeyTime: 0,
  });

  // Keep callback refs in sync with props
  useEffect(() => {
    onScrollRef.current = onScroll;
    onSelectRef.current = onSelect;
    onBackRef.current = onBack;
    onForwardRef.current = onForward;
  }, [onScroll, onSelect, onBack, onForward]);

  const calculateAngle = (x: number, y: number, cx: number, cy: number) => {
    return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  };

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!wheelRef.current || !enabled) return;

    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    stateRef.current.isDragging = true;
    stateRef.current.lastAngle = calculateAngle(clientX, clientY, cx, cy);
    stateRef.current.accumulatedDelta = 0;
    stateRef.current.lastScrollTime = Date.now();
  }, [enabled]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging || !wheelRef.current) return;

    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const currentAngle = calculateAngle(clientX, clientY, cx, cy);
    let delta = currentAngle - stateRef.current.lastAngle;

    // Handle wrap-around (crossing 180/-180 boundary)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    stateRef.current.accumulatedDelta += delta;
    stateRef.current.lastAngle = currentAngle;

    // 30-degree threshold for scroll event (Increased sensitivity)
    const THRESHOLD = 30;
    const absDelta = Math.abs(stateRef.current.accumulatedDelta);

    if (absDelta >= THRESHOLD) {
        const direction = stateRef.current.accumulatedDelta > 0 ? 'cw' : 'ccw';
        
        // Use requestAnimationFrame to ensure scroll updates are synced with display refresh (90FPS goal)
        requestAnimationFrame(() => {
            onScrollRef.current(direction);
        });

        // Carry over the remainder to avoid "lost" degrees during fast turns
        stateRef.current.accumulatedDelta %= THRESHOLD;
    }
  }, []);

  const handleEnd = useCallback(() => {
    stateRef.current.isDragging = false;
    stateRef.current.accumulatedDelta = 0;
  }, []);

  // Set up event listeners once, never recreate
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleEnd();

    const handleTouchMove = (e: TouchEvent) => {
      if (stateRef.current.isDragging) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => handleEnd();

    const handleWheel = (e: WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();
      // Mouse scroll wheel: deltaY > 0 = scroll down = cw, deltaY < 0 = scroll up = ccw
      const direction = e.deltaY > 0 ? 'cw' : 'ccw';
      onScrollRef.current(direction);
    };

    // Attach global listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Attach to wheel element
    const wheel = wheelRef.current;
    if (wheel) {
      wheel.addEventListener('touchmove', handleTouchMove, { passive: false });
      wheel.addEventListener('touchend', handleTouchEnd);
      wheel.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (wheel) {
        wheel.removeEventListener('touchmove', handleTouchMove);
        wheel.removeEventListener('touchend', handleTouchEnd);
        wheel.removeEventListener('wheel', handleWheel);
      }
    };
  }, [enabled, handleMove, handleEnd]);

  return {
    wheelRef,
    handleMouseDown: (e: React.MouseEvent) => handleStart(e.clientX, e.clientY),
    handleTouchStart: (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY),
  };
};
