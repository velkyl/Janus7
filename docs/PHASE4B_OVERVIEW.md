# Phase 4b — Quest & Event System: Übersicht

**Status:** ✅ ABGESCHLOSSEN
**Version:** 0.9.12.29
**Integration:** Erweiterung von Phase 4 (Academy Simulation)

---

## Was ist Phase 4b?

Phase 4b führt ein **story-getriebenes Quest-System** mit node-basierter Progression und ein **dynamisches Event-System** mit bedingten Optionen ein. Es nutzt alle Phase-4-Engines (Kalender, Scoring, Social) und Phase-3 (DSA5-Proben) als Basis.

---

## Komponenten-Übersicht

```
scripts/academy/
├── quests/
│   └── quest-engine.js          ← JanusQuestEngine
├── events/
│   └── event-engine.js          ← JanusEventsEngineExtended
├── conditions/
│   ├── condition-evaluator.js   ← JanusConditionEvaluator
│   └── context-provider.js      ← JanusConditionContextProvider
├── effects/
│   ├── effect-adapter.js        ← JanusEffectAdapter
│   └── effect-applier.js        ← applyEffectIds()
└── content/
    ├── content-registry.js      ← JanusContentRegistry
    └── expression/
        └── parser.js            ← parseExpr, parseCheckExpr
```

---

## 4b.1 Quest Engine

**Datei:** `scripts/academy/quests/quest-engine.js`

Node-basierte Quests mit drei Knotentypen:

| Knotentyp | Beschreibung |
|---|---|
| `event` | Triggert ein spezifisches Event |
| `check` | Verzweigung: success/failure/failforward |
| `effect` | Wendet State-Änderungen an |

### Quests starten und fortschreiten

```javascript
const quests = game.janus7.academy.quests;

// Quest starten
await quests.startQuest('Q_DEMO_LIBRARY', { actorId: 'Actor.xyz123' });

// Zu nächstem Knoten fortschreiten
await quests.progressToNode('Q_DEMO', 'QN_NEXT', { actorId: 'Actor.xyz' });

// Quest abschließen
await quests.completeQuest('Q_DEMO', { actorId: 'Actor.xyz' });

// Aktive Quests auflisten
const active = quests.listQuests({ actorId: 'Actor.xyz', status: 'active' });
```

### Quest-State (in `game.janus7.core.state`)

```
state.questStates
  └── [actorId]
        └── [questId]
              ├── status:        'active' | 'completed' | 'failed'
              ├── currentNodeId: string
              ├── startedAt:     ISO-Timestamp
              └── history:       [{ nodeId, timestamp, outcome }]
```

### Hooks

```javascript
Hooks.on('janus7QuestStarted',     ({ questId, actorId, quest }) => { ... });
Hooks.on('janus7QuestNodeChanged', ({ questId, actorId, nodeId, outcome }) => { ... });
Hooks.on('janus7QuestCompleted',   ({ questId, actorId, result }) => { ... });
```

---

## 4b.2 Event Engine

**Datei:** `scripts/academy/events/event-engine.js`

```javascript
const events = game.janus7.academy.events;

// Zufälliges Event aus Pool spawnen
const event = await events.spawnFromPool('exploration', { actorId: 'Actor.xyz' });

// Event mit Optionen präsentieren
const presentation = await events.presentEvent('E_LIBRARY_DISCOVER', {
  actorId: 'Actor.xyz'
});
// presentation: { event, options: [{ optionId, label, available, requiresCheck }] }

// Option auswählen und Effekte anwenden
const result = await events.selectOption('OPT_INVESTIGATE', {
  actorId: 'Actor.xyz'
});
// result: { success, effects: [...], nextNodeId: 'QN_NEXT' | null }
```

### Hooks

```javascript
Hooks.on('janus7EventShown',          ({ eventId, actorId, options }) => { ... });
Hooks.on('janus7EventOptionSelected', ({ eventId, optionId, result }) => { ... });
```

---

## 4b.3 Condition Evaluator

**Datei:** `scripts/academy/conditions/condition-evaluator.js`

Wertet Bedingungsausdrücke aus:

```javascript
const evaluator = game.janus7.academy.conditions;

// Logischer Ausdruck
const canEnter = await evaluator.evaluate(
  'playerState.skills.lore >= 2',
  { actorId: 'Actor.xyz' }
);

// DSA5-Probe
const passed = await evaluator.evaluate(
  'CHECK(Magiekunde, 15)',
  { actorId: 'Actor.xyz' }
);

// Kombiniert (AND/OR)
await evaluator.evaluate(
  'playerState.energy > 3 AND playerState.skills.lore >= 1',
  { actorId: 'Actor.xyz' }
);
```

**Leer-Ausdruck** (`''`) = immer `true` (keine Anforderung).

---

## 4b.4 Effect Adapter

**Datei:** `scripts/academy/effects/effect-adapter.js`

Effect-Definitionen (in `data/academy/effects/`):

```json
{
  "effectId": "stress_plus1",
  "expr": "stress:+:1",
  "description": "Erhöht Stress um 1"
}
```

```javascript
const effects = game.janus7.academy.effects;

// Mehrere Effekte auf einen Actor anwenden
const result = await effects.applyEffects(
  ['stress_plus1', 'energy_minus2'],
  { actorId: 'Actor.xyz', source: 'event', reason: 'Bibliothek durchsucht' }
);
// result: { success: true, changes: [{ effectId, from, to }] }
```

### Operator-Übersicht

| Operator | Bedeutung | Beispiel |
|---|---|---|
| `+` | Addieren | `stress:+:1` |
| `-` | Subtrahieren | `energy:-:2` |
| `=` | Setzen | `lore:=:3` |

---

## 4b.5 Content Registry

**Datei:** `scripts/academy/content/content-registry.js`

Zentrale In-Memory-Indices aller Quest-/Event-/Effekt-Inhalte:

```javascript
const registry = game.janus7.academy.content;

// Suchen
registry.by.quest.get('Q_DEMO_LIBRARY');
registry.by.event.get('E_LIBRARY_DISCOVER');
registry.by.effect.get('stress_plus1');

// Validierung (gibt Fehler/Warnungen zurück)
const report = registry.validate();
if (report.errors.length > 0) console.error(report.errors);
```

---

## Datenstruktur

```
data/
├── quests/
│   ├── quest-index.json       ← Liste aller Quest-IDs + Metadaten
│   └── Q_*.json               ← Einzelne Quest-Definitionen (Nodes)
├── events/
│   ├── event-index.json       ← Liste aller Event-IDs
│   ├── pool-index.json        ← Pool-Definitionen
│   ├── options.json           ← Event-Optionen
│   └── pools/
│       ├── exploration.json
│       ├── social_minor.json
│       └── ...
└── academy/effects/
    ├── effect-index.json
    ├── stress_plus1.json
    └── ...
```

---

## Architektur-Compliance

| Prinzip | Erfüllt |
|---|---|
| Hybrid-First: Keine UI in Engine-Code | ✅ |
| Data-Driven: JSON-basiert, Zero Hardcode | ✅ |
| SSOT: State Core als zentrale Wahrheit | ✅ |
| Modul-Agnostik: DSA5 nur via Bridge | ✅ |
| Phase-Isolation: Keine Phase-5+-Importe | ✅ |

---

## Verwandte Dokumente

- [QUEST_SYSTEM.md](./QUEST_SYSTEM.md) — Quest-Datenformat im Detail
- [ROADMAP.md](./ROADMAP.md) — Phase 4b im Gesamtkontext
