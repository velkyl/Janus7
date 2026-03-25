# API_REFERENCE – JANUS7

Diese Referenz beschreibt die **öffentlichen APIs** von JANUS7.
Alles hier ist:
- stabil,
- getestet,
- für Erweiterungen gedacht.

---

## Core API (Phase 1)

### game.janus7.core.state
Zentraler, persistenter Zustand.

**Wichtige Methoden**
- `get(path?: string)`
- `set(path: string, value: any)`
- `transaction(fn: (state) => Promise<void>)`

**Garantien**
- Atomicität
- Rollback bei Fehlern
- Validierung vor Persistenz

---

## Academy Data API (Phase 2)

### AcademyDataApi
Kapselt Zugriff auf Akademie-Daten (JSON).

**Ziele**
- Keine direkten fetch-Aufrufe im Spielcode
- Austauschbare Datenquellen
- Testbarkeit

---

## DSA5 Bridge (Phase 3)

### game.janus7.dsa5.wrapActor(actor)
Erzeugt einen stabilen Wrapper um einen dsa5-Actor.

**Beispiel**
```js
const w = game.janus7.dsa5.wrapActor(actor);
const value = w.getSkillValue("Magiekunde"); // number | null
```

### game.janus7.dsa5.rollSkill(actor, skill, options)

**Optionen**
- `modifier?: number`
- `silent?: boolean`

**Rückgabe**
```ts
{
  success: boolean;
  quality: number;
  modifier: number;
}
```

**Regeln**
- Kein UI-Dialog bei `silent:true`
- Fehlende Talente → saubere Fehler oder SKIP

### game.janus7.dsa5.getActorSpells(actor, options)

**Garantien**
- Stabile Sortierung
- Keine Dubletten
- Array von Items

---

## Test Runner API

Der TestRunner ist selbst Teil der API und dient:
- Abnahme
- Regression
- Dokumentation

Runner-Logs sind kanonisch.
---

## Simulation API (Phase 4 – Tech Preview)

> Hinweis: Die Simulation-APIs sind in **Version 0.4.4** als Tech Preview verfügbar.
> Sie sind darauf ausgelegt, stabil zu werden, können sich aber bis zum
> ersten Production-Certificate von Phase 4 noch ändern.

### game.janus7.academy.calendar

Kalender- und Zeit-Engine der Akademie.

**Verantwortung**
- Verwaltung des aktuellen Akademie-Slots (`SlotRef` = Jahr/Trimester/Woche/Tag/Phase)
- Fortschreiben von Phasen und Tagen
- Abfragen des Akademie-Kalenders und der Events

**Wichtige Methoden**
- `getCurrentSlotRef(): SlotRef`  
  Liefert den aktuellen Akademie-Zeitpunkt aus dem Janus-State.

- `getCalendarEntryForCurrentSlot(): CalendarEntry | null`  
  Gibt den zum aktuellen Slot passenden Eintrag aus `calendar.json` zurück.

- `getCalendarEntriesForDay(dayRef: DayRef): CalendarEntry[]`  
  Liefert alle Einträge für einen Tag (unabhängig von der Phase).

- `getEventsForCurrentSlot(): AcademyEvent[]`  
  Liefert alle Events (aus `events.json`), die für den aktuellen Slot gelten.

- `advancePhase({ steps = 1 }): Promise<SlotRef>`  
  Erhöht/verringert die Tagesphase, passt ggf. den Tag an und aktualisiert `time.isHoliday`.

- `advanceDay({ days = 1 }): Promise<SlotRef>`  
  Erhöht/verringert den Ingame-Tag (Phase bleibt gleich) und aktualisiert `time.isHoliday`.

**Hooks**
- `janus7DateChanged`  
  Wird nach erfolgreicher Zeitänderung gefeuert, Payload enthält `previous`, `current`, `reason`.

---

### game.janus7.academy.scoring

Scoring-Engine für Häuser/Zirkel und einzelne Schüler.

**Verantwortung**
- Zentrale Verwaltung aller Punkte:
  - `scoring.circles` (z. B. salamander, staves, swords, sickles)
  - `scoring.students` (beliebige Schüler-IDs)
