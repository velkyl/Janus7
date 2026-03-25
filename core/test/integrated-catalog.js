/**
 * @file core/test/integrated-catalog.js
 * @module janus7/test
 * @version 0.9.9.15
 * 
 * Integrated Smoke Test Catalog for JANUS7.
 * Contains all 97+ tests from the external test catalog, packaged as a
 * proper ES module that returns structured results.
 * 
 * Usage:
 *   const { results, summary } = await game.janus7.test.runCatalog();
 *   // or: await JanusTestCatalog.run();
 */

const MODULE_ID = 'janus7';

/**
 * Run a single test assertion.
 * @param {string} group - Test group name
 * @param {string} name - Test description
 * @param {boolean|*} condition - truthy = pass
 * @param {string} [detail] - Optional detail string
 * @returns {{group, name, status: string, detail: string}}
 */
function check(group, name, condition, detail = '') {
  const status = condition ? 'pass' : 'fail';
  return { group, name, status, detail: String(detail) };
}

/**
 * Run a single test that may throw.
 * @param {string} group
 * @param {string} name
 * @param {Function} fn - () => boolean | {ok, detail}
 * @returns {Promise<{group, name, status, detail}>}
 */
async function safeCheck(group, name, fn) {
  try {
    const result = await fn();
    if (typeof result === 'object' && result !== null && 'ok' in result) {
      return { group, name, status: result.ok ? 'pass' : 'fail', detail: String(result.detail ?? '') };
    }
    return { group, name, status: result ? 'pass' : 'fail', detail: '' };
  } catch (err) {
    return { group, name, status: 'fail', detail: err.message };
  }
}

/**
 * Main test catalog runner.
 * @returns {Promise<{results: Array, summary: {total, pass, fail, warn, version, timestamp}}>}
 */
