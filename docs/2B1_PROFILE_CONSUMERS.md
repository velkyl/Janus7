# 2B.1 Profile Consumers

Stand: 2026-04-09

## Zweck

Diese Notiz beschreibt, welche Profil-Datendomänen erkennbar von Loadern, Runtime oder UI genutzt werden. Sie ist eine Arbeitsgrundlage fuer 2B.1 und keine Garantie, dass jeder Konsument bereits vollstaendig verstanden wurde.

## Kurzfazit

- Der Datenzugriff ist profilfaehig und mehrstufig.
- Kern- und optionale Datensaetze werden ueber `academy/data-api-init.js` geladen.
- Die Asset-Aufloesung bevorzugt `profile/academy/` vor `profile-root`.
- Fallbacks gehen danach ueber `profile-root`, `data/academy/*` und `data/*`.
- Quest- und Event-Unterordner haben reale Konsumenten.
- `factions` und `social_links` haben reale Konsumenten.
- Viele tiefe Punin-/Festum-Dateien koennen nicht pauschal als Altlast abgeschrieben werden.

## Primare Konsumenten

### 1. Datenloader

Wichtige Datei:

- [academy/data-api-init.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/academy/data-api-init.js)

Geladene Kernsaetze:

- `lessons.json`
- `npcs.json`
- `calendar.json`
- `locations.json`
- `events.json`

Geladene optionale Saetze:

- `quests/quest-index.json`
- `events/event-index.json`
- `events/pool-index.json`
- `events/options.json`
- `academy/effects/effect-index.json`
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

Geladene Extensions:

- `academy/extensions/assignments.json`
- `academy/extensions/sanctuary.json`
- `academy/extensions/duels.json`
- `academy/extensions/factions.json`
- `academy/extensions/harvest_nodes.json`
- `academy/extensions/field_guide_lore.json`
- `academy/extensions/rumors.json`
- `academy/social_links.json`
- `academy/milestones.json`
- `academy/collections.json`
- `academy/school_stats.json`
- `academy/resources.json`

### 2. Asset-Aufloesung

Wichtige Datei:

- [academy/data-api-store.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/academy/data-api-store.js)

Wichtige Evidenz:

- Prioritaet laut Code:
  - `data/profiles/<profile>/academy/<path>`
  - `data/profiles/<profile>/<path>`
  - `data/academy/<path>`
  - `data/<path>`

Wichtige Konsequenz:

- `profile/academy/` ist technisch die hoechste Override-Ebene.
- Profil-Root ist kein Fuehrungspfad, sondern bereits zweiter Fallback.
- Eine pauschale Root-zuerst-Architektur ist mit dem aktuellen Code nicht haltbar.

## Sekundare Konsumenten

### 3. Calendar Runtime

Wichtige Datei:

- [academy/calendar.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/academy/calendar.js)

Genutzte Datendomänen:

- `calendar.json`
- `teaching-sessions.json`
- `calendar-template.json`
- `events.json`

Folgerung:

- Unterrichts-/Slotstruktur ist kein Luxus, sondern real in der Runtime verankert.

### 4. Content Registry

Wichtige Datei:

- [academy/content-registry.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/academy/content-registry.js)

Genutzte Datendomänen:

- `quests/<id>.json`
- `events/pools/<name>.json`
- `academy/effects/<id>.json`

Folgerung:

- Einzelquest-Dateien und Event-Pools haben echte Loader-Pfade.
- Ein kuenftiger 2B-Vertrag muss Quest- und Poolstrukturen bewusst behandeln.

### 5. Quest/Faction Runtime und UI

Wichtige Dateien:

- [academy/data-api-readers.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/academy/data-api-readers.js)
- [scripts/ui/quest-journal.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/scripts/ui/quest-journal.js)
- [phase8/session-prep/JanusSessionPrepService.js](/D:/RPG%20Lokal/FoundryVTT/Data/modules/Janus7/phase8/session-prep/JanusSessionPrepService.js)

Erkennbar genutzt:

- Questsummary
- Faction standing
- Rumor board
- aktive Quests
- Questjournal
- Session-Prep-Vorschlaege

Folgerung:

- `quests`, `factions`, `social_links` und verwandte Schichten sind keine rein optionalen Spielereien mehr.

## Vorlaeufige Konsumentenklassifikation

### Stark konsumiert

- `academy-data`
- `lessons`
- `calendar`
- `locations`
- `npcs`
- `events`
- `quests/quest-index`
- `quests/<id>.json`
- `events/pool-index`
- `events/pools/*`
- `factions`
- `social_links`
- `calendar-template`
- `teaching-sessions`
- `exams`
- `exam-questions`

### Erkennbar, aber eher optional oder ausbaufreundlich

- `alchemy-recipes`
- `circles`
- `collections`
- `milestones`
- `resources`
- `school_stats`
- `lesson-generator`
- `library`

### Noch nicht belastbar als Pflicht nachgewiesen

- einzelne Inspirationsdateien wie `academagia_inspired.json`
- `wizard_life_options.json`
- `wizard_life_quests.json`
- atmosphaerische Spezialdateien
- manche Effektdetails

## Konsequenzen fuer 2B.1

1. Ein 2B-Vertrag muss zwischen Kernverbrauchern und Luxusdaten unterscheiden.
2. `academy/` ist faktisch die technisch bevorzugte Override-Schicht.
3. Profil-Root ist aktuell oft Fallback oder historisch mitgefuehrte Parallelstruktur.
4. Quests und Fraktionen sind bereits in Runtime und UI relevant.
5. `calendar-template` und `teaching-sessions` sollten nicht vorschnell als optionaler Ballast eingestuft werden.

## Kritische Empfehlung

Fuer 2B.1 ist die wahrscheinlich sauberste Richtung:

- `academy/` als bevorzugte Profilschicht anerkennen
- Profil-Root nur dort tolerieren, wo der Datenbestand noch nicht migriert ist
- Root/Academy-Doppelungen nicht sofort loeschen, aber explizit als Konvergenzrisiko markieren
