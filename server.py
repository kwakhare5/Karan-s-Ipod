import concurrent.futures
import json
import os
import threading
import time
import traceback
import uuid

from flask import (
    Flask,
    Response,
    jsonify,
    request,
    stream_with_context,
)
from flask_cors import CORS
import requests
import yt_dlp
from ytmusicapi import YTMusic

app = Flask(__name__)
CORS(app)

# -- Backend Setup --
ytmusic = YTMusic()
search_cache = {}  # query -> [song results]

# Reusable YoutubeDL instance (for fallback only)
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

COMMON_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    ),
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
}

PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api-piped.mha.fi',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.lunar.icu',
    'https://api.piped.projectsegfau.lt',
    'https://piped-api.garudalinux.org',
]

INVIDIOUS_INSTANCES = [
    'https://iv.ggtyler.dev',
    'https://inv.tux.rs',
    'https://invidious.nerdvpn.de',
]


# ================================================
#        PIPED / INVIDIOUS HELPERS
# ================================================


def _get_piped_info(video_id):
    """Fetch stream info from Piped instances concurrently."""
    def fetch_inst(inst):
        try:
            api_url = f'{inst}/streams/{video_id}'
            resp = requests.get(
                api_url, timeout=4, headers=COMMON_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                streams = data.get('audioStreams', [])
                if streams:
                    streams.sort(
                        key=lambda x: (
                            1 if 'mp4' in x.get('mimeType', '')
                            else 0
                        ),
                        reverse=True,
                    )
                    return streams
        except Exception:
            pass
        return None

    workers = len(PIPED_INSTANCES)
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=workers
    ) as executor:
        fmap = {
            executor.submit(fetch_inst, i): i
            for i in PIPED_INSTANCES
        }
        for future in concurrent.futures.as_completed(fmap):
            result = future.result()
            if result:
                print(f"[Piped] Won: {fmap[future]}")
                return result
    return []


def _get_invidious_info(video_id):
    """Fetch stream info from Invidious concurrently."""
    def fetch_inst(inst):
        try:
            url = f'{inst}/api/v1/videos/{video_id}'
            resp = requests.get(
                url, timeout=4, headers=COMMON_HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                streams = data.get('adaptiveFormats', [])
                audio = [
                    s for s in streams
                    if 'audio/' in s.get('type', '')
                ]
                if audio:
                    audio.sort(
                        key=lambda x: int(
                            x.get('bitrate', 0)
                        ),
                        reverse=True,
                    )
                    return audio
        except Exception:
            pass
        return None

    workers = len(INVIDIOUS_INSTANCES)
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=workers
    ) as executor:
        fmap = {
            executor.submit(fetch_inst, i): i
            for i in INVIDIOUS_INSTANCES
        }
        for future in concurrent.futures.as_completed(fmap):
            result = future.result()
            if result:
                print(f"[Invidious] Won: {fmap[future]}")
                return result
    return []


def _proxy_audio(audio_url):
    """Proxy an audio URL through the backend."""
    try:
        hdrs = COMMON_HEADERS.copy()
        hdrs['Referer'] = 'https://www.youtube.com/'
        range_header = request.headers.get('Range')
        if range_header:
            hdrs['Range'] = range_header

        req = requests.get(
            audio_url, headers=hdrs, stream=True, timeout=10
        )

        if req.status_code >= 400:
            print(f"[Proxy] Error {req.status_code}")
            return None

        def generate():
            try:
                for chunk in req.iter_content(
                    chunk_size=32768
                ):
                    if chunk:
                        yield chunk
            except Exception as e:
                print(f"[Proxy Stream Error] {e}")

        res = Response(
            stream_with_context(generate()),
            status=req.status_code,
        )
        copy_headers = [
            'Content-Type',
            'Content-Length',
            'Content-Range',
            'Accept-Ranges',
        ]
        for k in copy_headers:
            if k in req.headers:
                res.headers[k] = req.headers[k]
        return res
    except Exception as e:
        print(f"[Proxy Fatal] {e}")
        return None


# ================================================
#                  SEARCH
# ================================================


