# JANUS7 PHASE 4 – ACADEMY SIMULATION OVERVIEW

**Projekt:** JANUS7 – Hybrides Betriebssystem für DSA5-Magierakademien  
**Phase:** 4 – Academy Simulation (Kalender, Scoring, Events)  
**Version:** 0.4.4  
**Status:** 🚧 IN DEVELOPMENT (TECH PREVIEW)

---

## 1. Zielbild von Phase 4

Phase 4 baut auf den stabilen Phasen 0–3 auf und führt die eigentliche **Akademie-Simulation** ein:

- Fortschreitender **Kalender** (Ingame-Tage, Phasen, Wochen, Trimester).
- Verknüpfung von **Unterrichtseinheiten, Prüfungen und Events** mit dem Zeitverlauf.
- **Scoring-System** für Zirkel/Häuser und individuelle Schüler.
- Vorbereitung bzw. erste Implementierung von **Lessons-, Exams-, Events- und Social-Systemen**.
- Vorbereitung von **Social- & Event-Engines** (zukünftig: Social Graph, Zufallsevents, Reaktionen).

Wichtig: Phase 4 **ändert keine DSA5-Logik**. Alle Regeln, Proben und Effekte bleiben vollständig im DSA5-System und in der DSA5-Bridge (Phase 3) gekapselt.

---

## 2. Architektur-Kontext

Phase 4 sitzt zwischen:

- **Core (Phase 1)**  
  - `JanusStateCore` – persistenter Weltzustand  
  - `JanusLogger`, `JanusConfig`, `JanusDirector`  
- **Static Academy Data (Phase 2)**  
  - `AcademyDataApi` – Zugriff auf `data/academy/*.json`  
- **DSA5 System Bridge (Phase 3)**  
  - `DSA5SystemBridge` – Roll-API, Actor-/Item-Resolver  

Phase 4 nutzt diese Schichten, **führt aber keine neuen harten Abhängigkeiten** zu Foundry- oder DSA5-Interna ein.  
Alle Simulationen laufen rein datengetrieben:

- Zeit & Scoring → `game.settings` (über `JanusStateCore`).
- Inhalte → JSON-Files in `data/academy/`.
- Proben → über `game.janus7.bridge.dsa5` (Roll-API), nicht direkt aus Phase 4 heraus (das folgt bei Exams/Lessons).

---

## 3. Simulation Engines in Phase 4

### 3.1 JanusCalendarEngine (`academy/calendar.js`)

Verantwortlichkeiten:

- Repräsentiert den aktuellen Akademie-Zeitpunkt (`SlotRef`).
- Steuert den Fortschritt von Phasen und Tagen.
- Liefert passende Kalendereinträge und Events.

Kern-APIs (stabil):

- `getCurrentSlotRef(): SlotRef`  
- `getCalendarEntryForCurrentSlot(): CalendarEntry | null`  
- `getCalendarEntriesForDay(dayRef: DayRef): CalendarEntry[]`  
- `getEventsForCurrentSlot(): AcademyEvent[]`  
- `advancePhase({ steps = 1 }): Promise<SlotRef>`  
- `advanceDay({ days = 1 }): Promise<SlotRef>`

Side-Effects:

- Schreibt ausschließlich in `state.time` (über `JanusStateCore.transaction`).
- Berechnet `time.isHoliday` auf Basis von Kalender-Einträgen und Events.
- Feuert `Hooks.callAll('janus7DateChanged', { previous, current, reason })`.

### 3.2 JanusScoringEngine (`academy/scoring.js`)

Verantwortlichkeiten:

- Verwaltet **Haus-/Zirkelpunkte** und **Schülerpunkte**.
- Hält eine **Punktvergabe-Historie** (`scoring.lastAwarded[]`).
- Bereitet Daten für Leaderboards / Visualisierungen auf.

State-Schema (Erweiterung):

```js
scoring: {
  circles: { [circleId: string]: number },
  students: { [studentId: string]: number },
  lastAwarded: Array<{
    timestamp: string,
    source: string,
    amount: number,
    targetType: 'circle' | 'student',
    targetId: string,
    reason: string,
    meta: any
  }>
}
```

Kern-APIs (stabil):

- `addCirclePoints(circleId, amount, reason, options?)`  
- `addStudentPoints(studentId, amount, reason, options?)`  
- `applyExamImpact(examDef, examResults?)`  
- `getCircleScore(circleId)`  
- `getStudentScore(studentId)`  
- `getLeaderboard({ type = 'circle' | 'student', topN? })`

Side-Effects:

- Schreibt ausschließlich in `state.scoring`.
- Feuert `Hooks.callAll('janus7ScoreChanged', payload)`.

---

## 4. Einbindung in die JANUS7 Engine