- Historisierung der Punktvergabe (`scoring.lastAwarded[]`)

**Wichtige Methoden**
- `addCirclePoints(circleId, amount, reason, options?): Promise<number>`  
  Vergibt Punkte an einen Zirkel. Schreibt in `scoring.circles` und protokolliert in `lastAwarded`.

- `addStudentPoints(studentId, amount, reason, options?): Promise<number>`  
  Vergibt Punkte an einen Schüler. Schreibt in `scoring.students` und protokolliert in `lastAwarded`.

- `applyExamImpact(examDef, examResults?): Promise<void>`  
  Wendet die in `examDef.scoringImpact` bzw. `examResults` definierten Punktewirkungen an.

- `getCircleScore(circleId): number`  
  Liefert den aktuellen Punktestand eines Zirkels.

- `getStudentScore(studentId): number`  
  Liefert den aktuellen Punktestand eines Schülers.

- `getLeaderboard({ type = 'circle' | 'student', topN? }): { id: string, score: number }[]`  
  Liefert sortierte Leaderboards (höchster Score zuerst).

**Hooks**
- `janus7ScoreChanged`  
  Wird nach jeder Punktvergabe gefeuert, Payload enthält u. a. `targetType`, `targetId`, `amount`, `newScore`, `source`.
---

## API-Stabilität

Änderungen an diesen APIs:
- erfordern neue Tests,
- müssen im CHANGELOG stehen,
- dürfen nicht stillschweigend passieren.

---

### game.janus7.academy.lessons

Lessons-Engine (MVP in 0.4.1).

**Verantwortung**
- Read-Layer auf `lessons.json` + `calendar.json`.
- Liefert Unterrichtseinheiten für Slots, Lehrer und Tags.

**Wichtige Methoden**
- `getLesson(id)`
- `listLessonsByTag(tag)`
- `listLessonsByTeacher(npcId)`
- `getLessonsForSlot(slotRef)`
- `getLessonsForCurrentSlot()`

---

### game.janus7.academy.exams

Exams-Engine (MVP in 0.4.1).

**Verantwortung**
- Read-Layer für `exams.json` und Multiple-Choice-Fragen.
- Schreibt Prüfungsresultate nach `academy.examResults`.
- Delegiert Punktevergabe an `JanusScoringEngine`.

**Wichtige Methoden**
- `getExam(id)`
- `listExamsByLesson(lessonId)`
- `getExamsForSlot(slotRef)`
- `getQuestionSetForExam(examId)`
- `isMultipleChoiceExam(examId)`
- `recordExamResult({ actorUuid, examId, status, score, maxScore, meta })`
- `applyScoringImpact(examDef, examResults?)`

---

### game.janus7.academy.events

Events-Engine (MVP in 0.4.1).

**Wichtige Methoden**
- `getEvent(id)`
- `listEventsForSlot(slotRef)`
- `listEventsForCurrentSlot()`

---

### game.janus7.academy.social

Social-Engine (MVP in 0.4.1).

**Verantwortung**
- Verwalten von einfachen Beziehungswerten zwischen Akteuren (`academy.social.relationships`).

**Wichtige Methoden**
- `getRelationship(fromId, toId)`
- `getAttitude(fromId, toId)`
- `setAttitude(fromId, toId, value, options?)`
- `adjustAttitude(fromId, toId, delta, options?)`


## Debug Helpers (read-only)

Diese Helpers sind ausschließlich zur Diagnose gedacht und verändern keinen Zustand.

- `game.janus7.academy.debug.resolveSlot(slotRef)` → `{ lessons, exams, events, meta }`
- `game.janus7.academy.debug.explainSlot(slotRef)` → `string | null` (kompakte Erklärung)
- `game.janus7.academy.debug.hasLesson(id)` → `boolean`
- `game.janus7.academy.debug.listLessonIds(limit)` → `string[]`
- `game.janus7.academy.debug.snapshotLessonById()` → `Record<string, Lesson>`

