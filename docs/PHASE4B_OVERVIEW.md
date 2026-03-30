# Phase 4b - Quest & Event System: Uebersicht

**Status:** stabil integriert
**Runtime-Stand:** 0.9.12.46
**Letzte Doku-Synchronisation:** 2026-03-30

---

## Einordnung

Phase 4b ist kein geplanter Zukunftsblock mehr, sondern Teil des laufenden Produktstands. Das Quest- und Event-System ist in die Runtime integriert, nutzt den zentralen State-Core und greift fuer DSA5-spezifische Operationen ueber die Bridge zu.

Die Kernlogik verteilt sich heute auf zwei Ebenen:
- `scripts/academy/*` enthaelt Quest-/Event-/Condition-/Effect-Bausteine.
- `academy/*` enthaelt produktive Fassaden, Reader und Runtime-Integrationen fuer den laufenden Modulbetrieb.

---

## Kernbausteine

### Quest-System

Relevante Runtime-Dateien:
- `scripts/academy/quests/quest-engine.js`
- `scripts/integration/quest-system-integration.js`
- `academy/content-registry.js`

Oeffentliche Laufzeitpfade:
- `game.janus7.academy.quests`
- `game.janus7.commands.startQuest(...)`
- `game.janus7.commands.completeQuest(...)`

Typische Aufgaben:
- Quests starten und fortschreiben
- Node-Uebergaenge und Outcomes verwalten
- Quest-State im zentralen State-Core spiegeln

### Event-System

Relevante Runtime-Dateien:
- `scripts/academy/events/event-engine.js`
- `academy/events.js`
- `scripts/integration/quest-system-integration.js`

Typische Aufgaben:
- Events aus Pools aufloesen
- Optionen praesentieren
- Effekte und Folgepfade ausloesen

### Conditions / Effects

Relevante Runtime-Dateien:
- `scripts/academy/conditions/condition-evaluator.js`
- `scripts/academy/conditions/context-provider.js`
- `scripts/academy/effects/effect-adapter.js`
- `scripts/academy/effects/effect-applier.js`

Architekturregel:
- DSA5-Proben oder Actor-bezogene Logik laufen nicht direkt gegen `game.dsa5`, sondern ueber die JANUS7-Bridge.

---

## State- und Hook-Anbindung

Kanonische Hook-Topics kommen aus `core/hooks/topics.js`.
Wichtige Topics fuer Phase 4b:
- `janus7.quest.system.ready`
- `janus7.quest.started`
- `janus7.quest.node.changed`
- `janus7.quest.completed`
- `janus7.event.shown`
- `janus7.event.option.selected`
- `janus7.effects.applied`

Die alten CamelCase-Hooknamen bleiben nur als Alias-Schicht fuer Kompatibilitaet erhalten.

---

## Datenquellen

Phase 4b ist datengetrieben. Relevante Bereiche:
- Quest-/Event-Definitionen unter `data/academy/` und den zugehoerigen Indizes
- Read-/Lookup-Schicht ueber `academy/data-api.js`
- Content-Registries fuer Quest/Event/Effect-Aufloesung

Wichtig fuer Dokumentation und Integrationen:
- Die Runtime-SSOT liegt bei den realen Datenstrukturen im Repo.
- Beispielsnippets aus aelteren Dokus duerfen nicht mehr als verbindliche API-Garantie gelesen werden, wenn sie internen Pfaden oder alten Hooknamen folgen.

---

## Bekannte Grenzen

- Die fachliche Qualitaet von Quest-/Event-Inhalten haengt weiter von den gelieferten Daten und den Welt-Mappings ab.
- Eine Live-Abnahme in Foundry bleibt fuer komplexe Quest- und Event-Flows sinnvoll, auch wenn die Repo-Validierung und der Testkatalog viele Drifts bereits abfangen.
- Legacy-Docs mit Phase-4b-Beispielen koennen historische Snippets enthalten; fuer neue Integrationen sind `core/hooks/topics.js`, `ui/commands/*`, `academy/*` und `scripts/academy/*` massgeblich.

