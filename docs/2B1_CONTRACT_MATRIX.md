# 2B.1 Contract Matrix

Stand: 2026-04-09

## Zweck

Diese Matrix ist die vorlaeufige 2B.1-Einstufung der Datendomänen. Sie ist bewusst kritisch und soll den Umfang fuer 2B.2 begrenzen.

## Ausgangslage

Der vorher angenommene einheitliche Vollvertrag ist wahrscheinlich zu schwer fuer fruehe Gegenproben. Daher ist fuer 2B.1 eine gestufte Einordnung sinnvoller:

- `foundation`
- `core-profile`
- `full-profile`

## Vertragsstufen

### Foundation

Ein Profil ist `foundation`, wenn der quellen- oder datenbasierte Grundschnitt fuer 2B belastbar hinterlegt ist, aber Unterricht/Pruefungen und Vollfunktionalitaet noch nicht komplett validiert wurden.

Pflicht:

- `academy/academy-data.json`
- `npcs.json`
- `locations.json`
- `events.json`

### Core Profile

Ein Profil ist `core`, wenn es spielbar beschreibbar und in JANUS7 sinnvoll lesbar ist.

Pflicht:

- `academy/academy-data.json`
- `lessons.json` oder gleichwertiger Unterrichtskern
- `calendar.json` oder `calendar-template` plus `teaching-sessions`
- `npcs.json`
- `locations.json`
- `events.json`
- SL-Kurzprofil oder gleichwertiger Seed-/Lore-Einstieg

### Full Profile

Ein Profil ist `full`, wenn es 2B-Vollfunktionalitaet fuer SL, Quests und Foundry traegt.

Pflicht:

- alles aus `core-profile`
- Questschicht
- Faction-/Sozialschicht
- Tabellenfaehige Event-/Quest-/Faction-Ausgabe
- Foundry/Seed-Ausgabe

## Vorlaeufige Einstufung je Datendomaene

| Domaene | Core | Full | Status 2B.1 | Kritische Anmerkung |
|---|---|---|---|---|
| `academy-data` | Pflicht | Pflicht | stabil | Primärer Vertragskern |
| `lessons` | Pflicht | Pflicht | stabil | Ohne Unterricht verliert die Akademie Struktur |
| `calendar` | Pflicht | Pflicht | stabil | Tages-/Slotlogik ist real angebunden |
| `events` | Pflicht | Pflicht | stabil | Kern der Spielbewegung |
| `npcs` | Pflicht | Pflicht | stabil | Ohne NPC-Netz keine soziale Akademie |
| `locations` | Pflicht | Pflicht | stabil | Ohne Orte keine konkrete Spielbarkeit |
| `teaching-sessions` | empfohlen | Pflichtnah | kritisch | Runtime-relevant, aber nicht in allen Profilen vorhanden |
| `calendar-template` | empfohlen | Pflichtnah | kritisch | fuer Slot-/Tagesstruktur relevant |
| `exams` | optional | Pflichtnah | offen | fuer 2B wegen Unterricht/Pruefungen wahrscheinlich wichtiger als bisher |
| `exam-questions` | optional | optional | offen | nicht automatisch Pflicht |
| `grading-schemes` | optional | optional | offen | eher Regeltiefe als Kern |
| `quests/quest-index` | optional | Pflicht | stark | reale Konsumenten vorhanden |
| `quests/<id>.json` | optional | Pflicht | stark | Questengine und Content Registry nutzen Einzelfiles |
| `events/pool-index` | optional | Pflichtnah | stark | wichtig fuer strukturierte Eventausgabe |
| `events/pools/*` | optional | Pflichtnah | stark | Eventsystem real angebunden |
| `factions` | optional | Pflicht | stark | Runtime und Session Prep nutzen Factiondaten |
| `social_links` | optional | Pflichtnah | stark | sozialer Kern, aber noch nicht fuer jedes Profil verfuegbar |
| `rumors` | optional | optional | nuetzlich | eher Ausbau als Minimalpflicht |
| `library` | optional | optional | nuetzlich | fuer Punin wichtig, nicht fuer jeden Vertrag automatisch |
| `alchemy-recipes` | optional | optional | spezial | keine allgemeine 2B-Pflicht |
| `effects` | optional | optional | spezial | Spieltiefe, aber kein Vertragskern |
| `collections` | optional | optional | spezial | nicht allgemeiner Akademiekern |
| `milestones` | optional | optional | offen | kann spaeter wichtiger werden |
| `resources` | optional | optional | offen | eher Management-/Meta-Schicht |
| `school_stats` | optional | optional | offen | nicht zuerst verpflichten |
| Inspirationsdateien | optional | optional | risikobehaftet | nur mit Herkunftsmarkierung |

## Kritische Entscheidungen

### Entscheidung 1

`Foundry-Tabellen` sollten nicht als eigene Pflichtdatei erzwungen werden.

Begruendung:

- sinnvoller ist `tabellenfaehige Ausgabe` als Vertragsziel
- die Tabelle kann aus Events, Quests und Factions abgeleitet werden
- eine zusaetzliche Pflichtdatei wuerde Doppelpflege provozieren

### Entscheidung 2

`Seeds/SL-Exporttexte` sollten als Pflichtfaehigkeit gelten, nicht zwingend als separate Datei.

Begruendung:

- vorhandene Shell- und Session-Prep-Pfade koennen Seeds aus strukturierten Daten ableiten
- separate Seeddateien nur dann, wenn der SL-Mehrwert gegenueber generiertem Output klar ist

### Entscheidung 3

`teaching-sessions` und `calendar-template` sind wichtiger, als ihre Verbreitung in `gareth`/`lowangen` aktuell vermuten laesst.

Begruendung:

- Runtime-Fallbacks nutzen sie real
- sie definieren Tagesrhythmus und Unterrichtsmodell
- sie sollten fuer `full-profile` sehr wahrscheinlich Pflicht werden

## Vorlaeufige Profilzuordnung

### Punin

- aktueller validierter Status: `full-profile`
- Zielstatus nach 2B.2: `full-profile`

### Lowangen

- aktueller validierter Status: `core-profile`
- Zielstatus fuer die erste Gegenprobe: `core-profile`
- spaeter moeglich: `full-profile`

### Gareth

- aktueller validierter Status: `core-profile`
- Zielstatus fuer die erste Gegenprobe: `core-profile`
- spaeter moeglich: `full-profile`

### Festum

- aktueller validierter Status: `foundation`
- strukturell tief, aber fachlich noch nicht als 2B-Referenz validiert
- bewusst als Bestandsprofil und nicht als 2B-Referenz behandeln

## Konsequenz fuer 2B.2

2B.2 sollte mit einem klaren Schnitt arbeiten:

- Punin wird auf `full-profile` stabilisiert
- Lowangen wird zuerst auf `core-profile` quellengebunden gehoben
- Gareth wird danach als `core-profile` institutionell-politisch kalibriert

Erst danach ist es sinnvoll, den Vollvertrag breiter auszurollen.

## Stand nach Umsetzung

- `punin` ist als `full-profile` technisch konsistent und ohne verbleibende Root-/`academy/`-Divergenzen in den vertraglich sensiblen Kernsets aufgeloest.
- `lowangen` ist als `core-profile` angehoben.
- `gareth` ist als `core-profile` angehoben.

Damit ist Variante A abgeschlossen:

- Referenzprofil: `punin`
- belastbare Gegenproben: `lowangen`, `gareth`
- Festum: vertraglich eingehegt, aber bewusst kein Referenzprofil
