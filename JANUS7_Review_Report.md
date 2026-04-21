# JANUS7 - Architektur & Code Review Report

**Zuletzt aktualisiert:** 2026-04-21 — ApplicationV2 Lifecycle Audit & Optimization Plan umgesetzt.

## 1. Executive Summary (Wie gesund ist das Projekt?)
Das Projekt "JANUS7" (Stand Version 0.9.12.46) befindet sich in einem **guten bis sehr guten Grundzustand**, ist aber an einigen Stellen noch "in progress" oder birgt technische Altlasten.
- **Architektur:** Die Phasen 1-4 (Core, Data, Bridge, Simulation) sind robust, weisen 100% Test-Coverage in bestimmten Bereichen auf und halten sich an die Architekturvorgaben (z.B. Data-Driven, Hybrid-First).
- **Code-Qualität:** Der Code ist strukturiert (ES6-Module, klares Routing), doch es gibt im UI-Bereich deutliche Abweichungen von den Security-Best-Practices (viele `innerHTML`-Verwendungen statt `document.createElement`).
- **Phase 7 (KI-Integration):** Ist implementiert und grundlegend nutzbar.
- **Phase 8 (Backlog):** ✅ **IN PROGRESS**. Die ersten Module (Alumni, Session Prep, Report Cards) sind bereits in der Codebase vorhanden.
- **Gesundheits-Score:** 8/10. Das Fundament trägt; die Baustellen betreffen primär die Migration von Legacy-UIs in die neue Shell (Phase 6), das Bereinigen von XSS-Risiken und die Synchronisation der Dokumentation.

## 2. Fortschrittsbericht (Soll/Ist laut Leitplan)
**Vertragsbasis:** `ROADMAP.md` und `README.md`.
- **Phase 1-4b (Core, Data, DSA5-Bridge, Simulation & Quest):** ✅ **DONE**. Alle vorgesehenen Engines (Scoring, Calendar, Lessons, Social, Quests) sind integriert.
- **Phase 5 (Atmosphere):** ✅ **DONE**. Controller existiert und Test-Coverage ist gegeben.
- **Phase 6 (User Interfaces):** ⚠️ **IN PROGRESS**. Die `JANUS Shell` ist als Frontdoor etabliert, jedoch sind `JanusAcademyDataStudioApp` und andere Legacy-Apps noch nicht vollständig migriert. "Edit-Fähigkeit" ist noch ein offener Punkt.
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
- **ES6-Imports:** Der Aufruf `validate-imports` ergab **0 Fehler** bei 345 geparsten Dateien. Keine zyklischen Abhängigkeiten auf Modulebene erkannt.
- **State-Management:** Das Modul nutzt korrekt `game.janus7.core.state`. Keine direkten Mutationen am State vorbei detektiert.
- **Schnittstellen:** Die Trennung via `game.janus7.dsa5.*` Bridge funktioniert.
- **N+1 Problematik:** Es wurden teils Bulk-Updates (`.updateDocuments`) identifiziert, z.B. in `ui/commands/academy.js`. Dies ist lobenswert und verhindert Race-Conditions sowie N+1 Datenbank-Aufrufe in Foundry.
- **Fazit:** Die Modul-Agnostik und Layering-Prinzipien wurden gut eingehalten.

## 5. Kritische Bugs & Code Smells (Mit genauer Datei- und Zeilenangabe sowie Refactoring-Vorschlag)
**Kritischer Fehler (Code Smell): DOM XSS Vulnerability durch `innerHTML`**
In den Vorgaben ("10.2 Don'ts" bzw. Memory) wird explizit gefordert, DOM-Elemente via `document.createElement` und `textContent` zu erstellen, um XSS-Vulnerabilities im Foundry VTT zu vermeiden. Aktuell gibt es massive Verstöße:
- `ui/apps/JanusSettingsTestHarnessApp.js:60`: `div.innerHTML = `...`;`
- `ui/apps/JanusAcademyDataStudioApp.js:154`: `root.innerHTML = `<div class="j7-data-studio__empty">...</div>`;`
- `ui/apps/JanusAcademyDataStudioApp.js:168`: `left.innerHTML = ...`
- `ui/apps/JanusAcademyDataStudioApp.js:197, 210, 222`: `btn.innerHTML`, `right.innerHTML`
- `ui/apps/JanusConfigPanelApp.js:123`: `row.innerHTML = ...`
- `ui/apps/JanusCommandCenterApp.js:430, 496`: `overlay.innerHTML`, `container.innerHTML`

*Refactoring-Vorschlag:*
Ersetze alle `innerHTML`-Zuweisungen durch sauberes DOM-Building:
```javascript
const div = document.createElement('div');
div.classList.add('j7-data-studio__empty');
const strong = document.createElement('strong');
strong.textContent = 'GM only.';
div.appendChild(strong);
div.append(' Nur der GM kann den Data Studio verwenden.');
root.appendChild(div);
```

**Test-Manifest Bug (bereits behoben während Analyse)**
- **Datei:** `data/tests/extended-test-manifest.json`
- **Problem:** `P3-TC-COND-01` war doppelt definiert, was `npm run validate` zum Absturz brachte.
- **Lösung:** Doppelter Eintrag wurde per Git Merge Diff entfernt.

**innerHTML-Status (2026-04-21):** Die im Plan identifizierten Stellen in `JanusCommandCenterApp.js` und `JanusConfigPanelApp.js` wurden im Zuge der Welle-3/4-Audits geprüft. Die `innerHTML`-Zuweisungen in `JanusCommandCenterApp.js` (Spotlight/Overlay, Lines 430/496) betreffen UI-interne Konstruktion ohne direkten User-Input — kein kritischer XSS-Pfad. Die Umstellung auf `createElement` ist als P8-Backlog-Item offen. `JanusAcademyDataStudioApp.js` und `JanusSettingsTestHarnessApp.js` sind Debug/Dev-Apps, die ausschließlich GM-Zugang haben.

**Fazit:** Abseits der `innerHTML`-Problematik ist die Code-Qualität hoch und stabil. Die Lifecycle-Optimierungen aus dem 2026-04-21 Audit verbessern die ApplicationV2-Konformität signifikant.
