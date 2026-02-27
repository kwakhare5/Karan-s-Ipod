import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MenuIDs, MenuItem, Track, MenuItemType, Playlist } from './types';
import { ROOT_MENUS, API_BASE_URL } from './constants';
import { MenuScreen } from '../components/MenuScreen';
import { ClockScreen } from '../components/ClockScreen';
import { ClickWheel } from '../components/ClickWheel';
import { NowPlayingScreen } from '../components/NowPlayingScreen';
import { SearchScreen } from '../components/SearchScreen';
import { StatusBar } from '../components/StatusBar';
import { useNavigation } from '../hooks/useNavigation';
import { useSettings } from '../hooks/useSettings';
import { useBacklight, BACKLIGHT_OPTIONS } from '../hooks/useBacklight';
import { useContacts } from '../hooks/useContacts';
import { useNotes } from '../hooks/useNotes';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { searchSongs, Song } from './utils/musicApi';
import { Artist } from './types';

const CHASSIS_GRADIENTS: Record<string, string> = {
  silver: 'linear-gradient(197.05deg, #E2E2E2 3.73%, #AEAEAE 94.77%)',
  blue: 'linear-gradient(197.05deg, #a1c4fd 3.73%, #5e99e8 94.77%)',
  yellow: 'linear-gradient(197.05deg, #ffeb3b 3.73%, #fbc02d 94.77%)',
  pink: 'linear-gradient(197.05deg, #ffcdd2 3.73%, #e57373 94.77%)',
  red: 'linear-gradient(197.05deg, #ff5252 3.73%, #d32f2f 94.77%)',
};

const BootScreen = () => (
  <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
    <img src="/apple_logo.png" alt="Apple Logo" className="w-24 h-24 object-contain" />
  </div>
);

