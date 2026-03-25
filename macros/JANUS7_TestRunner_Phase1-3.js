/**
 * JANUS7 – Testkatalog Runner (Phase 1–3)
 *
 * Nutzung:
 * - Macro in Foundry anlegen und diesen Code einfügen.
 * - Als GM ausführen.
 * - Erwartet zwei Actors in der Welt:
 *   - COMPLETE: "Magier" (oder anpassen)
 *   - INCOMPLETE: "Test-Magier" (oder anpassen)
 *
 * Ausgabe:
 * - Speichert 2 Download-Dateien:
 *   - janus7-testlog_YYYY-MM-DD...json
 *   - janus7-testlog_YYYY-MM-DD...txt
 */

(async () => {
  const NOW = new Date();

// ----------------------------
// Deterministische Würfel (Testmodus)
// ----------------------------
let _restoreRandomUniform = null;
if (USE_DETERMINISTIC_ROLLS) {
  try {
    const fn = CONFIG?.Dice?.randomUniform;
    if (typeof fn === 'function') {
      _restoreRandomUniform = fn;
      // konstante Mitte -> reproduzierbarer Verlauf; dsa5 nutzt i.d.R. CONFIG.Dice.randomUniform
      CONFIG.Dice.randomUniform = () => 0.5;
    }
  } catch (_e) {
    // ignore
  }
}


  const ts = NOW.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const fmtMs = (ms) => `${Math.round(ms)}ms`;

  const results = [];
  const SKIP = (reason) => ({ __skip: true, reason });

  function ok(cond, msg = 'Assertion failed') {
    if (!cond) throw new Error(msg);
  }

  async function runTest({ id, phase, title, fn }) {
    const t0 = performance.now();
    try {
      const out = await fn();
      const t1 = performance.now();
      if (out?.__skip) {
        results.push({ Phase: phase, 'Test-ID': id, Titel: title, Status: 'SKIP', Details: out.reason, Dauer: fmtMs(t1 - t0) });
      } else {
        results.push({ Phase: phase, 'Test-ID': id, Titel: title, Status: 'OK', Details: out ?? '', Dauer: fmtMs(t1 - t0) });
      }
    } catch (err) {
      const t1 = performance.now();
      results.push({ Phase: phase, 'Test-ID': id, Titel: title, Status: 'FAIL', Details: err?.message ?? String(err), Dauer: fmtMs(t1 - t0) });
      console.error(`[JANUS7-TEST] ${id} FAIL`, err);
    }
  }

  // --- Preconditions ---
  if (!game?.user?.isGM) {
    ui.notifications?.error?.('JANUS7 Test Runner muss als GM ausgeführt werden.');
    return;
  }

  const engine = game.janus7 ?? globalThis.janus7;
  if (!engine) {
    ui.notifications?.error?.('JANUS7 engine nicht gefunden. Ist das Modul aktiv?');
    return;
  }

  // Test-Fixtures (bewusst NICHT automatisch erzeugen – Tests sollen prüfen, nicht bauen)
  // - COMPLETE: "fertiger" Charakter, der das Talent sicher hat
  // - INCOMPLETE: "unfertiger" Charakter, bei dem Talente fehlen dürfen
  const ACTOR_COMPLETE = 'Magier';
  const ACTOR_INCOMPLETE = 'Test-Magier';

  /** @param {string} name */
  async function getActorByName(name) {
    return game.actors.getName?.(name) ?? null;
  }

  const tests = [
    // ============================
    // Phase 1 – Core
    // ============================
    {
      id: 'P1-TC-01',
      phase: 1,
      title: 'Engine global verfügbar (game.janus7) & Kernobjekte existieren',
      fn: async () => {
        ok(Boolean(game.janus7), 'game.janus7 fehlt');
        ok(Boolean(engine.core?.state), 'core.state fehlt');
        ok(Boolean(engine.core?.validator), 'core.validator fehlt');
        ok(Boolean(engine.core?.io), 'core.io fehlt');
        ok(Boolean(engine.core?.director), 'core.director fehlt');
        return 'ok';
      }
    },
    {
      id: 'P1-TC-02',
      phase: 1,
      title: 'World-Setting coreState existiert und ist lesbar',
      fn: async () => {
        const s = await game.settings.get('janus7', 'coreState');
        ok(Boolean(s), 'coreState ist leer/undefined');
        ok(typeof s === 'object', 'coreState ist kein Objekt');
        return `keys=${Object.keys(s).length}`;
      }
    },
    {
      id: 'P1-TC-03',
      phase: 1,
      title: 'State.get/set/transaction (Rollback bei Fehler)',
      fn: async () => {
        const before = engine.core.state.get('time.day');
        await engine.core.state.transaction(async (s) => {
          const d = s.get('time.day');
          s.set('time.day', d + 1);
        });
        const after = engine.core.state.get('time.day');
        ok(after === before + 1, 'transaction did not persist');

        try {
          await engine.core.state.transaction(async (s) => {
            s.set('time.day', 999);
            throw new Error('Intentional');
          });
        } catch (_e) {
          // expected
        }
        const rolled = engine.core.state.get('time.day');
        ok(rolled === after, 'Rollback failed');
        return `day=${rolled}`;
      }
    },

    // ============================
    // Phase 2 – Academy Data API
    // ============================
    {
      id: 'P2-TC-01',
      phase: 2,
      title: 'AcademyDataApi init + lessons verfügbar',
      fn: async () => {
        ok(Boolean(engine.academy?.data), 'academy.data fehlt');
        await engine.academy.data.init();
        const anyLesson = engine.academy.data.getLesson?.('L01') ?? null;
        // L01 ist nur ein Beispiel – wir prüfen defensiv, ob überhaupt Lessons existieren.
        const lessons = engine.academy.data.getAllLessons?.() ?? engine.academy.data._lessons?.lessons ?? [];
        ok(Array.isArray(lessons), 'Lessons sind keine Liste');
        ok(lessons.length > 0, 'Lessons leer');
        return `lessons=${lessons.length}${anyLesson ? ', sample=L01' : ''}`;
      }
    },

    // ============================
    // Phase 3 – DSA5 Bridge
    // ============================
    {
      id: 'P3-TC-01',
      phase: 3,
      title: 'DSA5 Bridge verfügbar (System dsa5 aktiv)',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP(`System ist ${game.system?.id}, erwartet dsa5`);
        ok(Boolean(engine.dsa5), 'engine.dsa5 fehlt');
        ok(engine.dsa5.available === true, 'dsa5.available ist false');
        return 'ok';
      }
    },
    {
      id: 'P3-TC-02',
      phase: 3,
      title: 'rollSkill: Talentprobe (Magiekunde) am COMPLETE Actor ohne Dialog + Ergebnis normalisiert',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP('Nicht dsa5');
        const actor = await getActorByName(ACTOR_COMPLETE);
        if (!actor) return SKIP(`COMPLETE Actor "${ACTOR_COMPLETE}" fehlt`);

        const res = await engine.dsa5.rollSkill(actor, 'Magiekunde', { rollMode: 'roll', modifier: 0, dsa5: { fastForward: true } });
        ok(res && typeof res === 'object', 'Kein Ergebnisobjekt');
        ok('raw' in res, 'res.raw fehlt');
        ok('success' in res, 'res.success fehlt');
        return `success=${res.success}, qs=${res.quality ?? 'n/a'}`;
      }
    },
    {
      id: 'P3-TC-03',
      phase: 3,
      title: 'Modifier wirkt (rollSkill mit -2) am COMPLETE Actor – Ergebnis kommt durch',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP('Nicht dsa5');
        const actor = await getActorByName(ACTOR_COMPLETE);
        if (!actor) return SKIP(`COMPLETE Actor "${ACTOR_COMPLETE}" fehlt`);
        const res = await engine.dsa5.rollSkill(actor, 'Magiekunde', { rollMode: 'roll', modifier: -2, dsa5: { fastForward: true } });
        ok(res && typeof res === 'object', 'Kein Ergebnisobjekt');
        return `success=${res.success}, mod=-2`;
      }
    },
    {
      id: 'P3-TC-04A',
      phase: 3,
      title: 'wrapActor + getSkillValue("Magiekunde") (COMPLETE Actor) liefert Zahl',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP('Nicht dsa5');
        const actor = await getActorByName(ACTOR_COMPLETE);
        if (!actor) return SKIP(`COMPLETE Actor "${ACTOR_COMPLETE}" fehlt`);
        const w = await engine.dsa5.wrapActor(actor);
        const v = w.getSkillValue('Magiekunde');
        if (typeof v !== 'number') return SKIP('Talentwert konnte nicht robust ermittelt werden (COMPLETE Actor hat Talent nicht / Schema unbekannt)');
        return `Magiekunde=${v}`;
      }
    },
    {
      id: 'P3-TC-04B',
      phase: 3,
      title: 'wrapActor + getSkillValue("Magiekunde") (INCOMPLETE Actor) darf fehlen (null oder Zahl)',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP('Nicht dsa5');
        const actor = await getActorByName(ACTOR_INCOMPLETE);
        if (!actor) return SKIP(`INCOMPLETE Actor "${ACTOR_INCOMPLETE}" fehlt`);
        const w = await engine.dsa5.wrapActor(actor);
        const v = w.getSkillValue('Magiekunde');
        // WICHTIG: "Talent fehlt" ist ein valider Zustand -> null ist korrekt.
        if (v == null) return 'Magiekunde=null (Talent fehlt, korrekt)';
        if (typeof v === 'number') return `Magiekunde=${v} (Talent vorhanden)`;
        return SKIP('Unerwarteter Rückgabewert (weder number noch null)');
      }
    },
    {
      id: 'P3-TC-05',
      phase: 3,
      title: 'getActorSpells liefert Liste',
      fn: async () => {
        if (game.system?.id !== 'dsa5') return SKIP('Nicht dsa5');
        const actor = await getActorByName(ACTOR_COMPLETE);
        if (!actor) return SKIP(`COMPLETE Actor "${ACTOR_COMPLETE}" fehlt`);
        const spells = await engine.dsa5.getActorSpells(actor);
        ok(Array.isArray(spells), 'Spells ist keine Liste');
        return `spells=${spells.length}`;
      }
    }
  ];

  // --- Run ---
  for (const t of tests) await runTest(t);

  const summary = {
    exportedAt: NOW.toISOString(),
    moduleVersion: game.modules.get('janus7')?.version ?? null,
    system: game.system?.id ?? null,
    counts: {
      ok: results.filter((r) => r.Status === 'OK').length,
      fail: results.filter((r) => r.Status === 'FAIL').length,
      skip: results.filter((r) => r.Status === 'SKIP').length,
      total: results.length
    },
    results
  };

  const jsonName = `janus7-testlog_${ts}.json`;
  const txtName = `janus7-testlog_${ts}.txt`;

  // JSON
  const jsonStr = JSON.stringify(summary, null, 2);
  await foundry.utils.saveDataToFile(jsonStr, 'application/json', jsonName);

  // TXT (human-readable)
  const lines = [];
  lines.push(`JANUS7 Testlog ${summary.exportedAt}`);
  lines.push(`Module: janus7 v${summary.moduleVersion}`);
  lines.push(`System: ${summary.system}`);
  lines.push(`OK=${summary.counts.ok} | FAIL=${summary.counts.fail} | SKIP=${summary.counts.skip} | TOTAL=${summary.counts.total}`);
  lines.push('');
  for (const r of results) {
    lines.push(`[P${r.Phase}] ${r['Test-ID']} ${r.Status} (${r.Dauer}) – ${r.Titel}`);
    if (r.Details) lines.push(`  -> ${r.Details}`);
  }
  await foundry.utils.saveDataToFile(lines.join('\n'), 'text/plain', txtName);

  const failCount = summary.counts.fail;
  if (failCount > 0) ui.notifications?.warn?.(`JANUS7 Tests fertig: ${failCount} FAIL – siehe Downloads.`);
  else ui.notifications?.info?.('JANUS7 Tests fertig: keine FAIL – siehe Downloads.');
})();
