
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from ytmusicapi import YTMusic

def get_high_res_thumb(thumbnails):
    if not thumbnails:
        return ""
    # Usually the last one is the highest resolution
    thumb = thumbnails[-1]['url']
    # Ensure it's large enough (w600-h600 is optimal for the iPod)
    if '=w' in thumb:
        thumb = thumb.split('=w')[0] + '=w600-h600-l90-rj'
    elif 'googleusercontent.com' in thumb and not '=' in thumb:
         thumb += '=w600-h600-l90-rj'
    return thumb

def fetch_art_for_song(yt, song):
    title = song.get('title', 'Unknown')
    artist = song.get('artist', 'Unknown')
    
    needs_update = False
    curr_thumb = song.get('thumbnailUrl', '')
    if not curr_thumb or 'w60' in curr_thumb or 'h60' in curr_thumb:
        needs_update = True
        
    if not needs_update:
        return False, song

    try:
        # Search for the song specifically
        search_results = yt.search(f"{title} {artist}", filter='songs', limit=1)
        if search_results:
            res = search_results[0]
            new_thumb = get_high_res_thumb(res.get('thumbnails', []))
            if new_thumb:
                song['thumbnailUrl'] = new_thumb
                # Also add a backup if possible
                if res.get('thumbnails') and len(res['thumbnails']) > 1:
                    song['thumbnailUrlBackup'] = res['thumbnails'][0]['url']
                return True, song
    except Exception as e:
        print(f"  Error fetching art for {title}: {e}")
    
    return False, song

def fetch_missing_art_fast():
    songs_path = "public/top_songs.json"
    if not os.path.exists(songs_path):
        print("Songs library not found.")
        return

    with open(songs_path, 'r', encoding='utf-8') as f:
        songs = json.load(f)

    print(f"Auditing {len(songs)} songs for thumbnails (TURBO MODE)...")
    
    yt = YTMusic()
    updated_count = 0
    
    # Filter songs that need updates to avoid overhead
    to_update = []
    for s in songs:
        curr_thumb = s.get('thumbnailUrl', '')
        if not curr_thumb or 'w60' in curr_thumb or 'h60' in curr_thumb:
            to_update.append(s)

    if not to_update:
        print("All songs already have high-res thumbnails!")
        return

    print(f"Found {len(to_update)} songs needing high-res art. Starting parallel fetch...")

    # Using 10 threads as a safe but fast limit
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_art_for_song, yt, song): song for song in to_update}
        
        completed = 0
        for future in as_completed(futures):
            updated, _ = future.result()
            if updated:
                updated_count += 1
            
            completed += 1
            if completed % 10 == 0:
                print(f"  Progress: {completed}/{len(to_update)} processed, {updated_count} updated.")

    # Final save
    print(f"Parallel fetch complete. Saving results...")
    with open(songs_path, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)
    
    print(f"\nFinished! Updated art for {updated_count} songs in record time.")

if __name__ == "__main__":
    fetch_missing_art_fast()