### Generated Lessons
Generated Lessons besitzen zusätzlich zu den normalen Lesson-Feldern:
- `generated: true`
- `templateId: string`
- `topic: string` (aufgelöster Themen-String, kein `[THEMA]` mehr)

---

## Phase 6 – User Interfaces API (v0.9.1)

---

### UI-Registry (`game.janus7.ui`)

Zentraler Router für alle JANUS7-Apps.

```javascript
// App-Klasse holen
const ControlPanel = game.janus7.ui.apps.controlPanel;  // Klasse
const AcademyOverview = game.janus7.ui.apps.academyOverview;

// App öffnen (generisch)
game.janus7.ui.open('scoringView');
game.janus7.ui.open('commandCenter');

// Control Panel Shortcut
game.janus7.ui.openControlPanel();

// Alle registrierten Apps auflisten
game.janus7.ui.list();
// → ['controlPanel', 'academyOverview', 'scoringView', 'socialView',
//    'atmosphereDJ', 'stateInspector', 'configPanel', 'syncPanel',
//    'commandCenter', 'testResults']
```

**Registrierte Apps:**

| Key | Klasse | Beschreibung |
|-----|--------|-------------|
| `controlPanel` | `JanusControlPanelApp` | Haupt-Control-Panel (7 Tabs) |
| `academyOverview` | `JanusAcademyOverviewApp` | Wochen-/Tagesübersicht Kalender |
| `scoringView` | `JanusScoringViewApp` | Punkte-Leaderboard + Award-Vergabe |
| `socialView` | `JanusSocialViewApp` | Beziehungs-Graph + Attitude-Steuerung |
| `atmosphereDJ` | `JanusAtmosphereDJApp` | Mood/Volume/Auto-Atmosphere |
| `stateInspector` | `JanusStateInspectorApp` | Read-only State Snapshot (Debug) |
| `configPanel` | `JanusConfigPanelApp` | Scene-Mappings + Feature-Flags |
| `syncPanel` | `JanusSyncPanelApp` | UUID-Sync: JANUS7 ↔ Foundry World |
| `commandCenter` | `JanusCommandCenterApp` | 11-Kategorie Command Terminal |
| `testResults` | `JanusTestResultApp` | Test-Catalog Ergebnisanzeige |

---

### Control Panel (`JanusControlPanelApp`)

Zentrale GM-Oberfläche. 7 Tabs: Status, Zeit, Atmosphäre, Scoring, Sozial, Akademie, Debug.

```javascript
// Öffnen (Singleton)
game.janus7.ui.openControlPanel();
// oder via Toolbar-Button (Token-Controls → JANUS7-Icon)
```

---

### Command Center (`JanusCommandCenterApp`)

Terminal-artiges UI mit 11 Befehlskategorien. Alle `game.janus7.commands.*` sind hier ausführbar.

```javascript
game.janus7.ui.open('commandCenter');
```

Kategorien: Doctor, State, Quest, Calendar, IO, Bridge, Audit, Test, Data, Atmosphere, Admin.

---

### Sync Panel (`JanusSyncPanelApp`)

Zeigt Abgleich zwischen JANUS7-JSON-Daten und realem Foundry-Weltbestand.

```javascript
game.janus7.ui.open('syncPanel');
```

Status-Codes pro Entität: `✅ LINKED` | `🟡 FOUND-BY-NAME` | `❌ MISSING` | `⚠️ BROKEN`

Drag & Drop: MISSING/BROKEN-Zeilen akzeptieren Drops aus der Foundry-Sidebar (Actors, Scenes, Playlists).

---

### Commands API (`game.janus7.commands`)

Alle Commands folgen dem gleichen Result-Pattern:

```javascript
{
  success: boolean,    // true = erfolgreich ausgeführt
  cancelled: boolean,  // true = User hat abgebrochen
  error: string,       // Fehlermeldung bei success: false
  data: any            // Result-Payload bei success: true
}
```

**Zeit-Commands (GM only):**

