# JANUS7 PHASE 4 – SIMULATION ENGINE (KALENDER & SCORING)

**Projekt:** JANUS7 – Hybrides Betriebssystem für DSA5-Magierakademien  
**Phase:** 4 – Simulation Engine  
**Version:** 0.4.4  
**Status:** 🚧 IN DEVELOPMENT (TECH PREVIEW)

Dieses Dokument beschreibt die **technischen Details** der beiden zentralen Engines:

- `JanusCalendarEngine` (`academy/calendar.js`)
- `JanusScoringEngine` (`academy/scoring.js`)

---

## 1. JanusCalendarEngine

### 1.1 Verantwortlichkeiten

- Verwaltung der Akademie-Zeitachse:
  - Jahr, Trimester, Woche, Wochentag, Tagesphase.
- Abfrage von Kalender-Einträgen und Events:
  - `calendar.json`, `events.json` über `AcademyDataApi`.
- Ermittlung von Feiertagen:
  - `calendarEntry.type === "holiday"` oder `holidayKey != null`.
  - Events mit `type === "holiday"`.

Kein direkter Zugriff auf:

- DSA5-Systemobjekte,
- Foundry-UI,
- Actor/Item-Instanzen.

### 1.2 Typen

```ts
type DayRef = {
  year: number;
  trimester: number;
  week: number;
  day: string;      // z. B. "Praiosstag"
}

type SlotRef = DayRef & {
  phase: string;    // z. B. "Morgen"
}
```

### 1.3 Konstruktor & Dependencies

```js
new JanusCalendarEngine({
  state,        // JanusStateCore
  academyData,  // AcademyDataApi
  logger,       // JanusLogger oder Console
  config?: {
    phaseOrder?: string[],
    dayOrder?: string[]
  }
})
```

Standardkonfiguration:

```js
phaseOrder: ['Morgen', 'Vormittag', 'Mittag', 'Nachmittag', 'Abend', 'Nacht']
dayOrder: ['Praiosstag', 'Rondra', 'Efferdstag', 'Traviatag', 'Boronstag', 'Hesindetag', 'Firunstag']
```

### 1.4 Öffentliche Methoden

#### `getCurrentSlotRef(): SlotRef`

- Liest `time` aus `JanusStateCore`.
- Normalisiert fehlende Felder mit Defaults.
- Garantiert gültige `day`/`phase` (sonst Fallback auf Index 0).

#### `getCalendarEntriesForDay(dayRef: DayRef): any[]`

- Ruft `academyData.findCalendarEntries(dayRef)` auf.
- Keine Mutationen.
- Fehler werden geloggt, nicht geworfen.

#### `getCalendarEntryForCurrentSlot(): any | null`

- Liest aktuellen Slot.
- Ruft `academyData.getCalendarEntryByDay(slotRef)` auf.

#### `getEventsForCurrentSlot(): any[]`

- Liest aktuellen Slot.
- Ruft `academyData.listEventsForDay(slotRef)` auf.

#### `advancePhase({ steps = 1 } = {}): Promise<SlotRef>`

- Ändert nur `time.phase` und ggf. `time.day/week`.
- Unterstützt Schritte > 1 und < 0 (Vor- und Zurückspulen).
- Aktualisiert:
  - `time.totalDaysPassed` (falls numerisch vorhanden),
  - `time.isHoliday` (via `_computeIsHoliday`).
- Verwendet `state.transaction(...)` für atomare Updates.
- Feuert `janus7DateChanged`.

#### `advanceDay({ days = 1 } = {}): Promise<SlotRef>`

- Ändert `time.day/week` direkt (Phase bleibt).
- Gleiche Regeln für `totalDaysPassed` und `isHoliday` wie `advancePhase`.

### 1.5 Hooks

#### `janus7DateChanged`

Payload:

```js
{
  previous: SlotRef,
  current: SlotRef,
  reason: 'advancePhase' | 'advanceDay'
}
```

Verwendung:

- UI-Module (Phase 6) können darauf hören:
  - Aktualisierung von Kalender-Views.
  - Triggern von Event-/Lesson-Logik.

---

## 2. JanusScoringEngine

### 2.1 Verantwortlichkeiten

- Verwaltung aller Punktestände:
  - Häuser/Zirkel (z. B. `salamander`, `staves`, `swords`, `sickles`).
  - Individuelle Schüler (`studentId` als String).
- Protokollierung der Punktvergabe für:
  - Debugging,
  - Narration („Wer hat wann Punkte bekommen?“),
  - spätere UI-Visualisierung.

### 2.2 Konstruktor

```js
new JanusScoringEngine({
  state,    // JanusStateCore
  logger    // JanusLogger oder Console
})
```

### 2.3 State-Schema (Details)

```ts
type ScoreHistoryEntry = {
  timestamp: string;           // ISO-8601
  source: string;              // 'lesson' | 'exam' | 'event' | 'manual' | ...
  amount: number;              // +/- Punkte
  targetType: 'circle' | 'student';
  targetId: string;            // normalisiert (trim + lowercase)
  reason: string;              // sichtbarer Grundtext
  meta: any;                   // z. B. { examId: '...' }
}

type ScoringState = {
  circles:  Record<string, number>;
  students: Record<string, number>;
  lastAwarded: ScoreHistoryEntry[];
}
```

### 2.4 Mutations-API

#### `addCirclePoints(circleId, amount, reason, options?): Promise<number>`

- Validierung:
  - `circleId` muss truthy sein.
  - `amount` muss eine endliche Zahl ≠ 0 sein.
- Normalisierung:
  - `circleId` → klein + getrimmt (`_normalizeId`).
