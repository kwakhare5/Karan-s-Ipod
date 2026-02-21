
import json
import os

def check_artist_coverage():
    artists_path = "public/top_artists.json"
    songs_path = "public/top_songs.json"
    
    if not os.path.exists(artists_path) or not os.path.exists(songs_path):
        print("Required JSON files missing.")
        return

    with open(artists_path, 'r', encoding='utf-8') as f:
        artists = json.load(f)
    
    with open(songs_path, 'r', encoding='utf-8') as f:
        songs = json.load(f)

    # Map artist names and IDs from songs
    song_artist_ids = set()
    song_artist_names = set()
    for s in songs:
        if s.get('artistId'):
            song_artist_ids.add(s['artistId'])
        if s.get('artist'):
            song_artist_names.add(s['artist'].lower())

    missing_artists = []
    for a in artists:
        has_id = a['id'] in song_artist_ids
        has_name = a['name'].lower() in song_artist_names
        if not has_id and not has_name:
            missing_artists.append(a['name'])

    print(f"Total Artists: {len(artists)}")
    print(f"Missing Artists: {len(missing_artists)}")
    print("Example missing artists:", missing_artists[:20])

if __name__ == "__main__":
    check_artist_coverage()
