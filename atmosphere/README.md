# Janus7 Atmosphere Module

## Komponenten
- **controller.js**: Regelt die Logik, Master-Client-Sync und Hybrid-Routing.
- **MusicDiscoveryEngine.js**: Die KI-Schnittstelle für dynamische Musikauswahl (Phase 8.5).
- **providers/**: Schnittstellen zu Foundry Playlists und direktem Audio-Playback.

## Musik-Katalog (AI Discovery)
Dieses Modul unterstützt die dynamische Musikauswahl basierend auf beaTunes-Metadaten.

### Schnelleinstieg
1. Lege deine Tracks in `data/academy/atmosphere/music-catalog.json` fest.
2. Nutze `game.janus7.atmosphere.playDiscoveryTrack({ sceneKey: 'deine_szene' })`.

Eine vollständige Anleitung findest du unter:
`docs/MUSIC_DISCOVERY_GUIDE.md`
