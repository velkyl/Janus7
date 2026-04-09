# Academy Data Guide

Dieses Dokument ist ein praktischer Leitfaden zum Bearbeiten und Erweitern der Academy-Daten.

## Datenauflösung

JANUS7 lädt aktive Akademiedaten nicht nur aus `data/academy/`.

Technische Priorität bei JSON-Assets:

1. `data/profiles/<profil>/academy/<datei>`
2. `data/profiles/<profil>/<datei>`
3. `data/academy/<datei>`
4. weitere Fallbacks aus dem Resolver

Konsequenz:

- Profilspezifische Daten gehören bevorzugt unter `data/profiles/<profil>/academy/`
- Root-Dateien im Profil gelten nur noch als Legacy- oder Fallback-Schicht, sofern sie neben `academy/` weiter existieren
- `data/academy/` bleibt die gemeinsame Basis und der Shared Fallback

## Profilverträge

Ab 2B.1 werden Profilverträge explizit über `data/profiles/<profil>/profile-contract.json` beschrieben.

Diese Manifeste halten fest:

- Zielstatus des Profils (`foundation`, `core-profile`, `full-profile`)
- bevorzugte Datenwurzel (`academy` oder `profile-root`)
- Referenzrolle im 2B-Ausbau
- erlaubte Herkunftsstufen (`kanonisch`, `verdichtet`, `adaptiert`, `experimentell`)
- Regeln für Legacy-Duplikate zwischen Profil-Root und `academy/`

Validierung:

- `npm run validate:profiles`
- oder vollständig über `npm run validate`

## Shared Verzeichnisstruktur

- `data/academy/npcs.json` – Shared Akademie-NPCs (Fallback)
- `data/academy/locations.json` – Shared Orte/Szenen (Fallback)
- `data/academy/lessons.json` – Shared Unterrichtseinheiten (Fallback)
- `data/academy/exams.json` – Shared Prüfungen (Fallback)
- `data/academy/events.json` – Shared Ereignisse (Fallback)
- `data/academy/tags.json` – zentrale Tag-Whitelist/Referenz
- weitere Dateien: Kalender-Templates, Curricula, Generatoren

Profilspezifische Varianten gehören, wenn vorhanden, bevorzugt nach:

- `data/profiles/<profil>/academy/npcs.json`
- `data/profiles/<profil>/academy/locations.json`
- `data/profiles/<profil>/academy/lessons.json`
- `data/profiles/<profil>/academy/events.json`

## IDs & Referenzen

**Grundregel:** IDs sind der "Primary Key" in den JSONs.
Wenn Datei A eine ID aus Datei B referenziert, muss diese existieren.

Beispiele:

- `EXAM_X.lessonIds[]` -> muss in `lessons.json` existieren
- `EVENT_Y.npcIds[]` -> muss in `npcs.json` existieren

## Tags

- Tags sind bewusst klein gehalten (z. B. `feier`, `schueler`, `lehrer`)
- Verwende nur Tags, die in `tags.json` definiert sind

## Handouts / Lesson Generator

`lesson-generator.json` ist als Content-Generator gedacht.
Ab 0.4.5 ist die Struktur stärker auf Templates/Nodes ausgelegt, um HTML in Strings zu vermeiden.

## Debugging / Validierung

Empfohlen:

1. Foundry starten und Konsole prüfen
2. Im Log sollten `AcademyDataApi: Ready` und keine harten Fehler erscheinen
3. Bei Warnungen: betroffene Datei oder ID korrigieren

Optional: eigenes Makro, das `game.modules.get("Janus7")...` oder `AcademyDataApi.validateIntegrity()` aufruft.
