# API_REFERENCE - JANUS7

Diese Referenz beschreibt die oeffentlichen Runtime-Einstiegspunkte von JANUS7.
Massgeblich sind die tatsaechlich exponierten Namespaces in `core/`, `bridge/`, `phase7/` und `ui/index.js`.

Nicht jeder Bereich ist gleich stabil:
- **bevorzugt/stabil:** `game.janus7.core.state`, `game.janus7.commands`, `game.janus7.ui`, `game.janus7.bridge.dsa5`, `game.janus7.ki`
- **compat/historisch gewachsen:** Legacy-Aliase und aeltere Wrapper, sofern explizit genannt

---

## Core API

### `game.janus7.core.state`

Zentraler, persistenter Zustand.

Wichtige Methoden:
- `get(path?: string)`
- `set(path: string, value: any)`
- `transaction(fn)`
- `save()`
- `reset(opts?)`

Garantien:
- validierter State
- transaktionale Writes
- Rollback bei Fehlern im Transaktionspfad

---

## Academy Data API

### `game.janus7.academy.data`

Read-Fassade fuer die shipped Akademiedaten plus session-/world-nahe Overlays.

Typische Einstiege:
- `getLesson(id)`
- `getLessons()`
- `getExam(id)`
- `listExamsByLesson(lessonId)`
- `getQuestionSetForExam(examId)`
- `isMultipleChoiceExam(examId)`
- `getNpc(id)`
- `getLocation(id)`
- `getEvent(id)`

Hinweis: MCQ-Fragensaetze werden aus `data/academy/exam-questions.json` ueber den Root `questionSets` gelesen. Legacy-Reader akzeptieren zusaetzlich `questions` nur als Compat-Fallback.

---

## DSA5 Bridge

### Bevorzugter Namespace

```js
const bridge = game.janus7.bridge.dsa5;
```

Historisch existiert auch `game.janus7.dsa5` als flacher Alias, neue Integrationen sollen aber `game.janus7.bridge.dsa5` verwenden.

### Haeufige Methoden

```js
const actor = await bridge.actors.getActorByName('Darios');
const wrapped = bridge.actors.wrapActor(actor);
const result = await bridge.rollSkill(actor, 'Magiekunde', { modifier: -1 });
const spells = bridge.getActorSpells(actor);
```

Wichtige Bereiche:
- `bridge.actors.*`
- `bridge.rolls.*`
- `bridge.library.*`
- `bridge.groupCheck.*`
- `bridge.tradition.*`
- `bridge.timedCond.*`
- `bridge.postRoll.*`
- `bridge.personae.*`
- `bridge.advancement.*`
- `bridge.fate.*`
- `bridge.moon.*`

Bridge-Regeln:
- DSA5-Interna bleiben hinter der Bridge.
- Neue Core-/UI-Logik soll keine Systemdetails direkt aus `game.dsa5` ziehen.
- Konsolen-Snippets duerfen die flache Surface `game.janus7.bridge.dsa5.*` verwenden.

---

## KI API

### `game.janus7.ki`

Kanonischer Namespace fuer Export, Preview, Apply, Backup und Recovery.

```js
const bundle = game.janus7.ki.exportBundle({ mode: 'week' });
const preflight = await game.janus7.ki.preflightImport(response, { mode: 'strict' });
const preview = await game.janus7.ki.previewImport(response, { mode: 'strict' });
await game.janus7.ki.applyImport(response);
const history = game.janus7.ki.getImportHistory();
```

Weitere Methoden:
- `exportToOutbox(opts?)`
- `importFromInbox(fileRef, opts?)`
- `listBackups()`
- `restoreBackup(fileRef, opts?)`
- `prompts.chatgpt()/claude()/gemini()`

Legacy-Alias:
- `game.janus7.ai` -> delegiert an `game.janus7.ki`

---

## UI Router

### `game.janus7.ui`

Zentraler Router fuer JANUS7-Apps.

```js
game.janus7.ui.open('shell');
game.janus7.ui.open('academyOverview');
game.janus7.ui.open('kiRoundtrip');
game.janus7.ui.openControlPanel(); // Alias -> shell
game.janus7.ui.openShell();
const keys = game.janus7.ui.list();
const meta = game.janus7.ui.appStatus('shell');
```

Bevorzugte produktive Einstiegspunkte:
- `shell`
- `academyOverview`
- `scoringView`
- `lessonLibrary`
- `kiRoundtrip`
- `kiBackupManager`
- `sessionPrepWizard`
- `syncPanel`
- `configPanel`

Legacy/Debug/Alias:
- `controlPanel`
- `commandCenter`
- `testResults`
- `guidedManualTests`
- `stateInspector`
- `aiRoundtrip`
- `lessons`

Hinweis: `openControlPanel()` ist aus Kompatibilitaetsgruenden erhalten, routed aber auf die Shell.

---

## Commands API

### `game.janus7.commands`

Commands liefern ein einheitliches Result-Pattern:

```js
{
  success: boolean,
  cancelled: boolean,
  error: string,
  data: any
}
```

Typische Commands:

```js
await game.janus7.commands.runHealthCheck();
await game.janus7.commands.runSmokeTests();
await game.janus7.commands.advanceDay({ steps: 1 });
await game.janus7.commands.bridgeDiagnostics();
await game.janus7.commands.bridgeActorLookup({ actorName: 'Darios' });
await game.janus7.commands.bridgeRollTest({ skillName: 'Magiekunde', modifier: 0 });
await game.janus7.commands.openSyncPanel();
await game.janus7.commands.openConfigPanel();
await game.janus7.commands.toggleHighContrast();
```

Richtlinie:
- UI orchestriert ueber Commands/Director/Bridge statt direkt auf Subsysteme zu schreiben.
- Parameterbezeichnungen in den Commands sind Teil des Vertrags (`actorName`, `skillName`, nicht die alten `name`/`skill`-Varianten).

---

## Permissions / Config

### `JanusPermissions`

```js
JanusPermissions.can('advanceSlot', game.user);
JanusPermissions.canTab('time', game.user);
JanusPermissions.role(game.user);
```

### `JanusConfig`

```js
const highContrast = JanusConfig.getUIPreference('uiHighContrast', false);
await JanusConfig.setUIPreference('uiHighContrast', true);
const features = JanusConfig.get('features');
```

Regel: UI liest/schreibt Settings ueber `JanusConfig`, nicht direkt ueber `game.settings`.

---

## Hook-Hinweise

Kanonische Hooks kommen aus `core/hooks/topics.js`.
Beispiele:
- `janus7.date.changed`
- `janus7.scoring.changed`
- `janus7.ki.exported`
- `janus7.ki.import.applied`

Legacy-Alias-Namen koennen parallel existieren, neue Integrationen sollen aber die kanonischen Topics verwenden.

---

## Stabilitaet / Deprecation

Stable / bevorzugte APIs:
- `game.janus7.core.state.*`
- `game.janus7.commands.*`
- `game.janus7.ui.open()`, `openShell()`, `appStatus()`
- `game.janus7.bridge.dsa5.*`
- `game.janus7.ki.*`
- `JanusPermissions.*`

Compat / bewegliche Bereiche:
- Legacy-UI-Aliase
- historische Phase-Wrapper
- Teilbereiche des laufenden Shell-Cutovers

Internal APIs ohne Garantie:
- alles mit `_`-Praefix
- Dateien/Exports mit explizitem Internal-/Compat-Charakter

---

**API Documentation Version:** 0.9.12.44  
**Last Updated:** 2026-03-25