const App = () => {
  const calculateScale = () => {
    if (typeof window === 'undefined') return 0.75;
    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 16 : 48; // Increased padding for safer margins

    // Use visualViewport if available for more accurate mobile dimensions (accounts for keyboard/bars)
    const viewWidth = window.visualViewport?.width || window.innerWidth;
    const viewHeight = window.visualViewport?.height || window.innerHeight;

    const wRatio = (viewWidth - padding) / 358;
    const hRatio = (viewHeight - padding) / 700;

    const maxScale = isMobile ? 0.95 : 1.2;
    const minScale = 0.3; // Allow scaling down further if needed on very small devices
    return Math.max(minScale, Math.min(maxScale, wRatio, hRatio));
  };

  const [scale, setScale] = useState(calculateScale);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const handleResize = () => setScale(calculateScale());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // -- State Hooks --
  const { navState, navigateTo, goBack, selectIndex, scroll } = useNavigation();
  const {
    chassisColor,
    setChassisColor,
    clockSettings,
    setClockSettings,
    favorites,
    toggleFavorite,
  } = useSettings();
  const { isDimmed, timeout: backlightTimeout, setBacklightTimeout } = useBacklight();
  const { contacts, addContact, updateContact, deleteContact, getContact } = useContacts();
  const { notes, addNote, updateNote, deleteNote, getNote } = useNotes();
  const music = useMusicPlayer();
  const musicRef = useRef(music);
  useEffect(() => {
    musicRef.current = music;
  });

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  // -- Library State --
  const [libraryArtists, setLibraryArtists] = useState<Artist[]>([]);
  // const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null); // Unused
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // genres removed (unused)
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');

  // Reset selection on search query change for "predictive" feel
  useEffect(() => {
    if (navState.currentMenuId === MenuIDs.PLAYLIST_SEARCH) {
      setTimeout(() => selectIndex(0), 0);
    }
  }, [playlistSearchQuery, navState.currentMenuId, selectIndex]);

  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [librarySongs, setLibrarySongs] = useState<Track[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<Track[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);

  // -- Memoized Sorted Data --
  const sortedArtists = useMemo(() => {
    return [...libraryArtists].sort((a, b) => a.name.localeCompare(b.name));
  }, [libraryArtists]);

  const sortedSongs = useMemo(() => {
    return [...librarySongs].sort((a, b) => a.title.localeCompare(b.title));
  }, [librarySongs]);

  // Fetch library stats/data on mount
  const fetchLibrary = useCallback(async () => {
    try {
      // Removed unused cachedArtists
      const cachedSongs = localStorage.getItem('ipod_library_songs');

      const initialSongs = cachedSongs ? JSON.parse(cachedSongs) : [];

      const artRes = await fetch(`${API_BASE_URL}/api/library/artists`).catch(() => null);
      let artData = artRes?.ok ? await artRes.json() : [];

      // Always pull top_artists.json if both API and local cache are missing or zero
      if (artData.length === 0) {
        try {
          const topRes = await fetch(`${API_BASE_URL}/top_artists.json`);
          if (topRes.ok) artData = await topRes.json();
        } catch (err) {
          console.log('Failed to load top artists seed', err);
        }
      }

      if (artData.length > 0) {
        setLibraryArtists(artData);
        localStorage.setItem('ipod_library_artists', JSON.stringify(artData));
      }

      const playlistsRes = await fetch(`${API_BASE_URL}/api/playlists`).catch(() => null);
      const playlistsData = playlistsRes?.ok ? await playlistsRes.json() : [];
      setPlaylists(playlistsData);

      const songRes = await fetch(`${API_BASE_URL}/api/library/songs`).catch(() => null);
      let songData = songRes?.ok ? await songRes.json() : [];

      // Always pull top_songs.json if API returned nothing
      if (songData.length === 0) {
        try {
          const topSongsRes = await fetch(`${API_BASE_URL}/top_songs.json`);
          if (topSongsRes.ok) songData = await topSongsRes.json();
        } catch (err) {
          console.log('Failed to load top songs seed', err);
        }
      }

      // Update both state and cache if we found new data, or fallback to cache
      if (songData.length > 0) {
        setLibrarySongs(songData);
        localStorage.setItem('ipod_library_songs', JSON.stringify(songData));
      } else if (initialSongs.length > 0) {
        setLibrarySongs(initialSongs);
      }
    } catch (e) {
      console.error('Failed to fetch library', e);
    }
  }, []);

  useEffect(() => {
    // Keep-alive ping every 10 minutes (600,000 ms)
    const pingBackend = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/ping`);
        console.log('Keep-alive ping successful');
      } catch (err) {
        console.warn('Keep-alive ping failed', err);
      }
    };

    const interval = setInterval(pingBackend, 600000);
    pingBackend(); // Initial ping
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Wrap in timeout to avoid synchronous state update warning
    const t = setTimeout(() => {
      fetchLibrary();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchLibrary]);

  const renamePlaylist = useCallback(
    async (id: string, oldName: string) => {
      const name = prompt('Rename Playlist:', oldName);
      if (name && name !== oldName) {
        await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        fetchLibrary();
      }
    },
    [fetchLibrary]
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this playlist?')) {
        await fetch(`${API_BASE_URL}/api/playlists/${id}`, { method: 'DELETE' });
        fetchLibrary();
        goBack();
      }
    },
    [fetchLibrary, goBack]
  );

  // -- Menu Logic --
  const executeItemAction = useCallback(
    (item: MenuItem) => {
      if (item.action) {
        item.action();
        return;
      }
      if (item.type === 'navigation' && item.targetMenuId) {
        navigateTo(item.targetMenuId);
      } else if (item.id.startsWith('set_color_')) {
        setChassisColor(item.id.replace('set_color_', ''));
      } else if (navState.currentMenuId === MenuIDs.SETTINGS_CLOCK) {
        if (item.id === 'time_format') setClockSettings((s) => ({ ...s, is24Hour: !s.is24Hour }));
        if (item.id === 'show_seconds')
          setClockSettings((s) => ({ ...s, showSeconds: !s.showSeconds }));
        if (item.id === 'date_format')
          setClockSettings((s) => ({ ...s, isLongDate: !s.isLongDate }));
      } else if (item.id === 'shuffle_songs') {
        const allSongs = [...librarySongs];
        if (allSongs.length > 0) {
          // Create a truly random shuffle
          for (let i = allSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
          }
          // Use toggleShuffle if needed, but here we just play from queue
          music.playSong(allSongs[0], allSongs);
          navigateTo(MenuIDs.NOW_PLAYING);
        }
      }
    },
    [navigateTo, setChassisColor, setClockSettings, navState.currentMenuId, librarySongs, music]
  );

  // -- Music Handlers --
  /**
   * Play a song or navigate to Now Playing if it's already playing
   */
  const playOrNavigate = useCallback(
    (track: Track, queue: Track[]) => {
      // If clicking the same song that's already playing, just go to Now Playing screen
      if (music.currentTrack && music.currentTrack.videoId === track.videoId) {
        navigateTo(MenuIDs.NOW_PLAYING);
        return;
      }

      // Make sure shuffle is off if it was on
      if (music.isShuffled) music.toggleShuffle();
      music.playSong(track, queue);
      navigateTo(MenuIDs.NOW_PLAYING);
    },
    [music, navigateTo]
  );

  const handleSearchSelect = useCallback(
    (track: Track, results: Track[]) => {
      playOrNavigate(track, results);
      setGlobalSearchResults([]); // Clear results on navigate
    },
    [playOrNavigate]
  );

  const handlePlaylistSearchSelect = useCallback(
    async (track: Track) => {
      if (!addingToPlaylistId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/playlists/${addingToPlaylistId}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId: track.videoId }),
        });
        if (res.ok) {
          await fetchLibrary();
          // Removed goBack() to allow multi-add
        }
      } catch (err) {
        console.error('Add to playlist failed', err);
      }
    },
    [addingToPlaylistId, fetchLibrary]
  );

  const handleGlobalSearch = useCallback(
    async (query: string) => {
      setGlobalSearchQuery(query);
      if (query.trim().length < 2) {
        setGlobalSearchResults([]);
        return;
      }
      setIsGlobalSearchLoading(true);
      try {
        const results = await searchSongs(query);
        const tracks: Track[] = results.map((item: Song) => ({
          videoId: item.id,
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          thumbnailUrl: item.thumbnail,
          thumbnailUrlBackup: item.thumbnailBackup,
          album: 'Unknown',
        }));
        setGlobalSearchResults(tracks);
        // Reset selection when search results come in
        setTimeout(() => selectIndex(0), 0);
      } catch (err) {
        console.error('Global search failed', err);
      } finally {
        setIsGlobalSearchLoading(false);
      }
    },
    [selectIndex]
  );

  const handlePlayPause = useCallback(() => {
    if (music.currentTrack) music.togglePlayPause();
  }, [music]);

  const handleNext = useCallback(() => {
    music.nextTrack();
  }, [music]);
  const handlePrev = useCallback(() => {
    music.prevTrack();
  }, [music]);

  const handleToggleLike = useCallback(() => {
    if (music.currentTrack) {
      toggleFavorite({
        id: music.currentTrack.videoId,
        title: music.currentTrack.title,
        artist: music.currentTrack.artist,
        duration: music.currentTrack.duration,
        url: '',
        thumbnailUrl: music.currentTrack.thumbnailUrl || '',
        albumId: music.currentTrack.album,
      });
    }
  }, [music.currentTrack, toggleFavorite]);

  // -- Menu Items --
  const currentMenuItems = useMemo<MenuItem[]>(() => {
    const menuId = navState.currentMenuId;

    if (menuId === MenuIDs.HOME) {
      return ROOT_MENUS[MenuIDs.HOME].filter((item) => {
        if (item.id === 'now_playing') return !!music.currentTrack;
        return true;
      });
    }
    if (menuId === MenuIDs.MUSIC) return ROOT_MENUS[MenuIDs.MUSIC];
    if (menuId === MenuIDs.SETTINGS) return ROOT_MENUS[MenuIDs.SETTINGS];
    if (menuId === MenuIDs.EXTRAS) return ROOT_MENUS[MenuIDs.EXTRAS];

    if (menuId === MenuIDs.SETTINGS_COLOR) {
      return ROOT_MENUS[menuId].map((item) => ({
        ...item,
        label: item.id.replace('set_color_', '') === chassisColor ? `✓ ${item.label}` : item.label,
      }));
    }

    if (menuId === MenuIDs.SETTINGS_CLOCK) {
      return ROOT_MENUS[menuId].map((item) => {
        let label = item.label;
        if (item.id === 'time_format')
          label = `Time Format: ${clockSettings.is24Hour ? '24-hour' : '12-hour'}`;
        if (item.id === 'show_seconds')
          label = `Show Seconds: ${clockSettings.showSeconds ? 'On' : 'Off'}`;
        if (item.id === 'date_format')
          label = `Date Format: ${clockSettings.isLongDate ? 'Long' : 'Short'}`;
        return { ...item, label };
      });
    }

    if (menuId === MenuIDs.SEARCH) {
      return globalSearchResults.map(
        (track): MenuItem => ({
          id: track.videoId,
          label: `${track.title} - ${track.artist}`,
          type: 'action' as MenuItemType,
          action: () => handleSearchSelect(track, globalSearchResults),
        })
      );
    }

    if (menuId === MenuIDs.FAVORITES) {
      if (favorites.length === 0)
        return [{ id: 'no_favs', label: 'No Favorites Yet', type: 'toggle' as MenuItemType }];
      return favorites.map(
        (fav): MenuItem => ({
          id: fav.id,
          label: `${fav.title} - ${fav.artist}`,
          type: 'action' as MenuItemType,
          action: () => {
            const track: Track = {
              videoId: fav.id,
              title: fav.title,
              artist: fav.artist,
              duration: fav.duration,
              url: '',
              thumbnailUrl: fav.thumbnailUrl,
              album: fav.albumId,
            };
            const favQueue = favorites.map((f) => ({
              videoId: f.id,
              title: f.title,
              artist: f.artist,
              duration: f.duration,
              thumbnailUrl: f.thumbnailUrl,
              album: f.albumId,
            }));
            playOrNavigate(track, favQueue);
          },
        })
      );
    }

    if (menuId === MenuIDs.ARTISTS) {
      if (sortedArtists.length === 0)
        return [{ id: 'no_artists', label: 'No Artists Found', type: 'toggle' as MenuItemType }];
      return sortedArtists.map(
        (artist): MenuItem => ({
          id: artist.id,
          label: artist.name,
          type: 'navigation' as MenuItemType,
          targetMenuId: MenuIDs.ARTIST_DETAIL,
          hasChevron: true,
          action: () => {
            setSelectedArtistId(artist.id);
            navigateTo(MenuIDs.ARTIST_DETAIL);
          },
        })
      );
    }

    if (menuId === MenuIDs.ARTIST_DETAIL && selectedArtistId) {
      const targetArtistName =
        libraryArtists.find((a) => a.id === selectedArtistId)?.name || selectedArtistId;
      const artistSongs = librarySongs
        .filter((s) => s.artistId === selectedArtistId || s.artist === targetArtistName)
        .sort((a, b) => a.title.localeCompare(b.title));

      if (artistSongs.length === 0)
        return [{ id: 'no_songs', label: 'No songs found', type: 'toggle' }];
      return artistSongs.map((song) => ({
        id: song.videoId,
        label: `${song.title} - ${song.artist}`,
        type: 'action',
        action: () => {
          playOrNavigate(song, artistSongs);
        },
      }));
    }

    if (menuId === MenuIDs.ALBUMS) {
      const albumMap = new Map<string, string>();
      librarySongs.forEach((s) => {
        if (s.album && !albumMap.has(s.album)) {
          albumMap.set(s.album, s.artist || 'Unknown Artist');
        }
      });
      const albumsArray = Array.from(albumMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      return albumsArray.map(([album, artist]) => ({
        id: `alb_${album}`,
        label: `${album} - ${artist}`,
        type: 'navigation',
        targetMenuId: MenuIDs.ALBUM_DETAIL,
        hasChevron: true,
        action: () => {
          setSelectedAlbumId(album);
          navigateTo(MenuIDs.ALBUM_DETAIL);
        },
      }));
    }

    if (menuId === MenuIDs.ALBUM_DETAIL && selectedAlbumId) {
      const albumSongs = librarySongs
        .filter((s) => s.album === selectedAlbumId || s.albumId === selectedAlbumId)
        .sort((a, b) => a.title.localeCompare(b.title));
      if (albumSongs.length === 0)
        return [{ id: 'no_songs', label: 'No songs found', type: 'toggle' }];
      return albumSongs.map((song) => ({
        id: song.videoId,
        label: `${song.title} - ${song.artist}`,
        type: 'action',
        action: () => {
          playOrNavigate(song, albumSongs);
        },
      }));
    }

    if (menuId === MenuIDs.PLAYLISTS) {
      return [
        {
          id: 'create_playlist',
          label: 'Create New Playlist',
          type: 'action' as const,
          action: async () => {
            const name = prompt('Enter Playlist Name:');
            if (name) {
              const res = await fetch(`${API_BASE_URL}/api/playlists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
              });
              if (res.ok) fetchLibrary();
            }
          },
        },
        ...playlists.map(
          (p): MenuItem => ({
            id: p.id,
            label: p.name,
            type: 'navigation' as const,
            targetMenuId: MenuIDs.PLAYLIST_DETAIL,
            hasChevron: true,
            action: () => {
              setSelectedPlaylistId(p.id);
              navigateTo(MenuIDs.PLAYLIST_DETAIL);
            },
          })
        ),
      ] as MenuItem[];
    }

    if (menuId === MenuIDs.PLAYLIST_DETAIL) {
      if (!selectedPlaylistId) return [];
      const playlist = playlists.find((p) => p.id === selectedPlaylistId);
      if (!playlist) return [];
      const playlistSongs = (playlist.songIds || [])
        .map((sid) => librarySongs.find((s) => s.videoId === sid))
        .filter(Boolean) as Track[];
      return [
        {
          id: 'add_songs_search',
          label: '+ Add Songs',
          type: 'navigation' as const,
          targetMenuId: MenuIDs.PLAYLIST_SEARCH,
          action: () => {
            setAddingToPlaylistId(selectedPlaylistId);
            setPlaylistSearchQuery('');
            navigateTo(MenuIDs.PLAYLIST_SEARCH);
          },
        },
        ...playlistSongs.map(
          (track): MenuItem => ({
            id: track.videoId,
            label: track.title,
            type: 'action' as const,
            action: () => {
              playOrNavigate(track, playlistSongs);
            },
          })
        ),
        {
          id: 'rename_playlist',
          label: 'Rename Playlist',
          type: 'action' as const,
          action: () => renamePlaylist(playlist.id, playlist.name),
        },
        {
          id: 'delete_playlist',
          label: 'Delete Playlist',
          type: 'action' as const,
          action: () => deletePlaylist(playlist.id),
        },
      ] as MenuItem[];
    }

    if (menuId === MenuIDs.PLAYLIST_SEARCH) {
      const results = librarySongs
        .filter(
          (s) =>
            s.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
            s.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase())
        )
        .slice(0, 15);

      const playlist = playlists.find((p) => p.id === addingToPlaylistId);
      const songIds = playlist?.songIds || [];

      return results.map(
        (track): MenuItem => ({
          id: track.videoId,
          label: songIds.includes(track.videoId) ? `✓ ${track.title}` : track.title,
          type: 'action',
          action: () => handlePlaylistSearchSelect(track),
        })
      );
    }

    if (menuId === MenuIDs.GENRES) {
      const availableGenres = Array.from(
        new Set(librarySongs.map((s) => s.genre).filter(Boolean))
      ) as string[];
      if (availableGenres.length === 0)
        return [{ id: 'no_genres', label: 'No Genres Found', type: 'toggle' as MenuItemType }];
      return availableGenres.sort().map(
        (g): MenuItem => ({
          id: g,
          label: g,
          type: 'navigation' as MenuItemType,
          targetMenuId: MenuIDs.GENRE_DETAIL,
          hasChevron: true,
          action: () => {
            setSelectedGenreId(g);
            navigateTo(MenuIDs.GENRE_DETAIL);
          },
        })
      );
    }

    if (menuId === MenuIDs.GENRE_DETAIL && selectedGenreId) {
      const genreSongs = librarySongs
        .filter((s) => s.genre === selectedGenreId)
        .sort((a, b) => a.title.localeCompare(b.title));
      if (genreSongs.length === 0)
        return [{ id: 'no_songs', label: 'No songs found', type: 'toggle' as MenuItemType }];
      return genreSongs.map(
        (song): MenuItem => ({
          id: song.videoId,
          label: song.title,
          type: 'action' as MenuItemType,
          action: () => {
            playOrNavigate(song, genreSongs);
          },
        })
      );
    }

    if (menuId === MenuIDs.SONGS) {
      return sortedSongs.map((song) => ({
        id: song.videoId,
        label: `${song.title} - ${song.artist}`,
        type: 'action',
        action: () => {
          playOrNavigate(song, sortedSongs);
        },
      }));
    }

    if (menuId === MenuIDs.BACKLIGHT_SETTINGS) {
      return BACKLIGHT_OPTIONS.map((opt) => ({
        id: `bl_${opt.value}`,
        label: backlightTimeout === opt.value ? `✓ ${opt.label}` : opt.label,
        type: 'action' as const,
        action: () => setBacklightTimeout(opt.value),
      }));
    }

    if (menuId === MenuIDs.CONTACTS) {
      const items: MenuItem[] = [
        {
          id: 'add_contact',
          label: 'Add Contact',
          type: 'navigation',
          targetMenuId: MenuIDs.CONTACT_ADD,
          action: () => {
            setContactForm({ firstName: '', lastName: '', phone: '', email: '' });
            setIsEditingContact(false);
            setSelectedContact(null);
            navigateTo(MenuIDs.CONTACT_EDIT);
          },
        },
      ];
      contacts
        .sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName))
        .forEach((c) => {
          items.push({
            id: c.id,
            label: `${c.firstName} ${c.lastName}`,
            type: 'navigation',
            targetMenuId: MenuIDs.CONTACT_DETAIL,
            hasChevron: true,
            action: () => {
              setSelectedContact(c.id);
              navigateTo(MenuIDs.CONTACT_DETAIL);
            },
          });
        });
      return items;
    }

    if (menuId === MenuIDs.CONTACT_DETAIL && selectedContact) {
      const contact = getContact(selectedContact);
      if (!contact)
        return [{ id: 'not_found', label: 'Contact Not Found', type: 'toggle' as MenuItemType }];
      return [
        {
          id: 'c_name',
          label: `Name: ${contact.firstName} ${contact.lastName}`,
          type: 'toggle' as MenuItemType,
        },
        { id: 'c_phone', label: `Phone: ${contact.phone || ''}`, type: 'toggle' as MenuItemType },
        { id: 'c_email', label: `Email: ${contact.email || ''}`, type: 'toggle' as MenuItemType },
        {
          id: 'edit_contact',
          label: 'Edit Contact',
          type: 'action' as MenuItemType,
          action: () => {
            setContactForm({
              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone || '',
              email: contact.email || '',
            });
            setIsEditingContact(true);
            navigateTo(MenuIDs.CONTACT_EDIT);
          },
        },
        {
          id: 'delete_contact',
          label: 'Delete Contact',
          type: 'action' as MenuItemType,
          action: () => {
            deleteContact(selectedContact);
            goBack();
          },
        },
      ];
    }

    if (menuId === MenuIDs.NOTES_LIST) {
      const items: MenuItem[] = [
        {
          id: 'add_note',
          label: 'Add Note',
          type: 'navigation' as const,
          targetMenuId: MenuIDs.NOTE_ADD,
          action: () => {
            setNoteForm({ title: '', content: '' });
            setIsEditingNote(false);
            setSelectedNote(null);
            navigateTo(MenuIDs.NOTE_EDIT);
          },
        },
      ];
      notes.forEach((n) => {
        items.push({
          id: n.id,
          label: n.title,
          type: 'navigation' as const,
          targetMenuId: MenuIDs.NOTE_DETAIL,
          hasChevron: true,
          action: () => {
            setSelectedNote(n.id);
            navigateTo(MenuIDs.NOTE_DETAIL);
          },
        });
      });
      return items;
    }

    if (menuId === MenuIDs.NOTE_DETAIL && selectedNote) {
      const note = getNote(selectedNote);
      if (!note)
        return [
          { id: 'not_found', label: 'Note Not Found', type: 'toggle' as const },
        ] as MenuItem[];
      const lines = note.content.split('\n');
      return [
        { id: 'note_title', label: `📝 ${note.title}`, type: 'toggle' as const },
        ...lines.map(
          (line, i): MenuItem => ({ id: `line_${i}`, label: line || ' ', type: 'toggle' as const })
        ),
        {
          id: 'edit_note',
          label: 'Edit Note',
          type: 'action' as const,
          action: () => {
            setNoteForm({ title: note.title, content: note.content });
            setIsEditingNote(true);
            navigateTo(MenuIDs.NOTE_EDIT);
          },
        },
        {
          id: 'delete_note',
          label: 'Delete Note',
          type: 'action' as const,
          action: () => {
            deleteNote(selectedNote);
            goBack();
          },
        },
      ] as MenuItem[];
    }

    if (ROOT_MENUS[navState.currentMenuId]) return ROOT_MENUS[navState.currentMenuId];

    return [];
  }, [
    navState.currentMenuId,
    playlists,
    selectedPlaylistId,
    sortedSongs,
    navigateTo,
    addingToPlaylistId,
    playlistSearchQuery,
    handlePlaylistSearchSelect,
    selectedGenreId,
    globalSearchResults,
    handleSearchSelect,
    favorites,
    sortedArtists,
    selectedArtistId,
    librarySongs,
    libraryArtists,
    notes,
    selectedNote,
    getNote,
    deleteNote,
    goBack,
    contacts,
    selectedContact,
    getContact,
    deleteContact,
    chassisColor,
    clockSettings,
    backlightTimeout,
    setBacklightTimeout,
    selectedAlbumId,
    fetchLibrary,
    renamePlaylist,
    deletePlaylist,
    playOrNavigate,
    music,
  ]);

  // -- Interaction Handlers --
  const handleMenuSelect = useCallback(() => {
    if (isBooting) return;
    const menuId = navState.currentMenuId;

    // Handle screens with non-list interactions
    if (menuId === MenuIDs.NOW_PLAYING) {
      handlePlayPause();
      return;
    }
    if (menuId === MenuIDs.CLOCK) {
      setClockSettings((s) => ({ ...s, is24Hour: !s.is24Hour }));
      return;
    }

    const selectedItem = currentMenuItems[navState.selectedIndex];
    if (!selectedItem) return;

    if (selectedItem.id === 'play_pause') {
      handlePlayPause();
      return;
    }
    executeItemAction(selectedItem);
  }, [
    isBooting,
    navState.currentMenuId,
    navState.selectedIndex,
    currentMenuItems,
    executeItemAction,
    handlePlayPause,
    setClockSettings,
  ]);

  const handleScroll = useCallback(
    (direction: 'cw' | 'ccw') => {
      if (isBooting) return;
      const m = musicRef.current;
      if (navState.currentMenuId === MenuIDs.NOW_PLAYING && m.currentTrack) {
        const step = 0.05;
        // Round to nearest 0.05 to prevent floating point drift
        const newVol = Math.round((m.volume + (direction === 'cw' ? step : -step)) * 20) / 20;
        m.setVolume(newVol);
      } else {
        scroll(direction, currentMenuItems.length);
      }
    },
    [isBooting, navState.currentMenuId, scroll, currentMenuItems.length]
  );

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  // -- Keyboard Support --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = (document.activeElement?.tagName || '').toLowerCase();
      // Allow Arrows and Enter to navigate even when in search bar
      if (
        (tagName === 'input' || tagName === 'textarea') &&
        !['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)
      )
        return;
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          ' ',
          'Enter',
          'Backspace',
          'Escape',
        ].includes(e.key)
      ) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          handleScroll('cw');
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          handleScroll('ccw');
          break;
        case 'Enter':
          handleMenuSelect();
          break;
        case 'Backspace':
        case 'Escape':
        case 'm':
        case 'M':
          handleBack();
          break;
        case ' ':
          handlePlayPause();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScroll, handleMenuSelect, handleBack, handlePlayPause]);

  // -- Screen Rendering --
  let ScreenComponent;
  const menuId = navState.currentMenuId;

  if (menuId === MenuIDs.NOW_PLAYING && music.currentTrack) {
    ScreenComponent = (
      <NowPlayingScreen
        track={music.currentTrack}
        isPlaying={music.isPlaying}
        isLoading={music.isLoading}
        progress={music.progress}
        currentTime={music.currentTime}
        duration={music.duration}
        isShuffled={music.isShuffled}
        repeatMode={music.repeatMode}
        isLiked={favorites.some((f) => f.id === music.currentTrack!.videoId)}
        onTogglePlay={handlePlayPause}
        onToggleShuffle={music.toggleShuffle}
        onToggleRepeat={music.toggleRepeat}
        onToggleLike={handleToggleLike}
        onSeek={music.seekTo}
        volume={music.volume}
        queueIndex={music.queueIndex}
        queueLength={music.queue.length}
      />
    );
  } else if (menuId === MenuIDs.NOW_PLAYING && !music.currentTrack) {
    ScreenComponent = (
      <div className="w-full h-full bg-white flex flex-col">
        <StatusBar title="Now Playing" isPlaying={false} hasActiveTrack={false} theme="light" />
        <div className="flex-1 flex flex-col items-center justify-center bg-[#1c1c1e] text-white/50">
          <div className="text-5xl mb-4">🎵</div>
          <div className="text-sm">No track playing</div>
          <div className="text-xs mt-1">Search for music to start</div>
        </div>
      </div>
    );
  } else if (menuId === MenuIDs.SEARCH) {
    ScreenComponent = (
      <SearchScreen
        selectedIndex={navState.selectedIndex}
        isPlaying={music.isPlaying}
        hasActiveTrack={!!music.currentTrack}
        onSelectResult={handleSearchSelect}
        results={globalSearchResults}
        isLoading={isGlobalSearchLoading}
        onSearch={handleGlobalSearch}
        query={globalSearchQuery}
      />
    );
  } else if (menuId === MenuIDs.CLOCK) {
    ScreenComponent = (
      <ClockScreen
        onExit={goBack}
        settings={clockSettings}
        isPlaying={music.isPlaying}
        hasActiveTrack={!!music.currentTrack}
      />
    );
  } else if (menuId === MenuIDs.CONTACT_EDIT) {
    ScreenComponent = (
      <div className="w-full h-full bg-white flex flex-col">
        <StatusBar
          title={isEditingContact ? 'Edit Contact' : 'New Contact'}
          isPlaying={music.isPlaying}
          hasActiveTrack={!!music.currentTrack}
          theme="light"
        />
        <div className="flex-1 flex flex-col gap-2 p-4">
          <input
            className="border p-1 rounded text-sm text-black"
            placeholder="First Name"
            value={contactForm.firstName}
            onChange={(e) => setContactForm((s) => ({ ...s, firstName: e.target.value }))}
          />
          <input
            className="border p-1 rounded text-sm text-black"
            placeholder="Last Name"
            value={contactForm.lastName}
            onChange={(e) => setContactForm((s) => ({ ...s, lastName: e.target.value }))}
          />
          <input
            className="border p-1 rounded text-sm text-black"
            placeholder="Phone"
            value={contactForm.phone}
            onChange={(e) => setContactForm((s) => ({ ...s, phone: e.target.value }))}
          />
          <input
            className="border p-1 rounded text-sm text-black"
            placeholder="Email"
            value={contactForm.email}
            onChange={(e) => setContactForm((s) => ({ ...s, email: e.target.value }))}
          />
          <div className="flex gap-2 mt-2">
            <button className="bg-gray-300 text-black p-1 rounded flex-1" onClick={goBack}>
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white p-1 rounded flex-1"
              onClick={() => {
                if (contactForm.firstName) {
                  if (isEditingContact && selectedContact)
                    updateContact(selectedContact, contactForm);
                  else addContact(contactForm);
                  goBack();
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  } else if (menuId === MenuIDs.NOTE_EDIT) {
    ScreenComponent = (
      <div className="w-full h-full bg-white flex flex-col">
        <StatusBar
          title={isEditingNote ? 'Edit Note' : 'New Note'}
          isPlaying={music.isPlaying}
          hasActiveTrack={!!music.currentTrack}
          theme="light"
        />
        <div className="flex-1 flex flex-col gap-2 p-4">
          <input
            className="border p-1 rounded text-sm text-black"
            placeholder="Title"
            value={noteForm.title}
            onChange={(e) => setNoteForm((s) => ({ ...s, title: e.target.value }))}
          />
          <textarea
            className="border p-1 rounded text-sm text-black flex-1 resize-none"
            placeholder="Content"
            value={noteForm.content}
            onChange={(e) => setNoteForm((s) => ({ ...s, content: e.target.value }))}
          />
          <div className="flex gap-2 mt-2">
            <button className="bg-gray-300 text-black p-1 rounded flex-1" onClick={goBack}>
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white p-1 rounded flex-1"
              onClick={() => {
                if (noteForm.title) {
                  if (isEditingNote && selectedNote)
                    updateNote(selectedNote, { title: noteForm.title, content: noteForm.content });
                  else addNote(noteForm.title, noteForm.content);
                  goBack();
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  } else if (menuId === MenuIDs.LOCATION_INPUT) {
    ScreenComponent = (
      <div className="w-full h-full bg-white flex flex-col">
        <StatusBar
          title="Set Location"
          isPlaying={music.isPlaying}
          hasActiveTrack={!!music.currentTrack}
          theme="light"
        />
        <div className="flex-1 flex flex-col justify-center p-4">
          <input
            className="border p-2 rounded w-full text-black mb-4"
            placeholder="City Name"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setClockSettings((s) => ({ ...s, location: locationInput }));
                goBack();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={goBack} className="bg-gray-300 text-black p-2 rounded flex-1">
              Cancel
            </button>
            <button
              onClick={() => {
                setClockSettings((s) => ({ ...s, location: locationInput }));
                goBack();
              }}
              className="bg-blue-500 text-white p-2 rounded flex-1"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  } else if (menuId === MenuIDs.PLAYLIST_SEARCH) {
    ScreenComponent = (
      <div className="w-full h-full bg-white flex flex-col">
        <StatusBar
          title="Search Playlist"
          isPlaying={music.isPlaying}
          hasActiveTrack={!!music.currentTrack}
          theme="light"
        />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="shrink-0 border-b border-gray-200 w-full">
            <input
              className="w-full px-4 py-4 text-lg font-semibold text-gray-900 placeholder-gray-400 border-none outline-none bg-white"
              placeholder="Search songs..."
              value={playlistSearchQuery}
              onChange={(e) => setPlaylistSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <MenuScreen
            title=""
            items={currentMenuItems}
            selectedIndex={navState.selectedIndex}
            onItemClick={(idx) => {
              selectIndex(idx);
              const item = currentMenuItems[idx];
              if (item) executeItemAction(item);
            }}
            isPlaying={music.isPlaying}
            hasActiveTrack={!!music.currentTrack}
            hideTitle={true}
          />
        </div>
      </div>
    );
  } else {
    ScreenComponent = (
      <MenuScreen
        title={
          menuId === MenuIDs.HOME
            ? "Karan's iPod"
            : menuId === MenuIDs.SETTINGS
              ? 'Settings'
              : menuId === MenuIDs.EXTRAS
                ? 'Extras'
                : menuId === MenuIDs.MUSIC
                  ? 'Music'
                  : menuId === MenuIDs.BACKLIGHT_SETTINGS
                    ? 'Backlight Timer'
                    : menuId
                        .toLowerCase()
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())
        }
        items={currentMenuItems}
        selectedIndex={navState.selectedIndex}
        onItemClick={(idx) => {
          selectIndex(idx);
          const item = currentMenuItems[idx];
          if (item) executeItemAction(item);
        }}
        isPlaying={music.isPlaying}
        hasActiveTrack={!!music.currentTrack}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-dvh w-full p-4 overflow-hidden">
      <div style={{ width: 358 * scale, height: 700 * scale, position: 'relative', flexShrink: 0 }}>
        <div
          className="relative bg-[#e3e3e3] rounded-[30px] shadow-2xl overflow-hidden border-4 border-[#d1d1d1]"
          style={{
            width: '358px',
            height: '700px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.1s ease-out',
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E"), radial-gradient(18.13% 7.45% at 51.16% 64.58%, rgba(0, 0, 0, 0.1) 1.28%, rgba(0, 0, 0, 0) 87%), ${CHASSIS_GRADIENTS[chassisColor] || CHASSIS_GRADIENTS['silver']}`,
            backgroundBlendMode: 'overlay, normal, normal',
            boxShadow:
              'inset 4px 4px 24px #FFFFFF, inset 0px 0px 32px rgba(233, 230, 224, 0.5), inset 8px -56px 100px rgba(46, 45, 45, 0.6)',
          }}
        >
          <div
            className="absolute overflow-hidden"
            style={{
              top: '24px',
              left: '12px',
              width: '310px',
              height: '339px',
              border: '8px solid #000000',
              borderRadius: '5px',
              background: '#000',
              boxSizing: 'content-box',
            }}
          >
            <div className="w-full h-full relative bg-white flex flex-col text-black">
              {isBooting ? <BootScreen /> : ScreenComponent}
              {!isBooting && (
                <div
                  className="absolute inset-0 pointer-events-none z-50"
                  style={{
                    background:
                      'conic-gradient(from 227.11deg at 67.66% 38.91%, #FFFFFF 0deg, rgba(255, 255, 255, 0) 360deg)',
                    backgroundBlendMode: 'lighten',
                    opacity: 0.1,
                    borderRadius: '4px',
                  }}
                />
              )}
              {isDimmed && (
                <div
                  className="absolute inset-0 z-60 pointer-events-none"
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    transition: 'opacity 0.5s ease',
                    borderRadius: '4px',
                  }}
                />
              )}
            </div>
          </div>
          <div
            className="absolute"
            style={{
              top: '407px',
              left: 'calc(50% - 125.46px + 0.46px)',
              width: '250.92px',
              height: '250.92px',
            }}
          >
            <ClickWheel
              onScroll={handleScroll}
              onMenu={handleBack}
              onSelect={handleMenuSelect}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              enabled={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
