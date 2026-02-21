from ytmusicapi import YTMusic
import json

yt = YTMusic()
try:
    charts = yt.get_charts(country='US')
    print("Charts keys:", charts.keys())
    
    if 'artists' in charts:
        print("\nArtists structure (first item):")
        items = charts['artists']['items']
        if items:
            print(json.dumps(items[0], indent=2))
        else:
            print("No artist items found")
            
    if 'videos' in charts: # Top Data likely has videos/songs
         print("\nVideos/Songs structure (first item):")
         items = charts['videos']['items']
         if items:
             print(json.dumps(items[0], indent=2))
             
    if 'trending' in charts:
        print("\nTrending structure (first item):")
        items = charts['trending']['items']
        if items:
            print(json.dumps(items[0], indent=2))

except Exception as e:
    print(f"Error: {e}")
