# JANUS7 - Architektur & Code Review Report

**Zuletzt aktualisiert:** 2026-04-21 — ApplicationV2 Lifecycle Audit & Shell-Cutover abgeschlossen.

## 1. Executive Summary (Wie gesund ist das Projekt?)
Das Projekt "JANUS7" (Stand Version 0.9.12.46) befindet sich in einem **guten bis sehr guten Grundzustand**, ist aber an einigen Stellen noch "in progress" oder birgt technische Altlasten.
- **Architektur:** Die Phasen 1-4 (Core, Data, Bridge, Simulation) sind robust, weisen 100% Test-Coverage in bestimmten Bereichen auf und halten sich an die Architekturvorgaben (z.B. Data-Driven, Hybrid-First).
- **Code-Qualität:** Der Code ist strukturiert (ES6-Module, klares Routing) und hält Security-Best-Practices ein (0 `innerHTML`-Verstöße, ApplicationV2-konform).
- **Phase 7 (KI-Integration):** Ist implementiert und grundlegend nutzbar.
- **Phase 8 (Backlog):** ✅ **IN PROGRESS**. Die ersten Module (Alumni, Session Prep, Report Cards) sind bereits in der Codebase vorhanden.
- **Gesundheits-Score:** 9/10. Das Fundament trägt; offene Baustellen sind `JanusAcademyDataStudioApp`-Edit-Fähigkeit und laufende P8-Erweiterungen.

## 2. Fortschrittsbericht (Soll/Ist laut Leitplan)
**Vertragsbasis:** `ROADMAP.md` und `README.md`.
- **Phase 1-4b (Core, Data, DSA5-Bridge, Simulation & Quest):** ✅ **DONE**. Alle vorgesehenen Engines (Scoring, Calendar, Lessons, Social, Quests) sind integriert.
- **Phase 5 (Atmosphere):** ✅ **DONE**. Controller existiert und Test-Coverage ist gegeben.
- **Phase 6 (User Interfaces):** ✅ **SHELL-CUTOVER DONE** (2026-04-21). `controlPanel`, `lessons`, `aiRoundtrip` aus dem Manifest entfernt; `APP_LAUNCHER_EXCLUDE` bereinigt. `JanusAcademyDataStudioApp` und "Edit-Fähigkeit" bleiben offene P8-Backlog-Items.
- **Phase 7 (KI-Integration):** ✅ **DONE**. Export, Import und Diff existieren in `phase7/`.
- **Phase 8 (Backlog):** ⚠️ **IN PROGRESS**. Module wie `JanusAlumniApp`, `JanusReportCardApp` und `JanusSessionPrepService` sind aktiv und folgen bereits den modernen Architekturvorgaben (ApplicationV2, _preRender).

**Offene Baustellen/Lücken:**
- Die `source-md/`-Dateien, die im Prompt erwähnt wurden, existieren in der aktuellen Codebase nicht mehr.
- ✅ **BEHOBEN (2026-04-21):** Tests für das Quest-System (`TC-QS-01` bis `TC-QS-05`) sind im `extended-test-manifest.json` registriert. P6-TC-24 (Command Center Kategorie-Filter) ebenfalls ergänzt.
- ✅ **BEHOBEN (2026-04-21):** ApplicationV2 Lifecycle — 3 Apps mit echten `await`-Verstößen in `_prepareContext` auf `_preRender`-Cache-Muster umgestellt (`JanusKiBackupManagerApp`, `JanusSyncPanelApp`, `JanusLaborApp`). 11 weitere Apps von unnötigem `async`-Keyword bereinigt.

## 3. Daten- & Content-Konsistenz (Probleme in den Lehrplänen/Jahres-Dateien)
Eine Prüfung der Academy JSON-Daten (`calendar.json`, `lessons.json`, `exams.json`) zeigt folgendes:
- Die Validierung über `npm run validate:academy` meldet **keine Referenz-Warnungen (refWarnings=0)** und validiert 16 Schemata erfolgreich.
- **Logische Brüche:**
  - Die Daten sind minimalisiert (z.B. `calendar.json` hat 2 Einträge, `lessons.json` hat 2/10 Einträge, `exams.json` hat 2 Einträge). Es handelt sich eher um Stubs als um vollständige Kampagnen-Daten, aber diese verweisen strukturell sauber aufeinander.
  - `calendar.json` verweist auf `LES_MAG_BASICS_01`, was in `lessons.json` definiert ist.
  - `exams.json` (`EXAM_MAG_BASICS_01`) verweist korrekt auf `LES_Y1_T2_MAGTH_01`.
- **Fazit:** Die JavaScript-Logik liest die Strukturen sauber ein, da die Schema-Validierung strikt ist und keine Mismatches zulässt.

## 4. Architektur-Probleme (Falsche API-Calls, Schnittstellen-Fehler)
- **ES6-Imports:** Der Aufruf `validate-imports` ergab **0 Fehler** bei 396 geparsten Dateien (inkl. Contracts). Keine zyklischen Abhängigkeiten auf Modulebene erkannt.
- **State-Management:** Das Modul nutzt korrekt `game.janus7.core.state`. Keine direkten Mutationen am State vorbei detektiert.
- **Schnittstellen:** Die Trennung via `game.janus7.dsa5.*` Bridge funktioniert.
- **N+1 Problematik:** Es wurden teils Bulk-Updates (`.updateDocuments`) identifiziert, z.B. in `ui/commands/academy.js`. Dies ist lobenswert und verhindert Race-Conditions sowie N+1 Datenbank-Aufrufe in Foundry.
- **Fazit:** Die Modul-Agnostik und Layering-Prinzipien wurden gut eingehalten.

## 5. Kritische Bugs & Code Smells (Mit genauer Datei- und Zeilenangabe sowie Refactoring-Vorschlag)
**✅ BEHOBEN (2026-04-21): DOM XSS — `innerHTML`-Verstöße vollständig beseitigt**
Grep-Scan über alle `.js`-Dateien der Codebase (exkl. `node_modules`) ergab **0 Treffer** für `innerHTML`. Alle in v0.9.12.42 gemeldeten Stellen wurden zwischen v0.9.12.42 und v0.9.12.46 auf sauberes DOM-Building (`document.createElement` / `textContent`) umgestellt:
- ~~`ui/apps/JanusSettingsTestHarnessApp.js:60`~~
- ~~`ui/apps/JanusAcademyDataStudioApp.js:154, 168, 197, 210, 222`~~
- ~~`ui/apps/JanusConfigPanelApp.js:123`~~
- ~~`ui/apps/JanusCommandCenterApp.js:430, 496`~~

`npm run validate` → Security validation: **OK**.

**Test-Manifest Bug (bereits behoben während Analyse)**
- **Datei:** `data/tests/extended-test-manifest.json`
- **Problem:** `P3-TC-COND-01` war doppelt definiert, was `npm run validate` zum Absturz brachte.
- **Lösung:** Doppelter Eintrag wurde per Git Merge Diff entfernt.

**Fazit:** Die Code-Qualität ist hoch und stabil. XSS-Risiken sind beseitigt; ApplicationV2-Konformität durch Lifecycle-Optimierungen signifikant verbessert.