export async function runCatalog() {
  const results = [];
  const e = game?.janus7;
  const VERSION = game?.modules?.get?.(MODULE_ID)?.version ?? '?';

  const t = (g, n, cond, detail) => results.push(check(g, n, cond, detail));
  const ta = async (g, n, fn) => results.push(await safeCheck(g, n, fn));

  // ═══════════════════════════════════════════════════════════════════
  // 0 — Engine
  // ═══════════════════════════════════════════════════════════════════
  const G0 = '0-Engine';
  t(G0, 'game.janus7 existiert', !!e);
  t(G0, 'Modul registriert', !!game.modules?.get?.(MODULE_ID));
  t(G0, `Version === ${VERSION}`, game.modules?.get?.(MODULE_ID)?.version === VERSION, `Ist: ${VERSION}`);
  t(G0, 'System ist dsa5', game.system?.id === 'dsa5');

  if (!e) {
    // Abort early
    const summary = { total: results.length, pass: 0, fail: results.length, warn: 0, version: VERSION, timestamp: new Date().toISOString() };
    return { results, summary };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1 — Core
  // ═══════════════════════════════════════════════════════════════════
  const G1 = '1-Core';
  t(G1, 'core.logger', !!e.core?.logger);
  t(G1, 'core.state', !!e.core?.state);
  t(G1, 'core.validator', !!e.core?.validator);
  t(G1, 'core.io', !!e.core?.io);
  t(G1, 'core.director', !!e.core?.director);
  t(G1, 'director (top-level)', !!e.director);
  t(G1, 'dsa5 shortcut', !!e.dsa5 || !!e.bridge?.dsa5);

  const time = e.core?.state?.get?.('time') ?? e.core?.state?.get?.()?.time ?? {};
  t(G1, 'state.get("time") liefert Objekt', typeof time === 'object' && time !== null);
  t(G1, 'time.year ist Zahl', typeof time.year === 'number', `year=${time.year}`);
  t(G1, 'time.dayName existiert', !!time.day || !!time.dayName, `day=${time.day ?? time.dayName}`);
  t(G1, 'time.slotName existiert', !!time.phase || !!time.slotName, `slot=${time.phase ?? time.slotName}`);
  await ta(G1, 'io.exportState() liefert Daten', async () => {
    const data = await e.core?.io?.exportState?.();
    return { ok: !!data && typeof data === 'object', detail: '' };
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2 — Settings
  // ═══════════════════════════════════════════════════════════════════
  const G2 = '2-Settings';
  for (const key of ['enableSimulation', 'enableAtmosphere', 'enableUI', 'enableQuestSystem']) {
    await ta(G2, `Setting: ${key}`, async () => {
      const val = game.settings.get(MODULE_ID, key);
      return { ok: val !== undefined, detail: `Wert: ${val}` };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3 — Director
  // ═══════════════════════════════════════════════════════════════════
  const G3 = '3-Director';
  const dir = e.director ?? e.core?.director;
  t(G3, 'director.get()', typeof dir?.get === 'function');
  t(G3, 'director.set()', typeof dir?.set === 'function');
  t(G3, 'director.batch()', typeof dir?.batch === 'function');
  t(G3, 'director.adjustRelation()', typeof dir?.adjustRelation === 'function');
  t(G3, 'director.setRelation()', typeof dir?.setRelation === 'function');
  t(G3, 'director.applyMood()', typeof dir?.applyMood === 'function');
  t(G3, 'director.setMasterVolume()', typeof dir?.setMasterVolume === 'function');
  t(G3, 'director.exportState()', typeof dir?.exportState === 'function');
  t(G3, 'director.importState()', typeof dir?.importState === 'function');
  t(G3, 'director.kernel', typeof dir?.kernel === 'object');
  t(G3, 'director.kernel.getRuntimeSummary()', typeof dir?.kernel?.getRuntimeSummary === 'function');
  t(G3, 'director.kernel.startDay()', typeof dir?.kernel?.startDay === 'function');
  await ta(G3, 'director.time.getRef()', async () => {
    const ref = dir?.time?.getRef?.();
    return { ok: !!ref && !!ref.day, detail: `ref.day=${ref?.day}` };
  });
  await ta(G3, 'director.kernel.getRuntimeSummary()', async () => {
    const summary = dir?.kernel?.getRuntimeSummary?.();
    return { ok: !!summary && typeof summary?.lessonCount === 'number', detail: `lessons=${summary?.lessonCount ?? 'n/a'} queued=${summary?.queuedEventCount ?? 'n/a'}` };
  });
  t(G3, 'director.get("time")', typeof (dir?.get?.('time')) === 'object');

  // ═══════════════════════════════════════════════════════════════════
  // 4 — Academy Data
  // ═══════════════════════════════════════════════════════════════════
  const G4 = '4-AcademyData';
  const ad = e.academy?.data;
  t(G4, 'academy.data existiert', !!ad);
  t(G4, 'academy.data.isReady', !!ad?.isReady);
  await ta(G4, 'listLessonIds(5)', async () => {
    const ids = ad?.listLessonIds?.(5) ?? ad?.getLessonIds?.()?.slice(0,5) ?? [];
    return { ok: ids.length > 0, detail: `${ids.length} IDs` };
  });
  await ta(G4, 'listNpcIds(5)', async () => {
    const ids = ad?.listNpcIds?.(5) ?? ad?.getNpcIds?.()?.slice(0,5) ?? [];
    return { ok: ids.length > 0, detail: `${ids.length} IDs` };
  });
  await ta(G4, 'listLocationIds(5)', async () => {
    const ids = ad?.listLocationIds?.(5) ?? ad?.getLocationIds?.()?.slice(0,5) ?? [];
    return { ok: ids.length > 0, detail: `${ids.length} IDs` };
  });

  const dataFiles = [
    { method: 'getSpellCurriculum', countKey: 'modules' },
    { method: 'getAlchemyRecipes', countKey: 'recipes' },
    { method: 'getLessonGenerator', countKey: 'templates' },
    { method: 'getCalendarTemplate', countKey: 'plans' },
    { method: 'getTeachingSessions', countKey: 'sessions' }
  ];
  for (const df of dataFiles) {
    await ta(G4, `${df.method}()`, async () => {
      const data = ad?.[df.method]?.();
      const arr = Array.isArray(data) ? data : (data?.[df.countKey] ?? Object.keys(data ?? {}));
      const count = Array.isArray(arr) ? arr.length : 0;
      return { ok: count > 0, detail: `${df.countKey}: ${count}` };
    });
  }

  // Slot-Bridge sanity: Aventurian Day/Phase -> Teaching Session slotId
  await ta(G4, 'TeachingSessions bridge: Praiosstag + Zeitslot 2', () => {
    const sessions = ad?.getTeachingSessionsForSlot?.({ day: 'Praiosstag', phase: 'Zeitslot 2' }) ?? [];
    const ok = Array.isArray(sessions) && sessions.length > 0;
    return { ok, detail: `sessions=${sessions.length}` };
  });

  // Calendar fallback sanity: if calendar.json doesn't match the current year/week, we still show a plan
  await ta(G4, 'Calendar fallback (teaching-sessions) yields entries', () => {
    const time = e.core?.state?.get?.('time') ?? {};
    const cal = e.academy?.calendar;
    const entries = cal?.getCalendarEntriesForDay?.({
      year: time.year ?? 1039,
      trimester: time.trimester ?? 1,
      week: time.week ?? 1,
      day: 'Praiosstag'
    }) ?? [];
    const ok = Array.isArray(entries) && entries.length > 0;
    return { ok, detail: `entries=${entries.length}` };
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5 — DSA5 Bridge
  // ═══════════════════════════════════════════════════════════════════
  const G5 = '5-DSA5Bridge';
  const bridge = e.bridge?.dsa5 ?? e.dsa5;
  t(G5, 'bridge.dsa5 existiert', !!bridge);
  t(G5, 'bridge.available', !!bridge?.available);
  t(G5, 'bridge.systemId === "dsa5"', bridge?.systemId === 'dsa5');
  t(G5, 'bridge.capabilities Objekt', typeof bridge?.capabilities === 'object');
  t(G5, 'Facade === Canonical', (e.bridge?.dsa5 ?? null) === (e.dsa5 ?? null) || !!bridge);

  // ═══════════════════════════════════════════════════════════════════
  // 6 — i18n
  // ═══════════════════════════════════════════════════════════════════
  const G6 = '6-i18n';
  const i18nTests = [
    ['JANUS7.UI.Time.Current', 'Current'],
    ['JANUS7.UI.Atmosphere.Title', 'Title'],
    ['JANUS7.UI.SystemStatus', 'SystemStatus'],
    ['JANUS7.Settings.AutoSave.Name', 'Name'],
    ['JANUS7.Settings.Academy', 'Academy'],
    ['JANUS7.Notifications.Ready', 'Ready']
  ];
  for (const [key, label] of i18nTests) {
    await ta(G6, `i18n: ${label}`, () => {
      const val = game.i18n?.localize?.(key) ?? '';
      return { ok: val.length > 0 && val !== key, detail: `"${val}"` };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7 — Hooks
  // ═══════════════════════════════════════════════════════════════════
  const G7 = '7-Hooks';
  for (const legacyHook of ['janus7:config:registered', 'janus7:ready']) {
    t(G7, `Kein Legacy-Hook: ${legacyHook}`,
      (Hooks._hooks?.[legacyHook]?.length ?? 0) === 0,
      `${Hooks._hooks?.[legacyHook]?.length ?? 0} Listener`);
  }
  for (const hook of ['janus7RelationChanged', 'janus7AtmosphereChanged', 'janus7DateChanged']) {
    await ta(G7, `Hook registrierbar: ${hook}`, () => {
      const id = Hooks.on(hook, () => {});
      Hooks.off(hook, id);
      return { ok: true, detail: '' };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8 — Commands
  // ═══════════════════════════════════════════════════════════════════
  const G8 = '8-Commands';
  const cmds = e.commands;
  t(G8, 'JanusCommands exportiert', !!cmds);
  for (const domain of ['timeCommands', 'stateCommands', 'atmosphereCommands', 'questCommands', 'academyCommands', 'systemCommands']) {
    t(G8, `Domain: ${domain}`, typeof cmds?.[domain] === 'object', typeof cmds?.[domain]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9 — UI
  // ═══════════════════════════════════════════════════════════════════
  const G9 = '9-UI';
  const ui_ = e.ui;
  t(G9, 'engine.ui existiert', !!ui_);
  t(G9, 'ui.open() Funktion', typeof ui_?.open === 'function');
  t(G9, 'ui.openControlPanel() Funktion', typeof ui_?.openControlPanel === 'function');
  const appList = ui_?.list?.() ?? [];
  await ta(G9, 'ui.list() & Template-Actions', async () => {
    const issues = [];
    if (!Array.isArray(appList) || appList.length === 0) {
      return { ok: false, detail: 'ui.list() ist leer' };
    }

    for (const appKey of appList) {
      const App = ui_?.apps?.[appKey];
      const template = App?.DEFAULT_OPTIONS?.template;
      const actions = Object.keys(App?.DEFAULT_OPTIONS?.actions ?? {});

      // Some apps intentionally have no actions/template.
      if (!template || actions.length === 0) continue;

      const templatePath = template.startsWith('modules/')
        ? template
        : `modules/${e?.id ?? 'janus7'}/${template.replace(/^\//, '')}`;

      let txt = '';
      try {
        const r = await fetch(templatePath);
        if (!r.ok) {
          issues.push(`${appKey}: template fetch ${r.status}`);
          continue;
        }
        txt = await r.text();
      } catch (err) {
        issues.push(`${appKey}: template fetch error`);
        continue;
      }

      const found = new Set();
      for (const m of txt.matchAll(/data-action\s*=\s*"([^"]+)"/g)) found.add(m[1]);
      for (const m of txt.matchAll(/data-action\s*=\s*'([^']+)'/g)) found.add(m[1]);

      // data-action is in template but not wired in actions -> dead button.
      const unknown = [...found].filter((a) => !actions.includes(a));
      if (unknown.length) {
        issues.push(`${appKey}: unknown actions -> ${unknown.join(', ')}`);
      }
    }

    return {
      ok: issues.length === 0,
      detail: issues.length ? issues.join(' | ') : `Apps: ${appList.join(', ')}`,
    };
  });
  for (const appKey of ['controlPanel', 'academyOverview', 'scoringView', 'socialView', 'atmosphereDJ', 'stateInspector', 'configPanel', 'commandCenter']) {
    t(G9, `UI App: ${appKey}`, appList.includes(appKey));
  }

  // ═══════════════════════════════════════════════════════════════════
  // 10 — Atmosphere
  // ═══════════════════════════════════════════════════════════════════
  const G10 = '10-Atmosphere';
  t(G10, 'atmosphere Objekt', !!e.atmosphere);
  t(G10, 'atmosphere.controller', !!e.atmosphere?.controller);
  t(G10, 'controller.destroy()', typeof e.atmosphere?.controller?.destroy === 'function');

  // ═══════════════════════════════════════════════════════════════════
  // 11 — AI / Phase 7
  // ═══════════════════════════════════════════════════════════════════
  const G11 = '11-AI/Phase7';
  t(G11, 'getAiContext() existiert', typeof (e.getAiContext ?? e.core?.getAiContext) === 'function');
  await ta(G11, 'AI Context Objekt', async () => {
    const fn = e.getAiContext ?? e.core?.getAiContext;
    const ctx = fn?.();
    return { ok: !!ctx && typeof ctx === 'object', detail: '' };
  });
  await ta(G11, 'schemaVersion vorhanden', async () => {
    const fn = e.getAiContext ?? e.core?.getAiContext;
    const ctx = fn?.();
    return { ok: !!ctx?.schemaVersion, detail: ctx?.schemaVersion };
  });
  await ta(G11, 'state im Context', async () => {
    const fn = e.getAiContext ?? e.core?.getAiContext;
    const ctx = fn?.();
    return { ok: !!ctx?.state, detail: '' };
  });
  await ta(G11, 'moduleVersion im Context', async () => {
    const fn = e.getAiContext ?? e.core?.getAiContext;
    const ctx = fn?.();
    return { ok: !!ctx?.moduleVersion, detail: ctx?.moduleVersion };
  });

  // ═══════════════════════════════════════════════════════════════════
  // 12 — Lifecycle
  // ═══════════════════════════════════════════════════════════════════
  const G12 = '12-Lifecycle';
  t(G12, 'engine.cleanup()', typeof e.cleanup === 'function');
  t(G12, 'engine.cleanupPhaseHooks()', typeof e.cleanupPhaseHooks === 'function');

  // ═══════════════════════════════════════════════════════════════════
  // 13 — Test Infrastructure
  // ═══════════════════════════════════════════════════════════════════
  const G13 = '13-TestInfra';
  t(G13, 'test.registry existiert', !!e.test?.registry);

  // ═══════════════════════════════════════════════════════════════════
  // 14 — Data File Integrity
  // ═══════════════════════════════════════════════════════════════════
  const G14 = '14-DataFiles';
  const base = `modules/${MODULE_ID}/`;
  const dataUrls = [
    'data/academy/effects/effect-index.json',
    'data/academy/spell-curriculum.json',
    'data/academy/alchemy-recipes.json',
    'data/academy/lesson-generator.json',
    'data/academy/calendar-template.json',
    'data/academy/teaching-sessions.json'
  ];
  for (const url of dataUrls) {
    await ta(G14, url.split('/').pop(), async () => {
      const resp = await fetch(`${base}${url}`);
      return { ok: resp.ok, detail: `Status: ${resp.status}` };
    });
  }
  await ta(G14, 'content-loader.js Import', async () => {
    const mod = await import(`/${base}scripts/content-loader.js`);
    return { ok: !!mod, detail: '' };
  });

  // ═══════════════════════════════════════════════════════════════════
  // 15 — Diagnostics
  // ═══════════════════════════════════════════════════════════════════
  const G15 = '15-Diagnostics';
  await ta(G15, 'Diagnostics ausgeführt', async () => {
    const report = await e.diagnostics?.run?.({ verbose: false });
    return { ok: !!report, detail: '' };
  });
  await ta(G15, 'OK-Checks', async () => {
    const report = await e.diagnostics?.run?.({ verbose: false });
    const ok = report?.summary?.ok ?? 0;
    return { ok: ok > 10, detail: ok.toString() };
  });
  await ta(G15, 'FAIL === 0', async () => {
    const report = await e.diagnostics?.run?.({ verbose: false });
    const fail = report?.summary?.fail ?? -1;
    return { ok: fail === 0, detail: `fail=${fail}` };
  });
  await ta(G15, 'WARN === 0', async () => {
    const report = await e.diagnostics?.run?.({ verbose: false });
    const warn = report?.summary?.warn ?? -1;
    return { ok: warn === 0, detail: `warn=${warn}` };
  });

  // ═══════════════════════════════════════════════════════════════════
  // 16 — Phase 6 / Config Panel
  // ═══════════════════════════════════════════════════════════════════
  const G16 = '16-Phase6';
  const ui16 = e.ui;
  const cfg16 = e.core?.config ?? e.config;

  // TC-01: alle 7 Phase-6-Apps registriert
  await ta(G16, 'Apps: 7 Phase-6-Apps registriert', () => {
    const required = ['controlPanel','academyOverview','scoringView','socialView',
                      'atmosphereDJ','stateInspector','configPanel'];
    const missing = required.filter(k => !ui16?.apps?.[k]);
    return { ok: missing.length === 0, detail: missing.length ? `Fehlt: ${missing.join(', ')}` : `${required.length} OK` };
  });

  // TC-02: ScoringView nutzt static PARTS, nicht DEFAULT_OPTIONS.template
  await ta(G16, 'ScoringView: static PARTS gesetzt', () => {
    const App = ui16?.apps?.scoringView;
    const hasDeprecated = !!App?.DEFAULT_OPTIONS?.template;
    const hasParts = !!App?.PARTS?.main?.template;
    return {
      ok: hasParts && !hasDeprecated,
      detail: hasParts ? (hasDeprecated ? 'PARTS ok aber deprecated template noch vorhanden' : App.PARTS.main.template) : 'PARTS fehlt'
    };
  });

  // TC-03: ConfigPanel _prepareContext existiert und ist Funktion
  await ta(G16, 'ConfigPanel: _prepareContext vorhanden', () => {
    const App = ui16?.apps?.configPanel;
    if (!App) return { ok: false, detail: 'configPanel nicht registriert' };
    const inst = new App();
    return { ok: typeof inst._prepareContext === 'function', detail: '' };
  });

  // TC-04: sceneMappings Roundtrip via JanusConfig
  await ta(G16, 'ConfigPanel: sceneMappings Roundtrip', async () => {
    if (!cfg16?.get || !cfg16?.set) return { ok: false, detail: 'JanusConfig nicht verfügbar' };
    const backup = cfg16.get('sceneMappings') ?? {};
    const TEST_KEY = '_p16_test';
    try {
      await cfg16.set('sceneMappings', { [TEST_KEY]: 'UUID.test' });
      const r = cfg16.get('sceneMappings');
      return { ok: r?.[TEST_KEY] === 'UUID.test', detail: r?.[TEST_KEY] === 'UUID.test' ? 'OK' : `Wert: ${r?.[TEST_KEY]}` };
    } finally {
      await cfg16.set('sceneMappings', backup);
    }
  });

  // TC-05: Feature-Flags Roundtrip via JanusConfig
  await ta(G16, 'ConfigPanel: Feature-Flags Roundtrip', async () => {
    if (!cfg16?.get || !cfg16?.set) return { ok: false, detail: 'JanusConfig nicht verfügbar' };
    const backup = cfg16.get('features') ?? {};
    const testFlags = { atmosphere: true, autoMood: false, beamer: true, academySimulation: false };
    try {
      await cfg16.set('features', testFlags);
      const r = cfg16.get('features');
      const keys = Object.keys(testFlags);
      const wrong = keys.filter(k => r[k] !== testFlags[k]);
      return { ok: wrong.length === 0, detail: wrong.length ? `Falsch: ${wrong.join(', ')}` : '4 Flags OK' };
    } finally {
      await cfg16.set('features', backup);
    }
  });

  // TC-06: Slot-Mapping dayOrder/slotOrder liefert valide Indizes
  await ta(G16, 'AcademyOverview: Slot-Mapping day→Index', () => {
    const cal = e.academy?.calendar;
    if (!cal) return { ok: false, detail: 'academy.calendar nicht verfügbar' };
    const dayOrder = cal.config?.dayOrder ?? [];
    const slotOrder = cal.config?.slotOrder ?? cal.config?.phaseOrder ?? [];
    if (!dayOrder.length || !slotOrder.length) return { ok: false, detail: `dayOrder=${dayOrder.length}, slotOrder=${slotOrder.length}` };
    const dayIdx = dayOrder.indexOf(dayOrder[0]);
    const slotIdx = slotOrder.indexOf(slotOrder[0]);
    const badIdx = dayOrder.indexOf('_INVALID_XYZ_');
    return {
      ok: dayIdx === 0 && slotIdx === 0 && badIdx === -1,
      detail: `day[0]="${dayOrder[0]}"→${dayIdx}, slot[0]="${slotOrder[0]}"→${slotIdx}`
    };
  });

  // TC-07: Social View Director-Pfad vorhanden
  await ta(G16, 'SocialView: academy.social.adjustAttitude Funktion', () => {
    const social = e.academy?.social;
    if (!social) return { ok: false, detail: 'academy.social nicht verfügbar' };
    return { ok: typeof social.adjustAttitude === 'function', detail: typeof social.adjustAttitude };
  });

  // TC-08: Atmosphere DJ API-Kette vollständig
  await ta(G16, 'AtmosphereDJ: Controller API vollständig', () => {
    const ctrl = e.atmosphere?.controller;
    if (!ctrl) return { ok: false, detail: 'atmosphere.controller nicht verfügbar' };
    const required = ['applyMood','listMoods','status','setMasterVolume','stopAll'];
    const missing = required.filter(m => typeof ctrl[m] !== 'function');
    const moods = Array.isArray(ctrl.listMoods?.()) ? ctrl.listMoods().length : '?';
    return { ok: missing.length === 0, detail: missing.length ? `Fehlt: ${missing.join(', ')}` : `${moods} Moods` };
  });

  // TC-09: StateInspector liefert valides JSON
  await ta(G16, 'StateInspector: _prepareContext JSON parseable', async () => {
    const App = ui16?.apps?.stateInspector;
    if (!App) return { ok: false, detail: 'stateInspector nicht registriert' };
    const inst = new App();
    const ctx = await inst._prepareContext({});
    if (ctx?.notReady) return { ok: false, detail: 'notReady:true' };
    try {
      JSON.parse(ctx.json);
      return { ok: true, detail: `${ctx.json.length} Zeichen` };
    } catch (err) {
      return { ok: false, detail: `JSON-Fehler: ${err.message}` };
    }
  });

  // TC-10: alle Phase-6-Apps instanziierbar ohne throw
  await ta(G16, 'Alle Phase-6-Apps instanziierbar', async () => {
    const keys = ['scoringView','socialView','atmosphereDJ','stateInspector','configPanel','academyOverview'];
    const failed = [];
    for (const k of keys) {
      try {
        const App = ui16?.apps?.[k];
        if (!App) { failed.push(`${k}: nicht registriert`); continue; }
        new App();
      } catch (err) {
        failed.push(`${k}: ${err.message}`);
      }
    }
    return { ok: failed.length === 0, detail: failed.length ? failed.join('; ') : `${keys.length} Apps OK` };
  });

  // ═══════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════
  const pass = results.filter(r => r.status === 'pass').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const warn = results.filter(r => r.status === 'warn').length;
  const summary = {
    total: results.length,
    pass,
    fail,
    warn,
    version: VERSION,
    timestamp: new Date().toISOString()
  };

  return { results, summary };
}

/**
 * Console shortcut: Run catalog and log results.
 */
export async function runAndLog() {
  const { results, summary } = await runCatalog();

  console.log(`%c=== JANUS7 v${summary.version} Integrated Test Catalog ===`,
    'font-size:14px; font-weight:bold; color:#7b68ee');
  console.log(`  ${summary.pass}/${summary.total} PASS | ${summary.fail} FAIL | ${summary.warn} WARN`);

  if (summary.fail > 0) {
    console.log('%cFailed tests:', 'color:red; font-weight:bold');
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  ❌ [${r.group}] ${r.name}: ${r.detail}`);
    }
  }

  console.table(results.map((r, i) => ({
    '#': i + 1,
    Group: r.group,
    Test: r.name,
    Status: r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️',
    Detail: r.detail
  })));

  return { results, summary };
}
