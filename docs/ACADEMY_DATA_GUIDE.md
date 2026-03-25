# Academy Data Guide (data/academy)

Dieses Dokument ist ein praktischer Leitfaden zum Bearbeiten und Erweitern der Academy-Daten.

## Verzeichnisstruktur

- `data/academy/npcs.json` – Akademie-NPCs (IDs, Rollen, ggf. Verweise auf Actors/Journals)
- `data/academy/locations.json` – Orte/Szenen (IDs, Szenen-Referenzen, Meta)
- `data/academy/lessons.json` – Unterrichtseinheiten (Thema, Lehrende, Slot-Regeln, Tags)
- `data/academy/exams.json` – Prüfungen (Zugehörige Lessons, Thresholds, Bewertung)
- `data/academy/events.json` – Ereignisse (Trigger/Slot, Teilnehmer, Tags)
- `data/academy/tags.json` – zentrale Tag-Whitelist/Referenz
- weitere Dateien: Kalender-Templates, Curricula, Generatoren

## IDs & Referenzen

**Grundregel:** IDs sind der „Primary Key“ in den JSONs.
Wenn Datei A eine ID aus Datei B referenziert, muss diese existieren.

Beispiele:
- `EXAM_X.lessonIds[]` → muss in `lessons.json` existieren
- `EVENT_Y.npcIds[]` → muss in `npcs.json` existieren

## Tags

- Tags sind bewusst „klein“ gehalten (z. B. `feier`, `schueler`, `lehrer`).
- Verwende nur Tags, die in `tags.json` definiert sind.

## Handouts / Lesson Generator

`lesson-generator.json` ist als Content-Generator gedacht.
Ab 0.4.5 ist die Struktur stärker auf **Templates/Nodes** ausgelegt, um HTML in Strings zu vermeiden.

## Debugging / Validierung

Empfohlen:
1. Foundry starten → Konsole prüfen.
2. Im Log sollten `AcademyDataApi: Ready` und keine harten Fehler erscheinen.
3. Bei Warnungen: betroffene Datei/ID korrigieren.

Optional: eigenes Makro, das `game.modules.get("janus7")...` / `AcademyDataApi.validateIntegrity()` aufruft.
