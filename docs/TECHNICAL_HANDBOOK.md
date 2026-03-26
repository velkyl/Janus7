# JANUS7 — Technisches Handbuch

## 1. Modulstart
- `scripts/janus.mjs` ist die zentrale Frontdoor.
- Beim Start werden Core, State, AcademyDataApi, Bridge, UI und optionale Phasen nacheinander angehängt.
- Die Shell ist der bevorzugte UI-Einstieg; ältere Apps werden über Wrapper oder Commands erreicht.

## 2. Wichtigste UI-Apps
- **JanusShellApp**: Hauptoberfläche, View-Wechsel (`director`, `academy`, `tools`) und Panel-Einstieg.
- **JanusScoringViewApp**: operativ nutzbar, Edit-Funktionen für Zirkel/Studentenpunkte.
- **JanusAcademyOverviewApp**: Überblick über Kalender, Daten und Kampagnenkontext.
- **JanusLessonLibraryApp**: Lessons/Unterrichtsdokumente, primär view-orientiert mit begrenzten Arbeitsflows.
- **JanusKiRoundtripApp / JanusKiBackupManagerApp**: GM-Werkzeuge für Export/Preview/Apply/Restore.
- **JanusCommandCenterApp / JanusTestResultApp**: Admin-, Diagnose- und Debugcharakter.

## 3. Datenfluss
1. Statische Daten kommen aus `data/academy/*.json`.
2. `AcademyDataApi` lädt, validiert und überlagert optionale World-Overrides.
3. Simulation und UI lesen über Services/API statt direkt aus Rohdateien.
4. Persistente Änderungen landen im JANUS-State oder in World-verwalteten Dokumenten.

## 4. KI-Import / Export
- Export erzeugt `JANUS_EXPORT_V2`.
- Preview validiert Version, Schema, Semantik und Diff.
- Apply schreibt zuerst ein Backup, dann wird transactionell angewendet.
- Restore kann optional validieren und speichert den State anschließend erneut.
- Empfohlen: immer Preview → selektive Auswahl → Apply als GM.

## 5. Diagnose / Tests
- `runHealthCheck()` delegiert auf `engine.diagnostics.report()` und behandelt optionale Subsysteme wie Atmosphere als `DISABLED`/`OPTIONAL` statt pauschal als Fehler.
- Der Test-Harness trennt Binding-/Auto-/Manual-Tests.
- Academy-Daten können zusätzlich über den CLI-Validator und Referenzintegrität geprüft werden.
- Schema- und Referenzfehler werden bewusst aussagekräftig geloggt.

## 6. App-Typen
- **View-only:** reine Anzeige, keine dauerhafte Mutation (z. B. State Inspector).
- **Edit-fähig:** UI kann Daten oder State mutieren (z. B. Scoring, Data Studio, KI Apply).
- **Admin/Debug:** Health Check, Test Runner, Diagnostics, State Inspector, Command Center.