@app.route('/api/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'results': []})

    if q in search_cache:
        return jsonify({'results': search_cache[q]})

    try:
        results = ytmusic.search(
            q, filter='songs', limit=15
        )
        songs = []
        for r in results:
            if r.get('resultType') != 'song':
                continue
            vid = r.get('videoId')
            if not vid:
                continue

            title = r.get('title', '')
            artists = r.get('artists', [{}])
            artist = artists[0].get('name', 'Unknown')
            thumbs = r.get('thumbnails', [{}])

            songs.append({
                'videoId': vid,
                'title': title,
                'artist': artist,
                'duration': (
                    r.get('duration_seconds', 0) or 0
                ),
                'thumbnailUrl': (
                    thumbs[-1].get('url', '')
                ),
                'thumbnailUrlBackup': (
                    thumbs[0].get('url', '')
                ),
            })

        final_results = songs[:10]
        search_cache[q] = final_results
        return jsonify({'results': final_results})
    except Exception as e:
        print(f"[Search Error] {e}")
        return jsonify(
            {'results': [], 'error': str(e)}
        ), 500


# ================================================
#              STREAMING ENDPOINTS
# ================================================


@app.route('/api/stream-info/<video_id>')
def stream_info(video_id):
    """Return a direct playable URL from Piped/Invidious."""
    ts = time.strftime('%H:%M:%S')
    print(
        f"\n[Stream-Info] v5 Direct Proxy "
        f"for {video_id} at {ts}"
    )

    # Tier 1: Piped
    streams = _get_piped_info(video_id)
    for s in streams:
        p_url = s.get('url')
        if p_url:
            print("[Stream-Info] Hit Tier 1 (Piped)")
            return jsonify({
                'url': p_url,
                'source': 'piped',
                'needs_proxy': False,
            })

    # Tier 2: Invidious
    inv_streams = _get_invidious_info(video_id)
    for s in inv_streams:
        i_url = s.get('url')
        if i_url:
            print("[Stream-Info] Hit Tier 2 (Invidious)")
            return jsonify({
                'url': i_url,
                'source': 'invidious',
                'needs_proxy': False,
            })

    # Fallback
    print("[Stream-Info] Providers exhausted")
    return jsonify({
        'url': f'/api/stream/{video_id}',
        'source': 'fallback_proxy',
        'needs_proxy': True,
    })


@app.route('/api/stream/<video_id>')
def stream(video_id):
    """Fallback proxy through Render."""
    ts = time.strftime('%H:%M:%S')
    print(f"\n[Fallback Stream] {video_id} at {ts}")

    try:
        print("[Fallback] yt-dlp...")
        yt_url = (
            f'https://www.youtube.com/watch?v={video_id}'
        )
        with _ydl_lock:
            info = _ydl.extract_info(
                yt_url, download=False
            )
            audio_url = info.get('url')
            if audio_url:
                result = _proxy_audio(audio_url)
                if result:
                    return result

        return jsonify(
            {'error': 'All sources exhausted'}
        ), 502
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/piped-stream/<video_id>')
def piped_stream_manual(video_id):
    """Legacy manual fallback endpoint."""
    return jsonify(
        {'url': f'/api/stream-info/{video_id}'}
    ), 302


# ================================================
#             PLAYLISTS & LIBRARY
# ================================================

PLAYLISTS_FILE = "public/playlists.json"


def load_playlists():
    if not os.path.exists(PLAYLISTS_FILE):
        return []
    try:
        with open(
            PLAYLISTS_FILE, 'r', encoding='utf-8'
        ) as f:
            return json.load(f)
    except Exception:
        return []


def save_playlists(playlists):
    os.makedirs(
        os.path.dirname(PLAYLISTS_FILE),
        exist_ok=True,
    )
    with open(
        PLAYLISTS_FILE, 'w', encoding='utf-8'
    ) as f:
        json.dump(
            playlists, f,
            indent=2, ensure_ascii=False,
        )


@app.route('/api/playlists', methods=['GET', 'POST'])
def handle_playlists():
    playlists = load_playlists()
    if request.method == 'GET':
        return jsonify(playlists)
    if request.method == 'POST':
        name = request.json.get('name')
        if not name:
            return jsonify(
                {'error': 'Name required'}
            ), 400
        new_playlist = {
            'id': str(uuid.uuid4()),
            'name': name,
            'songIds': [],
        }
        playlists.append(new_playlist)
        save_playlists(playlists)
        return jsonify(new_playlist)
    return jsonify({'error': 'Bad request'}), 400


@app.route(
    '/api/playlists/<playlist_id>/add',
    methods=['POST'],
)
def add_to_playlist(playlist_id):
    playlists = load_playlists()
    song_id = request.json.get('songId')
    if not song_id:
        return jsonify(
            {'error': 'songId required'}
        ), 400
    for p in playlists:
        if p['id'] == playlist_id:
            if song_id not in p.get('songIds', []):
                p.setdefault(
                    'songIds', []
                ).append(song_id)
            save_playlists(playlists)
            return jsonify(p)
    return jsonify(
        {'error': 'Playlist not found'}
    ), 404


@app.route(
    '/api/playlists/<playlist_id>',
    methods=['PUT', 'DELETE'],
)
def update_or_delete_playlist(playlist_id):
    playlists = load_playlists()
    if request.method == 'DELETE':
        playlists = [
            p for p in playlists
            if p['id'] != playlist_id
        ]
        save_playlists(playlists)
        return jsonify({'success': True})
    if request.method == 'PUT':
        name = request.json.get('name')
        if not name:
            return jsonify(
                {'error': 'Name required'}
            ), 400
        for p in playlists:
            if p['id'] == playlist_id:
                p['name'] = name
                save_playlists(playlists)
                return jsonify(p)
    return jsonify(
        {'error': 'Playlist not found'}
    ), 404


@app.route('/api/genres')
def get_genres():
    try:
        if os.path.exists('public/genres.json'):
            with open(
                'public/genres.json', 'r',
                encoding='utf-8',
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
                for s in songs
                if s.get('genre')
            )))
            return jsonify([
                {'id': g, 'name': g}
                for g in genres
            ])
        return jsonify([])
    except Exception:
        return jsonify([])


