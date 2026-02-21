
from ytmusicapi import YTMusic
import json
import time
import os

def populate_missing():
    artists_path = "public/top_artists.json"
    songs_path = "public/top_songs.json"
    
    if not os.path.exists(artists_path):
        print("Artists file missing.")
        return

    # Load artists
    with open(artists_path, 'r', encoding='utf-8') as f:
        artists = json.load(f)
    
    # Load existing songs
    existing_songs = []
    if os.path.exists(songs_path):
        with open(songs_path, 'r', encoding='utf-8') as f:
            existing_songs = json.load(f)
    
    # Identify which artists have songs
    song_artist_ids = set()
    song_artist_names = set()
    for s in existing_songs:
        if s.get('artistId'):
            song_artist_ids.add(s['artistId'])
        if s.get('artist'):
            song_artist_names.add(s['artist'].lower())

    missing_artists = []
    for a in artists:
        has_id = a['id'] in song_artist_ids
        has_name = a['name'].lower() in song_artist_names
        if not has_id and not has_name:
            missing_artists.append(a)

    if not missing_artists:
        print("No missing artists found.")
        return

    print(f"Total missing artists: {len(missing_artists)}")
    
    yt = YTMusic()
    new_songs = []
    
    for i, artist in enumerate(missing_artists):
        name = artist['name']
        artist_id = artist['id']
        print(f"[{i+1}/{len(missing_artists)}] Fetching top songs for {name}...")
        
        try:
            # Search for the artist specifically to get their top songs
            # Using get_artist is more reliable if we have ID
            artist_data = yt.get_artist(artist_id)
            
            top_tracks = []
            if 'songs' in artist_data and 'results' in artist_data['songs']:
                 top_tracks = artist_data['songs']['results'][:5]
            
            artist_songs_found = 0
            for track in top_tracks:
                title = track.get('title', '')
                vid = track.get('videoId')
                if not vid: continue
                
                # We need some more metadata like duration and album.
                # get_artist sometimes gives limited info.
                # We'll use the track info from get_artist but search if needed or just use what we have.
                # To be fast, we'll try to find cleaner metadata.
                
                album_name = "Unknown Album"
                if track.get('album'):
                    album_name = track['album'].get('name', 'Unknown Album')
                
                duration_sec = track.get('duration_seconds', 0)
                if not duration_sec and track.get('duration'):
                    parts = track['duration'].split(':')
                    if len(parts) == 2:
                        duration_sec = int(parts[0]) * 60 + int(parts[1])
                    elif len(parts) == 3:
                        duration_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

                thumb = ""
                if track.get('thumbnails'):
                    thumb = track['thumbnails'][-1]['url']
                    if '=w' in thumb:
                        thumb = thumb.split('=w')[0] + '=w600-h600-l90-rj'

                new_songs.append({
                    "videoId": vid,
                    "title": title,
                    "artist": name,
                    "artistId": artist_id,
                    "album": album_name,
                    "duration": duration_sec or 180,
                    "thumbnailUrl": thumb
                })
                artist_songs_found += 1
            
            print(f"  Added {artist_songs_found} songs.")
            
            # Save incrementally every 5 artists to be safe
            if (i + 1) % 5 == 0:
                merged = existing_songs + new_songs
                # Simple duplicate removal
                seen_ids = set()
                unique_merged = []
                for s in merged:
                    if s['videoId'] not in seen_ids:
                        unique_merged.append(s)
                        seen_ids.add(s['videoId'])
                
                with open(songs_path, 'w', encoding='utf-8') as f:
                    json.dump(unique_merged, f, indent=2)
                print("  Progress saved.")

            time.sleep(0.5) # Polite delay
            
        except Exception as e:
            print(f"  Error fetching songs for {name}: {e}")

    # Final save
    merged = existing_songs + new_songs
    seen_ids = set()
    unique_merged = []
    for s in merged:
        if s['videoId'] not in seen_ids:
            unique_merged.append(s)
            seen_ids.add(s['videoId'])
    
    unique_merged.sort(key=lambda x: x['title'].lower())
    with open(songs_path, 'w', encoding='utf-8') as f:
        json.dump(unique_merged, f, indent=2)
    
    print(f"Finished. Total library size: {len(unique_merged)}")

if __name__ == "__main__":
    populate_missing()
