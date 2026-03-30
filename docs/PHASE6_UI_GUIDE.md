# Phase 6 - UI Guide

**Status:** produktiv mit laufendem Shell-Cutover
**Runtime-Stand:** 0.9.12.46
**Letzte Doku-Synchronisation:** 2026-03-30

---

## Grundsatz

Phase 6 ist nicht mehr "in Arbeit" im Sinne einer offenen Grundimplementierung. Die UI-Landschaft existiert produktiv, wird aber weiterhin konsolidiert: Die Shell ist die bevorzugte Frontdoor, waehrend einzelne Alt-Apps, Debug-Werkzeuge und Alias-Einstiege aus Kompatibilitaetsgruenden weiter mitlaufen.

UI-Dateien bleiben duenn. Fachlogik gehoert in Commands, Director, Core, Academy oder Bridge - nicht in App-Klassen oder Templates.

---

## Bevorzugte Einstiege

Kanonischer Einstieg:

```js
game.janus7.ui.open('shell');
```

Weitere produktive oder teilproduktive Apps laut `ui/app-manifest.js`:
- `academyOverview`
- `scoringView`
- `lessonLibrary`
- `socialView`
- `kiRoundtrip`
- `kiBackupManager`
- `configPanel`
- `syncPanel`
- `atmosphereDJ`
- `academyDataStudio`
- `libraryBrowser`
- `studentArchive`
- `enrollmentScanner`
- `quartermaster`

Debug-/Test-/Compat-Bereiche:
- `commandCenter` (Debug/Power-Tools, nicht bevorzugter Produktivpfad)
- `testResults`
- `guidedManualTests`
- `stateInspector`
- `controlPanel` (Compat-Alias auf Shell)
- `aiRoundtrip` (Compat-Alias auf KI-Roundtrip)
- `lessons` (Compat-Alias auf Lesson Library)

---

## Router und Manifest

Massgebliche Runtime-Dateien:
- `ui/index.js`
- `ui/app-manifest.js`
- `ui/layer/*`
- `templates/apps/*`

Wichtige API:

```js
game.janus7.ui.open('shell');
game.janus7.ui.openShell();
game.janus7.ui.openControlPanel();
game.janus7.ui.list();
game.janus7.ui.appStatus('shell');
```

Regeln:
- Neue produktive Einstiege werden ueber `game.janus7.ui.open(key)` modelliert.
- `openControlPanel()` bleibt nur als harmlose Kompatibilitaetsschicht bestehen und routed intern auf die Shell. Dasselbe gilt fuer `ui.open('controlPanel')`.
- Scene Controls sollen kanonische Ziele oeffnen: Session Prep direkt als Shell-View, Diagnose bevorzugt ueber Shell/State Inspector statt ueber Altfenster.
- Session Prep ist innerhalb der Shell die bevorzugte Vorbereitungsansicht und bietet erste Mood-Vorschlaege ueber den bestehenden Atmosphere-Controller statt ueber eigene UI-Logik.
- Die View bereitet ausserdem NSC-Besetzungen fuer aktuelle und kommende Slots datengetrieben aus den Academy-Inhalten auf.
- Session Prep verdichtet diese Daten zu einer Shell-nativen Szenen-Checkliste statt weitere Admin-Fenster als Primärpfad aufzubauen.
- Checklisten-Aktionen laufen ueber die bestehenden Commands fuer Ortswechsel und Atmosphere, nicht ueber neue UI-seitige Direktpfade.
- Session Prep baut zusaetzlich eine datengetriebene Vorbereitungsagenda fuer aktuelle und naechste Slots auf; eine Lektion kann daraus direkt ueber `lesson.start` aktiviert werden.
- Der Reifegrad einzelner Apps wird zentral ueber `ui/app-manifest.js` beschrieben, nicht ueber verteilte Einzelannahmen.

---

## Commands statt UI-Logik

Massgebliche Runtime-Dateien:
- `ui/commands/index.js`
- `ui/commands/time.js`
- `ui/commands/state.js`
- `ui/commands/academy.js`
- `ui/commands/quest.js`
- `ui/commands/system.js`
- `ui/commands/ki.js`
- `ui/commands/phase7.js`

Praxisregel:
- UI loest Aktionen ueber Commands, Director oder die oeffentliche Bridge aus.
- Direkte State-Mutationen aus UI-Komponenten bleiben unerwuenscht.
- Parametervertraege aus den Commands sind Teil der stabilen Surface und sollen in Snippets und Doku konsistent benannt werden.

---

## Shell Layer

Die Shell ist der bevorzugte Sammelpunkt fuer Navigation und Workflow-Orchestrierung.

Massgebliche Dateien:
- `ui/apps/JanusShellApp.js`
- `templates/shell/*`
- `ui/layer/view-registry.js`
- `ui/layer/panel-registry.js`
- `ui/layer/context-builders.js`
- `ui/layer/director-context.js`

Zielbild:
- produktive Kernablaeufe zuerst in die Shell
- Legacy-Einstiege nur solange behalten, wie sie reale Kompatibilitaet liefern
- keine Logikverdopplung zwischen Shell und Alt-App
- die linke Shell-Side-Nav bleibt der bevorzugte Launcher fuer Views und registrierte Sub-Apps; sekundaere Debug-Pfade wie `commandCenter` bleiben ueber `Power Tools`, aber nicht mehr als prominenter Nav-Eintrag erhalten

---

## Template- und Styling-Hinweise

Aktive App-Templates werden in `module.json` unter `templates` registriert. Produktive App-Templates liegen heute vor allem unter `templates/apps/` und Shell-Templates unter `templates/shell/`.

Styling:
- `styles/janus7-layers.css`
- `styles/janus7-ui-bundle.css`

Wichtige Regel:
- Neue UI-Arbeit muss mit den registrierten Templates und den real geladenen Styles arbeiten. Verwaiste Template- oder CSS-Annahmen aus aelteren Dokus gelten nicht als Ist-Stand.

---

## Restrisiken

- Der Shell-Cutover ist funktional weit, aber nicht in jedem Altpfad vollstaendig abgeschlossen.
- Legacy-Wrapper bleiben bewusst vorhanden; neue Features sollten sie nicht weiter ausbauen.
- Endgueltige Nutzungsqualitaet einzelner Flows muss weiterhin in Foundry live geprueft werden.

