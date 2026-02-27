import { useState, useRef, useCallback, useEffect } from 'react';
import { Track } from '../src/types';
import { searchSongs } from '../src/utils/musicApi';

// YouTube IFrame API types
interface YTPlayerEvent {
  target: { setVolume: (v: number) => void };
  data: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YTPlayerInstance = any;

// Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
  }
}

export interface MusicPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
  isLoading: boolean;
  error: string | null;
  isShuffled: boolean;
  repeatMode: 'off' | 'one' | 'all';
}

export const useMusicPlayer = () => {
  // We no longer use an HTMLAudioElement. We use the YouTube IFrame API.
  const ytPlayerRef = useRef<YTPlayerInstance>(null);
  const playerReadyRef = useRef<boolean>(false);
  const playQueueRef = useRef<{ queue: Track[]; index: number } | null>(null);

  const [state, setState] = useState<MusicPlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume: 1,
    queue: [],
    queueIndex: -1,
    isLoading: false,
    error: null,
    isShuffled: false,
    repeatMode: 'off',
  });

  // Helper: fetch related songs from backend
  const fetchRelated = async (artist: string): Promise<Track[]> => {
    try {
      const results = await searchSongs(artist);
      return results.map(
        (item: {
          id: string;
          title: string;
          artist: string;
          duration: number;
          thumbnail: string;
        }) => ({
          videoId: item.id,
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          thumbnailUrl: item.thumbnail,
          album: 'Unknown',
        })
      );
    } catch {
      return [];
    }
  };

  // Helper: play a track by index from a queue
  const playFromQueue = useCallback(
    async (queue: Track[], idx: number) => {
      const track = queue[idx];

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        queueIndex: idx,
        queue,
        isPlaying: true, // Optimistic
        isLoading: true,
        error: null,
        progress: 0,
        currentTime: 0,
        duration: track.duration || 0,
      }));

      if (!playerReadyRef.current || !ytPlayerRef.current) {
        // Queue it up for when the API script finishes loading
        playQueueRef.current = { queue, index: idx };
        return;
      }

      try {
        ytPlayerRef.current.loadVideoById(track.videoId);
      } catch (err) {
        console.error('[YT API Error]:', err);
        setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to start video' }));
      }

      // Auto-fetch related queue natively if no more queue exists
      if (idx === queue.length - 1 && queue.length < 50) {
        fetchRelated(track.artist).then((related) => {
          if (related.length > 0) {
            const uniqueNew = related.filter(
              (t) => !queue.some((ext) => ext.videoId === t.videoId)
            );
            if (uniqueNew.length > 0) {
              setState((prev) => ({
                ...prev,
                queue: [...prev.queue, ...uniqueNew],
              }));
            }
          }
        });
      }
    },
    [] // playFromQueue is stable; it reads state via setState callbacks
  );

  const handleTrackEnd = useCallback(() => {
    setState((prev) => {
      if (prev.repeatMode === 'one') {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.seekTo(0);
          ytPlayerRef.current.playVideo();
        }
        return prev;
      }

      const newIndex = prev.queueIndex + 1;
      if (newIndex < prev.queue.length) {
        setTimeout(() => playFromQueue(prev.queue, newIndex), 0);
        return prev;
      } else if (prev.repeatMode === 'all' && prev.queue.length > 0) {
        setTimeout(() => playFromQueue(prev.queue, 0), 0);
        return prev;
      }

      // Stop playing
      return { ...prev, isPlaying: false, progress: 0, currentTime: 0 };
    });
  }, [playFromQueue]);

  const onPlayerReady = useCallback(
    (event: YTPlayerEvent) => {
      playerReadyRef.current = true;
      event.target.setVolume(state.volume * 100);

      // If a play request was queued before the player was ready, execute it now
      if (playQueueRef.current) {
        playFromQueue(playQueueRef.current.queue, playQueueRef.current.index);
        playQueueRef.current = null;
      }
    },
    [state.volume, playFromQueue]
  );

  const onPlayerStateChange = useCallback(
    (event: YTPlayerEvent) => {
      const YT_STATE = window.YT.PlayerState;

      switch (event.data) {
        case YT_STATE.PLAYING:
          // Force volume update whenever playback starts to ensure consistency across devices
          if (ytPlayerRef.current) {
            ytPlayerRef.current.setVolume(state.volume * 100);
          }
          setState((prev) => ({
            ...prev,
            isPlaying: true,
            isLoading: false,
            error: null,
            duration: ytPlayerRef.current?.getDuration?.() || prev.duration,
          }));
          break;
        case YT_STATE.PAUSED:
          setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
          break;
        case YT_STATE.ENDED:
          handleTrackEnd();
          break;
        case YT_STATE.BUFFERING:
          // Only show loading if we're not explicitly in a play/pause transition
          setState((prev) => ({
            ...prev,
            isLoading: prev.currentTrack ? prev.isLoading : true,
          }));
          break;
        case YT_STATE.UNSTARTED:
        case YT_STATE.CUED:
          break;
      }
    },
    [handleTrackEnd, state.volume]
  );

  const onPlayerError = useCallback((event: YTPlayerEvent) => {
    console.error('[YouTube Player Error]', event.data);
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      error: 'Playback failed. The video might be restricted or blocked.',
    }));
  }, []);

  // Inject the YouTube IFrame API Script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        // Create an invisible div to hold the iframe
        const div = document.createElement('div');
        div.id = 'yt-invisible-player';
        // IMPORTANT: DO NOT USE display: none. iOS Safari and Mobile Chrome
        // will aggressively block autoplay if the iframe is completely hidden.
        div.style.position = 'absolute';
        div.style.top = '-9999px';
        div.style.left = '-9999px';
        div.style.width = '1px';
        div.style.height = '1px';
        document.body.appendChild(div);

        ytPlayerRef.current = new window.YT.Player('yt-invisible-player', {
          height: '1',
          width: '1',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError,
          },
        });
      };
    } else if (!ytPlayerRef.current) {
      // API already loaded but player not created (e.g., hot reload)
      window.onYouTubeIframeAPIReady();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup loop to sync time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (state.isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration() || 1;
          setState((prev) => ({
            ...prev,
            currentTime,
            progress: currentTime / duration,
          }));
        }
      }, 500); // 500ms sync is smooth enough
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isPlaying]);

  // PUBLIC API

  const playSong = useCallback(
    (track: Track, newQueue?: Track[]) => {
      // SYNCHRONOUS MOBILE AUTOPLAY FIX
      // Mobile Safari/Chrome require media playback to start *synchronously*
      // within the click event handler. The setTimeout below breaks this chain.
      if (playerReadyRef.current && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.loadVideoById(track.videoId);
        } catch (e) {
          console.warn('Mobile sync play failed:', e);
        }
      }

      let q = newQueue || [track];
      // If we're currently shuffled and given a new queue, shuffle the new queue.
      if (newQueue) {
        setState((prev) => {
          if (prev.isShuffled) {
            const others = [...newQueue].filter((t) => t.videoId !== track.videoId);
            // basic shuffle
            for (let i = others.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [others[i], others[j]] = [others[j], others[i]];
            }
            q = [track, ...others];
          }
          return prev;
        });
      } else {
        // If no new queue is provided, see if track is in the existing queue
        setState((prev) => {
          const foundIndex = prev.queue.findIndex((t) => t.videoId === track.videoId);
          if (foundIndex !== -1) {
            q = prev.queue; // use existing queue
          } else {
            // not in queue, treat as single item queue
            q = [track];
          }
          return prev; // We're not fully updating state here, `playFromQueue` handles that.
        });
      }

      // Call outside of setState to avoid capturing old closure variables
      setTimeout(() => {
        // Re-find the index in case q changed
        let idx = q.findIndex((t) => t.videoId === track.videoId);
        if (idx === -1) idx = 0;
        playFromQueue(q, idx);
      }, 0);
    },
    [playFromQueue]
  );

  const togglePlayPause = useCallback(() => {
    if (!state.currentTrack || !ytPlayerRef.current) return;

    if (state.isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [state.isPlaying, state.currentTrack]);

  const seekTo = useCallback((timeOrFraction: number) => {
    if (ytPlayerRef.current) {
      // If value is between 0 and 1, treat as fraction of duration
      // (NowPlayingScreen scrubber passes fractions)
      const dur = ytPlayerRef.current.getDuration?.() || 0;
      const timeSec =
        timeOrFraction >= 0 && timeOrFraction <= 1 && dur > 0
          ? timeOrFraction * dur
          : timeOrFraction;
      ytPlayerRef.current.seekTo(timeSec, true);
      setState((prev) => ({
        ...prev,
        currentTime: timeSec,
        progress: prev.duration > 0 ? timeSec / prev.duration : 0,
      }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(clamped * 100);
    }
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const nextTrack = useCallback(() => {
    if (!state.queue.length || state.queueIndex === -1) return;

    let newIndex = state.queueIndex + 1;
    if (newIndex >= state.queue.length) {
      if (state.repeatMode === 'all') {
        newIndex = 0;
      } else {
        return; // End of list
      }
    }
    playFromQueue(state.queue, newIndex);
  }, [state.queue, state.queueIndex, state.repeatMode, playFromQueue]);

  const prevTrack = useCallback(() => {
    if (!state.currentTrack) return;

    // If past 3 seconds, just restart track
    if (state.currentTime > 3) {
      seekTo(0);
      return;
    }

    let newIndex = state.queueIndex - 1;
    if (newIndex < 0) {
      newIndex = state.queue.length - 1; // wrap around
    }
    playFromQueue(state.queue, newIndex);
  }, [state.queue, state.queueIndex, state.currentTrack, state.currentTime, seekTo, playFromQueue]);

  const toggleShuffle = useCallback(() => {
    setState((prev) => {
      if (!prev.isShuffled) {
        // Enable shuffle
        if (!prev.currentTrack || prev.queue.length <= 1) {
          return { ...prev, isShuffled: true };
        }
        const others = prev.queue.filter((t) => t.videoId !== prev.currentTrack?.videoId);
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        const newQueue = [prev.currentTrack, ...others];
        return {
          ...prev,
          isShuffled: true,
          queue: newQueue,
          queueIndex: 0,
        };
      } else {
        // Disable shuffle (cannot restore original order natively without storing it,
        // so we just turn off the flag so future queues aren't shuffled)
        return { ...prev, isShuffled: false };
      }
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const mapping: Record<string, 'off' | 'one' | 'all'> = {
        off: 'all',
        all: 'one',
        one: 'off',
      };
      return { ...prev, repeatMode: mapping[prev.repeatMode] };
    });
  }, []);

  return {
    ...state,
    playSong,
    togglePlayPause,
    seekTo,
    setVolume,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
  };
};
