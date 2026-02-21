import logging
import time
from ytmusicapi import YTMusic
from library_manager import LibraryManager

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def seed_library():
    print("Initializing Library Manager...")
    lib_mgr = LibraryManager()
    
    # Initialize YTMusic
    yt = YTMusic()

    # Predefined artists for fallback
    fallback_artists = [
        "The Weeknd", "Drake", "Taylor Swift", "Ed Sheeran", "Ariana Grande",
        "Post Malone", "Justin Bieber", "Eminem", "Rihanna", "Bad Bunny"
    ]
    
    print("Starting import via Search (fallback mode)...")
    
    for artist_name in fallback_artists:
        print(f"Searching for {artist_name}...")
        try:
            # Search for songs by this artist
            results = yt.search(artist_name, filter="songs", limit=5)
            
            for song in results:
                # Structure: videoId, title, artists, album, duration, thumbnails
                song_id = song['videoId']
                title = song['title']
                artists = song['artists']
                
                # Get primary artist details
                if artists:
                    primary = artists[0]
                    artist_id = primary.get('id')
                    artist_name_res = primary.get('name')
                else:
                    artist_id = 'unknown'
                    artist_name_res = 'Unknown Artist'

                if not artist_id:
                    artist_id = f"unknown_{artist_name.replace(' ', '')}"

                # Ensure artist exists in library
                if artist_id not in lib_mgr.data['artists']:
                     thumb = ''
                     if song.get('thumbnails'):
                         thumb = song['thumbnails'][-1]['url']
                         
                     lib_mgr.data['artists'][artist_id] = {
                         'id': artist_id,
                         'name': artist_name_res,
                         'thumbnailUrl': thumb,
                         'songs': []
                     }
                
                # Add song if not exists
                if song_id not in lib_mgr.data['songs']:
                    # Construct song object compatible with _process_song or manual add
                    # _process_song expects a track object from playlist/album
                    
                    # Create song entry manually
                    lib_mgr.data['songs'][song_id] = {
                        'videoId': song_id,
                        'title': title,
                        'artist': artist_name_res,
                        'artistId': artist_id,
                        'album': song.get('album', {}).get('name'),
                        'duration': song.get('duration_seconds', 0) or 180, # approximate if missing
                        'thumbnailUrl': song['thumbnails'][-1]['url'] if song.get('thumbnails') else ''
                    }
                    
                    # Link to artist
                    if song_id not in lib_mgr.data['artists'][artist_id]['songs']:
                        lib_mgr.data['artists'][artist_id]['songs'].append(song_id)
                        
                    print(f"  Added: {title}")
            
            time.sleep(1) # Polite delay
            
            # Save incrementally after each artist
            lib_mgr.save_library()
            print("  Progress saved.")
                    
        except Exception as e:
            print(f"Error searching {artist_name}: {e}")

    print("Import complete.")

if __name__ == "__main__":
    try:
        seed_library()
    except KeyboardInterrupt:
        print("\nInterrupted! (Data up to last artist was saved)")
    except Exception as e:
        print(f"Failed: {e}")
