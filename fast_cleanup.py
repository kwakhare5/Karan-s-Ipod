
import json, os

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

ENGLISH_LIMIT = 60
HINDI_LIMIT = 60

# Order from import_library.py (approximate)
ENGLISH_TOP = [
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

HINDI_TOP = [
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

ALLOWED_ARTISTS = set(ENGLISH_TOP + HINDI_TOP)

def get_genre(name):
    for g, artists in ARTIST_GENRES.items():
        if name in artists: return g
    return "Pop"

def cleanup():
    # 1. Update Artists
    with open('public/top_artists.json', 'r', encoding='utf-8') as f:
        artists = json.load(f)
    
    filtered_artists = [a for a in artists if a['name'] in ALLOWED_ARTISTS]
    
    with open('public/top_artists.json', 'w', encoding='utf-8') as f:
        json.dump(filtered_artists, f, indent=2)
    
    # 2. Update Songs
    with open('public/top_songs.json', 'r', encoding='utf-8') as f:
        songs = json.load(f)
    
    filtered_songs = []
    for s in songs:
        if s['artist'] in ALLOWED_ARTISTS:
            s['genre'] = get_genre(s['artist'])
            filtered_songs.append(s)
            
    with open('public/top_songs.json', 'w', encoding='utf-8') as f:
        json.dump(filtered_songs, f, indent=2)

    print(f"Cleanup done. Artists: {len(filtered_artists)}, Songs: {len(filtered_songs)}")

if __name__ == "__main__":
    cleanup()
