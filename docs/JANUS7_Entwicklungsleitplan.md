**Projektmanagement & Implementierungs-Roadmap**

**Version 1.0**

11\. December 2025

**Status: Bereit für Implementierungsstart**

# Executive Summary

Dieses Dokument definiert den konkreten Entwicklungsplan für JANUS7,
basierend auf der vollständigen Architektur-Roadmap. Es dient als
Leitfaden für die schrittweise Implementierung über 8 Phasen.

## Projektziele

-   Vollständige Implementierung aller Core-Phasen (0-7) innerhalb von
    3-5 Monaten

-   Funktionierender MVP nach Phase 4 (ca. 6-8 Wochen)

-   Modularer, wartbarer Code mit \<20% technischer Schuld

-   Dokumentation parallel zur Entwicklung

-   Kontinuierliche Tests in DEV-World

## Kritische Erfolgsfaktoren

-   Strikte Einhaltung der Phase-Abhängigkeiten (keine Phasen
    überspringen)

-   Weekly Reviews gegen Architektur-Leitbild

-   Backup-Strategie: Jeden Major-Meilenstein State sichern

-   Test-First-Ansatz: DEV-World vor PROD-World

-   Dokumentation ist Pflicht, nicht Optional

# Zeitplan & Meilensteine

Basierend auf den Aufwandsschätzungen aus der Roadmap ergibt sich
folgender realistischer Zeitplan:

## Gesamtübersicht

  --------------------------------------------------------------------------
  **Phase**      **Aufwand      **Dauer        **Start        **Status**
                 (PT)**         (Wochen)**     (relativ)**    
  -------------- -------------- -------------- -------------- --------------
  Phase 0        1,5-2          1              Woche 0        Zu starten

  Phase 1        8-11           2-3            Woche 1        Vorbereitet

  Phase 2        7,5-12         2-3            Woche 3-4      Geplant

  Phase 3        6-10           1,5-2          Woche 5-6      Geplant

  Phase 4        9-14           2-3            Woche 7-8      Geplant

  MVP            ---            ---            Woche 8        Ziel
  Meilenstein                                                 

  Phase 5        8-13           2-3            Woche 9-10     Geplant

  Phase 6        13-19          3-4            Woche 11-13    Geplant

  Phase 7        11-19          2-4            Woche 14-16    Geplant
  --------------------------------------------------------------------------

**Gesamtdauer: 16-20 Wochen (ca. 4-5 Monate)**

## Meilensteine

**M0: Architektur finalisiert** --- Ende Woche 1

-   Phase 0 abgeschlossen, alle Phasen dokumentiert

**M1: Core funktionsfähig** --- Ende Woche 3-4

-   State Manager, Config, Director, Validator laufen

**M2: Daten verfügbar** --- Ende Woche 6-7

-   Alle statischen Akademie-Daten in JSON, APIs funktionieren

**M3: DSA5-Integration** --- Ende Woche 8

-   Proben, Zauber, Items funktionieren über Bridge

**M4: MVP - Spielbarer Prototyp** --- Ende Woche 10-11

-   Eine komplette Akademie-Woche durchspielbar

**M5: Atmosphere läuft** --- Ende Woche 13

-   Audio-/Mood-System funktioniert

**M6: UI komplett** --- Ende Woche 16-17

-   Alle Control Panels und Views einsatzbereit

**M7: KI-Roundtrip** --- Ende Woche 19-20

-   Export, Import, Validierung funktionieren

**RELEASE: JANUS7 v7.0** --- Ende Woche 20

-   Produktiv einsetzbar für echte Kampagne

# Detaillierte Phase-Planung

## Phase 0: Leitbild & Architektur

### Dauer

1 Woche

### Deliverables

-   Finales Architektur-Dokument (Word)

-   Architecture Contract Checkliste

-   Namespace-Definitionen

-   State-Schema V7.1.0 (konzeptionell)

-   Risiko-Register

### Abhängigkeiten

Keine (Startpunkt)

### Akzeptanzkriterien

-   Alle folgenden Phasen referenzieren dieses Dokument

-   Architecture Contract wird von Team verstanden

-   Keine offenen Architektur-Fragen

## Phase 1: Core & Data Architecture

### Dauer

2-3 Wochen

### Deliverables

-   modules/janus7/core/state.js - JanusStateCore

-   modules/janus7/core/config.js - Config Layer

-   modules/janus7/core/director.js - Director API

-   modules/janus7/core/io.js - IO Layer

-   modules/janus7/core/validator.js - Validator

-   modules/janus7/core/logger.js - Logger

-   HOOKS_API.md Dokumentation

### Abhängigkeiten

Phase 0 abgeschlossen

### Akzeptanzkriterien

-   State kann gespeichert/geladen werden

-   Transaktionen mit Rollback funktionieren

-   Backups werden automatisch erstellt

-   Logger mit 4 Levels funktioniert

-   Alle Core-Tests bestanden

## Phase 2: Static Academy Data

### Dauer

2-3 Wochen

### Deliverables

-   data/academy/calendar.json

-   data/academy/lessons.json

