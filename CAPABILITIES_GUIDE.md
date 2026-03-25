# JANUS7 Capabilities Guide

> **Version:** ab 0.9.9.33  
> **Zielgruppe:** GM-Makro-Autoren, Entwickler, KI-Integration  
> **Grundprinzip:** `game.janus7.capabilities` ist der **stabile Vertragspunkt** (Anti-Corruption Layer). Nie direkt `engine.ki.*`, `engine.simulation.*` usw. von außen aufrufen — diese APIs können sich intern verschieben.

---

## Übersicht

```js
const caps = game.janus7.capabilities;

// Verfügbare Namespaces (alle Object.freeze):
caps.time     // Kalender / Zeitsteuerung
caps.scoring  // Punkte & Bewertungen
caps.quests   // Quest-System
caps.lesson   // Aktive Lektion / Examen
caps.ki       // KI-Export/Import-Roundtrip
caps.state    // State-Inspektion & Diagnose
```

Alle Namespaces sind **eingefroren** — keine externe Mutation möglich.  
Das Wurzelobjekt `capabilities` selbst ist ebenfalls frozen.

---

## 1. `capabilities.time`

Steuert den Akademiekalender.

```js
const caps = game.janus7.capabilities;

// Nächsten Zeitslot (halbe Stunde / Unterrichtsblock) vorspulen
await caps.time.advanceSlot();

// Einen ganzen Tag vorspulen
await caps.time.advanceDay();
```

| Methode | Effekt | Hook |
|---|---|---|
| `advanceSlot()` | +1 Zeitslot | `janus7.date.changed` |
| `advanceDay()` | +1 Tag (alle Slots der alten Tagesroutine werden übersprungen) | `janus7.date.changed` |

**Makro-Beispiel — 3 Tage vorspulen:**
```js
const caps = game.janus7.capabilities;
for (let i = 0; i < 3; i++) await caps.time.advanceDay();
```

---

## 2. `capabilities.scoring`

Punkte für Zirkel und Einzelstudenten vergeben.

```js
// Zirkel-Punkte (z.B. nach Gruppenprüfung)
await caps.scoring.addCirclePoints('ZIRKEL_FEUER', 5, 'Gruppenprüfung bestanden');

// Einzelpunkte für einen PC/NPC-Akteur
await caps.scoring.addStudentPoints('student-uuid-hier', 3, 'Zusatzaufgabe');
```

| Methode | Parameter | Beschreibung |
|---|---|---|
| `addCirclePoints(circleId, delta, reason)` | `string, number, string` | Delta positiv oder negativ |
| `addStudentPoints(studentId, delta, reason)` | `string, number, string` | studentId = Actor-UUID |

**BHC-Note:** `delta` wird intern auf endliche Zahlen validiert (non-finite → Error geloggt, kein State-Write).

---

## 3. `capabilities.quests`

Quest-Engine anstoßen.

```js
// Quest starten (questId muss in quests.json definiert sein)
await caps.quests.startQuest('Q_BIBLIOTHEK_GEHEIMNIS', { triggerSource: 'gm_manual' });
```

| Methode | Parameter | Beschreibung |
|---|---|---|
| `startQuest(questId, opts?)` | `string, object?` | Startet die Quest im State |

Aktiver Quest-State ist unter `game.janus7.core.state.get('simulation.activeQuests')` lesbar.

---

## 4. `capabilities.lesson`

Aktive Lektion oder Examen für den `RollScoringConnector` setzen.

```js
// Lektion aktivieren (beeinflusst welche Lernprogress-Hooks feuern)
await caps.lesson.setActiveLesson('LEKTION_ZAUBERTHEORIE_01');

// Examen aktivieren
await caps.lesson.setActiveExam('EXAM_MAG_BASICS_01');

// Beide deaktivieren (Freiphase)
await caps.lesson.clearActive();

// Aktuell Aktives abfragen (synchron)
const active = caps.lesson.getActive();
// → { type: 'lesson'|'exam'|null, id: string|null }
```

**Typischer Spielflow:**
1. GM setzt Lektion via Makro / Chat-CLI: `/janus lesson.start id=LEKTION_…`
2. SCs würfeln DSA5-Proben
3. `RollScoringConnector` reagiert auf `janus7.roll.completed` → bewertet in Kontext der aktiven Lektion
4. GM beendet: `/janus lesson.clear`

---

## 5. `capabilities.ki`

KI-Roundtrip-API. Nur für GMs.

