# JANUS7 Macros (v0.5.2)

Dieses Modul liefert ein Macro-Compendium **JANUS7 Macros**.
Import: Compendium öffnen → Einträge per Drag&Drop in die Macro-Leiste ziehen.

## Atmosphere
- JANUS7 – Atmosphere: Enable
- JANUS7 – Atmosphere: Disable
- JANUS7 – Atmosphere: Set Master (Self)
- JANUS7 – Atmosphere: Set Master…
- JANUS7 – Atmosphere: Apply Mood…
- JANUS7 – Atmosphere: Stop All
- JANUS7 – Atmosphere: Pause
- JANUS7 – Atmosphere: Resume
- JANUS7 – Atmosphere: Master Volume…
- JANUS7 – Atmosphere: Toggle Auto (Calendar)
- JANUS7 – Atmosphere: Toggle Auto (Events)
- JANUS7 – Atmosphere: Toggle Auto (Location)
- JANUS7 – Atmosphere: Status

## Locations
- JANUS7 – Location: Set Current…

Hinweis: Auto-Moods für Events/Locations wirken nur auf dem **Master-Client** (Hybrid-first).

## UI / Control Panel

- **JANUS7 – Control Panel: Open** – Öffnet das JANUS7 Control Panel. Standardmäßig wird der Tab "status" angezeigt. 
  - Optional kann im Macro-Dialog ein Tab-Name angegeben werden (`status`, `atmo`, `time` oder `debug`).  
  - Nur für den Spielleiter sichtbar.  
  - Macro-Inhalt in `macros/JANUS7_Control_Panel_Open.js`.


---

## Chat-CLI (ab v0.9.9.29)

Alle JANUS7-Aktionen sind über den Foundry-Chat aufrufbar.  
Syntax: `/janus <verb> [param=wert ...]`  
Nur für GMs verfügbar (wo nicht anders angegeben).

### Zeit
```
/janus time.advanceSlot [amount=N]
/janus time.advanceDay  [amount=N]
/janus day              [amount=N]     (Alias)
/janus time.resetCalendar
```

### Lektion & Prüfung
```
/janus lesson.start  lessonId=LES_Y1_T1_ARKAN_01
/janus lesson.clear
/janus lesson.status                   (GM + Spieler)
/janus exam.start    examId=EXAM_MAG_BASICS_01
/janus exam.clear
```

### Scoring
```
/janus scoring.addCirclePoints circleId=feuer delta=5 reason=Gute_Antwort
```

### KI / Phase 7
```
/janus ki.export         [mode=full|delta|social]
/janus ki.exportOutbox   [mode=full]
/janus ki.history
```

### Atmosphäre
```
/janus mood moodId=studious
/janus atmosphere.applyMood moodId=studious
```

### System
```
/janus health
/janus smoke
/janus diag
/janus panel
/janus save
/janus help
```

---

## Capabilities API (ab v0.9.9.33)

Stabiler Vertragspunkt für Makros und externe Skripte.  
**Empfohlen** gegenüber direktem `engine.ki` / `engine.academy.scoring`-Zugriff.

```js
const caps = game.janus7.capabilities;

// ── Zeit ──────────────────────────────────────────────────────
await caps.time.advanceDay();
await caps.time.advanceSlot();

// ── Scoring ───────────────────────────────────────────────────
await caps.scoring.addCirclePoints('feuer', 5, 'Gute Antwort in Arkanologie');
await caps.scoring.addStudentPoints('NPC_AELINDRA', 3, 'Kritischer Erfolg');

// ── Lektion / Prüfung ─────────────────────────────────────────
await caps.lesson.setActiveLesson('LES_Y1_T1_ARKAN_01');
await caps.lesson.setActiveExam('EXAM_MAG_BASICS_01');
await caps.lesson.clearActive();
const { activeLessonId } = caps.lesson.getActive();

// ── Quest ─────────────────────────────────────────────────────
await caps.quests.startQuest('Q_DEMO_LIBRARY', { actorId: 'Actor.xyz' });

// ── State ─────────────────────────────────────────────────────
const snap = caps.state.snapshot();          // Deep-Clone, kein Live-Objekt
const health = await caps.state.runHealthCheck();

// ── KI (Phase 7) ──────────────────────────────────────────────
const bundle = await caps.ki.exportBundle({ mode: 'full' });
const diffs  = await caps.ki.previewImport(kiResponse);
await caps.ki.applyImport(kiResponse);
const history = caps.ki.getImportHistory();
```

---

## Cron-Jobs (ab v0.9.9.32)

Periodische Aufgaben über `game.janus7._cron`. Siehe `CRON_GUIDE.md` für vollständige Dokumentation.

```js
// Eigener Wochenreport
game.janus7._cron.addJob('weekly', async (engine, current) => {
  const score = engine?.academy?.scoring?.getCircleScores?.() ?? [];
  ChatMessage.create({ content: `Woche ${current.week}: ${JSON.stringify(score)}` });
});
```