-   data/academy/exams.json

-   data/academy/npcs.json

-   data/academy/locations.json

-   data/academy/library.json

-   modules/janus7/academy/data-api.js

-   Caching-Layer für häufige Zugriffe

### Abhängigkeiten

Phase 1 (Core APIs verfügbar)

### Akzeptanzkriterien

-   Alle JSONs validieren gegen Schema

-   Mindestens 1 vollständiges Trimester definiert

-   NPCs mit Beziehungen verknüpft

-   Lookup-Performance \<50ms für cached Items

-   Alle Daten-Tests bestanden

## Phase 3: DSA5 System Bridge

### Dauer

1,5-2 Wochen

### Deliverables

-   modules/janus7/systems/dsa5/index.js

-   modules/janus7/systems/dsa5/rolls.js

-   modules/janus7/systems/dsa5/actors.js

-   modules/janus7/systems/dsa5/items.js

-   modules/janus7/systems/dsa5/packs.js

-   modules/janus7/systems/dsa5/diagnostics.js

-   DSA5_BRIDGE_API.md

### Abhängigkeiten

Phase 1 + 2, DSA5-System installiert

### Akzeptanzkriterien

-   Talent-Proben werden korrekt aufgerufen

-   Zauber können gecasted werden

-   Items können zu Actors hinzugefügt werden

-   Fehlerhafte Referenzen werden abgefangen

-   Bridge-Tests mit echten DSA5-Daten bestanden

## Phase 4: Academy Simulation Logic

### Dauer

2-3 Wochen

### Deliverables

-   modules/janus7/academy/calendar.js

-   modules/janus7/academy/lessons.js

-   modules/janus7/academy/exams.js

-   modules/janus7/academy/scoring.js

-   modules/janus7/academy/social.js

-   modules/janus7/academy/events.js

-   Akademie-Engine vollständig integriert

### Abhängigkeiten

Phase 1, 2, 3

### Akzeptanzkriterien

-   Kalender kann vorwärts/rückwärts navigiert werden

-   Lektionen werden Slots zugewiesen

-   Prüfungen können durchgeführt werden

-   Scoring wird korrekt berechnet

-   MVP: Eine komplette Woche ist spielbar

# Ressourcenplanung

## Team-Struktur

JANUS7 ist als Solo-/Duo-Projekt konzipiert:

**Lead Developer:** Hauptverantwortlich für Architektur, Core-Module,
Integration

**KI-Unterstützung (Claude/ChatGPT):** Code-Generierung, Review,
Dokumentation, Testing

**Optional: Junior Dev:** Daten-Entry (JSON), Testing, Dokumentation

## Benötigte Tools & Umgebung

-   Foundry VTT v13+ (Lizenz erforderlich)

-   DSA5-System + relevante Module (dsa5-core, soms, magic1-3)

-   VS Code mit ESLint, Prettier, Foundry-Extension

-   Git für Versionskontrolle

-   Zwei Foundry-Welten: JANUS7_DEV (Testing) + AKADEMIE_PUNIN_PROD

-   Node.js v18+ für lokale Tools

-   Optional: Gemini/ChatGPT API für KI-Features

## Zeitinvestition

  -----------------------------------------------------------------------
  **Phase-Gruppe**        **Aufwand (PT)**        **Bei 20h/Woche**
  ----------------------- ----------------------- -----------------------
  Phase 0-1 (Foundation)  9,5-13 PT               \~3 Wochen

  Phase 2-4 (MVP)         22,5-36 PT              \~4-6 Wochen

  Phase 5-7 (Polish)      32-51 PT                \~6-9 Wochen

  **GESAMT**              64-100 PT               13-20 Wochen
  -----------------------------------------------------------------------

# Risikomanagement

Identifizierte Risiken mit Wahrscheinlichkeit, Impact und Mitigation:

  -----------------------------------------------------------------------------------------------
  **Risiko**                 **Wahrscheinlichkeit**   **Impact**        **Mitigation**
  -------------------------- ------------------------ ----------------- -------------------------
  **Scope Creep**            Hoch                     Kritisch          Strikte Phase-Disziplin.
                                                                        Neue Features nur in
                                                                        Phase 8 Backlog. Weekly
                                                                        Architecture Reviews.

  **Foundry API-Änderungen** Mittel                   Hoch              Verwendung von
                                                                        ApplicationV2 und
                                                                        offiziellen APIs.
                                                                        Test-World vor
                                                                        Production-Updates.

  **DSA5-Module nicht        Mittel                   Hoch              Bridge-Layer mit
  kompatibel**                                                          Fallbacks. Diagnostics
                                                                        für Dependency-Checks
                                                                        beim Start.

  **State-Korruption**       Niedrig                  Kritisch          Automatische Backups vor
                                                                        jedem Major-Update.
                                                                        Transaktions-Rollbacks.
                                                                        Schema-Validierung.

  **Performance-Probleme**   Mittel                   Mittel            Caching-Layer für
                                                                        statische Daten.
                                                                        State-Optimierung.
                                                                        Profiling in DEV-World.

  **Dokumentation hinkt      Hoch                     Mittel            Docs sind Acceptance
  hinterher**                                                           Criterion für jede Phase.
                                                                        Parallel-Entwicklung.
  -----------------------------------------------------------------------------------------------

