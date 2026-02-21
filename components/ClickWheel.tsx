
import React from 'react';
import { useClickWheel } from '../hooks/useClickWheel';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface ClickWheelProps {
  onScroll: (direction: 'cw' | 'ccw') => void;
  onMenu: () => void;
  onSelect: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  enabled?: boolean;
}

export const ClickWheel = React.memo<ClickWheelProps>(({
  onScroll,
  onMenu,
  onSelect,
  onPlayPause,
  onNext,
  onPrev,
  enabled = true
}) => {
  const { wheelRef, handleMouseDown, handleTouchStart } = useClickWheel({
    onScroll,
    onSelect,
    onBack: onMenu,
    onForward: onNext,
    enabled
  });

  // Colors from spec
  const COLOR_NORMAL = "#9F9DB0";

  // Wheel dimensions from spec
  const WHEEL_SIZE = 250.92;
  const CENTER_SIZE = 91.02;

  // Common button styles
  const buttonStyle = "absolute z-10 flex items-center justify-center group transition-colors duration-75 outline-none touch-manipulation cursor-pointer";

  return (
    <div
      ref={wheelRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="relative select-none rounded-full"
      style={{
        width: `${WHEEL_SIZE}px`,
        height: `${WHEEL_SIZE}px`,
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
    >
      {/* The Wheel Surface (Background) */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden active:brightness-95 transition-all"
        style={{
          background: '#F6FAFB',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.1), 0px 4px 8px rgba(0,0,0,0.08), 0px 8px 16px rgba(0,0,0,0.06)'
        }}
      >
      </div>

      {/* MENU (Top) */}
      <button
        onClick={(e) => { e.stopPropagation(); onMenu(); }}
        className={`${buttonStyle} left-1/2 -translate-x-1/2`}
        style={{
          top: '20px', // Optically centered
          width: '60px',
          height: '40px',
          color: COLOR_NORMAL
        }}
      >
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '15px', 
            fontWeight: 600,
            letterSpacing: '0.05em' // Refined tracking
          }}
          className="group-active:text-[#7C7A8D]"
        >
          MENU
        </span>
      </button>

      {/* PREV (Left) */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className={`${buttonStyle} top-1/2 -translate-y-1/2`}
        style={{
          left: '18px',
          width: '50px',
          height: '50px',
          color: COLOR_NORMAL
        }}
      >
        <SkipBack
          size={22}
          fill="currentColor"
          className="group-active:text-[#7C7A8D] transition-colors"
        />
      </button>

      {/* NEXT (Right) */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className={`${buttonStyle} top-1/2 -translate-y-1/2`}
        style={{
          right: '18px',
          width: '50px',
          height: '50px',
          color: COLOR_NORMAL
        }}
      >
        <SkipForward
          size={22}
          fill="currentColor"
          className="group-active:text-[#7C7A8D] transition-colors"
        />
      </button>

      {/* PLAY/PAUSE (Bottom) */}
      <button
        onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
        className={`${buttonStyle} left-1/2 -translate-x-1/2 items-end gap-1`}
        style={{
          top: '200px', // Balanced against MENU
          width: '60px',
          height: '30px',
          color: COLOR_NORMAL
        }}
      >
        <div className="flex group-active:text-[#7C7A8D] transition-colors">
          <Play size={15} fill="currentColor" />
          <Pause size={15} fill="currentColor" className="-ml-1" />
        </div>
      </button>

      {/* CENTER BUTTON (Select) - Inner Circle */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-30 active:brightness-95 outline-none cursor-pointer"
        style={{
          width: `${CENTER_SIZE}px`,
          height: `${CENTER_SIZE}px`,
          background: 'linear-gradient(135deg, #E8E8E8 0%, #D1D1D1 100%)',
          boxShadow: 'inset 0px 1px 2px rgba(255,255,255,0.8), 0px 1px 3px rgba(0,0,0,0.1)',
          border: 'none'
        }}
        aria-label="Select"
      />
    </div>
  );
});
