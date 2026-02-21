from ytmusicapi import YTMusic
ytm = YTMusic()
song_id = "J7p4bzqLvCw" # Blinding Lights
data = ytm.get_song(song_id)
print(f"Keys: {data.keys()}")
# Some versions of ytmusicapi have microformat or playabilityStatus
if 'microformat' in data:
    mf = data['microformat']
    if 'microformatDataRenderer' in mf:
        views = mf['microformatDataRenderer'].get('viewCount')
        print(f"Views: {views}")
else:
    print("Microformat not found")
