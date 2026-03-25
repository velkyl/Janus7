# Data Hygiene & Validation (Academy)

Dieses Dokument beschreibt, wie die Daten in `data/academy/` stabil und wartbar bleiben – besonders wenn die Datenmenge wächst.

## Ziele

- **Frühes Scheitern**: Fehler (Tippfehler in IDs, kaputte Referenzen) sollen *beim Laden* sichtbar werden, nicht erst „mitten in der Session“.
- **Wartbarkeit**: Keine „Escaping-Hölle“ durch HTML in JSON, klare Strukturen, wiederverwendbare Templates.
- **Skalierung**: Standards für Tags, Referenzen und Ableitungen („derived data“).

## 1) Schemas (Developer-Tooling + Runtime-Checks)

Unter `schemas/` liegen JSON-Schemas für die wichtigsten Datentypen (NPCs, Lessons, Exams, Events, …).
Die `AcademyDataApi` kann beim Laden eines JSONs optional ein Schema verwenden, um Strukturfehler früh zu melden.

**Nutzen**
- IDE-Unterstützung (Autocompletion/Validation in VS Code)
- Stabilere Runtime (Warnungen statt Rätselraten)

## 2) Referential Integrity

Viele Dateien referenzieren IDs anderer Dateien, z. B.:
- `exams.json` → `lessonIds`
- `events.json` → `npcIds` / `locationIds`

Die `AcademyDataApi.validateIntegrity()` prüft, ob diese IDs existieren und loggt Warnungen, wenn nicht.

## 3) Tags: Standardisierung

`data/academy/tags.json` ist die zentrale Referenz für erlaubte Tags.
Ziel: Vermeidung von Varianten wie `"schueler"`, `"Schüler"`, `"students"`.

**Regel**
- Neue Tags bitte **in `tags.json` aufnehmen** und danach in Events/Lessons verwenden.

## 4) Kein HTML in JSON

Langfristig sollen Handouts/Outputs **nicht** als rohes HTML in JSON-Strings liegen.
Stattdessen:
- strukturierte Daten (Objekte/Nodes)
- Rendering über Templates (z. B. Handlebars) oder Markdown

In 0.4.5 wurde `lesson-generator.json` bereits in Richtung Template-/Node-Ansatz umgebaut.

## Checkliste für neue Daten

- [ ] Neue IDs sind eindeutig und konsistent benannt.
- [ ] Referenzen (z. B. `lessonIds`) existieren wirklich.
- [ ] Tags stammen aus `data/academy/tags.json`.
- [ ] `AcademyDataApi.validateIntegrity()` zeigt keine „Red Flags“ mehr an.
