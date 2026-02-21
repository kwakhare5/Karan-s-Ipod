from ytmusicapi import YTMusic
import json
import time

yt = YTMusic()

print("Loading top artists...")
with open("public/top_artists.json", "r", encoding="utf-8") as f:
    artists = json.load(f)

all_songs = []
print(f"Fetching top songs for {len(artists)} artists...")

# For each artist, fetch 5 official studio songs.
for i, artist in enumerate(artists):
    artist_name = artist['name']
    artist_id = artist['id']
    print(f"[{i+1}/{len(artists)}] Fetching top songs for {artist_name}...")
    try:
        artist_data = yt.get_artist(artist_id)
        
        top_songs = []
        if 'songs' in artist_data and 'results' in artist_data['songs']:
             top_songs = artist_data['songs']['results'][:5]
        
        for song in top_songs:
            title = song.get('title', '')
            
            # Must explicitly search YT Music for the 'song' type (which are official audio tracks)
            query = f"{title} {artist_name}"
            # print(f"  Searching for official studio version: {query}")
            search_res = yt.search(query, filter="songs", limit=1)
            
            if search_res and len(search_res) > 0:
                official = search_res[0]
                
                # Extract clean thumbnail
                thumb = ""
                if 'thumbnails' in official and official['thumbnails']:
                    thumb = official['thumbnails'][-1]['url']
                    if '=w' in thumb:
                        thumb = thumb.split('=w')[0] + '=w600-h600-l90-rj'
                        
                # Extract clean duration
                duration_sec = official.get('duration_seconds', 0)
                if duration_sec == 0 and 'duration' in official:
                   parts = official['duration'].split(':')
                   if len(parts) == 2:
                       duration_sec = int(parts[0]) * 60 + int(parts[1])
                   elif len(parts) == 3:
                       duration_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                
                # Extract album
                album_name = "Unknown Album"
                if 'album' in official and official['album'] and 'name' in official['album']:
                    album_name = official['album']['name']
                elif 'album' in song and song['album'] and 'name' in song['album']:
                    album_name = song['album']['name']
                
                # Avoid duplicates
                if not any(s['videoId'] == official['videoId'] for s in all_songs):
                    all_songs.append({
                        "videoId": official['videoId'],
                        "title": official['title'],
                        "artist": artist_name,
                        "artistId": artist_id,
                        "album": album_name,
                        "duration": duration_sec,
                        "thumbnailUrl": thumb
                    })
            time.sleep(0.5) # Prevent rate limiting
            
    except Exception as e:
        print(f"  Error fetching songs for {artist_name}: {e}")

all_songs.sort(key=lambda x: x['title'].lower())

print(f"Total pure studio songs fetched: {len(all_songs)}")

with open("public/top_songs.json", "w", encoding="utf-8") as f:
    json.dump(all_songs, f, indent=2)

print("Saved clean premium studio forms to public/top_songs.json")
