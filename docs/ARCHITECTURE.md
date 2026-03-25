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

### Phase 4 – UI / Director
- ApplicationV2 (keine deprecated V1 Apps)
- UI spricht nur mit Phase 1–3 APIs (nicht “quer” durch Ordner)

### Phase 5 – Import/Export
- JSON-Formate (JANUS_IMPORT / JANUS_EXPORT)
- Validierung & Recovery (teilweise Importfehler ohne Totalschaden)

### Phase 6 – Integration / Regression
- Tests gegen echte Worlds / typische Modulsets
- Kompatibilitätschecks bei Foundry-/dsa5-Updates

### Phase 7 – Hardening
- Resilience: saubere Fehlerpfade, Retry/Backoff, Logging
- Security: Eingabedaten validieren, kein eval, keine stillen Side-Effects

### Phase 8 – Extensions
- Optionales: Atmosphere, Media, zusätzliche Tools

## Anti-Patterns (bitte vermeiden)
- Direktzugriff auf `actor.system` ohne Bridge (bricht bei dsa5-Updates)
- UI-Dialoge in Tests (nicht reproduzierbar)
- “Fehlendes Talent => 0” (Semantikfehler; null ist korrekt)
- Deprecated Foundry APIs (V1 Application, global JournalSheet etc.)

