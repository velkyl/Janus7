# JANUS7 ROADMAP - konsolidierter Ist-Stand

**Runtime-Version:** 0.9.12.46
**Stand:** 2026-04-21
**Status:** Phasen 0-7 sind im Repo implementiert; laufender Fokus liegt auf Stabilisierung, Shell-Cutover und Release-Hardening.

**2026-04-21 — Optimization & Refactoring Audit abgeschlossen:**
- ApplicationV2 Lifecycle: `_preRender`-Cache-Pattern in 3 Apps implementiert (`JanusKiBackupManagerApp`, `JanusSyncPanelApp`, `JanusLaborApp`); 11 weitere Apps von unnötigem `async` bereinigt.
- Test-Manifest: P6-TC-24 (Command Center Filter) und TC-QS-01..05 (Quest System) in `extended-test-manifest.json` synchronisiert.
- Command Center: Alle `render()`-Aufrufe verwenden `{ force: true }` — konform.

---

## Ueberblick

JANUS7 ist ein hybrides Betriebssystem fuer DSA5-Magierakademie-Kampagnen in Foundry VTT.

Leitlinien:
- Hybrid-First
- Data-Driven
- SSOT ueber den zentralen State-Core
- DSA5-spezifische Logik hinter der Bridge
- KI-Ready, aber konservativ validiert

---

## Phasenstatus

| Phase | Titel | Ist-Stand |
|-------|-------|-----------|
| 0 | Leitbild & Governance | abgeschlossen |
| 1 | Core & State | abgeschlossen |
| 2 | Academy Data | abgeschlossen |
| 3 | DSA5 Bridge | abgeschlossen |
| 4 | Academy Simulation | abgeschlossen |
| 4b | Quest & Event System | abgeschlossen und integriert |
| 5 | Hybrid & Atmosphere | abgeschlossen |
| 6 | UI / Shell Layer | produktiv, mit weiterem Cutover |
| 7 | KI-Integration | abgeschlossen und produktiv nutzbar |
| 8 | Phase 8 Extensions | in Arbeit (Alumni, Session Prep, Report Cards) |

---

## Aktueller Fokus

Die Roadmap ist kein Plan fuer noch fehlende Grundbausteine mehr. Der aktuelle Fokus verschiebt sich auf konsolidierende Arbeit:
- Runtime-Stabilitaet in produktiven Pfaden
- Test-/Validator-Haertung
- Shell-Cutover ohne stillen API-Bruch
- Doku-Sync gegen reale Runtime-APIs und App-Manifeste
- Live-Abnahme kritischer Flows in Foundry

---

## Naechste sinnvolle Arbeiten

### 1. Runtime- und Release-Hardening
- echte Regressionen in produktiven Pfaden priorisieren
- Import-/Export-, Bridge- und Director-Vertraege weiter gegen Drift absichern
- Doku- und Versionssync Teil des Release-Rituals halten

### 2. UI-Konsolidierung
- Shell als primaeren Einstieg weiter staerken
- Legacy-Wrapper nur behalten, wenn sie reale Kompatibilitaet liefern
- keine neue Fachlogik in UI-Klassen einfuehren

### 3. Test- und Diagnoseabdeckung
- Validatoren und Registry-Pruefungen aktuell halten
- Guided Manual Harness nur als Testwerkzeug weiterentwickeln
- Live-Checks fuer komplexe DSA5-/Foundry-Interaktionen beibehalten

### 4. Daten- und Weltqualitaet
- Welt-Mappings und Actor-UUID-Bezuege sauber halten
- neue Datenstrukturen nur mit klarer Schema- und Reader-Abdeckung einfuehren
- Quest-/Event-/Scoring-Inhalte weiter datengetrieben pflegen

---

## Architekturanker

Massgebliche aktuelle Referenzen:
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/TECHNICAL_HANDBOOK.md`
- `docs/UI_SHELL_LAYER.md`
- `docs/KI_INTEGRATION_GUIDE.md`
- `docs/STATUS.md`
- `docs/MODULE_STATUS.md`

Fuer die Runtime sind ausserdem `module.json`, `VERSION.json`, `package.json`, `ui/app-manifest.js` und `core/hooks/topics.js` verbindlicher als aeltere Planungsdokumente.

---

## Hinweis zu aelteren Phase-Dokumenten

Mehrere Dateien im `docs/`-Verzeichnis dokumentieren historische Implementierungswellen, Freigaben oder Audit-Staende. Diese Dokumente bleiben als Nachvollziehbarkeitsartefakte erhalten, sind aber keine Roadmap-SSOT fuer den aktuellen Produktstand.

