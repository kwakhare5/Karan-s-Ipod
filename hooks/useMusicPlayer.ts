import { useState, useRef, useCallback, useEffect } from 'react';
import { Track } from '../src/types';
import { getAudioUrl, searchSongs, getPipedFallbackUrl } from '../src/utils/musicApi';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prefetchCache = useRef<Record<string, string>>({}); // Store pre-fetched stream URLs
  const retryState = useRef({ videoId: '', sourceIndex: 0 });

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

  // Create audio element once and wire up all event handlers
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        progress: audio.duration > 0 ? audio.currentTime / audio.duration : 0,
      }));
    };

    const onDurationChange = () => {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    };

    const onError = async () => {
      const { videoId, sourceIndex } = retryState.current;
      console.error(`[Audio Error] Source ${sourceIndex} failed:`, audio.error);

      // Attempt backend Piped fallback
      if (sourceIndex === 0 && videoId) {
        console.log('Attempting backend Piped fallback...');
        setState((prev) => ({ ...prev, isLoading: true, error: 'Trying backup server...' }));

        try {
          const fallbackUrl = await getPipedFallbackUrl(videoId);
          if (fallbackUrl) {
            retryState.current.sourceIndex = 1;
            audio.src = fallbackUrl;
            audio.load();
            await audio.play();
            return;
          }
        } catch (err) {
          console.error('Backend Piped fallback failed:', err);
        }
      }

      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error:
          sourceIndex === 0
            ? 'Playback failed. Try again.'
            : 'All sources failed. Try again later.',
      }));
    };

    const onCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    const onPlaying = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
    };

    // Helper: fetch related songs from backend
    const fetchRelated = async (artist: string): Promise<Track[]> => {
      try {
        // Use new searchSongs utility
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
    const playFromQueue = async (queue: Track[], idx: number) => {
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

      try {
        // Instantly use pre-fetched URL if available
        let streamUrl: string | null = prefetchCache.current[track.videoId];

        if (!streamUrl) {
          streamUrl = await getAudioUrl(track.videoId);
          if (!streamUrl) throw new Error('Failed to get audio URL');
        }

        retryState.current = { videoId: track.videoId, sourceIndex: 0 };
        audio.src = streamUrl as string;
        audio.load();
        await audio.play();

        // Pre-fetch the NEXT track in the background immediately
        const nextIdx = idx + 1;
        if (nextIdx < queue.length) {
          const nextTrackId = queue[nextIdx].videoId;
          if (!prefetchCache.current[nextTrackId]) {
            getAudioUrl(nextTrackId)
              .then((url: string | null) => {
                if (url) prefetchCache.current[nextTrackId] = url;
              })
              .catch(() => {});
          }
        }
      } catch (error) {
        console.error('Play from queue failed:', error);
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isLoading: false,
          error: 'Playback failed',
        }));
      }
    };

    // Single onEnded handler — handles repeat, shuffle, queue advance, and auto-queue
    const onEnded = () => {
      setState((current) => {
        const { queue, queueIndex, isShuffled, repeatMode, currentTrack } = current;

        // 1) Repeat One → replay same track
        if (repeatMode === 'one') {
          audio.currentTime = 0;
          audio.play().catch(console.error);
          return { ...current, isPlaying: true };
        }

        // 2) Shuffle → random track from queue
        if (isShuffled && queue.length > 1) {
          let nextIdx = queueIndex;
          let attempts = 0;
          while (nextIdx === queueIndex && attempts < 10) {
            nextIdx = Math.floor(Math.random() * queue.length);
            attempts++;
          }
          playFromQueue(queue, nextIdx);
          return current; // playFromQueue already calls setState
        }

        // 3) Normal: advance to next in queue
        const nextIdx = queueIndex + 1;
        if (nextIdx < queue.length) {
          playFromQueue(queue, nextIdx);
          return current;
        }

        // 4) Repeat All → loop back to start
        if (repeatMode === 'all' && queue.length > 0) {
          playFromQueue(queue, 0);
          return current;
        }

        // 5) Queue exhausted → auto-queue related songs
        if (currentTrack) {
          const artist = currentTrack.artist || currentTrack.title || '';
          // Fetch related songs asynchronously
          fetchRelated(artist).then((results) => {
            // Filter out the track that just played
            const filtered = results.filter((t) => t.videoId !== currentTrack.videoId);
            if (filtered.length > 0) {
              playFromQueue(filtered, 0);
            } else if (results.length > 0) {
              playFromQueue(results, 0);
            }
            // If still nothing, playback simply stops
          });
        }

        // Temporarily mark as not playing while we fetch
        return { ...current, isPlaying: false, progress: 1, currentTime: current.duration };
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Separated volume effect to fix linting warning
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);
  // Play a track
  const play = useCallback(
    async (track: Track, queue?: Track[], queueIndex?: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If clicking the same track that is currently playing or paused, just ensure it's playing
      if (state.currentTrack?.videoId === track.videoId && !state.error) {
        if (!state.isPlaying) {
          audio.play().catch(() => {});
          setState((prev) => ({ ...prev, isPlaying: true }));
        }
        return;
      }

      const effectiveQueue = queue || [track];
      const effectiveIndex = queueIndex ?? 0;

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        isPlaying: false,
        isLoading: true,
        error: null,
        progress: 0,
        currentTime: 0,
        duration: track.duration || 0,
        queue: effectiveQueue,
        queueIndex: effectiveIndex,
      }));

      try {
        // Instantly use pre-fetched URL if available
        let streamUrl: string | null = prefetchCache.current[track.videoId];
        if (!streamUrl) {
          streamUrl = await getAudioUrl(track.videoId);
          if (!streamUrl) throw new Error('Failed to get audio URL');
        }

        retryState.current = { videoId: track.videoId, sourceIndex: 0 };
        audio.src = streamUrl as string;
        audio.load();
        await audio.play();

        // Pre-fetch the NEXT track in the background immediately
        const nextIdx = effectiveIndex + 1;
        if (nextIdx < effectiveQueue.length) {
          const nextTrackId = effectiveQueue[nextIdx].videoId;
          if (!prefetchCache.current[nextTrackId]) {
            getAudioUrl(nextTrackId)
              .then((url: string | null) => {
                if (url) prefetchCache.current[nextTrackId] = url;
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('[Play Error]', err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to start playback',
        }));
      }
    },
    [state.currentTrack?.videoId, state.error, state.isPlaying]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.currentTrack) {
      resume();
    }
  }, [state.isPlaying, state.currentTrack, pause, resume]);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const setShuffle = useCallback((isShuffled: boolean) => {
    setState((prev) => ({ ...prev, isShuffled }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: ('off' | 'one' | 'all')[] = ['off', 'all', 'one'];
      const nextMode = modes[(modes.indexOf(prev.repeatMode) + 1) % modes.length];
      return { ...prev, repeatMode: nextMode };
    });
  }, []);

  const next = useCallback(() => {
    const { queue, queueIndex, isShuffled, repeatMode } = state;
    if (queue.length === 0) return;

    let nextIdx = -1;

    if (repeatMode === 'one') {
      // Manual next should skip to next track even in repeat one
    }

    if (isShuffled) {
      let attempts = 0;
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
        attempts++;
      } while (nextIdx === queueIndex && queue.length > 1 && attempts < 5);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') nextIdx = 0;
        else nextIdx = 0; // Loop to start on manual next
      }
    }

    if (nextIdx >= 0 && nextIdx < queue.length) {
      play(queue[nextIdx], queue, nextIdx);
    }
  }, [state, play]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const { queue, queueIndex, isShuffled } = state;

    let prevIdx = -1;
    if (isShuffled) {
      prevIdx = Math.floor(Math.random() * queue.length);
    } else {
      prevIdx = queueIndex - 1;
      if (prevIdx < 0) {
        prevIdx = queue.length - 1; // Loop back
      }
    }

    if (prevIdx >= 0) {
      play(queue[prevIdx], queue, prevIdx);
    }
  }, [state, play]);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = fraction * audio.duration;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = clamped;
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  return {
    ...state,
    play,
    pause,
    resume,
    togglePlayPause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    setShuffle,
    toggleRepeat,
  };
};