# Quality Assurance & Testing

## Test-Strategie

**Unit Tests:** Jedes Modul hat eigene Tests (Jest/Mocha) --- *Phase 1+*

**Integration Tests:** Phasen-übergreifende Tests (State + Academy) ---
*Phase 4+*

**System Tests:** End-to-End in DEV-World --- *Jede Phase*

**User Acceptance:** Spielbare Session in DEV-World --- *MVP + Final*

**Regression Tests:** Nach jedem Major-Update --- *Kontinuierlich*

## Definition of Done

Eine Phase gilt als abgeschlossen, wenn:

1.  Alle Deliverables existieren und sind committed

2.  Alle Akzeptanzkriterien erfüllt

3.  Code-Review durchgeführt (selbst oder mit KI)

4.  Tests geschrieben und bestanden

5.  Dokumentation aktualisiert

6.  DEV-World funktioniert ohne Fehler

7.  Architecture Contract eingehalten

8.  State-Backup erstellt

# Progress Tracking

## Weekly Checkpoints

Jeden Freitag:

-   Status-Update: Was wurde erreicht?

-   Blocker-Identifikation: Was verhindert Fortschritt?

-   Architecture-Review: Weichen wir ab?

-   Nächste Woche: Was sind die 3 Hauptziele?

-   Risk-Assessment: Neue Risiken? Status bestehender?

## Phase-Abschluss Reviews

Nach jeder Phase:

-   Vollständige Demo in DEV-World

-   Lessons Learned dokumentieren

-   Technical Debt Assessment

-   Nächste Phase Planning

-   Dokumentations-Review

## Tracking-Template

  ------------------------------------------------------------------------
  **Phase**   **Geplant   **Actual    **Geplant   **Actual    **Status**
              Start**     Start**     Ende**      Ende**      
  ----------- ----------- ----------- ----------- ----------- ------------
  Phase 0     Woche 0     ---         Woche 1     ---         Not Started

  Phase 1     Woche 1     ---         Woche 3     ---         Not Started

  Phase 2     Woche 3     ---         Woche 6     ---         Not Started

  Phase 3     Woche 6     ---         Woche 8     ---         Not Started

  Phase 4     Woche 8     ---         Woche 11    ---         Not Started
  ------------------------------------------------------------------------

# Deployment & Release-Strategie

## Umgebungen

  -------------------------------------------------------------------------------
  **Umgebung**          **Zweck**         **Update-Frequenz**   **Inhalt**
  --------------------- ----------------- --------------------- -----------------
  JANUS7_DEV            Entwicklung &     Täglich               Alle
                        Testing                                 experimentellen
                                                                Features

  JANUS7_TEST           Pre-Production    Wöchentlich           Nur stabile
                        Staging                                 Phasen

  AKADEMIE_PUNIN_PROD   Live-Kampagne     Nach Meilensteinen    Nur Releases
  -------------------------------------------------------------------------------

## Release-Checklist

Vor jedem Production-Release:

-   [ ] Alle Tests in DEV-World bestanden

-   [ ] TEST-World erfolgreich aktualisiert und getestet

-   [ ] State-Backup von PROD erstellt

-   [ ] Release Notes geschrieben

-   [ ] CHANGELOG.md aktualisiert

-   [ ] module.json Version erhöht (SemVer)

-   [ ] Dokumentation aktuell

-   [ ] Rollback-Plan definiert

-   [ ] Kommunikation an Team/Spieler

# Nächste Schritte

## Sofort (Diese Woche)

9.  1\. Phase 0 finalisieren: Dieses Dokument + Tech-Doku reviewed

10. 2\. DEV-World aufsetzen: Leere Foundry-Welt mit DSA5-System

11. 3\. Git-Repository initialisieren: Branch-Struktur (main, develop,
    feature/\*)

12. 4\. Verzeichnisstruktur erstellen: modules/janus7/\...

13. 5\. Phase 1 Starter-Kit studieren

14. 6\. Ersten Commit: \"feat: Initialize JANUS7 project structure\"

## Diese Woche (Start Phase 1)

-   core/state.js: Grundstruktur implementieren

-   core/logger.js: Logging-System mit Leveln

-   Erste Tests schreiben

-   Daily Standups: Was funktioniert? Was blockiert?

-   Weekend Review: Phase 1 Fortschritt gegen Plan

## Nächste 2 Wochen (Phase 1 abschließen)

-   Vollständiger State Manager mit Transaktionen

-   Config-System mit world-spezifischen Settings

-   Director-API für Foundry-Orchestrierung

-   IO-Layer für Export/Import

-   Validator für State-Validierung

-   Komplette Test-Suite für Core

-   Phase 1 Review & Abschluss

**Mit diesem Plan bist du bereit, JANUS7 von der Vision zur Realität zu
machen!**

Viel Erfolg bei der Implementierung! 🎯
