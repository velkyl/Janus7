# Phase 5 – Atmosphere (v0.5.3)

## Ziel
Hybrid-first Atmosphäre über Foundry-Playlists:
- Audio läuft nur auf einem **Master-Client** (z. B. Beamer-PC).
- Steuerung erfolgt via Socket-Events (`module.janus7`).
- Moods sind **data-driven** (`data/academy/atmosphere/moods.json`).

## Quickstart (GM)
1) Aktivieren:
```js
await game.janus7.core.state.transaction(s => s.set("features.atmosphere.enabled", true));
await game.janus7.core.state.save({ force: true });
```
2) Master setzen (auf dem Audio-Rechner als GM ausführen):
```js
await game.janus7.atmosphere.setMasterClient(game.user.id, { broadcast: true });
```
3) Mood anwenden:
```js
await game.janus7.atmosphere.applyMood("academy_day", { broadcast: true });
```

## Auto-Moods
Priorität: `manual > event > location > calendar`.

Event-Overrides sind temporär:
- `atmosphere.overrideUntil` wird gesetzt
- Watchdog (Master-Client) fällt nach Ablauf zurück auf Auto-Mood.

Anti-Flapping:
- `atmosphere.cooldownMs` (Default 5000)
- `atmosphere.minDurationMs` (Default 30000)
- Gilt nur, wenn neue Quelle nicht höher priorisiert ist.

## Makros (Source of Truth)
Makro-Skripte liegen in `macros/atmosphere/*.js`.
Optional können sie zusätzlich in ein Macro-Compendium importiert werden.


## Troubleshooting

- **Playlist spielt nicht ab**: Prüfe, ob du auf dem **Master-Client** bist (`Atmosphere: Status`). Stelle sicher, dass `playlistRef` in `moods.json` auf eine existierende Foundry-Playlist zeigt (UUID/ID).
- **Audio läuft auf falschem Rechner**: Setze den Master-Client explizit (Makro `Set Master (Self)` auf dem Audio-PC). Andere Clients sollten nur steuern.
- **Event-Musik endet nicht**: Prüfe `eventOverrideMs` und ob der Master-Client online ist. Der Watchdog läuft nur auf dem Master.
- **Moods wechseln zu häufig / gar nicht**: Prüfe `cooldownMs` und `minDurationMs` (Makro `Configure Stability`). Höhere Priorität (manual/event) kann niedrigere übersteuern.
