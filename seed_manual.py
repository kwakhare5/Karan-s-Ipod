import json
from library_manager import LibraryManager

def seed_manual():
    print("Manually seeding library with sample data...")
    lib = LibraryManager()
    
    # Sample Data
    artists = [
        {"id": "UC0wpHCcbdPcatJ1J03cM_wA", "name": "The Weeknd", "songs": [
            {"videoId": "4NRXx6U8ABQ", "title": "Blinding Lights", "duration": 200, "album": "After Hours"},
            {"videoId": "fHI8X4OXluQ", "title": "Save Your Tears", "duration": 215, "album": "After Hours"},
            {"videoId": "yzTuBuRdAyA", "title": "The Hills", "duration": 242, "album": "Beauty Behind the Madness"}
        ]},
        {"id": "UCzFfdP4e6d4hHk-F9OdJ-6g", "name": "Drake", "songs": [
            {"videoId": "xpVfcZ0ZcFM", "title": "God's Plan", "duration": 198, "album": "Scorpion"},
            {"videoId": "tIp251KVLvE", "title": "One Dance", "duration": 173, "album": "Views"}
        ]},
        {"id": "UCq3Ci-h945sbEYXnPt_h0gw", "name": "Ariana Grande", "songs": [
            {"videoId": "SXiSVQZLje8", "title": "7 rings", "duration": 178, "album": "thank u, next"},
            {"videoId": "ffxKSjUwKdU", "title": "positions", "duration": 172, "album": "Positions"}
        ]}
    ]
    
    for artist_data in artists:
        aid = artist_data['id']
        aname = artist_data['name']
        
        # Add Artist
        if aid not in lib.data['artists']:
            lib.data['artists'][aid] = {
                'id': aid,
                'name': aname,
                'thumbnailUrl': '', # Can be empty
                'songs': []
            }
            
        # Add Songs
        for song in artist_data['songs']:
            sid = song['videoId']
            if sid not in lib.data['songs']:
                 lib.data['songs'][sid] = {
                     'videoId': sid,
                     'title': song['title'],
                     'artist': aname,
                     'artistId': aid,
                     'album': song['album'],
                     'duration': song['duration'],
                     'thumbnailUrl': f"https://img.youtube.com/vi/{sid}/default.jpg"
                 }
                 # Link to artist
                 if sid not in lib.data['artists'][aid]['songs']:
                     lib.data['artists'][aid]['songs'].append(sid)
                     
    lib.save_library()
    print("Manual seed complete.")

if __name__ == "__main__":
    seed_manual()
