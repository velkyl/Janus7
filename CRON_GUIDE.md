# JANUS7 — JanusCron: Periodische Aufgaben

**Datei:** `services/cron/JanusCron.js`  
**Phase:** Services / Phase 4  
**Zweck:** Taktgesteuerte, eventgetriebene Scheduler-Jobs für regelmäßige Akademie-Aufgaben.

---

## Architektur

`JanusCron` hat **kein `setInterval`**. Stattdessen lauscht er auf `janus7.date.changed` und vergleicht Woche/Trimester/Tag des neuen Zeitpunkts mit dem letzten bekannten Stand.

```
janus7.date.changed
    ↓
JanusCron._tick(current)
    ├─ trimester neu? → _runJobs('trimester', ...)
    ├─ week neu?      → _runJobs('weekly', ...)
    └─ dayIndex neu?  → _runJobs('daily', ...)
```

**GM-only:** Alle Jobs werden nur auf dem Client ausgeführt, bei dem `game.user.isGM === true`.

---

## Eingebaut-Jobs

| Job | Periode | Aktiviert via Setting |
|---|---|---|
| `housePointsWeeklyReset` | weekly | `scoring.useWeeklyBuffer = true` im State (opt-in) |
| `trimesterReport` | trimester | `cronTrimesterEnabled = true` (Standard) |

### `trimesterReport`

Beim Trimesterwechsel wird automatisch feuert `janus7.trimester.completed`:

```js
Hooks.on('janus7.trimester.completed', ({ trimester, week, circles, topStudents }) => {
  console.log(`Trimester ${trimester} beendet.`);
  console.table(circles);
  console.log('Top 5:', topStudents);
});
```

---

## GM-Einstellungen

In Foundry **Moduleinstellungen → JANUS7**:

| Setting | Typ | Standard | Beschreibung |
|---|---|---|---|
| `cronWeeklyEnabled` | Boolean | `true` | Wöchentliche Jobs aktiv |
| `cronTrimesterEnabled` | Boolean | `true` | Trimester-Jobs aktiv |

---

## Eigene Jobs hinzufügen (Makro)

```js
// Makro: Eigener Weekly-Job registrieren
// HINWEIS: Muss nach dem 'janus7Ready'-Hook ausgeführt werden.
// Einmalig beim Spielstart ausführen — oder in ein persistentes Makro packen.

const cron = game.janus7._cron;
if (!cron) {
  ui.notifications.warn('JANUS7: Cron nicht verfügbar.');
  return;
}

// Wöchentlicher Job: Status-Chat-Nachricht
cron.addJob('weekly', async (engine, current) => {
  const scoring = engine?.academy?.scoring;
  const circles = scoring?.getCircleScores?.() ?? [];
  const leader  = circles.sort((a, b) => b.score - a.score)[0];

  ChatMessage.create({
    content: `<b>📅 JANUS7 Wochenbericht (Woche ${current?.week})</b><br>
      Führender Zirkel: <b>${leader?.circleId ?? '?'}</b> mit ${leader?.score ?? 0} Punkten.`,
    speaker: { alias: 'Akademie-Sekretariat' },
  });
});

ui.notifications.info('JANUS7: Weekly-Job registriert.');
```

---

## Trimester-Job: Custom-Logik

```js
// Makro: Trimester-Abschluss-Nachricht + Archiv-Snapshot
const cron = game.janus7._cron;
if (!cron) return;

cron.addJob('trimester', async (engine, current) => {
  const scoring   = engine?.academy?.scoring;
  const circles   = scoring?.getCircleScores?.() ?? [];
  const students  = scoring?.getStudentScores?.({ topN: 3 }) ?? [];

  // Top-3-Schüler ins Chat
  const podium = students
    .map((s, i) => `${['🥇','🥈','🥉'][i]} ${s.studentId}: ${s.score} P.`)
    .join('<br>');

  ChatMessage.create({
    content: `<h3>Trimester ${current?.trimester} – Abschluss!</h3>
      <b>Top 3:</b><br>${podium || '(keine Daten)'}`,
    speaker: { alias: 'Akademieleitung' },
  });
});
```

---

## Daily-Job: Anwesenheitsprüfung

```js
// Tägliche Erinnerung wenn keine aktive Lektion im Slot
cron.addJob('daily', async (engine) => {
  const sim = engine?.core?.state?.get?.('simulation') ?? {};
  if (!sim?.activeLessonId && !sim?.activeExamId) {
    // Kein aktiver Unterricht — optional: automatisch aus Kalender ableiten
    const caps = engine?.capabilities;
    const lesson = engine?.academy?.lessons;
    if (lesson) {
      const slots = lesson.getLessonsForCurrentSlot?.() ?? [];
      if (slots.length > 0) {
        await caps?.lesson?.setActiveLesson(slots[0]?.lesson?.id);
        console.log('[JANUS7 Cron] Lektion auto-gesetzt:', slots[0]?.lesson?.id);
      }
    }
  }
});
```

---

## Cron deaktivieren / teardown

```js
// Temporär deaktivieren
game.janus7._cron?.teardown();

// Wieder registrieren
game.janus7._cron?.register();
```

---

## Debugging

```js
// Aktuellen _lastSeen-Zustand prüfen
console.log(game.janus7._cron._lastSeen);
// → { week: 3, trimester: 1, dayIndex: 2 }

// Alle registrierten Jobs zählen
const c = game.janus7._cron;
console.log({
  daily:     c._jobs.daily.length,
  weekly:    c._jobs.weekly.length,
  trimester: c._jobs.trimester.length,
});
```

---

*Zuletzt aktualisiert: v0.9.9.34 (Block A + Services)*
