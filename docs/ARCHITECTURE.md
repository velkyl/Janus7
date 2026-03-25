# ARCHITECTURE – JANUS7

## Zielbild
JANUS7 ist kein “Monolith mit Makros”, sondern ein modularer Stack. Ziel ist:
- klare Zuständigkeiten,
- minimale Kopplung,
- reproduzierbare Tests,
- langfristige Weiterentwicklung (JANUS7 → JANUS8 etc. möglich).

## Schichtenmodell (Phasen 0–8)
**Regel:** Phase N darf nur Phase ≤N importieren.

### Phase 0 – Bootstrap
- Entry-Points: Hook-Registrierung, Initialisierung der Kernmodule.
- Keine Business-Logik.

### Phase 1 – Core
- State (persistenter, versionierter Zustand)
- Validator (Schema-/Invariantenchecks)
- Logger (strukturierte Logs)
- IO (kleine Hilfsfunktionen)
- Fehlerklassen

### Phase 2 – Academy Data
- Datenzugriff (JSON) über `AcademyDataApi`
- Stabile, testbare Schnittstellen (keine direkte Fetch-Orgie im Code)
- Caching/Validierung vorbereitet

### Phase 3 – DSA5 Bridge
- Kapselt dsa5-Interna:
  - Actor-/Item-Auflösung
  - Skill-/Zauberzugriff
  - Rolls (silent, ohne UI)
  - Wrapper (einfache, stabile API für JANUS)
- Diagnosefunktionen (Capabilities)

### Phase 4 – Simulation / Academy Runtime
- Kalender, Scoring, Social, Lessons, Exams
- Living World und Academy Progression als aufgesetzte Laufzeitschichten
- UI-freie Domänenlogik auf Basis von Phase 1–3

### Phase 5 – Atmosphere
- Audio-/Mood-Steuerung
- Playlist-Provider, Auto-Mood-Regeln, Hybrid-/Socket-Pfade
- Optional und per Kill-Switch abschaltbar

### Phase 6 – UI / Shell / Commands
- ApplicationV2-Apps und JANUS Shell
- UI-Router, Layer/Registry, Scene-Controls, Commands
- UI spricht über Core-/Bridge-/Academy-APIs statt quer durch den Code

### Phase 7 – KI Roundtrip / Import / Export
- JSON-Formate (JANUS_EXPORT_V2 / JANUS_KI_RESPONSE_V1)
- Preview, Diff, Backup/Restore, semantische Validierung
- konservative Apply-/Recovery-Pfade

### Phase 8 – Extensions / Zusatzwerkzeuge
- Session Prep, Discovery, Graph, optionale Zusatztools
- Nicht alles davon ist gleich reif oder produktiv

## Anti-Patterns (bitte vermeiden)
- Direktzugriff auf `actor.system` ohne Bridge (bricht bei dsa5-Updates)
- UI-Dialoge in Tests (nicht reproduzierbar)
- “Fehlendes Talent => 0” (Semantikfehler; null ist korrekt)
- Deprecated Foundry APIs (V1 Application, global JournalSheet etc.)

