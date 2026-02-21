import json, os, time
from concurrent.futures import ThreadPoolExecutor
from ytmusicapi import YTMusic

MIN_VIEWS = 500_000_000
ytm = YTMusic()

def get_views_fast(video_id):
    try:
        data = ytm.get_song(video_id)
        if 'microformat' in data:
            mf = data['microformat']
            if 'microformatDataRenderer' in mf:
                views = mf['microformatDataRenderer'].get('viewCount')
                if views and views.isdigit():
                    return int(views)
    except:
        pass
    return 0

def process_song(s):
    views = get_views_fast(s['videoId'])
    return s, views

def prune_by_views():
    path = 'public/top_songs.json'
    if not os.path.exists(path):
        print("top_songs.json not found")
        return

    with open(path, 'r', encoding='utf-8') as f:
        songs = json.load(f)
    
    total = len(songs)
    print(f"Starting High-Speed Prune. Current songs: {total}")
    filtered_songs = []
    
    # Process in larger batches of threads
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(process_song, songs))

    for s, views in results:
        title = s.get('title', 'Unknown')
        if views >= MIN_VIEWS:
            s['views'] = views
            filtered_songs.append(s)
            print(f"KEEP  [{views:12,}] {title}")
        else:
            print(f"PRUNE [{views:12,}] {title}")

    # Backup then save
    os.replace(path, path + '.bak')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(filtered_songs, f, indent=2, ensure_ascii=False)
    
    print(f"\nPrune Complete!")
    print(f"Original:  {total}")
    print(f"Remaining: {len(filtered_songs)}")
    print(f"Removed:   {total - len(filtered_songs)}")

if __name__ == "__main__":
    prune_by_views()