```javascript
await game.janus7.commands.advanceSlot({ steps: 1 });   // +1 Slot
await game.janus7.commands.advanceSlot({ steps: -1 });  // -1 Slot
await game.janus7.commands.advancePhase({ steps: 1 });
await game.janus7.commands.advanceDay({ steps: 1 });
await game.janus7.commands.setSlot({ dayIndex: 0, slotIndex: 2 });
await game.janus7.commands.resetCalendar();
await game.janus7.commands.syncCalendar();
```

**State-Commands (GM/Trusted):**

```javascript
await game.janus7.commands.saveState();
const result = await game.janus7.commands.exportState();
// result.data = JSON-String des vollständigen State
```

**Atmosphere-Commands (GM only):**

```javascript
await game.janus7.commands.setAtmosphereEnabled({ enabled: true });
await game.janus7.commands.setAtmosphereMaster({ userId: 'user-id' });
await game.janus7.commands.setAtmosphereVolume({ volume: 0.7 });
await game.janus7.commands.applyMood({ moodId: 'morning' });
await game.janus7.commands.stopAtmosphere();
await game.janus7.commands.setAtmosphereAuto({ type: 'calendar', enabled: true });
await game.janus7.commands.setAtmosphereAuto({ type: 'location', enabled: true });
await game.janus7.commands.setAtmosphereAuto({ type: 'events', enabled: true });
```

**Academy-Commands (GM only):**

```javascript
// Daten browsen (Ergebnis in Konsole als console.table)
await game.janus7.commands.browseLessons();
await game.janus7.commands.browseLessons({ filter: 'Feuer' });
await game.janus7.commands.browseNPCs();
await game.janus7.commands.browseLocations({ type: 'outdoor' });
await game.janus7.commands.browseSpells({ school: 'Pyromancy' });
```

**Quest-Commands (GM only):**

```javascript
await game.janus7.commands.startQuest({ questId: 'quest-id' });
await game.janus7.commands.advanceQuest({ questId: 'quest-id', nodeId: 'node-id' });
await game.janus7.commands.completeQuest({ questId: 'quest-id' });
await game.janus7.commands.listQuests();
await game.janus7.commands.showEvent({ eventId: 'event-id' });
```

**System/Admin-Commands (GM only):**

```javascript
await game.janus7.commands.copyDiagnostics();       // in Zwischenablage (All Users)
await game.janus7.commands.runHealthCheck();         // Engine-Status-Prüfung
await game.janus7.commands.runSmokeTests();          // Smoke Test Catalog
await game.janus7.commands.runFullCatalog();         // Vollständiger Test Catalog
await game.janus7.commands.bridgeDiagnostics();      // DSA5 Bridge Status
await game.janus7.commands.bridgeActorLookup({ name: 'Darios' });
await game.janus7.commands.bridgeRollTest({ skill: 'Magiekunde', modifier: 0 });
await game.janus7.commands.openSyncPanel();          // Sync Panel öffnen
await game.janus7.commands.openConfigPanel();        // Config Panel öffnen
await game.janus7.commands.openTestHarness();        // Test Harness öffnen
await game.janus7.commands.createBackup();           // State-Backup erstellen
await game.janus7.commands.restoreBackup();          // Backup wiederherstellen
await game.janus7.commands.resetWorld();             // VORSICHT: State reset
await game.janus7.commands.toggleHighContrast();     // UI-Präferenz (All Users)
await game.janus7.commands.traceUIActions();         // Action-Logging an/aus
await game.janus7.commands.viewActionLog();          // Log anzeigen
```

---

### Permissions API

```javascript
import { JanusPermissions } from './ui/permissions.js';

JanusPermissions.can('advanceSlot', game.user);  // true für GM
JanusPermissions.canTab('time', game.user);       // true für GM
JanusPermissions.role(game.user);                 // 'gm' | 'trusted' | 'player' | 'none'
```

**Permission-Matrix:**

| Action | GM | Trusted | Player |
|--------|----|---------|--------|
| Zeit-Commands | ✅ | ❌ | ❌ |
| Atmosphere-Commands | ✅ | ❌ | ❌ |
| Academy/Quest-Commands | ✅ | ❌ | ❌ |
| Admin-Commands | ✅ | ❌ | ❌ |
| `saveState` / `exportState` | ✅ | ✅ | ❌ |
| `copyDiagnostics` | ✅ | ✅ | ✅ |
| `toggleHighContrast` | ✅ | ✅ | ✅ |

