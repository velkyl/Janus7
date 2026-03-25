**Technische Referenz, APIs & Best Practices**

**Version 1.0 - Phase 1 Ready**

11\. December 2025

# Inhaltsverzeichnis

1.  1\. Setup & Installation

2.  2\. Projektstruktur

3.  3\. Code-Konventionen

4.  4\. Core APIs

5.  5\. State Management

6.  6\. Hooks System

7.  7\. Error Handling

8.  8\. Testing

9.  9\. Debugging

10. 10\. Best Practices

# 1. Setup & Installation

## 1.1 Voraussetzungen

-   Foundry VTT v13.x oder höher

-   DSA5-System installiert und aktiviert

-   Node.js v18+ für lokale Development-Tools

-   Git für Versionskontrolle

-   VS Code (empfohlen) mit Extensions:

```{=html}
<!-- -->
```
-   ESLint

-   Prettier

-   Foundry VTT

-   GitLens

## 1.2 Repository einrichten

Verzeichnisstruktur erstellen:

FoundryVTT/Data/modules/janus7/\
├── core/\
│ ├── state.js\
│ ├── config.js\
│ ├── director.js\
│ ├── io.js\
│ ├── validator.js\
│ └── logger.js\
├── academy/\
│ ├── calendar.js\
│ ├── lessons.js\
│ └── \...\
├── systems/\
│ └── dsa5/\
├── ui/\
├── ki/\
├── atmosphere/\
├── data/\
│ └── academy/\
│ ├── calendar.json\
│ ├── lessons.json\
│ └── \...\
├── styles/\
│ └── janus.css\
├── templates/\
│ └── apps/\
├── lang/\
│ ├── de.json\
│ └── en.json\
├── module.json\
├── README.md\
└── CHANGELOG.md

## 1.3 module.json konfigurieren

