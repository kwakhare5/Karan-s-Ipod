export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

export interface Genre {
  id: string;
  name: string;
}

export interface NavigationState {
  currentMenuId: string;
  selectedIndex: number;
  menuStack: { menuId: string; selectedIndex: number }[];
}

export type MenuItemType = 'navigation' | 'action' | 'toggle' | 'select';

export interface MenuItem {
  id: string;
  label: string;
  type: MenuItemType;
  targetMenuId?: string;
  action?: () => void;
  hasChevron?: boolean;
  isActive?: boolean;
}

export interface MenuScreenProps {
  title: string;
  items: MenuItem[];
  selectedIndex: number;
  onItemClick: (index: number) => void;
  testId?: string;
  isPlaying?: boolean;
  hasActiveTrack?: boolean;
  hideTitle?: boolean;
}

export interface ClockSettings {
  is24Hour: boolean;
  showSeconds: boolean;
  isLongDate: boolean;
  showWeather: boolean;
  isCelsius: boolean;
  location: string;
}

// ── Music Types ──────────────────────────────────────────

export interface Track {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  genre?: string;
  duration: number;       // seconds
  thumbnailUrl?: string;
  thumbnailUrlBackup?: string;
  artistId?: string;
  url?: string;
}

export interface Artist {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

export const MenuIDs = {
  HOME: 'HOME',
  EXTRAS: 'EXTRAS',
  SETTINGS: 'SETTINGS',
  ABOUT: 'ABOUT',
  SETTINGS_COLOR: 'SETTINGS_COLOR',
  CLOCK: 'CLOCK',
  SETTINGS_CLOCK: 'SETTINGS_CLOCK',
  LOCATION_INPUT: 'LOCATION_INPUT',
  GAME_BRICK: 'GAME_BRICK',
  GAME_PARACHUTE: 'GAME_PARACHUTE',
  GAME_SOLITAIRE: 'GAME_SOLITAIRE',
  SETTINGS_MAIN: 'SETTINGS_MAIN',
  SETTINGS_ABOUT: 'SETTINGS_ABOUT',
  SETTINGS_EQ: 'SETTINGS_EQ',
  SETTINGS_SOUND_CHECK: 'SETTINGS_SOUND_CHECK',
  SETTINGS_SLEEP_TIMER: 'SETTINGS_SLEEP_TIMER',
  SETTINGS_ALARM: 'SETTINGS_ALARM',
  SETTINGS_DATE_TIME: 'SETTINGS_DATE_TIME',
  SETTINGS_CONTACTS: 'SETTINGS_CONTACTS',
  SETTINGS_CALENDAR: 'SETTINGS_CALENDAR',
  SETTINGS_NOTES: 'SETTINGS_NOTES',
  CONTACTS: 'CONTACTS',
  CONTACT_DETAIL: 'CONTACT_DETAIL',
  CONTACT_ADD: 'CONTACT_ADD',
  NOTES_LIST: 'NOTES_LIST',
  NOTE_DETAIL: 'NOTE_DETAIL',
  NOTE_ADD: 'NOTE_ADD',
  BACKLIGHT_SETTINGS: 'BACKLIGHT_SETTINGS',
  CONTACT_EDIT: 'CONTACT_EDIT',
  NOTE_EDIT: 'NOTE_EDIT',
  // Music
  MUSIC: 'MUSIC',
  SEARCH: 'SEARCH',
  NOW_PLAYING: 'NOW_PLAYING',
  ARTISTS: 'ARTISTS',
  ARTIST_DETAIL: 'ARTIST_DETAIL',
  ALBUMS: 'ALBUMS',
  ALBUM_DETAIL: 'ALBUM_DETAIL',
  SONGS: 'SONGS',
  PLAYLISTS: 'PLAYLISTS',
  PLAYLIST_DETAIL: 'PLAYLIST_DETAIL',
  PLAYLIST_CREATE: 'PLAYLIST_CREATE',
  GENRES: 'GENRES',
  GENRE_DETAIL: 'GENRE_DETAIL',
  ADD_TO_PLAYLIST: 'ADD_TO_PLAYLIST',
  SHUFFLE_SONGS: 'SHUFFLE_SONGS',
  FAVORITES: 'FAVORITES',
  PLAYLIST_SEARCH: 'PLAYLIST_SEARCH',
};
