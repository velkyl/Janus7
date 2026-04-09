# 2B.1 Profile Inventory

Stand: 2026-04-09

## Zweck

Diese Notiz friert den realen Profilbestand fuer die 2B.1-Inventur ein. Sie beschreibt nur den aktuell im Repo sichtbaren Datenzustand und vermeidet Soll-Architektur als Fakt.

## Kurzfazit

- `punin` ist das tiefste Profil.
- `festum` ist strukturell fast ein Spiegel von `punin`.
- `gareth` und `lowangen` sind deutlich schlanker.
- Das Repo enthaelt sowohl Profil-Root-Dateien als auch `academy/`-Dateien.
- Fuer `punin` und `festum` existieren viele scheinbar parallele Strukturen.
- Fuer `gareth` und `lowangen` fehlt ein grosser Teil des tiefen Akademie-Stacks.

## Profilklassen

### Vollnahe Profile

- `punin`
- `festum`

Merkmale:

- Kern-JSONs im Profil-Root
- zusaetzliche `academy/`-Spiegel
- Event-Unterordner mit Pool-Indizes und Einzelfiles
- Quest-Unterordner mit `quest-index.json` und Einzelfiles
- `academy/extensions/*`
- `academy/effects/*`
- `atmosphere/*`
- weitere optionale Schul- und Regelergaenzungen

### Schlanke Profile

- `gareth`
- `lowangen`

Merkmale:

- `academy/academy-data.json`
- Root-Dateien fuer `events.json`, `npcs.json`, `locations.json`
- keine sichtbare Queststruktur
- keine sichtbaren Event-Pools
- keine sichtbaren Extensions-/Effects-Strukturen

## Inventarmatrix

### Punin

Vorhanden im Root:

- `academy-data.json`
- `calendar.json`
- `events.json`
- `lessons.json`
- `locations.json`
- `npcs.json`
- `spell-curriculum.json`
- `spells-index.json`
- `alchemy-recipes.json`
- `lesson-generator.json`
- `calendar-template.json`
- `teaching-sessions.json`
- `circles.json`
- `exams.json`
- `exam-questions.json`
- `grading-schemes.json`
- `subjects.json`
- `ap-awards.json`
- `library.json`
- `social_links.json`
- `milestones.json`
- `collections.json`
- `school_stats.json`
- `resources.json`
- `familiar_missions.json`
- `mechanics.json`
- `rumors.json`

Vorhanden unter `academy/`:

- `academy-data.json`
- `calendar.json`
- `events.json`
- `lessons.json`
- `locations.json`
- `npcs.json`
- `spell-curriculum.json`
- `spells-index.json`
- `alchemy-recipes.json`
- `lesson-generator.json`
- `calendar-template.json`
- `teaching-sessions.json`
- `circles.json`
- `exams.json`
- `exam-questions.json`
- `grading-schemes.json`
- `subjects.json`
- `ap-awards.json`
- `library.json`

Vorhanden unter `academy/extensions/`:

- `assignments.json`
- `duels.json`
- `factions.json`
- `field_guide_lore.json`
- `harvest_nodes.json`
- `rumors.json`
- `sanctuary.json`

Vorhanden unter `academy/events/`:

- `event-index.json`
- `pool-index.json`
- `options.json`
- `procedural_options.json`
- `academagia_inspired.json`
- `wizard_life_options.json`
- Tages-/Kontextdateien wie `morgen.json`, `mensa.json`, `nacht.json`, `exploration.json`
- diverse Pools unter `academy/events/pools/`

Vorhanden unter `academy/quests/`:

- `quest-index.json`
- `procedural_quests.json`
- `wizard_life_quests.json`
- mehrere Einzelquests

Wichtige Beobachtung:

- `punin` ist kein einzelnes sauberes Profil, sondern ein gewachsener Datenraum mit parallelen Ebenen.

### Festum

Festum weist nahezu dieselbe Tiefenstruktur wie `punin` auf:

- Root-Kernsets
- `academy/`-Spiegel
- `academy/extensions/*`
- `academy/events/*`
- `academy/quests/*`
- `effects/*`
- `atmosphere/*`

Wichtige Beobachtung:

- `festum` wirkt derzeit eher wie ein struktureller Klon des tiefen Akademiemodells als wie ein eigenstaendig kalibriertes Profil.

### Gareth

Vorhanden:

- `academy/academy-data.json`
- `events.json`
- `npcs.json`
- `locations.json`

Nicht sichtbar vorhanden:

- `quests/`
- `academy/events/`
- `academy/extensions/`
- `academy/effects/`
- `calendar-template.json`
- `teaching-sessions.json`
- `exams.json`
- `subjects.json`

### Lowangen

Vorhanden:

- `academy/academy-data.json`
- `events.json`
- `npcs.json`
- `locations.json`

Nicht sichtbar vorhanden:

- `quests/`
- `academy/events/`
- `academy/extensions/`
- `academy/effects/`
- `calendar-template.json`
- `teaching-sessions.json`
- `exams.json`
- `subjects.json`

## Vorlaeufige Einordnung

### Sicherer Kernbestand im Repo

- `academy-data`
- `events`
- `npcs`
- `locations`

### Tiefer, aber nicht fuer alle Profile stabil verfuegbar

- `quests`
- `factions`
- `effects`
- `calendar-template`
- `teaching-sessions`
- `exams`
- `subjects`
- `library`

### Kritische Doppelungszonen

- Profil-Root vs `profile/academy/`
- Root-`events.json` vs `academy/events/*`
- Root-`social_links.json` vs `academy/social_links.json`
- Root-`milestones.json` vs `academy/milestones.json`

## Konsequenz fuer 2B.1

2B.1 darf nicht mit einem Greenfield-Schema starten. Zuerst muss entschieden werden:

- welche Ebene fuehrend ist
- welche Ebene nur Fallback ist
- welche Dateien optional sind
- welche Dateien historisch gedoppelt sind

Ohne diese Entscheidung wuerde 2B weitere Sonderfaelle produzieren statt Konvergenz.
