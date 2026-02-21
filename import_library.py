"""
import_library.py — Fetch top English + Hindi artists and their songs from YouTube Music.
No API keys needed. Uses ytmusicapi directly.
Outputs: public/top_songs.json, public/top_artists.json
"""
import json, os, time
from ytmusicapi import YTMusic

OUTPUT_SONGS = os.path.join("public", "top_songs.json")
OUTPUT_ARTISTS = os.path.join("public", "top_artists.json")

# ─── Top English Artists (Top 50) ───
ENGLISH_ARTISTS = [
    "The Weeknd", "Drake", "Taylor Swift", "Ed Sheeran", "Ariana Grande",
    "Justin Bieber", "Eminem", "Rihanna", "Post Malone", "Bruno Mars",
    "Billie Eilish", "Dua Lipa", "Kanye West", "Beyoncé", "Adele",
    "Coldplay", "Imagine Dragons", "Maroon 5", "Sam Smith", "Shakira",
    "Lady Gaga", "Selena Gomez", "Harry Styles", "The Chainsmokers", "Marshmello",
    "Halsey", "Khalid", "Travis Scott", "Doja Cat", "Lil Nas X",
    "SZA", "Olivia Rodrigo", "Juice WRLD", "XXXTentacion", "Lana Del Rey",
    "Shawn Mendes", "Charlie Puth", "Sia", "Daft Punk", "OneRepublic",
    "John Legend", "Elton John", "Michael Jackson", "Queen", "The Beatles",
    "David Bowie", "Pink Floyd", "Nirvana", "AC/DC", "Metallica",
    "Linkin Park", "Green Day", "Arctic Monkeys", "Radiohead", "U2",
    "Kendrick Lamar", "J. Cole", "21 Savage", "Future", "Metro Boomin"
]

# ─── Top Hindi Artists (Top 50) ───
HINDI_ARTISTS = [
    "Arijit Singh", "Shreya Ghoshal", "Atif Aslam", "Neha Kakkar", "Jubin Nautiyal",
    "Badshah", "Honey Singh", "Darshan Raval", "Armaan Malik", "B Praak",
    "KK", "Sonu Nigam", "Kumar Sanu", "Udit Narayan", "Lata Mangeshkar",
    "Kishore Kumar", "Mohammed Rafi", "Asha Bhosle", "Sunidhi Chauhan", "Alka Yagnik",
    "A.R. Rahman", "Vishal-Shekhar", "Pritam", "Amit Trivedi", "Sachin-Jigar",
    "Tanishk Bagchi", "Guru Randhawa", "Harrdy Sandhu", "Jasleen Royal", "Ritviz",
    "King", "MC Stan", "Raftaar", "Divine", "Diljit Dosanjh",
    "AP Dhillon", "Sidhu Moose Wala", "Karan Aujla", "Jassie Gill", "Garry Sandhu",
    "Vishal Mishra", "Sachet Tandon", "Papon", "Ash King", "Mohit Chauhan",
    "Shaan", "Mika Singh", "Himesh Reshammiya", "Rahat Fateh Ali Khan", "Nusrat Fateh Ali Khan",
    "Shankar Mahadevan", "Hariharan", "Sukhwinder Singh", "Ankit Tiwari", "Tulsi Kumar",
    "Palak Muchhal", "Monali Thakur", "Lisa Mishra", "Dhvani Bhanushali", "Asees Kaur"
]

# ─── Genre Mapping ───
ARTIST_GENRES = {
    # English
    "Pop": ["Taylor Swift", "Ariana Grande", "Justin Bieber", "Ed Sheeran", "Dua Lipa", "Selena Gomez", "Harry Styles", "Shawn Mendes", "Charlie Puth", "Miley Cyrus", "Katy Perry", "P!nk", "Christina Aguilera", "Britney Spears", "Lady Gaga", "Shakira", "Halsey", "Billie Eilish", "Olivia Rodrigo", "Palak Muchhal", "Monali Thakur", "Lisa Mishra", "Dhvani Bhanushali", "Asees Kaur"],
    "Hip-Hop": ["Drake", "Eminem", "Post Malone", "Kanye West", "Travis Scott", "Doja Cat", "Lil Nas X", "Kendrick Lamar", "J. Cole", "21 Savage", "Future", "Nicki Minaj", "Cardi B", "Megan Thee Stallion", "Tyler, The Creator", "Juice WRLD", "XXXTentacion", "Metro Boomin"],
    "R&B/Soul": ["The Weeknd", "Rihanna", "Bruno Mars", "Beyoncé", "Sam Smith", "Khalid", "SZA", "Frank Ocean", "John Legend", "Michael Jackson"],
    "Rock": ["Coldplay", "Imagine Dragons", "Maroon 5", "Queen", "The Beatles", "Pink Floyd", "Nirvana", "AC/DC", "Metallica", "Radiohead", "U2", "OneRepublic", "David Bowie", "Linkin Park", "Green Day", "Arctic Monkeys"],
    "Electronic": ["The Chainsmokers", "Marshmello", "Daft Punk"],
    # Hindi
    "Bollywood": ["Arijit Singh", "Shreya Ghoshal", "Atif Aslam", "Sonu Nigam", "Kumar Sanu", "Udit Narayan", "Lata Mangeshkar", "Kishore Kumar", "Mohammed Rafi", "Asha Bhosle", "Alka Yagnik", "Sunidhi Chauhan", "Mohit Chauhan", "Shaan", "KK", "Vishal-Shekhar", "Pritam", "Amit Trivedi", "Sachin-Jigar", "Shankar Mahadevan", "Hariharan", "Sukhwinder Singh", "Himesh Reshammiya", "Neeti Mohan", "Sachet Tandon", "Vishal Mishra", "Ankit Tiwari", "Tulsi Kumar"],
    "Indie/Pop": ["Jubin Nautiyal", "Darshan Raval", "Armaan Malik", "Guru Randhawa", "Ritviz", "Anuv Jain", "Prateek Kuhad", "King", "AP Dhillon", "Sidhu Moose Wala", "Karan Aujla", "Diljit Dosanjh", "B Praak", "Neha Kakkar", "Jasleen Royal", "Harrdy Sandhu"],
    "Hindi Hip-Hop": ["Badshah", "Honey Singh", "Raftaar", "Divine", "MC Stan"],
    "Sufi/Classical": ["Rahat Fateh Ali Khan", "Nusrat Fateh Ali Khan", "Papon", "Ash King", "A.R. Rahman"]
}

