import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import ytmusicapi
import json
import os
import random
import time

# --- YOU MUST PROVIDE THESE CREDS BEFORE RUNNING VIA THE WEB UI ---
# https://developer.spotify.com/dashboard
SPOTIPY_CLIENT_ID = 'YOUR_CLIENT_ID'
SPOTIPY_CLIENT_SECRET = 'YOUR_CLIENT_SECRET'

OUTPUT_SONGS = os.path.join("public", "top_songs.json")
OUTPUT_ARTISTS = os.path.join("public", "top_artists.json")

def generate_library():
    print("WARNING: You must replace SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET with real credentials.")
    if SPOTIPY_CLIENT_ID == 'YOUR_CLIENT_ID':
        print("Please edit fetch_spotify_library.py with your credentials first.")
        return

    print("Authenticating with Spotify...")
    auth_manager = SpotifyClientCredentials(client_id=SPOTIPY_CLIENT_ID, client_secret=SPOTIPY_CLIENT_SECRET)
    sp = spotipy.Spotify(auth_manager=auth_manager)
    yt = ytmusicapi.YTMusic()
    
    # We will fetch a mix of extremely popular artist URIs to build the base catalog
    base_artists = [
        "spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ", # The Weeknd
        "spotify:artist:3TVXtAsR1Inumwj472S9r4", # Drake
        "spotify:artist:06HL4z0CvFAxyc27GXpf02", # Taylor Swift
        "spotify:artist:4q3ewBCX7sLwd24euOig1v", # Bad Bunny
        "spotify:artist:6eUKZXaKkcviH0Ku9w2n3V", # Ed Sheeran
        "spotify:artist:1uNFoZAHBGtllmzznpCI3s", # Justin Bieber
        "spotify:artist:66CXWjxzNUsdJxJ2JdwvnR", # Ariana Grande
        "spotify:artist:7dGJo4pcD2V6oG8kP0tJRR", # Eminem
        "spotify:artist:5pKCCKE2ajJHZ9KAiaK11H", # Rihanna
        "spotify:artist:246dkjvS1zLTtiykXe5h60", # Post Malone
        "spotify:artist:1dfeR4VWcgj13gZjmZXXPt", # Shawn Mendes
        "spotify:artist:6kBDZFXuOTrS2LIFf1z236", # Bruno Mars
        "spotify:artist:6vWDO969PvNqNYHIOW5v0m", # Beyonce
        "spotify:artist:0du5cEVh5yTK9QJze8zA0C", # Bruno Mars
        "spotify:artist:3dz0NnCZcmxKwyk4Dmn0T0", # Coldplay
        "spotify:artist:1vyhD5VmyZ7KMf5H3tIfH8"  # Daft Punk
    ]
    
    master_songs = []
    master_artists = []
    
    print(f"Beginning fetch for {len(base_artists)} core artists...")
    
    for artist_uri in base_artists:
        artist_details = sp.artist(artist_uri)
        artist_id = artist_details['id']
        artist_name = artist_details['name']
        artist_genres = artist_details['genres']
        primary_genre = artist_genres[0] if artist_genres else "Pop"
        
        # Determine highest res artist image
        artist_imgs = artist_details.get('images', [])
        artist_thumb = artist_imgs[0]['url'] if artist_imgs else ""
        
        master_artists.append({
            "id": artist_id,
            "name": artist_name,
            "thumbnailUrl": artist_thumb
        })
        
        print(f"Fetching top tracks for {artist_name}...")
        top_tracks = sp.artist_top_tracks(artist_uri)['tracks']
        
        for track in top_tracks:
            track_name = track['name']
            album_name = track['album']['name']
            album_id = track['album']['id']
            duration_sec = int(track['duration_ms'] / 1000)
            
            # Use Spotify's pristine artwork
            imgs = track['album'].get('images', [])
            thumb_high = imgs[0]['url'] if len(imgs) > 0 else ""
            thumb_low = imgs[-1]['url'] if len(imgs) > 0 else ""
            
            # Now we MUST map the Spotify track to a YouTube Video ID for the actual YT-DLP playback component
            print(f"  -> Cross-referencing YouTube ID for: {track_name} by {artist_name}...")
            
            yt_query = f"{track_name} {artist_name} audio"
            try:
                search_results = yt.search(yt_query, filter="songs", limit=1)
                # Fallback to general search if songs filter fails
                if not search_results:
                     search_results = yt.search(yt_query, limit=1)
                
                if search_results and 'videoId' in search_results[0]:
                    yt_video_id = search_results[0]['videoId']
                    
                    master_songs.append({
                        "videoId": yt_video_id,
                        "title": track_name,
                        "artist": artist_name,
                        "artistId": artist_id,
                        "album": album_name,
                        "albumId": album_id,
                        "genre": primary_genre,
                        "duration": duration_sec,
                        "thumbnailUrl": thumb_high,
                        "thumbnailUrlBackup": thumb_low
                    })
            except Exception as e:
                print(f"  -> FAILED to match: {e}")
                
            time.sleep(0.5) # Avoid Youtube Rate Limits
            
    print(f"\nSuccessfully collected {len(master_songs)} high-quality songs across {len(master_artists)} artists.")
    
    with open(OUTPUT_ARTISTS, 'w', encoding='utf-8') as f:
        json.dump(master_artists, f, indent=2, ensure_ascii=False)
        
    with open(OUTPUT_SONGS, 'w', encoding='utf-8') as f:
        json.dump(master_songs, f, indent=2, ensure_ascii=False)
        
    print(f"Library exported to {OUTPUT_SONGS} and {OUTPUT_ARTISTS}")
    print("Restart your vite server or reload the webpage to see the updated library!")

if __name__ == "__main__":
    generate_library()
