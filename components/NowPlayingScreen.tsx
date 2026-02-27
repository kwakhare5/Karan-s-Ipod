import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Track } from '../src/types';
import { StatusBar } from './StatusBar';
import { Shuffle, Repeat, Heart, Loader2 } from 'lucide-react';

interface NowPlayingScreenProps {
  track: Track;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  isLiked?: boolean;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onSeek: (fraction: number) => void;
  volume?: number;
  queueIndex?: number;
  queueLength?: number;
}

const F = "'Inter', -apple-system, sans-serif";

function fmt(s: number): string {
  if (!s || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
  track,
  isPlaying,
  isLoading,
  progress,
  currentTime,
  duration,
  isShuffled,
  repeatMode,
  isLiked,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onSeek,
  volume = 1,
  queueIndex = 0,
  queueLength = 1,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [volShow, setVolShow] = useState(false);
  const volTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVolShow(true), 0);
    if (volTimer.current) clearTimeout(volTimer.current);
    volTimer.current = setTimeout(() => setVolShow(false), 1200);
    return () => {
      clearTimeout(timer);
      if (volTimer.current) clearTimeout(volTimer.current);
    };
  }, [volume]);

  const frac = useCallback((cx: number) => {
    if (!barRef.current) return 0;
    const r = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (cx - r.left) / r.width));
  }, []);

  const onPD = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      barRef.current?.setPointerCapture(e.pointerId);
      onSeek(frac(e.clientX));
    },
    [onSeek, frac]
  );

  const onPM = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current) onSeek(frac(e.clientX));
    },
    [onSeek, frac]
  );

  const onPU = useCallback(() => {
    dragging.current = false;
  }, []);

  const rem = Math.max(0, duration - currentTime);
  const pct = `${(progress * 100).toFixed(2)}%`;

  // Consistent button style
  const btn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
    transition: 'color 0.15s',
  };

  /* paddings */
  const px = 16; // horizontal padding for the bottom section

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        background: 'linear-gradient(180deg, #2a2a2c 0%, #1a1a1c 100%)',
        position: 'relative',
      }}
    >
      {/* ── Volume overlay ── */}
      {volShow && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'rgba(0,0,0,0.8)',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 150,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{ fontSize: 11, color: '#fff', fontFamily: F }}>Vol</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round(volume * 100)}%`,
                background: '#fff',
                borderRadius: 2,
                transition: 'width 0.1s',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 9,
              color: '#8e8e93',
              fontFamily: F,
              minWidth: 24,
              textAlign: 'right',
            }}
          >
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* ── Status Bar ── */}
      <StatusBar title="Now Playing" isPlaying={isPlaying} hasActiveTrack={true} theme="dark" />

      {/* ── Content area (flexbox column) ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          minHeight: 0,
          background: '#1c1c1e', // Solid premium dark background
        }}
      >
        {/* ── Album Art ── */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, marginTop: 12 }}>
          <div
            style={{
              width: 154,
              height: 154,
              borderRadius: 10,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: 'scale(1.0)',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== track.thumbnailUrlBackup && track.thumbnailUrlBackup) {
                  target.src = track.thumbnailUrlBackup;
                } else {
                  target.style.display = 'none';
                }
              }}
            />
            {/* Placeholder emoji shown if image fails/hidden */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#fff',
                zIndex: -1,
              }}
            >
              🎵
            </div>
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  animation: 'fadeIn 0.5s ease-in-out', // Subtle fade to prevent flash
                }}
              >
                <Loader2 size={32} color="#fff" className="animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* ── Track title + artist ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            textAlign: 'center',
            flexShrink: 0,
            marginTop: 12,
            padding: `0 ${px}px`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: F,
              letterSpacing: '-0.015em',
            }}
          >
            {track.title}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#aeaeb2',
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: F,
              letterSpacing: '-0.01em',
            }}
          >
            {track.artist}
          </div>
        </div>

        {/* ══════ Bottom section ══════ */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            flexShrink: 0,
            marginTop: 'auto', // Pushes to bottom
            padding: `0 ${px}px 26px`, // Increased bottom padding to lift icons up
          }}
        >
          {/* ── Scrubber ── */}
          <div
            ref={barRef}
            onPointerDown={onPD}
            onPointerMove={onPM}
            onPointerUp={onPU}
            style={{
              position: 'relative',
              width: '100%',
              height: 22,
              cursor: 'pointer',
              touchAction: 'none',
            }}
          >
            {/* Track background */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 10,
                height: 3,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 1.5,
              }}
            />
            {/* Filled */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 10,
                height: 3,
                width: pct,
                background: '#fff',
                borderRadius: 1.5,
              }}
            />
            {/* Knob */}
            <div
              style={{
                position: 'absolute',
                left: pct,
                top: 11.5,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>

          {/* Time labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              fontWeight: 500,
              color: '#8e8e93',
              fontFamily: F,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 2,
              lineHeight: 1,
            }}
          >
            <span>{fmt(currentTime)}</span>
            <span>-{fmt(rem)}</span>
          </div>

          {/* ── Controls row: shuffle  ·  queue  ·  heart  ·  repeat ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              height: 26,
            }}
          >
            {/* Shuffle – far left */}
            <button
              onClick={onToggleShuffle}
              style={{ ...btn, color: isShuffled ? '#0a84ff' : '#8e8e93', width: 26, height: 26 }}
            >
              <Shuffle size={16} strokeWidth={2.5} />
            </button>

            {/* Queue counter – center */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#8e8e93',
                fontFamily: F,
                fontVariantNumeric: 'tabular-nums',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {queueIndex + 1} of {queueLength}
            </span>

            {/* Heart + Repeat – far right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={onToggleLike}
                style={{ ...btn, color: isLiked ? '#ff453a' : '#8e8e93', width: 26, height: 26 }}
              >
                <Heart
                  size={16}
                  fill={isLiked ? 'currentColor' : 'none'}
                  strokeWidth={isLiked ? 0 : 2.5}
                />
              </button>
              <button
                onClick={onToggleRepeat}
                style={{
                  ...btn,
                  color: repeatMode !== 'off' ? '#0a84ff' : '#8e8e93',
                  width: 26,
                  height: 26,
                  position: 'relative',
                }}
              >
                <Repeat size={16} strokeWidth={2.5} />
                {repeatMode === 'one' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 7,
                      fontWeight: 800,
                      color: '#0a84ff',
                    }}
                  >
                    1
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
