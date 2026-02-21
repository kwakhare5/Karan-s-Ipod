from ytmusicapi import YTMusic
import json

yt = YTMusic()
results = yt.search("Arijit Singh Tum Hi Ho", filter="songs", limit=1)

print(json.dumps(results, indent=2))
