# JANUS7 Music & Mood Discovery Guide

## Übersicht
Das **Music Discovery System** ermöglicht eine dynamische, AI-gestützte Auswahl von Musikstücken in Janus7. Anstatt manuell feste Playlists zu pflegen, nutzt das System einen Metadaten-Katalog (basierend auf beaTunes-Analysen und KI-Scoring), um den optimalen Track für jede Szene zu finden.

---

## Workflow: Von beaTunes zu Janus7

1.  **Analyse**: Analysiere dein Musikverzeichnis mit **beaTunes**, um BPM, Key, Mood und Genres zu extrahieren.
2.  **Export**: Exportiere die Ergebnisse (z.B. als CSV oder JSON).
3.  **KI-Scoring** (Optional): Nutze eine KI, um die analysierten Tracks gegen deine Janus7-Szenen (z.B. `academy_morning`, `dungeon_combat`) zu bewerten.
4.  **Katalog-Erstellung**: Erstelle/aktualisiere die Datei `data/academy/atmosphere/music-catalog.json`.

---

## JSON Schema (`music-catalog.json`)

Die Datei muss im Ordner `data/academy/atmosphere/` liegen.

```json
{
  "version": "1.0.0",
  "songs": [
    {
      "id": "track_unique_id",
      "path": "pfad/zu/deiner/datei.mp3",
      "title": "Anzeigetitel",
      "metadata": {
        "bpm": 85,
        "mood": "tense",
        "genre": "ambient",
        "tags": ["dungeon", "magic"]
      },
      "ai_scores": {
        "scene_key_1": 0.95,
        "scene_key_2": 0.40
      }
    }
  ]
}
```

---

## Nutzung der API

### Manueller Aufruf via Makro
Du kannst die Entdeckung direkt über die API triggern:

```javascript
// Findet den besten Song für den KI-Szenenschlüssel "academy_morning"
game.janus7.atmosphere.playDiscoveryTrack({ 
    sceneKey: 'academy_morning',
    minScore: 0.8
});

// Findet einen Song basierend auf Tags und Mood
game.janus7.atmosphere.playDiscoveryTrack({ 
    mood: 'tense',
    tags: ['dungeon', 'scary']
});
```

### Discovery Logic
Die Engine berechnet einen Gesamt-Score für jeden Song im Katalog:
1.  **AI-Score** (Query `sceneKey`): Multiplikator 100x.
2.  **Mood Match**: Bonus von +30 Punkten.
3.  **Tag Match**: +10 Punkte pro übereinstimmendem Tag.

Der Song mit dem höchsten Score wird automatisch ausgewählt und abgespielt.

---

## Troubleshooting
*   **Fehler: Kein Track gefunden**: Überprüfe, ob dein `sceneKey` im Katalog vorkommt und ob der `minScore` (Standard: 0) erreicht wird.
*   **Audio spielt nicht**: Stelle sicher, dass der Pfad (`path`) relativ zum Foundry VTT `Data` Verzeichnis korrekt ist.
*   **Katalog lädt nicht**: Prüfe die Browser-Konsole auf JSON-Syntaxfehler.

---
*Version 1.0.0 | Janus7 Phase 8.5*
