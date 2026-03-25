# DSA5 Bridge — API-Referenz

**Phase:** 3 | **Datei:** `bridge/dsa5/index.js`

---

## DSA5SystemBridge (Hauptklasse)

```javascript
const bridge = game.janus7.dsa5;
// Alternativ:
const bridge = game.janus7.bridge.dsa5;
```

### Eigenschaften

| Property | Typ | Beschreibung |
|---|---|---|
| `available` | `boolean` | `true` wenn DSA5-System geladen ist |
| `systemId` | `string` | Immer `'dsa5'` |
| `capabilities` | `object\|null` | Capability-Map (nach `init()` befüllt) |

### `bridge.available`

```javascript
if (!game.janus7.dsa5.available) return;
```

### `bridge.hasCapability(key)`

```javascript
// @param {string} key — Capability-Key aus bridge.capabilities
// @returns {boolean}
bridge.hasCapability('hasFatePoints');      // true/false
bridge.hasCapability('hasTimedConditions'); // true/false
bridge.hasCapability('hasGroupCheck');      // true/false
```

### `bridge.assertCapabilities(keys, context)`

Wirft `DSA5NotAvailableError` wenn `bridge.available === false`.

```javascript
bridge.assertCapabilities(['hasSetupSkill'], 'lesson-roll');
```

### `bridge.init()` → `Promise<void>`

Capability-Detection. Wird automatisch durch `scripts/janus.mjs` aufgerufen.

---

## DSA5Resolver

```javascript
const resolver = bridge.resolver;
```

### `resolver.fromUuid(uuid)` → `Promise<Document|null>`

```javascript
const actor = await resolver.fromUuid('Actor.abc123');
```

### `resolver.findInCompendium({ pack, name, type })` → `Promise<IndexEntry|null>`

```javascript
const entry = await resolver.findInCompendium({
  pack: 'dsa5.skillsde',
  name: 'Magiekunde',
  type: 'skill'
});
```

### `resolver.getPackIndex(packId)` → `Promise<IndexEntry[]>`

Index gecacht (einmaliger Load pro Session).

---

## DSA5RollApi

```javascript
const rolls = bridge.rolls;
```

### Typen

```typescript
interface RollOptions {
  tokenId?:      string;   // Token-ID für die Probe
  modifier?:     number;   // Situationsmodifikator (±)
  rollMode?:     string;   // 'roll' | 'gmroll' | 'blindroll' | 'selfroll'
  silent?:       boolean;  // Dialoge unterdrücken (true = headless)
  deterministic?: boolean; // Testmodus: stabiles RNG
}

interface NormalizedRollResult {
  success:  boolean | null;  // Erfolg/Misserfolg oder unbekannt
  quality:  number  | null;  // Qualitätsstufe (QS)
  critical: boolean;         // Kritischer Erfolg
  fumble:   boolean;         // Patzer
  margin:   number  | null;  // Erfolgsgrad
  raw:      any;             // Originales DSA5-Ergebnis
  context:  object;          // Metadaten (Probe-Typ, Actor-IDs)
}
```

### `rolls.requestSkillCheck({ actorRef, skillRef, options })` → `Promise<NormalizedRollResult>`

```javascript
const result = await bridge.rolls.requestSkillCheck({
  actorRef: actor,            // Actor-Dokument oder UUID
  skillRef: 'Magiekunde',     // Talent-Name, UUID oder Item-Dokument
  options: { modifier: -2, silent: true }
});
if (result.success) console.log(`QS ${result.quality}`);
```

---

## DSA5ActorBridge

```javascript
const actors = bridge.actors;
```

### `actors.resolveActor(ref)` → `Promise<Actor|null>`

```javascript
const actor = await bridge.actors.resolveActor('NPC_SIRDON_KOSMAAR');
// ref kann sein: UUID, Name, JANUS-NPC-ID, Actor-Dokument
```

### `actors.getSkillValue(actor, skillName)` → `number|null`

```javascript
const fw = bridge.actors.getSkillValue(actor, 'Magiekunde');
// null wenn Talent nicht vorhanden (KEIN 0-Fallback!)
```

---

## DSA5ConditionBridge

```javascript
const cond = bridge.conditions;
```

### `cond.addCondition(actor, conditionId, opts)` → `Promise<void>`

```javascript
await bridge.conditions.addCondition(actor, 'exhausted');
await bridge.conditions.addCondition(actor, 'stunned', { value: 2 });
```

### `cond.removeCondition(actor, conditionId)` → `Promise<void>`

```javascript
await bridge.conditions.removeCondition(actor, 'exhausted');
```

### `DSA5_CONDITION_IDS` (Konstante)

```javascript
import { DSA5_CONDITION_IDS } from 'bridge/dsa5/index.js';
// Enthält kanonische DSA5-Zustands-IDs
```

---

## DSA5TimedConditionBridge

```javascript
const timedCond = bridge.timedCond;
```

### `timedCond.applyTimedAcademyCondition(actor, conditionKey, durationDays, opts)` → `Promise<void>`

Legt einen zeitlich begrenzten Akademie-Zustand an, der nach `durationDays` automatisch entfernt wird.

```javascript
await bridge.timedCond.applyTimedAcademyCondition(
  actor, 'stress', 3, { source: 'exam' }
);
```

---

## DSA5FateBridge

```javascript
const fate = bridge.fate;
```

### `fate.getSchips(actor)` → `number`

```javascript
const schips = bridge.fate.getSchips(actor);
```

### `fate.useOnRoll(actor, roll, opts)` → `Promise<boolean>`

Verwendet einen S-Chip auf einen Roll.

---

## DSA5MoonBridge

```javascript
const moon = bridge.moon;
```

### `moon.getCurrentPhase()` → `string|null`

```javascript
const phase = bridge.moon.getCurrentPhase();
// z.B. 'VOLLMOND', 'NEUMOND', 'ZUNEHMEND_HALB'
```

### `moon.getModifier(phase, context)` → `number`

Liest den Modifikator für eine Mondphase aus `data/academy/moon-modifiers.json`.

---

## Fehlerklassen

```javascript
import { JanusBridgeError, DSA5NotAvailableError, DSA5ResolveError, DSA5RollError }
  from 'bridge/dsa5/errors.js';

try {
  await bridge.rolls.requestSkillCheck(...);
} catch (err) {
  if (err instanceof DSA5NotAvailableError) { /* DSA5 nicht geladen */ }
  if (err instanceof DSA5ResolveError)      { /* Actor/Item nicht gefunden */ }
  if (err instanceof DSA5RollError)         { /* Probe fehlgeschlagen */ }
}
```

---

## Konstanten

```javascript
import {
  DSA5_SYSTEM_ID,        // 'dsa5'
  MIN_FOUNDRY_CORE,      // 13
  MIN_DSA5_VERSION,      // '7.0.0'
  DSA5_ITEM_TYPES,       // ['ritual', 'spell', 'skill', ...]
  DSA5_SKILL_ALIASES,    // { wahrnehmung: 'Sinnesschärfe', ... }
  DSA5_COMMON_SKILLS,    // ['Sinnesschärfe', 'Willenskraft', ...]
  DSA5_CONDITION_IDS,
  JANUS_TO_DSA5_CONDITION_MAP,
  SCHIP_SOURCE,
  MOON_PHASES,
  MOON_CYCLE_DAYS,
  JANUS_DURATION,
  TRADITION_CIRCLE_MAP_DEFAULT,
} from 'bridge/dsa5/index.js';
```
