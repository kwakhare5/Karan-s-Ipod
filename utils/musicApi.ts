// utils/musicApi.ts

// ───── Types ─────
export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  thumbnailBackup?: string;
  duration: number;
}

// ───── Search Songs ─────
export async function searchSongs(query: string): Promise<Song[]> {
  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    
    // server.py returns { results: [...] }
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
    console.error("Search failed:", err);
    return [];
  }
}

// ───── Get Audio URL ─────
export async function getAudioUrl(videoId: string): Promise<string | null> {
  // Since server.py redirects to the audio URL, we can just return this endpoint
  return `/api/stream/${videoId}`;
}
