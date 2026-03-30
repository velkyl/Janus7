
# JANUS7 UI Shell Layer

Stand: v0.9.12.46

## Ziel
Additive, modulare OberflÃ¤che innerhalb von JANUS7.
Sie ergÃ¤nzt die bestehenden Einzel-Apps und ersetzt sie nicht abrupt.

## Architektur
- `ui/apps/JanusShellApp.js`
  - Hauptfenster / Layer-Shell
  - View-State (`director`, `academy`, `schedule`, `people`, `places`, `system`, `tools`, `sessionPrep`)
  - Panel-State (`scoring`, `social`, `diagnostics`, ...)
  - dynamische Side-Nav fuer Shell-Views und registrierte Sub-Apps
- `ui/layer/view-registry.js`
  - registriert die Shell-Views
  - jede View baut ihr Modell Ã¼ber `build(engine)`
- `ui/layer/panel-registry.js`
  - registriert Panels als Metadaten + Builder
  - neue Panels werden hier additiv ergÃ¤nzt
- `ui/layer/action-router.js`
  - Action-Dispatch fÃ¼r Commands, App-Ã–ffnungen und Panel-Aktionen
- `ui/layer/bridge.js`
  - hÃ¤ngt die Shell als `engine.uiLayer.openShell()` ein
  - registriert einen Scene-Control-Button

## Erweiterung
### Neues Panel
1. Definition in `ui/layer/panel-registry.js` ergÃ¤nzen
2. optional `build(engine)` hinzufÃ¼gen
3. Buttons/Aktionen konfigurieren

### Neue View
1. `registerView({ id, title, icon, build })`
2. passendes Template `templates/shell/views/<id>.hbs`
3. Shell verwendet die View automatisch

## Zugriff
- `game.janus7.ui.open('shell')`
- `game.janus7.uiLayer.openShell()`
- Scene Controls: `JANUS Shell Ã¶ffnen`


## Navigation
- Die linke Side-Nav ist der kanonische Einstieg in die Shell.
- Oben stehen immer die Shell-Views.
- Darunter werden registrierte Sub-Apps dynamisch in die Gruppen `Arbeitsflaechen`, `GM & Admin`, `Debug & Tests` und `Legacy & Bridges` einsortiert. Sekundaere Debug-Pfade wie `commandCenter` oder `settingsTestHarness` bleiben dabei bewusst aus der prominenten Side-Nav herausgenommen.
- Die View `Werkzeuge` rendert `Scoring`, `Social` und `Atmosphaere` jetzt als Shell-Cards im Grid statt nur als Panel-Tiles.
- Legacy-/Alias-Einstiege bleiben erreichbar, sollen aber nicht mehr als Primaerpfad fuer neue Workflows ausgebaut werden. `controlPanel` routed kanonisch auf `shell`, `sessionPrepWizard` auf die Shell-View `sessionPrep`.
- Scene Controls oeffnen Session Prep direkt als Shell-View; Diagnosepfade bevorzugen innerhalb der Shell den `State Inspector`, waehrend `Power Tools` nur noch ein Sekundaerpfad bleiben.
- Session Prep zeigt erste Atmosphaere-Vorschlaege direkt in der Shell an und leitet Mood-Anwendungen ueber den bestehenden Atmosphere-Command-Pfad.
- Session Prep baut ausserdem eine slotbasierte NSC-Besetzung aus Lessons/Exams/Events auf, ohne neue Simulationslogik in die UI zu verschieben.
- Darauf aufbauend rendert die Shell eine kompakte Szenen-Checkliste pro Slot mit Inhalten, Besetzung, Ort und voraussichtlicher Stimmung.
- Diese Checkliste nutzt vorhandene Commands fuer `Ort aktivieren`, `Orts-Mood` und direkte Mood-Anwendung statt eigener UI-Sonderlogik.
- Darueber hinaus verdichtet Session Prep Lessons, Pruefungen und Events zu einer kleinen Vorbereitungsagenda mit Fokus, Skills/Checks und optionaler Lektion-Aktivierung ueber bestehende Commands.
- Offene Quest-Knoten und `relatedStoryThreads` werden dabei gegen kommende Slots gespiegelt, damit narrative Anschluss-Szenen frueh sichtbar werden.
- Session Prep rendert zusaetzlich eine kleine Chronik-Vorschau aus vorhandenen State-Historien (Quests, Zirkelpunkte, Pruefungen, Ressourcen, Aktivitaeten) als Vorstufe fuer spaetere Journal-/KI-Exporte.
- Darauf aufbauend erzeugt die View jetzt auch einen kopierbaren `Campaign Chronicle Seed` fuer KI- oder Journal-Weiterverarbeitung.
- Als erste `WP 3`-Basis rendert Session Prep ausserdem einen read-only Pruefungsstand mit normalisierter Notenbasis aus `academy.examResults` und den hinterlegten Bewertungsschemata.
- Darauf aufbauend verdichtet die View diese Exam-Daten jetzt auch zu einem kleinen Zwischenstand je Akteur; neue Versuche tragen dafuer zusaetzlich einen akademischen Periodenstempel im Attempt-Meta.

## Overlay
- Fuer GMs wird ein kleines `GM-Quick-Access-Overlay` ueber der Szene gerendert.
- Es zeigt Zeitkontext und Zirkelstand und bietet nur duenne Quick-Actions auf bestehende Commands/UI-Router.
- Foundry-Core-Hooks dafuer bleiben zentral in `scripts/janus.mjs`; die DOM-Logik lebt in `ui/layer/bridge.js`.
