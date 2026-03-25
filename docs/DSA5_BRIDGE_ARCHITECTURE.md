# DSA5 Bridge — Architektur

**Phase:** 3 | **ADR-Status:** Abgeschlossen

---

## Ziel

Die DSA5 Bridge entkoppelt JANUS7-Business-Logik vollständig vom DSA5-System. Jede Interaktion mit DSA5-Interna läuft ausschließlich durch diese Schicht.

---

## Schichtenmodell

```
┌─────────────────────────────────────────┐
│           JANUS7 Business Logic          │  Phase 4+
│   (Academy, Scoring, Events, UI …)       │
└───────────────────┬─────────────────────┘
                    │ nur über Bridge-API
┌───────────────────▼─────────────────────┐
│         DSA5SystemBridge (Facade)        │  Phase 3
│   bridge/dsa5/index.js                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Sub-Bridges (je eine Datei)    │    │
│  │  resolver, rolls, actors, ...   │    │
│  └─────────────────────────────────┘    │
└───────────────────┬─────────────────────┘
                    │ game.*, Actor.prototype.*
┌───────────────────▼─────────────────────┐
│         DSA5 Foundry System              │  extern
│   game.dsa5.*, Actor.setupSkill()…      │
└─────────────────────────────────────────┘
```

---

## Design-Entscheidungen

### 1. Facade Pattern

`DSA5SystemBridge` ist die einzige öffentliche Klasse. Sub-Bridges sind intern und werden als Properties exponiert (`bridge.rolls`, `bridge.actors`, …). Das verhindert, dass JANUS7-Code direkt Sub-Bridge-Klassen importiert.

### 2. Dependency Injection

Alle Sub-Bridges erhalten Abhängigkeiten (logger, resolver, packs) per Constructor-Injection. Dies ermöglicht Unit-Tests mit Mocks ohne laufendes Foundry.

### 3. Method Binding im Constructor

Jede Bridge bindet alle Methoden im Constructor:

```javascript
for (const key of Object.getOwnPropertyNames(proto)) {
  if (key === 'constructor') continue;
  if (typeof this[key] === 'function') this[key] = this[key].bind(this);
}
```

**Grund:** Destructuring (`const { rollSkill } = bridge.rolls`) verliert ohne Binding den `this`-Kontext. Dies ist bei DSA5-API-Callbacks kritisch.

### 4. Capability Detection statt Version Guards

Statt `if (dsa5Version >= '7.2.0')` prüft die Bridge Runtime-Capabilities:

```javascript
const hasTimedConditions = typeof actorProto.addTimedCondition === 'function';
```

**Grund:** Versionsnummern sind unzuverlässig (Hotfixes, Forks). Duck-Typing ist robuster.

### 5. Normalisiertes Roll-Ergebnis

DSA5-Würfelergebnisse variieren je nach Version und Probentyp. Die Bridge normalisiert **immer** auf `NormalizedRollResult`:

```typescript
{ success, quality, critical, fumble, margin, raw, context }
```

Unbekannte Felder landen in `raw`. `success: null` signalisiert "nicht auflösbar".

### 6. Fehlerklassen-Hierarchie

```
Error
└── JanusBridgeError          (Basis)
    ├── DSA5NotAvailableError  (System nicht geladen)
    ├── DSA5ResolveError       (Dokument nicht gefunden)
    └── DSA5RollError          (Probe fehlgeschlagen)
```

Alle Fehler tragen ein `context`-Objekt mit Debugging-Infos.

### 7. Hook-Zentralisierung

**Regel:** `bridge/dsa5/moon.js` und alle Sub-Bridges registrieren Hooks **nicht** selbst über `Hooks.on(...)`. Die Registrierung erfolgt zentralisiert in `scripts/janus.mjs` oder via `bridge.init()`.

**Grund:** Verhindert doppelte Hook-Registrierung bei Hot-Reload (P1-TC-11 überwacht dies).

---

## Verbotene Muster

```javascript
// ❌ Direktzugriff auf actor.system (bricht bei DSA5-Updates)
const fw = actor.system.skills.magicallore.value;

// ❌ Direktzugriff auf game.dsa5 (außerhalb Bridge)
game.dsa5.apps.SomeDialog.render(true);

// ❌ Fehlende-Talent-Semantik ignorieren
const fw = actor.getSkill('Magiekunde') ?? 0; // 0 ist falsch — null ist korrekt

// ❌ DSA5-Import außerhalb von bridge/
import { ItemFactory } from '../../../systems/dsa5/...';
```

---

## Test-Abdeckung (Phase 3)

| Test-ID | Beschreibung |
|---|---|
| P3-TC-01 | Pack Resolution (Compendium-Index-Cache) |
| P3-TC-02 | Roll Simulation (NormalizedRollResult) |
| P3-TC-03 | Actor Resolution (UUID / Name / JANUS-Key) |
| P3-TC-12 | Typed Error Handling (6 Sub-Tests: NotAvailable, Resolve, Roll) |
| P1-TC-11 | Hook-Leak-Check (moon.js darf keine eigenen Hooks registrieren) |
