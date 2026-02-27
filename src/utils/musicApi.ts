// utils/musicApi.ts
import { API_BASE_URL } from '../constants';

// ───── Types ─────
export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  thumbnailBackup?: string;
  duration: number;
}

// ───── Search Songs (YTMusic - best quality) ─────
export async function searchSongs(query: string): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results || [];

    interface BackendSong {
      videoId: string;
      title: string;
      artist: string;
      thumbnailUrl: string;
      thumbnailUrlBackup?: string;
      duration: number;
    }

    return (results as BackendSong[]).map((item) => ({
      id: item.videoId,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnailUrl,
      thumbnailBackup: item.thumbnailUrlBackup,
      duration: item.duration,
    }));
  } catch (err: unknown) {
    console.error('Search failed:', err);
    return [];
  }
}

// ───── Get Audio URL (Hybrid: JioSaavn CDN → Backend Proxy) ─────
export async function getAudioUrl(videoId: string): Promise<string | null> {
  try {
    // First, ask the backend for a direct CDN URL (JioSaavn)
    const res = await fetch(`${API_BASE_URL}/api/stream-info/${videoId}`);
    const data = await res.json();

    if (data.url && !data.needs_proxy) {
      // Direct CDN URL (JioSaavn) — browser can play this directly!
      console.log(`[Audio] Using ${data.source} CDN`);
      return data.url;
    }
  } catch (err) {
    console.warn('[Audio] stream-info failed, using proxy:', err);
  }

  // Fallback: use the backend proxy endpoint
  return `${API_BASE_URL}/api/stream/${videoId}`;
}

// ───── Fallback URL (Secondary Proxy) ─────
export async function getPipedFallbackUrl(videoId: string): Promise<string | null> {
  return `${API_BASE_URL}/api/piped-stream/${videoId}`;
}

// Legacy export
export async function fetchPipedAudioUrl(videoId: string): Promise<string | null> {
  return getPipedFallbackUrl(videoId);
}
