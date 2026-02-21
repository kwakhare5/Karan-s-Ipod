import React, { useState, useEffect } from 'react';
import { } from 'lucide-react';

interface StatusBarProps {
    title: string;
    isPlaying?: boolean;
    batteryLevel?: number;
    theme?: 'light' | 'dark';
    background?: string;
    hasActiveTrack?: boolean;
}

    export const StatusBar: React.FC<StatusBarProps> = React.memo(({
        title,
        isPlaying = false,
        batteryLevel = 80,
        theme = 'light',
        background,
        // Optional prop to know if we're paused vs stopped
        hasActiveTrack = false,
    }: StatusBarProps) => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const defaultLightBg = 'linear-gradient(180deg, #F0F0F0 0%, #C8C8C8 100%)';
    const defaultDarkBg = 'linear-gradient(180deg, #505050 0%, #292929 100%)';
    const activeBackground = background || (theme === 'dark' ? defaultDarkBg : defaultLightBg);
    const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';

    return (
        <div
            className="w-full flex items-center justify-between shrink-0 z-20 select-none overflow-hidden"
            style={{
                height: '42px',
                background: activeBackground,
                padding: '0 12px',
                boxSizing: 'border-box',
                borderBottom: '1px solid rgba(0,0,0,0.15)'
            }}
        >
            {/* Left - Clock */}
            <div style={{ width: '82px', height: '100%', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, -apple-system, sans-serif', fontWeight: 700, fontSize: '17px', color: textColor, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                    {time}
                </span>
            </div>

            {/* Center - Title */}
            <div className="flex-1 flex items-center justify-center h-full overflow-hidden">
                <span style={{ fontFamily: 'Inter, -apple-system, sans-serif', fontWeight: 700, fontSize: '18px', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title}
                </span>
            </div>

            {/* Right - Play/Pause indicator + Battery */}
            <div className="flex justify-end items-center h-full pr-1" style={{ width: '82px', gap: '13px' }}>
                <style>
                    {`
                        @keyframes wave-1 { 0%, 100% { height: 6px; } 50% { height: 10px; } }
                        @keyframes wave-2 { 0%, 100% { height: 8px; } 50% { height: 12px; } }
                        @keyframes wave-3 { 0%, 100% { height: 10px; } 50% { height: 14px; } }
                        .ref-bar { width: 2.5px; background: ${textColor}; border-radius: 4px; flex: none; }
                        .wb-1 { animation: wave-1 0.8s ease-in-out infinite; }
                        .wb-2 { animation: wave-2 0.6s ease-in-out infinite; animation-delay: 0.1s; }
                        .wb-3 { animation: wave-3 0.7s ease-in-out infinite; animation-delay: 0.2s; }
                    `}
                </style>
                {/* Playback Indicator Container - Fixed width for absolute stability */}
                <div style={{ 
                    width: '21px', // (5 bars * 2.5px) + (4 gaps * 2px) = 20.5px
                    height: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        {isPlaying ? (
                            <>
                                {/* 5-bar symmetric dynamic sound wave */}
                                <div className="ref-bar wb-1" style={{ height: '6px' }} />
                                <div className="ref-bar wb-2" style={{ height: '10px' }} />
                                <div className="ref-bar wb-3" style={{ height: '14px' }} />
                                <div className="ref-bar wb-2" style={{ height: '10px' }} />
                                <div className="ref-bar wb-1" style={{ height: '6px' }} />
                            </>
                        ) : hasActiveTrack ? (
                            <>
                                {/* 5-bar static sound wave for Pause state */}
                                <div className="ref-bar" style={{ height: '6px' }} />
                                <div className="ref-bar" style={{ height: '10px' }} />
                                <div className="ref-bar" style={{ height: '14px' }} />
                                <div className="ref-bar" style={{ height: '10px' }} />
                                <div className="ref-bar" style={{ height: '6px' }} />
                            </>
                        ) : null}
                    </div>
                </div>

                {/* Battery Icon */}
                <div className="flex items-center relative" style={{ height: '14px' }}>
                    <div style={{ 
                        width: '28px', 
                        height: '14px', 
                        border: `2px solid ${theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}`, 
                        borderRadius: '4.5px', 
                        padding: '1.5px',
                        display: 'flex',
                        alignItems: 'center',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ 
                            width: `${batteryLevel}%`, 
                            height: '100%', 
                            background: '#4CD964',
                            borderRadius: '1px' 
                        }} />
                    </div>
                    {/* Integrated Cap */}
                    <div style={{ 
                        position: 'absolute',
                        right: '-3px',
                        top: '4px',
                        width: '2.5px', 
                        height: '6px', 
                        background: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                        borderRadius: '0 2px 2px 0'
                    }} />
                </div>
            </div>
        </div>
    );
});
