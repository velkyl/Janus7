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
- Die Agenda markiert ausserdem direkte Quest-Event-Treffer und Story-Threads und kann passende Event-Popups ueber den bestehenden Quest-Command-Pfad oeffnen.
- Session Prep stellt ausserdem eine reine Chronik-Vorschau aus vorhandenen Runtime-Historien bereit, ohne dafuer bereits ein eigenes Journal-Subsystem einzufuehren.
- Fuer nachgelagerte KI-/Journal-Flows wird daraus zusaetzlich ein kopierbarer Chronicle-Seed generiert; Persistenz oder Exportlogik bleiben weiterhin ausserhalb der Shell.
- Als erste `WP 3`-Welle zeigt Session Prep zusaetzlich einen read-only Pruefungsstand mit Notenbasis aus `academy.examResults`, den Exam-Thresholds und `grading-schemes.json`.
- Die naechste Ausbaustufe aggregiert diese Daten innerhalb von Session Prep zu einem kleinen Zwischenstand je Akteur; neue Exam-Attempts speichern dafuer zusaetzlich den akademischen Zeitraum im Meta-Feld.
- Darauf aufbauend zeigt Session Prep jetzt ausserdem eine erste trimesterbezogene `Grades V1`-Auswertung pro Akteur, noch ohne Zeugnis- oder PDF-Erzeugung.
- Als naechste schmale Ausbaustufe stellt Session Prep dazu jetzt kopierbare Trimester-Export-Seeds pro Akteur bereit, ohne bereits ein Zeugnis- oder Journal-Backend einzufuehren.
- Darauf aufbauend liefert Session Prep jetzt auch strukturierte Zeugnis-/Journal-Entwuerfe pro Akteur als read-only Draft-Objekte fuer spaetere Export- oder PDF-Flows.
- Als naechste schmale Stufe wird daraus jetzt ein kanonisches Zeugnis-/Journal-Export-Bundle mit stabiler JSON-Struktur fuer nachgelagerte Weiterverarbeitung abgeleitet.
- Darauf aufbauend erzeugt Session Prep jetzt ausserdem ein writer-orientiertes Journal-Bundle mit vorbereiteten JournalEntry-/Page-Inhalten pro Akteur, noch ohne echten Schreibpfad.
- Als Abschlusskante fuer das Zeugnissystem kann die Shell jetzt aus diesen Artefakten sowohl Zeugnis-Journals schreiben als auch einen druckfaehigen HTML-/Print-Export fuer den PDF-Speicherpfad oeffnen.
- In `People` existiert jetzt ausserdem ein erstes `Alumni Tracking V1`: read-only Uebersicht plus kleine GM-Verwaltung auf Basis von `academy.alumni`, getrennt vom bestehenden `studentArchive`-Lorefenster.
- Die Alumni-Uebersicht zieht dazu nun den vorhandenen Trimester-/Zeugnisstand aus `Session Prep` heran, statt eine zweite Bewertungslogik aufzubauen.
- Darauf aufbauend zeigt `People` jetzt auch erste Wiedereinsatz-Hinweise fuer Alumni, noch ohne daraus bereits eine eigene Simulations- oder Event-Engine zu machen.
- Diese Alumni-Hinweise werden nun mit offenen Quest-Titeln und Story-Threads aus `Session Prep` kontextualisiert, ohne dafuer bereits neue Quest- oder Event-Logik einzufuehren.
- Aus diesen Hinweisen koennen GMs nun direkt einen duennen Wiedereinsatz-Fokus setzen (`Mentor` oder `Rueckkehr-Arc`), weiterhin rein als Verwaltungsmarkierung.
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

- Das Social-Panel zeigt jetzt auch autonome Beziehungs-Events aus dem Living-World-Tick als knappe Verlaufssicht; die Beziehungslogik bleibt weiterhin in `academy/social.js` und `academy/living-world.js`.
- Der dedizierte Social-View rendert diese autonomen Events jetzt ebenfalls read-only und macht damit Jahrgangs-, Mentor- und Kollegiums-Dynamiken sichtbarer, ohne neue UI-Schreibpfade einzufuehren.
- Session Prep fuehrt diese Living-World-Social-Events nun auch in der Chronik-Vorschau und im Chronicle-Seed mit, sodass sie in den bestehenden Vorbereitungs- und Exportpfaden sichtbar bleiben.
- Offene Quests sowie Alumni-/Mentor-Bezuege heben solche Social-Eintraege in der Chronik nun leicht an, ohne eine neue Story-Automation einzufuehren.
- Die Shell bietet dafuer jetzt einen kleinen GM-Pfad `Als Story-Hook vormerken`; dieser markiert den Eintrag nur im State und bleibt bewusst ohne automatische Quest-/Event-Ausloesung.
- Eine kleine Queue-Sicht in Session Prep buendelt diese vorgemerkten Hooks, ohne daraus schon ein eigenes Story-Backend zu machen.
- Die Queue dieser Social-Story-Hooks hat jetzt zudem einen kleinen Lebenszyklus (`vorgemerkt`, `abgeschlossen`, `verworfen`), bleibt aber weiterhin nur ein GM-Verwaltungsmarker ohne automatische Story-Verarbeitung.
- Der dedizierte Social-View spiegelt diese Hook-Queue jetzt ebenfalls systemnah und erlaubt dort denselben kleinen GM-Lebenszyklus, statt die Queue nur in `Session Prep` sichtbar zu halten.
- Story-Hook-Aenderungen feuern jetzt einen eigenen JANUS-Hook und halten Shell sowie Social-View dadurch ohne manuelle Zusatzschritte konsistent aktuell.