@app.route('/api/library/artists')
def get_library_artists():
    path = "public/top_artists.json"
    if os.path.exists(path):
        with open(
            path, 'r', encoding='utf-8'
        ) as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/api/library/songs')
def get_library_songs():
    path = "public/top_songs.json"
    if os.path.exists(path):
        with open(
            path, 'r', encoding='utf-8'
        ) as f:
            return jsonify(json.load(f))
    return jsonify([])


# ================================================
#              STATUS & UTILITIES
# ================================================


@app.route('/')
def api_status():
    return jsonify({
        'status': 'online',
        'message': (
            "Karan's iPod API "
            "(v5 Direct YouTube Proxy Streaming)"
        ),
        'endpoints': {
            'search': '/api/search?q=query',
            'stream_info': '/api/stream-info/<id>',
            'stream': '/api/stream/<id>',
            'ping': '/api/ping',
        },
    })


@app.route('/api/ping')
def ping():
    return jsonify({
        'status': 'ok',
        'timestamp': time.time(),
        'v': '5.0',
    })


@app.route('/favicon.ico')
def favicon():
    return '', 204


@app.route('/top_songs.json')
def serve_top_songs():
    path = "public/top_songs.json"
    if os.path.exists(path):
        with open(
            path, 'r', encoding='utf-8'
        ) as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/top_artists.json')
def serve_top_artists():
    path = "public/top_artists.json"
    if os.path.exists(path):
        with open(
            path, 'r', encoding='utf-8'
        ) as f:
            return jsonify(json.load(f))
    return jsonify([])


@app.route('/<path:path>')
def serve_catch_all(path):
    return jsonify({
        'error': 'Not Found',
        'path': path,
    }), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(
        f"Starting iPod backend v5 on port {port}..."
    )
    app.run(host='0.0.0.0', port=port, debug=False)
