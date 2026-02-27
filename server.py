from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import json
import traceback
import os
import uuid
import yt_dlp
from ytmusicapi import YTMusic
import threading

app = Flask(__name__)
CORS(app)

# ── Optimized Backend Setup ──
ytmusic = YTMusic()
search_cache = {}

# Reusable YoutubeDL instance
ydl_opts = {
    'format': 'bestaudio/best',
    'noplaylist': True,
    'quiet': True,
    'no_warnings': True,
    'extract_flat': False,
    'source_address': '0.0.0.0',  # help with some connectivity issues
    'force_ipv4': True,
}
_ydl = yt_dlp.YoutubeDL(ydl_opts)
_ydl_lock = threading.Lock()

# ── Search ──


@app.route('/api/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'results': []})

    if q in search_cache:
        return jsonify({'results': search_cache[q]})

    try:
        results = ytmusic.search(q, filter='songs', limit=15)
        songs = []
        for r in results:
            if r.get('resultType') != 'song':
                continue
            vid = r.get('videoId')
            if not vid:
                continue

            songs.append({
                'videoId': vid,
                'title': r.get('title', ''),
                'artist': r.get('artists', [{}])[0].get('name', 'Unknown'),
                'duration': r.get('duration_seconds', 0) or 0,
                'thumbnailUrl': r.get('thumbnails', [{}])[-1].get('url', ''),
                'thumbnailUrlBackup': (
                    r.get('thumbnails', [{}])[0].get('url', '')
                ),
            })

        # Cache the first 10 results
        final_results = songs[:10]
        search_cache[q] = final_results
        return jsonify({'results': final_results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'results': [], 'error': str(e)}), 500

# ── Playlists ──


PLAYLISTS_FILE = "public/playlists.json"


def load_playlists():
    if not os.path.exists(PLAYLISTS_FILE):
        return []
    try:
        with open(PLAYLISTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_playlists(playlists):
    os.makedirs(os.path.dirname(PLAYLISTS_FILE), exist_ok=True)
    with open(PLAYLISTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(playlists, f, indent=2, ensure_ascii=False)


@app.route('/api/playlists', methods=['GET', 'POST'])
def handle_playlists():
    playlists = load_playlists()
    if request.method == 'GET':
        return jsonify(playlists)

    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Name required'}), 400

        new_playlist = {
            'id': str(uuid.uuid4()),
            'name': name,
            'songIds': []
        }
        playlists.append(new_playlist)
        save_playlists(playlists)
        return jsonify(new_playlist)


@app.route('/api/playlists/<playlist_id>/add', methods=['POST'])
def add_to_playlist(playlist_id):
    playlists = load_playlists()
    data = request.json
    song_id = data.get('songId')

    if not song_id:
        return jsonify({'error': 'songId required'}), 400

    for p in playlists:
        if p['id'] == playlist_id:
            if song_id not in p.get('songIds', []):
                p.setdefault('songIds', []).append(song_id)
            save_playlists(playlists)
            return jsonify(p)


@app.route('/api/playlists/<playlist_id>', methods=['PUT', 'DELETE'])
def update_or_delete_playlist(playlist_id):
    playlists = load_playlists()

    if request.method == 'DELETE':
        playlists = [p for p in playlists if p['id'] != playlist_id]
        save_playlists(playlists)
        return jsonify({'success': True})

    if request.method == 'PUT':
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Name required'}), 400

        for p in playlists:
            if p['id'] == playlist_id:
                p['name'] = name
                save_playlists(playlists)
                return jsonify(p)

    return jsonify({'error': 'Playlist not found'}), 404


# ── Library ──


@app.route('/api/genres')
def get_genres():
    try:
        # Generate genres dynamically from songs if no genres.json
        if os.path.exists('public/genres.json'):
            with open('public/genres.json', 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))

        songs_path = "public/top_songs.json"
        if os.path.exists(songs_path):
            with open(songs_path, 'r', encoding='utf-8') as f:
                songs = json.load(f)
            genres = sorted(
                list(set(s.get('genre') for s in songs if s.get('genre')))
            )
            return jsonify([{'id': g, 'name': g} for g in genres])
        return jsonify([])
    except Exception:
        return jsonify([])


@app.route('/api/library/artists')
def get_library_artists():
    path = "public/top_artists.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/api/library/songs')
def get_library_songs():
    path = "public/top_songs.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])


# ── Stream ──


@app.route('/api/stream/<video_id>')
def stream(video_id):
    try:
        url = f'https://music.youtube.com/watch?v={video_id}'
        with _ydl_lock:
            info = _ydl.extract_info(url, download=False)
            audio_url = info.get('url')
            if not audio_url:
                # Fallback to direct youtube if music fails
                fallback_url = (
                    f'https://www.youtube.com/watch?v={video_id}'
                )
                info = _ydl.extract_info(fallback_url, download=False)
                audio_url = info.get('url')

            if audio_url:
                return redirect(audio_url)
        return jsonify({'error': 'Extraction failed'}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── API Status (Root) ──


@app.route('/')
def api_status():
    return jsonify({
        'status': 'online',
        'message': "Karan's iPod API is running",
        'endpoints': {
            'search': '/api/search?q=query',
            'songs': '/api/library/songs',
            'artists': '/api/library/artists',
            'playlists': '/api/playlists'
        }
    })


@app.route('/favicon.ico')
def favicon():
    return '', 204


# ── Serve Public JSON Files ──


@app.route('/top_songs.json')
def serve_top_songs():
    path = "public/top_songs.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/top_artists.json')
def serve_top_artists():
    path = "public/top_artists.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/<path:path>')
def serve_catch_all(path):
    # Simply return 404 for unknown API paths
    return jsonify({'error': 'Not Found', 'path': path}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting iPod backend on http://localhost:{port}")
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        print(f"FAILED TO START SERVER: {e}")
        traceback.print_exc()
