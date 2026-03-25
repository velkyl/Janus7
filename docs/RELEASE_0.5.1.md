# Release 0.5.1 (2025-12-16)

## Fokus: Phase 5 – Hybrid & Atmosphere (MVP)

### Highlights
- **Foundry-Playlist Atmosphere Provider** (Play/Stop, defensiv).
- **Mood-Presets** (data-driven) unter `data/academy/atmosphere/moods.json`.
- **Hybrid Master-Client Routing**: Audio läuft nur auf dem Master-Client; Steuerung via Socket-Nachrichten.
- **Feature Flag**: `features.atmosphere.enabled` (default: `false`) – vollständige Deaktivierung ohne Seiteneffekte.

### Neue API
- `game.janus7.atmosphere.applyMood(moodId, opts?)`
- `game.janus7.atmosphere.playPlaylist(playlistIdOrUuid, opts?)`
- `game.janus7.atmosphere.stopAll(opts?)`
- `game.janus7.atmosphere.setMasterClient(userId|null, opts?)`

### Migration
Keine Migration erforderlich. Für Aktivierung:
- State-Flag auf `true` setzen (`features.atmosphere.enabled`).