**Tab-Access (Control Panel):**

| Tab | GM | Trusted | Player |
|-----|----|---------|--------|
| status | ✅ | ✅ | ✅ |
| time | ✅ | ❌ | ❌ |
| atmo | ✅ | ❌ | ❌ |
| scoring | ✅ | ❌ | ❌ |
| social | ✅ | ❌ | ❌ |
| academy | ✅ | ❌ | ❌ |
| debug | ✅ | ✅ | ✅ |

---

### UI Helpers (`JanusUI`)

```javascript
import { JanusUI } from './ui/helpers.js';

// XSS-sicheres Escaping
const safe = JanusUI.escape(userInput);

// Bestätigungs-Dialog (DialogV2)
const ok = await JanusUI.confirm({ title: 'Bestätigen', message: 'Wirklich?', confirmLabel: 'Ja', cancelLabel: 'Nein' });

// Eingabe-Dialog
const value = await JanusUI.prompt({ title: 'Eingabe', placeholder: '...' });

// Auswahl-Dialog
const choice = await JanusUI.choose({ title: 'Wählen', options: ['A', 'B', 'C'] });

// In Zwischenablage kopieren
const ok = await JanusUI.copyToClipboard(text);

// User-Avatar
const avatar = JanusUI.getUserAvatar(user);  // <img> HTML-Tag
```

---

### i18n (Lokalisierung)

```javascript
// Lokaler Helper in Tab-Renderern
const t = (key, fallback) => {
  try {
    const v = game?.i18n?.localize?.(key);
    return (v && v !== key) ? v : fallback;
  } catch { return fallback; }
};

// Verwendung
const label = t('JANUS7.UI.Time.Current', 'Aktuelle Zeit');
```

---

### Config (`JanusConfig` – Phase 6 Additions)

```javascript
import { JanusConfig } from './core/config.js';

// UI-Präferenz lesen (kein direktes game.settings in UI-Layer)
const highContrast = JanusConfig.getUIPreference('uiHighContrast', false);

// UI-Präferenz schreiben
await JanusConfig.setUIPreference('uiHighContrast', true);

// Scene-Mappings (für ConfigPanel)
const mappings = JanusConfig.get('sceneMappings');  // { beamer: 'Scene.uuid', ... }

// Feature-Flags
const flags = JanusConfig.get('features');  // { atmosphere: bool, autoMood: bool, ... }
```

---

## Error Handling

**Command Errors:**

```javascript
const result = await game.janus7.commands.advanceSlot({ steps: 1 });

if (result.cancelled) {
  // User hat abgebrochen (via Confirmation-Dialog)
}

if (!result.success) {
  // Command fehlgeschlagen
  console.error(result.error);
  ui.notifications.error(result.error);
}

if (result.success) {
  // Command erfolgreich
  console.log(result.data);
}
```

**Permission Errors:**

```javascript
// Command ohne Permission ausführen
const result = await game.janus7.commands.advanceSlot({ steps: 1 });
// → result = { success: false, cancelled: true }
// → Notification: "JANUS7: Keine Berechtigung für diese Aktion."
```

---

## Deprecation Policy

**Version 0.6.7:**
- Keine Deprecations

**Future Deprecations:**
- Werden mindestens 2 Minor-Versionen im Voraus angekündigt
- Werden in CHANGELOG dokumentiert
- Haben Migration-Guides

---

## API Stability Guarantees

**Stable APIs (nicht ändern ohne Major-Version):**
- `game.janus7.core.state.*`
- `game.janus7.commands.*`
- `JanusPermissions.can()`, `JanusPermissions.canTab()`

**Tech Preview APIs (können sich ändern):**
- Data-File Strukturen (bis v0.7.0)

**Internal APIs (keine Garantie):**
- Alles mit `_` Präfix
- Alles in `*.internal.js` Dateien

---

**API Documentation Version:** 0.9.1  
**Last Updated:** 2026-02-20  
**Next Review:** Phase 7 Kickoff