```js
const ki = game.janus7.capabilities.ki;

// === EXPORT ===

// Lite-Bundle (Default, ~10 KB): Zustand + Metadaten ohne volle Prosahistorie
const bundle = await ki.exportBundle({ mode: 'lite' });
// mode: 'lite' | 'week' | 'full'

// In Outbox-Datei speichern
const { filename } = await ki.exportToOutbox({ mode: 'lite' });
console.log('Gespeichert als:', filename);

// === IMPORT / VORSCHAU ===

// Patch aus KI als JS-Objekt (nach JSON.parse des KI-Outputs)
const patch = { ... };

// Diff berechnen — kein State-Write
const diffs = await ki.previewImport(patch);
// diffs: Array von { changeKey, path, oldValue, newValue, ... }

// Patch tatsächlich anwenden (State-Transaktion, Rollback bei Fehler)
const applied = await ki.applyImport(patch, { selectedIds: ['change-001'] });

// Aus Inbox-Datei importieren (Dateiname aus /Data/janus7/inbox/)
const diffs2 = await ki.importFromInbox('ki_patch_2026.json');

// === HISTORY ===

const history = ki.getImportHistory();
// Array: [{ timestamp, filename, diffs, ok }, ...]
```

**Sicherheitsregeln (hardcoded):**
- Alle `ki.*`-Methoden prüfen `game.user.isGM` — Nicht-GMs erhalten `null`/leere Ergebnisse + Warning.
- `applyImport` erzeugt vor dem Write einen State-Snapshot → Rollback bei Exception.

---

## 6. `capabilities.state`

State-Inspektion und Gesundheitscheck — primär für Debugging und Tests.

```js
const state = game.janus7.capabilities.state;

// Snapshot (Deep-Clone) des aktuellen State
const snap = state.snapshot();
// → { version, time, academy, actors, meta, ... } | null

// Healthcheck (async, nutzt engine.diagnostics wenn verfügbar)
const report = await state.runHealthCheck();
// → { ok: boolean, checks: [...], warnings: [...] }
```

**Standard-Smoke-Test (Konsole):**
```js
const { ok, checks, warnings } = await game.janus7.capabilities.state.runHealthCheck();
console.log('JANUS7 Health:', ok ? '✅ OK' : '❌ FAIL', { checks, warnings });
```

---

## Chat-CLI-Äquivalente

Alle Capabilities sind auch über den Chat-Parser erreichbar:

| Chat-Kommando | Equivalent |
|---|---|
| `/janus time.advance` | `caps.time.advanceSlot()` |
| `/janus time.day` | `caps.time.advanceDay()` |
| `/janus lesson.start id=X` | `caps.lesson.setActiveLesson('X')` |
| `/janus lesson.clear` | `caps.lesson.clearActive()` |
| `/janus exam.start id=X` | `caps.lesson.setActiveExam('X')` |
| `/janus ki.export` | `ki.exportBundle({ mode: 'lite' })` |
| `/janus ki.exportOutbox` | `ki.exportToOutbox({})` |
| `/janus ki.history` | `ki.getImportHistory()` |

---

## Warum Capabilities statt direktem Namespace-Zugriff?

```
engine.ki.exportBundle()           ← VERMEIDEN: interner Pfad, kann sich verschieben
engine.capabilities.ki.exportBundle()  ← OK: stabiler Vertragsraum
game.janus7.capabilities.ki.exportBundle()  ← EMPFOHLEN aus externem Code
```

Der `capabilities`-Layer:
1. Kapselt interne Pfade — `engine.ki` existiert heute parallel, wird langfristig der einzige Weg
2. Ist frozen → keine versehentlichen Monkey-Patches von außen
3. Gibt konsistente Fallbacks statt undefined-Fehler (fehlende Subsysteme → Warn-Log + null)
4. Ist testbar via `P1-TC-14` (Namespace-Vollständigkeit + Freeze-Check)

---

## Fehlerverhalten

Alle Capabilities-Methoden sind defensiv implementiert:

```js
// Typisches Muster intern:
someMethod: async (...args) => {
  const subsystem = this._subsystem();
  if (!subsystem?.method) {
    this._warn('someMethod', 'Subsystem nicht verfügbar');
    return null; // kein throw
  }
  return subsystem.method(...args);
}
```

→ Capabilities werfen **nie** unerwartete Exceptions nach außen.  
→ Alle Warn-Logs laufen durch `JanusLogger` (Prefix: `[JANUS7][Capabilities]`).

---

## Verwandte Dokumente

- [`SCENE_REGIONS_GUIDE.md`](./SCENE_REGIONS_GUIDE.md) — Foundry Region→Location-Bridge
- [`CRON_GUIDE.md`](./CRON_GUIDE.md) — Periodischer Scheduler
- [`API_REFERENCE.md`](./API_REFERENCE.md) — Vollständige API-Referenz
- `P1-TC-14` in Test-Runner: Namespace-Vollständigkeit + Freeze-Prüfung
