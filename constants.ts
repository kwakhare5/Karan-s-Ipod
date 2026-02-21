import { MenuIDs, MenuItem } from './types';

export const API_BASE_URL = 'http://localhost:5001';

export const ROOT_MENUS: Record<string, MenuItem[]> = {
  [MenuIDs.HOME]: [
    { id: 'now_playing', label: 'Now Playing', type: 'navigation', targetMenuId: MenuIDs.NOW_PLAYING, hasChevron: true },
    { id: 'music', label: 'Music', type: 'navigation', targetMenuId: MenuIDs.MUSIC, hasChevron: true },
    { id: 'shuffle_songs', label: 'Shuffle Songs', type: 'action' },
    { id: 'extras', label: 'Extras', type: 'navigation', targetMenuId: MenuIDs.EXTRAS, hasChevron: true },
    { id: 'settings', label: 'Settings', type: 'navigation', targetMenuId: MenuIDs.SETTINGS, hasChevron: true },
  ],
  [MenuIDs.MUSIC]: [
    { id: 'search', label: 'Search', type: 'navigation', targetMenuId: MenuIDs.SEARCH, hasChevron: true },
    { id: 'favorites', label: 'Favorites', type: 'navigation', targetMenuId: MenuIDs.FAVORITES, hasChevron: true },
    { id: 'songs', label: 'Songs', type: 'navigation', targetMenuId: MenuIDs.SONGS, hasChevron: true },
    { id: 'playlists', label: 'Playlists', type: 'navigation', targetMenuId: MenuIDs.PLAYLISTS, hasChevron: true },
    { id: 'artists', label: 'Artists', type: 'navigation', targetMenuId: MenuIDs.ARTISTS, hasChevron: true },
    { id: 'albums', label: 'Albums', type: 'navigation', targetMenuId: MenuIDs.ALBUMS, hasChevron: true },
    { id: 'genres', label: 'Genres', type: 'navigation', targetMenuId: MenuIDs.GENRES, hasChevron: true },
  ],
  [MenuIDs.EXTRAS]: [
    { id: 'clock', label: 'Clock', type: 'navigation', targetMenuId: MenuIDs.CLOCK, hasChevron: true },
    { id: 'contacts', label: 'Contacts', type: 'navigation', targetMenuId: MenuIDs.CONTACTS, hasChevron: true },
    { id: 'notes', label: 'Notes', type: 'navigation', targetMenuId: MenuIDs.NOTES_LIST, hasChevron: true }
  ],
  [MenuIDs.SETTINGS]: [
    { id: 'about', label: 'About', type: 'navigation', targetMenuId: MenuIDs.ABOUT, hasChevron: true },
    { id: 'color', label: 'Case Colour', type: 'navigation', targetMenuId: MenuIDs.SETTINGS_COLOR, hasChevron: true },
    { id: 'backlight', label: 'Backlight Timer', type: 'navigation', targetMenuId: MenuIDs.BACKLIGHT_SETTINGS, hasChevron: true },
  ],
  [MenuIDs.SETTINGS_COLOR]: [
    { id: 'set_color_silver', label: 'Silver', type: 'action' },
    { id: 'set_color_blue', label: 'Blue', type: 'action' },
    { id: 'set_color_yellow', label: 'Yellow', type: 'action' },
    { id: 'set_color_pink', label: 'Pink', type: 'action' },
    { id: 'set_color_red', label: 'Red', type: 'action' }
  ],
  [MenuIDs.SETTINGS_CLOCK]: [
    { id: 'time_format', label: 'Time Format', type: 'toggle' },
    { id: 'show_seconds', label: 'Show Seconds', type: 'toggle' },
    { id: 'date_format', label: 'Date Format', type: 'toggle' },
  ],
  [MenuIDs.ABOUT]: [
    { id: 'name', label: "Name: Karan\u2019s iPod", type: 'toggle' },
    { id: 'songs', label: 'Songs: \u221E (Online)', type: 'toggle' },
    { id: 'capacity', label: 'Capacity: 32 GB', type: 'toggle' },
    { id: 'available', label: 'Available: 31.8 GB', type: 'toggle' },
    { id: 'version', label: 'Version: 3.0.0', type: 'toggle' },
    { id: 'model', label: 'Model: MA146LL/A', type: 'toggle' },
    { id: 'serial', label: 'Serial: W884012...', type: 'toggle' }
  ]
};