Phase 4 wird **nicht** direkt über `core/index.js` importiert, sondern registriert sich über einen Custom-Hook:

1. In `core/index.js` feuert `Janus7Engine.ready()` nach erfolgreicher Initialisierung:

```js
const HooksRef = globalThis.Hooks;
HooksRef?.callAll?.('janus7Ready', this);
```

2. In `academy/phase4.js` hängt sich die Simulation an diesen Hook:

```js
Hooks.once('janus7Ready', (engine) => {
  const logger = engine.core.logger;
  const state = engine.core.state;
  const academyData = engine.academy.data;

  const calendar = new JanusCalendarEngine({ state, academyData, logger });
  const scoring  = new JanusScoringEngine({ state, logger });

  engine.academy.calendar   = calendar;
  engine.academy.scoring    = scoring;
  engine.simulation         = engine.simulation || {};
  engine.simulation.calendar = calendar;
  engine.simulation.scoring  = scoring;
});
```

Damit bleibt die Schichtenarchitektur gewahrt:

- Phase 1 (Core) weiß nichts von Phase 4.
- Phase 4 hängt sich **nachgelagert** über `janus7Ready` an die Engine.

---

## 5. Öffentliche API (Spieler- & GM-Sicht)

In Foundry steht nach erfolgreichem Start:

```js
game.janus7.academy.data      // AcademyDataApi (Phase 2)
game.janus7.academy.calendar  // JanusCalendarEngine (Phase 4)
game.janus7.academy.scoring   // JanusScoringEngine (Phase 4)

// Convenience:
game.janus7.simulation.calendar
game.janus7.simulation.scoring
```

Typische Aufrufe:

```js
// Zeit fortschreiben
await game.janus7.academy.calendar.advancePhase({ steps: 1 });
await game.janus7.academy.calendar.advanceDay({ days: 1 });

// Aktuellen Slot und Lesson/Event
const slot   = game.janus7.academy.calendar.getCurrentSlotRef();
const entry  = game.janus7.academy.calendar.getCalendarEntryForCurrentSlot();
const events = game.janus7.academy.calendar.getEventsForCurrentSlot();

// Scoring
await game.janus7.academy.scoring.addCirclePoints('salamander', 10, 'Testpunkte');
game.janus7.academy.scoring.getLeaderboard({ type: 'circle' });
```

---

## 6. Status & Ausblick

**Aktueller Status (0.4.0):**

- ✅ Kalendersimulation (Phase + Tage + Feiertage)  
- ✅ Scoring-Grundlagen (Zirkel, Schüler, Historie, Hooks)  
- ✅ Integration über `janus7Ready`  
- ⚠️ Noch kein eigenes UI (Macros & Konsolen-API only)  
- ⚠️ Lessons-, Exams-, Social- und Event-Engines sind vorbereitet, aber noch nicht implementiert

**Geplante Erweiterungen in Phase 4.x:**

- `academy/lessons.js` – Unterrichtssessions, Outcomes, Auto-Scoring  
- `academy/exams.js` – Prüfungen, Roll-API-Integration, Auswertungen  
- `academy/events.js` – Zufalls- und Story-Events, Hooks an Kalender  
- `academy/social.js` – einfacher Social-Graph (Sympathien, Rivalitäten)  
- UI-Module (Phase 6) für:
  - Kalenderübersicht
  - Hauscup-Leaderboards
  - Event-/Lesson-Dashboard

Phase 4 wird als **Tech Preview** ausgeliefert, bis:
- stabile APIs für Lessons/Exams definiert sind,
- eine erste UI-Schicht (Phase 6) aufsetzt,
- ein automatisierter Testkatalog für die Simulation ergänzt wurde.


---

## Neuerungen in 0.4.4 (Balance & Tests)

- Ergänzt: Prüfungs-Grading-Schema (konfigurierbar, mit Fallback-Schema).
- Ergänzt: Komfort-API `recordAndApplyResult()` in `JanusExamsEngine`.
- Ergänzt: Event-Runner, der leichte Flavor-Events automatisch auslöst und größere Ereignisse der SL vorschlägt.
- Ergänzt: Social-Integration für Events über `event.socialImpact`.
- Ergänzt: `JANUS7_TestRunner_Phase4`-Makro für einfache Smoke-Tests der Phase-4-Engines.
- Fokus: Balance als Werkzeugkasten – SL entscheidet über Härtegrad und Einsatz der Automatik.


## 0.4.5 – Data Hygiene (Academy)

- Schemas unter `schemas/` zur Validierung der Academy-JSONs.
- `data/academy/tags.json` als zentrale Tag-Referenz.
- `AcademyDataApi.validateIntegrity()` als Broken-Link-Checker für referenzierte IDs.
- Umbau `lesson-generator.json` in Richtung Template-/Node-Ansatz (weniger HTML im JSON).
