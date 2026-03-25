# JANUS7 — Quest System

**Phase:** 4b | **Engine:** `scripts/academy/quests/quest-engine.js`

---

## Quest-Datenformat

Jede Quest ist eine JSON-Datei unter `data/quests/Q_*.json`.

### Struktur

```json
{
  "questId": "Q_DEMO_LIBRARY",
  "title": "Das Geheimnis der Bibliothek",
  "description": "Ein Schüler entdeckt einen versteckten Raum in der Bibliothek.",
  "tags": ["exploration", "year1"],
  "startNodeId": "QN_DISCOVER",
  "nodes": [
    {
      "nodeId": "QN_DISCOVER",
      "type": "event",
      "eventId": "E_LIBRARY_DISCOVER",
      "onSuccess": "QN_INVESTIGATE",
      "onFailure": "QN_END_FAIL",
      "onFailforward": "QN_INVESTIGATE"
    },
    {
      "nodeId": "QN_INVESTIGATE",
      "type": "check",
      "condition": "CHECK(Magiekunde, 12)",
      "onSuccess": "QN_REWARD",
      "onFailure": "QN_END_PARTIAL",
      "onFailforward": "QN_END_PARTIAL"
    },
    {
      "nodeId": "QN_REWARD",
      "type": "effect",
      "effectIds": ["lore_plus1", "rep_mentor_plus2"],
      "nextNodeId": "QN_END_SUCCESS"
    },
    {
      "nodeId": "QN_END_SUCCESS",
      "type": "terminal",
      "outcome": "success"
    },
    {
      "nodeId": "QN_END_PARTIAL",
      "type": "terminal",
      "outcome": "partial"
    },
    {
      "nodeId": "QN_END_FAIL",
      "type": "terminal",
      "outcome": "failure"
    }
  ]
}
```

---

## Node-Typen

| Typ | Beschreibung | Pflichtfelder |
|---|---|---|
| `event` | Triggert ein Event, wartet auf Optionsauswahl | `eventId`, `onSuccess` |
| `check` | Wertet eine Condition aus, verzweigt | `condition`, `onSuccess`, `onFailure` |
| `effect` | Wendet Effect-IDs an | `effectIds`, `nextNodeId` |
| `terminal` | Beendet die Quest | `outcome` |

### `check`-Knoten: Failforward-Mechanik

Wenn `onFailforward` gesetzt ist, wird bei Misserfolg **nicht** abgebrochen, sondern auf den Failforward-Pfad weitergeleitet. So können Quests auch bei Würfelpech fortgeführt werden.

```json
{
  "nodeId": "QN_CHECK",
  "type": "check",
  "condition": "CHECK(Magiekunde, 15)",
  "onSuccess":    "QN_ERFOLG",
  "onFailure":    "QN_SCHEITERN",
  "onFailforward": "QN_TEILERFOLG"
}
```

---

## Quest-Index

`data/quests/quest-index.json` listet alle verfügbaren Quests:

```json
{
  "quests": [
    {
      "questId": "Q_DEMO_LIBRARY",
      "title": "Das Geheimnis der Bibliothek",
      "file": "Q_DEMO_LIBRARY.json",
      "tags": ["exploration", "year1"],
      "startCondition": "playerState.year >= 1"
    }
  ]
}
```

---

## Event-Datenformat

Events liegen unter `data/events/` und werden durch das Event-System präsentiert.

```json
{
  "eventId": "E_LIBRARY_DISCOVER",
  "title": "Ein verborgener Raum",
  "description": "Hinter einem Regal entdeckst du eine Tür...",
  "triggerExpr": "playerState.skills.lore >= 1",
  "tags": ["exploration", "mystery"]
}
```

---

## Options-Format

`data/events/options.json` definiert alle Optionen aller Events:

```json
[
  {
    "optionId": "OPT_INVESTIGATE",
    "parentType": "event",
    "parentId": "E_LIBRARY_DISCOVER",
    "label": "Den Raum genauer untersuchen",
    "availableExpr": "playerState.energy > 2",
    "requiresCheck": true,
    "checkExpr": "CHECK(Sinnesschärfe, 10)",
    "effectIds": ["energy_minus1"],
    "nextNodeId": "QN_INVESTIGATE"
  },
  {
    "optionId": "OPT_IGNORE",
    "parentType": "event",
    "parentId": "E_LIBRARY_DISCOVER",
    "label": "Den Raum ignorieren",
    "availableExpr": "",
    "requiresCheck": false,
    "effectIds": [],
    "nextNodeId": "QN_END_FAIL"
  }
]
```

---

## Effect-Format

Effects liegen unter `data/academy/effects/`.

```json
{
  "effectId": "lore_plus1",
  "expr": "lore:+:1",
  "description": "Erhöht Wissenspunkte um 1",
  "tags": ["knowledge"]
}
```

### Expressions

```
Format: <key>:<op>:<value>

Operatoren:
  +  addieren   z.B. "stress:+:1"
  -  abziehen   z.B. "energy:-:2"
  =  setzen     z.B. "lore:=:5"
```

---

## Pool-Format

Pools definieren Gruppen von Events für zufällige Auswahl.

`data/events/pools/exploration.json`:
```json
{
  "poolId": "exploration",
  "label": "Erkundungs-Events",
  "events": [
    "E_LIBRARY_DISCOVER",
    "E_GARDEN_SECRET",
    "E_CELLAR_NOISE"
  ]
}
```

---

## Condition-Expressions

| Typ | Syntax | Beispiel |
|---|---|---|
| Vergleich | `<pfad> <op> <wert>` | `playerState.skills.lore >= 2` |
| DSA5-Probe | `CHECK(<Talent>, <SchwierigkeitDC>)` | `CHECK(Magiekunde, 15)` |
| Logisch-UND | `<expr1> AND <expr2>` | `... AND ...` |
| Logisch-ODER | `<expr1> OR <expr2>` | `... OR ...` |
| Leer | `""` | immer `true` |

---

## State-Pfade

```
state.questStates
  └── {actorId}
        └── {questId}
              ├── status:        'active' | 'completed' | 'failed'
              ├── currentNodeId: string | null
              ├── startedAt:     ISO-8601
              ├── completedAt:   ISO-8601 | null
              └── history:       [{ nodeId, timestamp, outcome, details }]

state.academy.eventStates
  └── {actorId}
        └── {eventId}
              ├── seenAt:        ISO-8601
              └── selectedOption: string | null
```

---

## Hooks-Übersicht

| Hook | Payload | Zeitpunkt |
|---|---|---|
| `janus7QuestStarted` | `{ questId, actorId, quest }` | Quest gestartet |
| `janus7QuestNodeChanged` | `{ questId, actorId, nodeId, outcome }` | Node-Wechsel |
| `janus7QuestCompleted` | `{ questId, actorId, result }` | Quest beendet |
| `janus7EventShown` | `{ eventId, actorId, options }` | Event präsentiert |
| `janus7EventOptionSelected` | `{ eventId, optionId, result }` | Option gewählt |

---

## Verwandte Dokumente

- [PHASE4B_OVERVIEW.md](./PHASE4B_OVERVIEW.md) — Komponentenübersicht
- [ROADMAP.md](./ROADMAP.md) — Phase 4b im Gesamtkontext
