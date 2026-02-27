from flask import Flask, request, jsonify, Response, stream_with_context
import requests
from flask_cors import CORS
import json
import traceback
import os
import uuid
import yt_dlp
from ytmusicapi import YTMusic
import threading
import time

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
    'source_address': '0.0.0.0',
    'force_ipv4': True,
}
_ydl = yt_dlp.YoutubeDL(ydl_opts)
_ydl_lock = threading.Lock()

# ── Robust Proxy Config ──

COMMON_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
    'Referer': 'https://www.youtube.com/',
    'Accept': '*/*',
}

PIPED_INSTANCES = [
    'https://pipedapi.lunar.icu',
    'https://api-piped.mha.fi',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
]

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
                'artist': (
                    r.get('artists', [{}])[0].get('name', 'Unknown')
                ),
                'duration': r.get('duration_seconds', 0) or 0,
                'thumbnailUrl': (
                    r.get('thumbnails', [{}])[-1].get('url', '')
                ),
                'thumbnailUrlBackup': (
                    r.get('thumbnails', [{}])[0].get('url', '')
                ),
            })

        final_results = songs[:10]
        search_cache[q] = final_results
        return jsonify({'results': final_results})
    except Exception as e:
        print(f"[Search Engine] Error: {e}")
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
    os.makedirs(
        os.path.dirname(PLAYLISTS_FILE), exist_ok=True
    )
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


@app.route(
    '/api/playlists/<playlist_id>',
    methods=['PUT', 'DELETE']
)
def update_or_delete_playlist(playlist_id):
    playlists = load_playlists()

    if request.method == 'DELETE':
        playlists = [
            p for p in playlists if p['id'] != playlist_id
        ]
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
        if os.path.exists('public/genres.json'):
            with open(
                'public/genres.json', 'r', encoding='utf-8'
            ) as f:
                return jsonify(json.load(f))

        songs_path = "public/top_songs.json"
        if os.path.exists(songs_path):
            with open(
                songs_path, 'r', encoding='utf-8'
            ) as f:
                songs = json.load(f)
            genres = sorted(list(set(
                s.get('genre')
                for s in songs if s.get('genre')
            )))
            return jsonify(
                [{'id': g, 'name': g} for g in genres]
            )
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


# ── Proxy Helpers ──


def _get_piped_info(video_id):
    """Fetch stream info from multiple Piped instances."""
    for inst in PIPED_INSTANCES:
        try:
            api_url = f'{inst}/streams/{video_id}'
            print(f"[Piped] Trying {inst}...")
            resp = requests.get(
                api_url, timeout=5, headers=COMMON_HEADERS
            )
            if resp.status_code != 200:
                continue
            data = resp.json()
            streams = data.get('audioStreams', [])
            if not streams:
                continue
            # Sort: prefer mp4 over webm
            streams.sort(
                key=lambda x: 1 if 'mp4' in x.get(
                    'mimeType', ''
                ) else 0,
                reverse=True
            )
            return streams
        except Exception as e:
            print(f"[Piped] Instance {inst} failed: {e}")
            continue
    return []


def _proxy_audio(audio_url):
    """Direct proxy with robust headers."""
    try:
        hdrs = COMMON_HEADERS.copy()
        range_header = request.headers.get('Range')
        if range_header:
            hdrs['Range'] = range_header

        print(
            f"[Proxy] Fetching from {audio_url[:60]}..."
        )
        req = requests.get(
            audio_url, headers=hdrs,
            stream=True, timeout=10
        )

        if req.status_code >= 400:
            print(
                f"[Proxy] Error {req.status_code}"
            )
            return None

        def generate():
            try:
                for chunk in req.iter_content(
                    chunk_size=16384
                ):
                    if chunk:
                        yield chunk
            except Exception as e:
                print(f"[Proxy] Stream error: {e}")

        res = Response(
            stream_with_context(generate()),
            status=req.status_code
        )
        # Forward essential media headers
        for k in [
            'Content-Type', 'Content-Length',
            'Content-Range', 'Accept-Ranges'
        ]:
            if k in req.headers:
                res.headers[k] = req.headers[k]
        return res
    except Exception as e:
        print(f"[Proxy] Fatal error: {e}")
        return None


# ── Stream Routes ──


@app.route('/api/stream/<video_id>')
def stream(video_id):
    ts = time.strftime('%H:%M:%S')
    print(f"\n[Playback] {video_id} at {ts}")
    try:
        # Attempt 1: yt-dlp (Direct YouTube)
        print("[Attempt 1] yt-dlp extraction...")
        try:
            yt_url = (
                'https://www.youtube.com/watch?v='
                + video_id
            )
            with _ydl_lock:
                info = _ydl.extract_info(
                    yt_url, download=False
                )
                audio_url = info.get('url')
                if audio_url:
                    result = _proxy_audio(audio_url)
                    if result:
                        print("[OK] yt-dlp proxy")
                        return result
        except Exception as e:
            print(f"[Attempt 1] Failed: {e}")

        # Attempt 2: Piped Fallback
        print("[Attempt 2] Piped rotation...")
        streams = _get_piped_info(video_id)
        for s in streams:
            p_url = s.get('url')
            if not p_url:
                continue
            result = _proxy_audio(p_url)
            if result:
                print("[OK] Piped proxy")
                return result

        print("[FAIL] All sources exhausted")
        return jsonify(
            {'error': 'No working source found'}
        ), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/piped-stream/<video_id>')
def piped_stream_direct(video_id):
    """Direct Piped fallback loop."""
    print(f"[Manual Fallback] {video_id}")
    streams = _get_piped_info(video_id)
    for s in streams:
        p_url = s.get('url')
        if p_url:
            result = _proxy_audio(p_url)
            if result:
                return result
    return jsonify({'error': 'Piped exhausted'}), 502


# ── API Status & Keep-Alive ──


@app.route('/')
def api_status():
    return jsonify({
        'status': 'online',
        'message': "Karan's iPod API is running",
        'endpoints': {
            'search': '/api/search?q=query',
            'stream': '/api/stream/<id>',
            'ping': '/api/ping'
        }
    })


@app.route('/api/ping')
def ping():
    return jsonify({
        'status': 'ok',
        'timestamp': time.time()
    })


@app.route('/favicon.ico')
def favicon():
    return '', 204


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
    return jsonify(
        {'error': 'Not Found', 'path': path}
    ), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting iPod backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
