
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
- Als naechste Grades-V1-Stufe leitet Session Prep daraus jetzt zusaetzlich eine erste trimesterbezogene Endbewertung pro Akteur ab, weiterhin rein read-only und ohne Zeugnis-Backend.
- Darauf aufbauend erzeugt die View jetzt auch kompakte Trimester-Export-Seeds pro Akteur als Vorstufe fuer spaetere Zeugnis-, Journal- oder KI-Weiterverarbeitung.
- Als naechste Stufe stellt Session Prep nun ausserdem strukturierte Zeugnis-/Journal-Entwuerfe pro Akteur als read-only Draft-Objekte bereit, noch ohne Persistenz- oder PDF-Backend.
- Darauf aufbauend erzeugt die View jetzt auch ein kanonisches Zeugnis-/Journal-Export-Bundle mit stabiler JSON-Struktur fuer nachgelagerte Datei-, Journal- oder PDF-Flows.
- Als naechste Writer-Vorstufe leitet Session Prep daraus nun zusaetzlich ein Journal-Bundle mit vorbereiteten JournalEntry-/Page-Inhalten pro Akteur ab, weiterhin ohne echten Schreibpfad.
- Darauf aufbauend gibt es jetzt einen echten Ausgabepfad: Zeugnis-Journals koennen aus der Shell geschrieben werden, und ein druckfaehiger HTML-/Print-Export oeffnet den PDF-Speicherpfad des Browsers.
- Die `People`-View enthaelt nun zusaetzlich ein kleines `Alumni Tracking V1`, das ehemalige Schueler ueber `academy.alumni` im State fuehrt und als Kandidaten aus den NPC-Daten vorbelegt.
- Diese Alumni-Ansicht wird jetzt ausserdem mit dem bestehenden Grades-V1-/Zeugnisstand aus `Session Prep` angereichert, damit Abschlussstand und Leistungsnachweise direkt sichtbar bleiben.
- Darauf aufbauend leitet `People` jetzt erste read-only Wiedereinsatz-Hinweise fuer Mentor- oder Rueckkehr-NSC-Rollen aus Alumni-Status, Zeugnisstand und NPC-Metadaten ab.
- Diese Hinweise werden nun zusaetzlich gegen offene Quests und Story-Threads aus `Session Prep` gespiegelt, damit Alumni-Priorisierung narrativ anschlussfaehig bleibt.
- `People` erlaubt jetzt ausserdem duenne GM-Aktionen direkt aus diesen Hinweisen: Alumni koennen als Mentor vorgemerkt oder fuer einen Rueckkehr-Arc priorisiert werden, ohne schon eine Simulations-Engine auszulösen.
- Als erste Living-World-Vorstufe erzeugt der Wochen-Tick nun ausserdem kleine autonome Beziehungs-Events zwischen NSCs und schreibt sie nach `academy.social.livingEvents`; das Social-Panel zeigt diese Verlaufseintraege kompakt an.
- Die Gewichtung unterscheidet dabei jetzt konservativ zwischen Jahrgangsrivalitaeten, Mentorenspannungen und Kollegiumspolitik; der dedizierte Social-View zeigt dieselben Living-World-Eintraege ebenfalls read-only an.
- Session Prep spiegelt diese autonomen Social-Ereignisse jetzt ausserdem in Chronik-Vorschau und Campaign Chronicle Seed, damit die Living-World-Dynamik in Vorbereitung und Export nicht verloren geht.
- Diese Social-Eintraege werden in Session Prep jetzt ausserdem leicht priorisiert, wenn sie offene Quests oder Alumni-/Mentor-Linien beruehren.
- Priorisierte Social-Eintraege koennen in Session Prep jetzt ausserdem als duenne `Story-Hooks` vorgemerkt werden; das schreibt nur in `academy.social.storyHooks` und startet noch keine Automatik.
- Session Prep zeigt diese vorgemerkten Social-Story-Hooks jetzt ausserdem in einer kleinen Queue-Sicht mit letztem Aenderungsverlauf.

## Overlay
- Fuer GMs wird ein kleines `GM-Quick-Access-Overlay` ueber der Szene gerendert.
- Es zeigt Zeitkontext und Zirkelstand und bietet nur duenne Quick-Actions auf bestehende Commands/UI-Router.
- Foundry-Core-Hooks dafuer bleiben zentral in `scripts/janus.mjs`; die DOM-Logik lebt in `ui/layer/bridge.js`.
- Die Queue dieser Social-Story-Hooks hat jetzt zudem einen kleinen Lebenszyklus (`vorgemerkt`, `abgeschlossen`, `verworfen`), bleibt aber weiterhin nur ein GM-Verwaltungsmarker ohne automatische Story-Verarbeitung.
- Der dedizierte Social-View spiegelt diese Hook-Queue jetzt ebenfalls systemnah und erlaubt dort denselben kleinen GM-Lebenszyklus, statt die Queue nur in `Session Prep` sichtbar zu halten.
- Story-Hook-Aenderungen feuern jetzt einen eigenen JANUS-Hook und halten Shell sowie Social-View dadurch ohne manuelle Zusatzschritte konsistent aktuell.
