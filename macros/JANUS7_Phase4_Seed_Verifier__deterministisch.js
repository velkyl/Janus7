/**
 * JANUS7 Phase4 Seed Verifier (deterministisch)
 * - P4-TC-03: findet EVT_SCHOOL_FEST_01 (year=1 ref) durch temporäres Setzen der Zeit
 * - P4-TC-06: seeded in-memory holiday event + AdvanceDay, prüft time.isHoliday
 * - Auto-Restore am Ende
 */
(async () => {
  const engine = game?.janus7;
  if (!engine) return ui.notifications?.error?.("JANUS7: game.janus7 nicht gefunden.");

  const sim = engine?.simulation || {};
  const calendar = engine?.academy?.calendar || sim.calendar;
  const eventsEngine = engine?.academy?.events || sim.events;
  const data = engine?.academy?.data;

  if (!calendar?.advanceDay || !calendar?.getCurrentSlotRef) {
    return ui.notifications?.error?.("JANUS7: CalendarEngine unvollständig.");
  }
  if (!data) return ui.notifications?.error?.("JANUS7: AcademyDataApi nicht gefunden.");
  if (!eventsEngine?.listEventsForCurrentSlot) return ui.notifications?.error?.("JANUS7: EventsEngine.listEventsForCurrentSlot fehlt.");

  const snapshot = engine?.core?.state?.get?.();
  const canRestore = !!engine?.core?.state?.replace;
  const state = engine?.core?.state;

  const now = () => new Date().toISOString();
  const htmlLines = [];
  const ok = (t) => htmlLines.push(`✅ ${t}`);
  const warn = (t) => htmlLines.push(`🟡 ${t}`);
  const fail = (t) => htmlLines.push(`❌ ${t}`);

  // --- Helper: set time directly (public state path is "time") ---
  const setTime = (t) => {
    // keep totalDaysPassed if exists
    const cur = state.get("time") ?? {};
    state.set("time", { ...cur, ...t });
  };

  // --- P4-TC-03: Event exists, but year=1. We jump to that slot. ---
  // Event ref: year 1, trimester 1, week 4, day Firunstag, phase Abend
  try {
    setTime({ year: 1, trimester: 1, week: 4, day: "Firunstag", phase: "Abend", isHoliday: false });
    // force recompute by doing a no-op day move? easiest: move -1 then +1
    await calendar.advanceDay({ days: -1 });
    await calendar.advanceDay({ days: +1 });

    const slot = calendar.getCurrentSlotRef();
    const ev = eventsEngine.listEventsForCurrentSlot() ?? [];
    if (Array.isArray(ev) && ev.length) {
      ok(`P4-TC-03: Event gefunden im Slot ${JSON.stringify(slot)} | count=${ev.length} | first=${ev[0]?.id ?? "?"}`);
    } else {
      fail(`P4-TC-03: Keine Events gefunden im erwarteten Slot ${JSON.stringify(slot)} (prüfe Events-Daten).`);
    }
  } catch (e) {
    fail(`P4-TC-03 Error: ${e?.message ?? String(e)}`);
  }

  // --- P4-TC-06: Holiday detection (calendar computes isHoliday from AcademyDataApi.listEventsForDay) ---
  // We seed an in-memory holiday event in academy data for year=1 t1 w1 Rondra Morgen
  try {
    const target = { year: 1, trimester: 1, week: 1, day: "Rondra", phase: "Morgen" };
    const seedId = "EVT__TEST_HOLIDAY__AUTO";

    // best-effort inject (in-memory only)
    const eventsObj = data?._events;
    if (eventsObj?.events && Array.isArray(eventsObj.events)) {
      // avoid duplicates
      const exists = eventsObj.events.some(e => e?.id === seedId);
      if (!exists) {
        eventsObj.events.push({
          id: seedId,
          name: "TEST: Holiday Seed",
          type: "holiday",
          tags: ["test", "holiday"],
          summary: "Automatisch erzeugtes Test-Event für Holiday-Detection.",
          locationId: null,
          relatedStoryThreads: [],
          calendarRefs: [target]
        });
        // rebuild quick lookup map if present
        if (data?._eventById?.set) data._eventById.set(seedId, eventsObj.events[eventsObj.events.length - 1]);
      }
      ok("P4-TC-06: Holiday-Event in-memory seeded.");
    } else {
      warn("P4-TC-06: Konnte in-memory Event nicht seeden (AcademyDataApi intern anders). Test evtl. nicht aussagekräftig.");
    }

    // move to day before, then advance into holiday day to trigger _computeIsHoliday
    setTime({ year: 1, trimester: 1, week: 1, day: "Praiosstag", phase: "Morgen", isHoliday: false });
    await calendar.advanceDay({ days: +1 }); // should land on Rondra Morgen

    const t = state.get("time") ?? {};
    if (t.isHoliday === true) {
      ok(`P4-TC-06: Holiday erkannt (time.isHoliday=true) im Slot ${JSON.stringify(calendar.getCurrentSlotRef())}.`);
    } else {
      fail(`P4-TC-06: Holiday NICHT erkannt (time.isHoliday=${String(t.isHoliday)}).`);
    }
  } catch (e) {
    fail(`P4-TC-06 Error: ${e?.message ?? String(e)}`);
  }

  // --- Restore ---
  if (snapshot && canRestore) {
    try {
      engine.core.state.replace(snapshot);
      ok("Auto-Restore: state.replace(snapshot) erfolgreich.");
    } catch (e) {
      warn(`Auto-Restore fehlgeschlagen: ${e?.message ?? String(e)}`);
    }
  } else {
    warn("Auto-Restore übersprungen (kein Snapshot/replace).");
  }

  const html = `
    <h2>JANUS7 Phase 4 – Seed Verifier</h2>
    <p><b>Version:</b> ${game.modules.get("janus7")?.version ?? "?"} | <b>Time:</b> ${now()}</p>
    <hr/>
    <div>${htmlLines.join("<br/>")}</div>
    <hr/>
    <p><small>Hinweis: Holiday-Event wird nur in-memory seeded (nur für Test). Events-Daten bleiben in Dateien unverändert.</small></p>
  `;
  await ChatMessage.create({ user: game.userId, speaker: ChatMessage.getSpeaker(), content: html });

  ui.notifications?.info?.("JANUS7 Seed Verifier fertig – siehe Chat.");
})();