{\
\"id\": \"janus7\",\
\"title\": \"JANUS7 - Academy Director\",\
\"version\": \"7.0.0\",\
\"compatibility\": {\
\"minimum\": \"13\",\
\"verified\": \"13\",\
\"maximum\": \"13\"\
},\
\"authors\": \[\
{\
\"name\": \"Your Name\"\
}\
\],\
\"esmodules\": \[\
\"core/index.js\"\
\],\
\"styles\": \[\
\"styles/janus.css\"\
\],\
\"languages\": \[\
{\
\"lang\": \"de\",\
\"name\": \"Deutsch\",\
\"path\": \"lang/de.json\"\
}\
\],\
\"relationships\": {\
\"systems\": \[\
{\
\"id\": \"dsa5\",\
\"type\": \"system\",\
\"compatibility\": {\
\"minimum\": \"6.0.0\"\
}\
}\
\]\
}\
}

# 2. Projektstruktur

## 2.1 Modul-Organisation

JANUS7 folgt einer strikten Layer-Architektur:

**core/** --- Fundamentale Services (State, Config, Logger, etc.)

**academy/** --- Akademie-spezifische Logik (Calendar, Lessons, Scoring)

**systems/dsa5/** --- DSA5-System Integration & Bridge

**ui/** --- ApplicationV2-basierte Benutzeroberflächen

**ki/** --- KI-Integration (Export, Import, Validation)

**atmosphere/** --- Audio & Mood Management

**data/** --- Statische JSON-Daten (kein Code)

## 2.2 Namespace-Konvention

Alle JANUS7-APIs sind unter game.janus7 verfügbar:

game.janus7.core.state // JanusStateCore\
game.janus7.core.config // JanusConfig\
game.janus7.core.logger // JanusLogger\
game.janus7.academy // Academy-Engine APIs\
game.janus7.system // DSA5-Bridge\
game.janus7.ui // UI-Controller

# 3. Code-Konventionen

## 3.1 JavaScript Style Guide

**ES6 Modules:** Immer import/export, keine require()

**const/let:** Nie var verwenden

**Arrow Functions:** Bevorzugt für Callbacks

**Template Literals:** Für String-Interpolation

**Destructuring:** Wo sinnvoll einsetzen

**async/await:** Bevorzugt gegenüber Promises

## 3.2 Naming Conventions

// Classes: PascalCase\
class JanusStateCore {}\
\
// Functions/Methods: camelCase\
function advanceDay() {}\
\
// Constants: UPPER_SNAKE_CASE\
const MAX_CIRCLE_POINTS = 1000;\
\
// Private Methods: \_camelCase\
class Example {\
\_privateHelper() {}\
}\
\
// Files: kebab-case\
// state-manager.js, circle-points.js

## 3.3 Kommentare & JSDoc

/\*\*\
\* Advances the game time by one day\
\* \@param {boolean} skipWeekend - Whether to skip weekends\
\* \@returns {Object} Updated time state\
\* \@throws {ValidationError} If state is invalid\
\*/\
async function advanceDay(skipWeekend = false) {\
// Implementation\
}

# 4. Core APIs

## 4.1 JanusStateCore

Der zentrale State Manager für alle Kampagnendaten.

// Initialize State\
await game.janus7.core.state.init();\
\
// Get State Value\
const year = game.janus7.core.state.get(\'time.year\');\
const circles = game.janus7.core.state.get(\'scoring.circles\');\
\
// Set State Value\
game.janus7.core.state.set(\'time.day\', 5);\
\
// Update Multiple Values\
game.janus7.core.state.update({\
\'time.day\': 6,\
\'time.phase\': \'afternoon\'\
});\
\
// Transaction with Rollback\
await game.janus7.core.state.transaction(async () =\> {\
game.janus7.core.state.set(\'time.day\', 7);\
game.janus7.core.state.set(\'scoring.circles.salamander\', 150);\
// If error occurs, both changes are rolled back\
});\
\
// Save State\
await game.janus7.core.state.save();\
\
// Export Snapshot\
const snapshot = game.janus7.core.state.exportSnapshot();\
\
// Reset to Backup\
await game.janus7.core.state.reset(backupId);

## 4.2 JanusConfig

World-spezifische Konfiguration und Mappings.

// Get Config Value\
const debugMode = game.janus7.core.config.get(\'debugMode\');\
const sceneMap = game.janus7.core.config.get(\'scenes\');\
\
// Set Config Value\
game.janus7.core.config.set(\'logLevel\', \'debug\');\
\
// Get Scene UUID by Key\
const uuid = game.janus7.core.config.getSceneUUID(\'great-hall\');\
\
// Feature Flags\
if (game.janus7.core.config.isFeatureEnabled(\'atmosphere\')) {\
// Use atmosphere system\
}

## 4.3 JanusLogger

// Log Levels: debug, info, warn, error\
const log = game.janus7.core.logger;\
\
log.debug(\'Detailed debug info\', { data: value });\
log.info(\'General information\');\
log.warn(\'Warning message\');\
log.error(\'Error occurred\', error);\
\
// Set Log Level\
game.janus7.core.logger.setLevel(\'debug\');

# 5. State Management

## 5.1 State-Schema

Das vollständige State-Schema (JanusStateCore V7.1.0):

{\
meta: {\
version: \'7.1.0\',\
lastSave: \'2025-12-11T10:30:00Z\',\
campaignId: \'akademie-punin-001\'\
},\
time: {\
year: 1,\
trimester: 1,\
week: 1,\
day: 1,\
phase: \'morning\',\
isHoliday: false,\
totalDaysPassed: 0\
},\
academy: {\
phaseOfStudy: \'elevium\',\
threatLevel: 0,\
currentCurriculumId: \'standard-year1\'\
},\
scoring: {\
circles: {\
salamander: 0,\
staves: 0,\
swords: 0,\
sickles: 0\
},\
students: {},\
lastAwarded: \[\]\
},\
social: {\
relations: {},\
reputation: {},\
tags: {}\
},\
story: {\
threads: \[\],\
journalRefs: \[\],\
chronicle: \[\]\
},\
economy: {\
allowance: {},\
debts: \[\],\
stash: {}\
},\
display: {\
beamerMode: false,\
activeSceneKey: null,\
activeOverlayId: null,\
currentMood: null\
},\
flags: {\
todayLessonOverrideId: null,\
todayExamOverrideId: null,\
disableAutoMood: false,\
debugMode: false\
}\
}

## 5.2 State-Änderungs-Pattern

Best Practice für State-Mutationen:

// ❌ FALSCH - Direkter Zugriff\
game.janus7.\_state.time.day = 5;\
\
// ✅ RICHTIG - Über API\
game.janus7.core.state.set(\'time.day\', 5);\
\
// ✅ RICHTIG - Mit Validierung\
await game.janus7.core.state.transaction(async () =\> {\
const currentDay = game.janus7.core.state.get(\'time.day\');\
if (currentDay \< 7) {\
game.janus7.core.state.set(\'time.day\', currentDay + 1);\
} else {\
// Advance week\
const week = game.janus7.core.state.get(\'time.week\');\
game.janus7.core.state.update({\
\'time.week\': week + 1,\
\'time.day\': 1\
});\
}\
});

# 6. Hooks System

## 6.1 Verfügbare Hooks

**janus7Ready** --- JANUS7 vollständig initialisiert\
Payload: Keine

**janus7StateChanged** --- State wurde geändert\
Payload: {path, oldValue, newValue}

**janus7StateLoaded** --- State aus Storage geladen\
Payload: {state}

**janus7DayAdvanced** --- Tag wurde vorwärts bewegt\
Payload: {oldDay, newDay}

**janus7CirclePointsAwarded** --- Punkte vergeben\
Payload: {circle, points, reason}

**janus7LessonStarted** --- Unterricht begonnen\
Payload: {lessonId, time}

**janus7ExamStarted** --- Prüfung begonnen\
Payload: {examId, participants}

## 6.2 Hook Usage Examples

// Listen for state changes\
Hooks.on(\'janus7StateChanged\', (data) =\> {\
console.log(\`State changed at \${data.path}\`);\
console.log(\`Old: \${data.oldValue}, New: \${data.newValue}\`);\
});\
\
// Listen for day advancement\
Hooks.on(\'janus7DayAdvanced\', (data) =\> {\
ui.notifications.info(\`Tag \${data.newDay} beginnt!\`);\
});\
\
// One-time hook\
Hooks.once(\'janus7Ready\', () =\> {\
console.log(\'JANUS7 is ready!\');\
// Initialize your extension\
});

# 7. Error Handling

## 7.1 Error Types

**ValidationError:** State oder Input ist ungültig

**ConfigError:** Konfigurationsfehler

**StateCorruptionError:** State ist korrupt

**DSA5BridgeError:** DSA5-System Interaktionsfehler

**ImportError:** KI-Import fehlgeschlagen

## 7.2 Error Handling Pattern

try {\
await game.janus7.core.state.transaction(async () =\> {\
// Risky operations\
game.janus7.core.state.set(\'time.day\', newDay);\
});\
} catch (error) {\
if (error instanceof ValidationError) {\
ui.notifications.error(\'Ungültige Eingabe!\');\
game.janus7.core.logger.warn(\'Validation failed\', error);\
} else if (error instanceof StateCorruptionError) {\
ui.notifications.error(\'State korrupt! Rollback wird durchgeführt.\');\
game.janus7.core.logger.error(\'State corruption detected\', error);\
await game.janus7.core.state.restoreLastBackup();\
} else {\
// Unerwarteter Fehler\
ui.notifications.error(\'Unerwarteter Fehler!\');\
game.janus7.core.logger.error(\'Unexpected error\', error);\
}\
}

# 8. Testing

## 8.1 Test-Setup

// tests/core/state.test.js\
import { JanusStateCore } from \'../../core/state.js\';\
\
describe(\'JanusStateCore\', () =\> {\
let state;\
\
beforeEach(async () =\> {\
state = new JanusStateCore();\
await state.init();\
});\
\
afterEach(async () =\> {\
await state.reset();\
});\
\
it(\'should initialize with default values\', () =\> {\
expect(state.get(\'time.year\')).toBe(1);\
expect(state.get(\'time.day\')).toBe(1);\
});\
\
it(\'should handle transactions with rollback\', async () =\> {\
await state.transaction(async () =\> {\
state.set(\'time.day\', 5);\
throw new Error(\'Rollback test\');\
}).catch(() =\> {});\
\
expect(state.get(\'time.day\')).toBe(1); // Rolled back\
});\
});

## 8.2 Testing in DEV-World

-   DEV-World regelmäßig zurücksetzen

-   Test-Szenarien durchspielen (voller Tag, Woche, Trimester)

-   Edge Cases testen (Fehlende NPCs, ungültige IDs)

-   Performance-Profiling mit Browser DevTools

-   Console nach Errors/Warnings durchsuchen

# 9. Debugging

## 9.1 Debug-Modus aktivieren

// In Foundry-Console\
game.janus7.core.logger.setLevel(\'debug\');\
game.janus7.core.state.set(\'flags.debugMode\', true);\
\
// State inspizieren\
console.log(game.janus7.core.state.exportSnapshot());\
\
// Config inspizieren\
console.log(game.janus7.core.config.getAll());

## 9.2 Häufige Probleme & Lösungen

**Problem: State wird nicht gespeichert**\
Lösung: Prüfe: await state.save() aufgerufen? Berechtigung als GM?

**Problem: Hooks feuern nicht**\
Lösung: Prüfe: Hooks.on() vor oder nach janus7Ready?

**Problem: DSA5-Bridge funktioniert nicht**\
Lösung: Prüfe: DSA5-System installiert? Version kompatibel?

**Problem: Performance-Probleme**\
Lösung: Prüfe: Caching aktiv? Zu viele Logs im Debug-Mode?

**Problem: State korrupt**\
Lösung: Lösung: await state.restoreLastBackup()

# 10. Best Practices

## 10.1 Do\'s

-   **✓** Immer über State-API zugreifen, nie direkt

-   **✓** Transaktionen für zusammenhängende Änderungen verwenden

-   **✓** Logging für alle wichtigen Operationen

-   **✓** JSDoc für alle öffentlichen Funktionen

-   **✓** Tests für neue Features schreiben

-   **✓** Backups vor großen Änderungen

-   **✓** Code-Reviews (selbst oder mit KI)

-   **✓** Dokumentation parallel aktualisieren

## 10.2 Don\'ts

-   **✗** Direkter Zugriff auf \_private Properties

-   **✗** Mutationen ohne Validierung

-   **✗** Synchrone Operationen bei Async-APIs

-   **✗** Hardcoded Pfade/IDs im Code

-   **✗** console.log() statt Logger

-   **✗** Commits ohne aussagekräftige Messages

-   **✗** Production-Änderungen ohne DEV-Test

-   **✗** Breaking Changes ohne Version-Bump

## 10.3 Code Review Checklist

-   [ ] Code folgt Naming Conventions

-   [ ] JSDoc vorhanden und vollständig

-   [ ] Error Handling implementiert

-   [ ] Tests geschrieben und bestanden

-   [ ] Keine direkten State-Zugriffe

-   [ ] Logging an wichtigen Stellen

-   [ ] Keine Magic Numbers/Strings

-   [ ] Performance akzeptabel

-   [ ] Dokumentation aktualisiert

-   [ ] CHANGELOG.md erweitert

# Anhang: Schnellreferenz

// === STATE ===\
game.janus7.core.state.get(path)\
game.janus7.core.state.set(path, value)\
game.janus7.core.state.update(object)\
game.janus7.core.state.transaction(fn)\
game.janus7.core.state.save()\
\
// === CONFIG ===\
game.janus7.core.config.get(key)\
game.janus7.core.config.set(key, value)\
game.janus7.core.config.isFeatureEnabled(feature)\
\
// === LOGGER ===\
game.janus7.core.logger.debug/info/warn/error(msg, data)\
game.janus7.core.logger.setLevel(level)\
\
// === ACADEMY ===\
game.janus7.academy.calendar.advanceDay()\
game.janus7.academy.lessons.runLesson(id)\
game.janus7.academy.scoring.addPoints(circle, points)\
\
// === DSA5 BRIDGE ===\
game.janus7.system.rolls.requestSkillCheck(options)\
game.janus7.system.actors.getStudentActor(key)

*Diese Dokumentation wächst mit jedem Milestone.*

**Happy Coding! 🚀**
