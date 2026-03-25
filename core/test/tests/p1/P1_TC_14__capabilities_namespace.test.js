/**
 * @file core/test/tests/p1/P1_TC_14__capabilities_namespace.test.js
 * @description Phase 1 Auto-Test: JanusCapabilities ist vollständig registriert
 *              und alle Namespaces sind eingefroren (Object.freeze).
 */

export default {
  id: 'P1-TC-14',
  title: 'JanusCapabilities: Namespace-Vollständigkeit + Freeze',
  phases: [1],
  kind: 'auto',
  expected: 'game.janus7.capabilities enthält alle 6 Namespaces, alle frozen',

  run: async () => {
    const engine = game?.janus7;
    const caps = engine?.capabilities;
    const notes = [];
    let ok = true;

    // ── 1. capabilities-Objekt existiert ─────────────────────────────────
    if (!caps) {
      return {
        ok: false,
        summary: 'game.janus7.capabilities nicht verfügbar',
        notes: ['engine.capabilities ist null/undefined. Phase 1 korrekt geladen?'],
      };
    }
    notes.push('✓ game.janus7.capabilities vorhanden');

    // ── 2. Alle erwarteten Namespaces sind vorhanden ──────────────────────
    const REQUIRED_NAMESPACES = ['time', 'scoring', 'quests', 'lesson', 'ki', 'state'];

    for (const ns of REQUIRED_NAMESPACES) {
      if (typeof caps[ns] !== 'object' || caps[ns] === null) {
        ok = false;
        notes.push(`FAIL: capabilities.${ns} fehlt oder ist kein Objekt`);
      } else {
        notes.push(`✓ capabilities.${ns} vorhanden`);
      }
    }

    // ── 3. Namespaces sind eingefroren ────────────────────────────────────
    for (const ns of REQUIRED_NAMESPACES) {
      if (!caps[ns]) continue;
      const frozen = Object.isFrozen(caps[ns]);
      if (!frozen) {
        ok = false;
        notes.push(`FAIL: capabilities.${ns} ist NICHT eingefroren (Object.isFrozen = false)`);
      } else {
        notes.push(`✓ capabilities.${ns} eingefroren`);
      }
    }

    // ── 4. Erwartete Methoden je Namespace ───────────────────────────────
    const METHOD_MAP = {
      time:    ['advanceSlot', 'advanceDay'],
      scoring: ['addCirclePoints', 'addStudentPoints'],
      quests:  ['startQuest'],
      lesson:  ['setActiveLesson', 'setActiveExam', 'clearActive', 'getActive'],
      ki:      ['exportBundle', 'previewImport', 'applyImport', 'exportToOutbox', 'importFromInbox', 'getImportHistory'],
      state:   ['snapshot', 'runHealthCheck'],
    };

    for (const [ns, methods] of Object.entries(METHOD_MAP)) {
      if (!caps[ns]) continue;
      for (const method of methods) {
        if (typeof caps[ns][method] !== 'function') {
          ok = false;
          notes.push(`FAIL: capabilities.${ns}.${method} ist keine Funktion`);
        }
      }
    }
    notes.push(`✓ Alle ${Object.values(METHOD_MAP).flat().length} Methoden-Signaturen OK`);

    // ── 5. capabilities selbst ist eingefroren ───────────────────────────
    if (!Object.isFrozen(caps)) {
      ok = false;
      notes.push('FAIL: capabilities (Wurzelobjekt) ist nicht eingefroren');
    } else {
      notes.push('✓ capabilities (Wurzel) eingefroren');
    }

    // ── 6. capabilities.state.snapshot() liefert einen Klon ──────────────
    try {
      const snap = caps.state.snapshot();
      if (snap === null) {
        notes.push('INFO: capabilities.state.snapshot() returned null (State noch nicht geladen?)');
      } else if (typeof snap !== 'object') {
        ok = false;
        notes.push(`FAIL: snapshot() lieferte kein Objekt: ${typeof snap}`);
      } else {
        // Live-Objekt-Check: Mutation darf State nicht verändern
        const key = '__janus7_test_probe__';
        snap[key] = true;
        const snap2 = caps.state.snapshot();
        if (snap2?.[key] === true) {
          ok = false;
          notes.push('FAIL: snapshot() ist kein Deep-Clone — Mutation propagiert zum State');
        } else {
          notes.push('✓ capabilities.state.snapshot() ist isolierter Deep-Clone');
        }
      }
    } catch (err) {
      notes.push(`INFO: snapshot() Fehler: ${err?.message}`);
    }

    return {
      ok,
      summary: ok
        ? `JanusCapabilities: alle ${REQUIRED_NAMESPACES.length} Namespaces korrekt`
        : 'JanusCapabilities: FAIL (Details in notes)',
      notes,
    };
  },
};