def get_genre_for_artist(name):
    for genre, artists in ARTIST_GENRES.items():
        if name in artists:
            return genre
    return "Various"


def get_high_res_thumb(thumbnails):
    """Extract the highest resolution thumbnail URL from ytmusicapi results."""
    if not thumbnails:
        return "", ""
    # Sort by width to get the largest
    sorted_thumbs = sorted(thumbnails, key=lambda t: t.get('width', 0), reverse=True)
    high = sorted_thumbs[0]['url'] if sorted_thumbs else ""
    low = sorted_thumbs[-1]['url'] if sorted_thumbs else ""
    # Replace w60-h60 with w544-h544 for better quality
    high = high.split('=')[0] + '=w544-h544-l90-rj' if '=' in high else high
    return high, low

def fetch_artist_songs(yt, artist_name, max_songs=10):
    """Search for an artist and fetch their top songs."""
    songs = []
    artist_info = {"id": "", "name": artist_name, "thumbnailUrl": ""}
    
    try:
        # Search for the artist first to get their channel/browse ID
        artist_results = yt.search(artist_name, filter='artists', limit=1)
        if artist_results:
            ar = artist_results[0]
            artist_id = ar.get('browseId', artist_name.replace(' ', '_').lower())
            thumbs = ar.get('thumbnails', [])
            artist_thumb, _ = get_high_res_thumb(thumbs)
            artist_info = {
                "id": artist_id,
                "name": artist_name,
                "thumbnailUrl": artist_thumb
            }
        
        # Now search for their songs
        song_results = yt.search(f"{artist_name}", filter='songs', limit=max_songs)
        
        for s in song_results:
            if s.get('resultType') != 'song':
                continue
            vid = s.get('videoId')
            if not vid:
                continue
            title = s.get('title', '')
            artists = s.get('artists', [])
            song_artist = artists[0]['name'] if artists else artist_name
            
            album_info = s.get('album')
            album_name = album_info.get('name', '') if album_info else ''
            album_id = album_info.get('id', '') if album_info else ''
            
            duration = s.get('duration_seconds', 0) or 0
            thumbs = s.get('thumbnails', [])
            thumb_high, thumb_low = get_high_res_thumb(thumbs)
            
            songs.append({
                "videoId": vid,
                "title": title,
                "artist": song_artist,
                "artistId": artist_info['id'],
                "album": album_name,
                "albumId": album_id,
                "genre": get_genre_for_artist(artist_name),
                "duration": duration,
                "thumbnailUrl": thumb_high,
                "thumbnailUrlBackup": thumb_low,
            })
    except Exception as e:
        print(f"  WARNING: Error fetching {artist_name}: {e}")
    
    return artist_info, songs

def main():
    print("=" * 50)
    print("   iPod Music Library Importer (ytmusicapi)")
    print("=" * 50)
    
    yt = YTMusic()
    all_songs = []
    all_artists = []
    seen_video_ids = set()
    seen_artist_ids = set()
    
    all_artist_names = ENGLISH_ARTISTS + HINDI_ARTISTS
    # Deduplicate
    unique_artists = list(dict.fromkeys(all_artist_names))
    
    print(f"\nFetching songs for {len(unique_artists)} artists...\n")
    
    for i, name in enumerate(unique_artists):
        print(f"[{i+1}/{len(unique_artists)}] {name}...", end=" ", flush=True)
        artist_info, songs = fetch_artist_songs(yt, name, max_songs=10)
        
        if artist_info['id'] and artist_info['id'] not in seen_artist_ids:
            all_artists.append(artist_info)
            seen_artist_ids.add(artist_info['id'])
        
        added = 0
        for song in songs:
            if song['videoId'] not in seen_video_ids:
                all_songs.append(song)
                seen_video_ids.add(song['videoId'])
                added += 1
        
        
        # Save progressively so data is available immediately
        os.makedirs("public", exist_ok=True)
        with open(OUTPUT_SONGS, 'w', encoding='utf-8') as f:
            json.dump(all_songs, f, indent=2, ensure_ascii=False)
        with open(OUTPUT_ARTISTS, 'w', encoding='utf-8') as f:
            json.dump(all_artists, f, indent=2, ensure_ascii=False)
            
        print(f"OK {added} songs (Saved Progress)")
        time.sleep(0.3)  # Be gentle with YT Music
    
    print(f"\n{'='*50}")
    print(f"Total Songs:   {len(all_songs)}")
    print(f"Total Artists: {len(all_artists)}")
    print(f"{'='*50}")
    
    print(f"\nDONE! Saved to {OUTPUT_SONGS} and {OUTPUT_ARTISTS}")
    print("Reload your iPod app to see the updated library!")

if __name__ == "__main__":
    main()
