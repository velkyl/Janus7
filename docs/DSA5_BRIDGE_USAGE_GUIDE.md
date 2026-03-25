# DSA5 Bridge — Nutzungsanleitung

**Phase:** 3 | Für: JANUS7-Engine-Code und Makros

---

## Grundregel

```javascript
// ❌ FALSCH — direkter DSA5-Zugriff
actor.system.skills['Magiekunde'].value;
game.dsa5.apps.DoSomething();

// ✅ RICHTIG — über Bridge
const fw = game.janus7.dsa5.actors.getSkillValue(actor, 'Magiekunde');
```

---

## Zugriff auf die Bridge

```javascript
// Via game.janus7 (empfohlen für Makros)
const bridge = game.janus7.dsa5;

// Via engine-Objekt (empfohlen für Engine-Code)
const bridge = engine.bridge.dsa5;
```

---

## Beispiel 1: Talent-Probe durchführen

```javascript
const bridge = game.janus7.dsa5;

// Actor auflösen (Name, UUID oder JANUS-NPC-ID)
const actor = await bridge.actors.resolveActor('NPC_SIRDON_KOSMAAR');
if (!actor) {
  console.warn('Actor nicht gefunden');
  return;
}

// Stille Probe (kein Dialog)
const result = await bridge.rolls.requestSkillCheck({
  actorRef: actor,
  skillRef: 'Magiekunde',
  options: { modifier: -1, silent: true }
});

console.log(`Erfolg: ${result.success}, QS: ${result.quality}`);
if (result.critical) console.log('Kritischer Erfolg!');
if (result.fumble)   console.log('Patzer!');
```

---

## Beispiel 2: Zustand anlegen und entfernen

```javascript
const bridge = game.janus7.dsa5;
const actor  = await bridge.actors.resolveActor('Actor.xyz123');

// Zustand anlegen
await bridge.conditions.addCondition(actor, 'exhausted');

// Zeitlich begrenzten Akademie-Zustand anlegen (3 Tage)
await bridge.timedCond.applyTimedAcademyCondition(
  actor, 'stress', 3, { source: 'exam_failure' }
);

// Zustand entfernen
await bridge.conditions.removeCondition(actor, 'exhausted');
```

---

## Beispiel 3: Compendium-Item suchen

```javascript
const bridge = game.janus7.dsa5;

// Index-Eintrag suchen
const entry = await bridge.resolver.findInCompendium({
  pack: 'dsa5.skillsde',
  name: 'Alchemie',
  type: 'skill'
});

if (entry) {
  const item = await bridge.resolver.fromUuid(entry.uuid);
  console.log(item.name);
}
```

---

## Beispiel 4: S-Chip einsetzen

```javascript
const bridge = game.janus7.dsa5;
const actor  = await bridge.actors.resolveActor('Actor.xyz123');

if (bridge.hasCapability('hasFatePoints')) {
  const schips = bridge.fate.getSchips(actor);
  console.log(`Verfügbare S-Chips: ${schips}`);
}
```

---

## Beispiel 5: Mondphase abfragen

```javascript
const bridge = game.janus7.dsa5;

if (bridge.hasCapability('hasMoonPhase')) {
  const phase = bridge.moon.getCurrentPhase();
  const mod   = bridge.moon.getModifier(phase, { category: 'magic' });
  console.log(`Mondphase: ${phase}, Modifikator: ${mod}`);
}
```

---

## Beispiel 6: Gruppenprobe

```javascript
const bridge  = game.janus7.dsa5;
const actorIds = ['Actor.a1', 'Actor.b2', 'Actor.c3'];

if (bridge.hasCapability('hasGroupCheck')) {
  const results = await bridge.groupCheck.requestGroupCheck({
    actorIds,
    skillName: 'Sinnesschärfe',
    modifier: 0,
    silent: true
  });
  console.log(`Erfolge: ${results.filter(r => r.success).length}/${results.length}`);
}
```

---

## Fehlerbehandlung

```javascript
import { DSA5NotAvailableError, DSA5ResolveError, DSA5RollError }
  from '../bridge/dsa5/errors.js';

try {
  const result = await bridge.rolls.requestSkillCheck({ actorRef, skillRef });
} catch (err) {
  if (err instanceof DSA5NotAvailableError) {
    ui.notifications.error('DSA5 ist nicht verfügbar.');
  } else if (err instanceof DSA5ResolveError) {
    ui.notifications.warn(`Dokument nicht gefunden: ${err.context?.ref}`);
  } else if (err instanceof DSA5RollError) {
    console.error('Probe fehlgeschlagen:', err.message);
  } else {
    throw err; // Unbekannte Fehler weiterwerfen
  }
}
```

---

## Diagnostics ausführen

```javascript
// Vollständiger Health-Check der Bridge
const report = await game.janus7.dsa5.runDiagnostics?.();
// Alternativ über Testkatalog:
// game.janus7.test.run({ filter: 'p3' })
```

---

## Talent-Namen: Kanonische Schreibweise

DSA5 ist case-sensitive. Die folgenden Schreibweisen sind korrekt:

```javascript
// ✅ Korrekt
'Magiekunde', 'Sinnesschärfe', 'Körperbeherrschung',
'Heilkunde Wunden', 'Menschenkenntnis', 'Überreden'

// ❌ Falsch (wird nicht aufgelöst)
'magiekunde', 'Sinnesschärfe ', 'Heilkunde', 'Körperbeherrschung '
```

Bekannte Aliase (aus `DSA5_SKILL_ALIASES`):

| Alias | Kanonisch |
|---|---|
| `wahrnehmung` | `Sinnesschärfe` |
| `heilkunde` | `Heilkunde Wunden` |
| `klettern` | `Körperbeherrschung` |
| `psychologie` | `Menschenkenntnis` |
| `athletik` | `Körperbeherrschung` |
| `diplomatie` | `Überreden` |