- Transaktion:
  - Liest `scoring`.
  - Addiert `amount` auf `scoring.circles[circleId]`.
  - Pusht einen neuen `lastAwarded`-Eintrag.
  - Persistiert den State via `JanusStateCore`.
- Hooks:
  - Feuert `janus7ScoreChanged` mit Payload:
    - `{ targetType: 'circle', targetId, amount, reason, newScore, source }`.

#### `addStudentPoints(studentId, amount, reason, options?): Promise<number>`

- Identisch zu `addCirclePoints`, aber gegen `students`.

#### `applyExamImpact(examDef, examResults = {}): Promise<void>`

- Erwartete Struktur:

```ts
examDef.scoringImpact?.circles?:  Record<string, number>
examDef.scoringImpact?.students?: Record<string, number>

examResults.circles?:  Record<string, number>
examResults.students?: Record<string, number>
examResults.reason?:   string
examResults.source?:   string
```

- Semantik:
  - `examResults` überschreibt Werte aus `examDef.scoringImpact`.
  - Für jeden Eintrag wird `addCirclePoints`/`addStudentPoints` mit `source = 'exam'` (Default) aufgerufen.
  - `meta.examId = examDef.id ?? null`.

### 2.5 Read-API

#### `getCircleScore(circleId): number`

- Gibt `0` zurück, wenn Zirkel unbekannt ist.
- Verschmutzt den State nicht.

#### `getStudentScore(studentId): number`

- Gibt `0` zurück, wenn Schüler unbekannt ist.

#### `getLeaderboard({ type = 'circle', topN } = {}): { id: string, score: number }[]`

- Sortiert absteigend nach Score.
- Optional:
  - `topN` beschränkt die Anzahl an Einträgen.

### 2.6 Hooks

#### `janus7ScoreChanged`

Payload:

```js
{
  targetType: 'circle' | 'student',
  targetId: string,
  amount: number,
  reason: string,
  newScore: number,
  source: string
}
```

Verwendung:

- UI-Module (Phase 6) können Leaderboards automatisch aktualisieren.
- Logging / Analytics.

---

## 3. Integrationspunkte & Best Practices

### 3.1 Verwendung aus Makros

Beispiele:

```js
// +10 Punkte für Zirkel Salamander
await game.janus7.academy.scoring.addCirclePoints(
  'salamander',
  10,
  'Vorbildlicher Einsatz im Unterricht'
);

// -5 Punkte für Schüler
await game.janus7.academy.scoring.addStudentPoints(
  'nadjescha-von-irgendwo',
  -5,
  'Regelverstoß in der Bibliothek'
);
```

### 3.2 Verwendung aus zukünftigen Engines (Lessons/Exams)

- Lessons-Engine ruft nach erfolgreicher Unterrichtsstunde `addStudentPoints`/`addCirclePoints` auf.
- Exams-Engine ruft nach Abschluss `applyExamImpact` mit detailliertem Ergebnisobjekt auf.
- Social/Event-Engine kann Bonus-/Maluspunkte für soziale Interaktionen vergeben.

**Wichtig:**  
Kein anderer Code (außer Tests) darf `state.scoring` direkt verändern.  
Alle Anpassungen laufen über `JanusScoringEngine`.

---

## 4. Erweiterbarkeit

Geplante Erweiterungen der Simulation Engine:

- Konfigurierbare **Score-Ranges** und **Grenzwerte** per Config/JSON.
- Spezialisierte Leaderboards:
  - nach Zirkel,
  - nach Jahrgang,
  - nach Fachbereich.
- Aggregierte Kennzahlen:
  - Durchschnittspunkte pro Student/Zirkel,
  - Punkteverlauf über die Zeit.
- Export-API für KI-Integration (Phase 7):
  - Scoring-Historie als Input für Erzähl- und Ereignisgenerierung.


---

## 5. Erweiterungen in 0.4.4

### 5.1 Exam-Grading (Hybrid + konfigurierbar)

- Neue Methoden in `JanusExamsEngine`:
  - `getGradingScheme(examDef)` – kombiniert Exam-spezifisches Schema, globale Defaults und einen Fallback.
  - `determineStatusFromScore({ score, maxScore, examDef })` – leitet Status + Prozentwert ab.
  - `recordAndApplyResult({ actorUuid, examId, score, maxScore, examDef, applyScoring })` – zeichnet Ergebnis auf und ruft optional `applyScoringImpact` auf.

Standard-Fallback-Schema (konfigurierbar):

- `failed` – < 50 %
- `passed` – ≥ 50 %
- `excellent` – ≥ 80 %

### 5.2 Event-Runner & Social-Impact

- Event-Runner hört auf `janus7DateChanged` und:
  - löst Events mit `autoMode: 'soft'` (oder `flags.janus7.autoMode === 'soft'`) automatisch aus,
  - schlägt Events ohne Auto-Flag oder mit „major impact“ nur vor (`janus7EventSuggestions`-Hook).

- Events mit `socialImpact` (Array) können Social-Werte automatisch verändern, z. B.:

```js
socialImpact: [
  { fromId: 'student-A', toId: 'student-B', delta: +5, tags: ['event', 'friendship'] }
]
```

### 5.3 Phase-4-TestRunner-Makro

- `macros/JANUS7_TestRunner_Phase4.js`
- Führt einfache Smoke-Tests durch:
  - Kalender: Slotwechsel,
  - Scoring: Punktevergabe,
  - Lessons: Slot-Abfrage,
  - Exams: Grading-Helper,
  - Events: Slot-Abfrage,
  - Social: `setAttitude` / `adjustAttitude` / `getAttitude`.
