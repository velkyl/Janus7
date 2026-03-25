import { MODULE_ID } from '../../common.js';

function pathGet(root, path) {
  if (!root || !path) return undefined;
  const parts = String(path).split('.').filter(Boolean);
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function previewValue(value) {
  if (value == null) return 'null';
  if (typeof value === 'string') return value.length > 280 ? `${value.slice(0, 277)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return safeJson(value.slice(0, 6));
  if (typeof value === 'object') return safeJson(value);
  return String(value);
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'step';
}

function escapeJsString(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\\$');
}

function buildUserStep(id, label, options = {}) {
  return {
    id,
    type: 'user',
    label,
    help: options.help ?? '',
    buttonLabel: options.buttonLabel ?? 'Erledigt',
    capture: options.capture ?? null,
    consoleCommand: options.consoleCommand ?? null,
    consoleTitle: options.consoleTitle ?? null
  };
}

function buildActionStep(id, label, action, options = {}) {
  return {
    id,
    type: 'action',
    label,
    help: options.help ?? '',
    buttonLabel: options.buttonLabel ?? 'Ausführen',
    action,
    capture: options.capture ?? null,
    consoleCommand: options.consoleCommand ?? null,
    consoleTitle: options.consoleTitle ?? null
  };
}

function buildSnippet(title, code) {
  return { title, code: String(code ?? '').trim() };
}

const GROUP_CHECK_COMMAND = `await game.janus7.bridge.dsa5.showGroupCheckMessage({
  skillName: 'Magiekunde',
  modifier: -2,
  maxRolls: 3,
  targetQs: 6,
  label: 'Test-Prüfung Arkanologie'
})`;

const GUIDE_OVERRIDES = Object.freeze({
  'INT-TC-01': {
    openApp: 'academyOverview',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'state', label: 'State geladen', check: { type: 'stateLoaded' } },
      { id: 'overview-app', label: 'Academy Overview verfügbar', check: { type: 'uiAppExists', app: 'academyOverview' } }
    ],
    steps: [
      buildActionStep('open-overview', 'Academy Overview öffnen', { type: 'openApp', app: 'academyOverview' }, { buttonLabel: 'Academy Overview öffnen', consoleCommand: `game.janus7.ui.open('academyOverview')`, consoleTitle: 'Konsole — Academy Overview öffnen' }),
      buildUserStep('start-lesson', 'Lektion in der Oberfläche starten', { help: 'Wähle eine verfügbare Lektion und starte sie über die UI.' }),
      buildActionStep('capture-before', 'Aktiven Slot / Lektion inspizieren', { type: 'statePath', path: 'time' }, { buttonLabel: 'Time-State prüfen', consoleCommand: `game.janus7.core.state.getPath('time')`, consoleTitle: 'Konsole — Time-State anzeigen' }),
      buildUserStep('finish-lesson', 'Lektion abschließen', { help: 'Schließe die Lektion über den regulären UI-Flow ab.' }),
      buildActionStep('capture-score', 'Scoring-Snapshot erfassen', { type: 'statePath', path: 'scoring' }, { buttonLabel: 'Scoring prüfen', consoleCommand: `game.janus7.core.state.getPath('scoring')`, consoleTitle: 'Konsole — Scoring anzeigen' }),
      buildActionStep('capture-diagnostics', 'Diagnostics-Snapshot erfassen', { type: 'diagnosticsSnapshot' }, { buttonLabel: 'Diagnostics prüfen', consoleCommand: `game.janus7.diagnostics.report()`, consoleTitle: 'Konsole — Diagnostics Report' })
    ]
  },
  'INT-TC-02': {
    openApp: 'kiRoundtrip',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'state', label: 'State geladen', check: { type: 'stateLoaded' } },
      { id: 'ki-ui', label: 'KI-Roundtrip-UI verfügbar', check: { type: 'uiAppExists', app: 'kiRoundtrip' } }
    ],
    steps: [
      buildActionStep('open-roundtrip', 'KI Roundtrip öffnen', { type: 'openApp', app: 'kiRoundtrip' }, { buttonLabel: 'KI Roundtrip öffnen', consoleCommand: `game.janus7.ui.open('kiRoundtrip')`, consoleTitle: 'Konsole — KI Roundtrip öffnen' }),
      buildActionStep('bundle-preview', 'Aktuellen Bundle-Snapshot erfassen', { type: 'aiBundlePreview' }, { buttonLabel: 'Bundle-Vorschau', consoleCommand: `await game.janus7.ki.exportBundle()`, consoleTitle: 'Konsole — KI Bundle exportieren' }),
      buildUserStep('export', 'Export in der Oberfläche auslösen'),
      buildUserStep('edit', 'Exportdatei extern bearbeiten / simulieren'),
      buildUserStep('import', 'Bearbeitete Datei importieren'),
      buildActionStep('import-history', 'KI-Historie inspizieren', { type: 'kiHistory' }, { buttonLabel: 'KI-Historie prüfen', consoleCommand: `game.janus7.ki.getImportHistory()`, consoleTitle: 'Konsole — KI Historie' })
    ]
  },
  'INT-TC-03': {
    openApp: 'syncPanel',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'second-user', label: 'Mindestens 2 aktive Nutzer', check: { type: 'minUsers', min: 2 } }
    ],
    steps: [
      buildActionStep('open-sync-panel', 'Sync Panel öffnen', { type: 'openApp', app: 'syncPanel' }, { buttonLabel: 'Sync Panel öffnen', consoleCommand: `game.janus7.ui.open('syncPanel')`, consoleTitle: 'Konsole — Sync Panel öffnen' }),
      buildUserStep('second-client', 'Zweiten Client verbinden / aktiv halten', { help: 'Dieser Test benötigt einen zweiten aktiven Nutzer.' }),
      buildUserStep('change-state', 'State über UI oder Director ändern'),
      buildActionStep('capture-users', 'Aktive Nutzer prüfen', { type: 'connectedUsers' }, { buttonLabel: 'Nutzer prüfen', consoleCommand: `game.users.contents.map(u => ({name: u.name, active: u.active, isGM: u.isGM}))`, consoleTitle: 'Konsole — aktive Nutzer' }),
      buildUserStep('verify-sync', 'Im zweiten Client prüfen, ob der Zustand synchron ankommt')
    ]
  },
  'INT-TC-04': {
    openApp: 'controlPanel',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'beamer', label: 'Beamer-/Scene-Control-Kontext vorbereitet', check: { type: 'uiAppExists', app: 'controlPanel' } }
    ],
    steps: [
      buildActionStep('open-control-panel', 'Control Panel öffnen', { type: 'openApp', app: 'controlPanel' }, { buttonLabel: 'Control Panel öffnen', consoleCommand: `game.janus7.ui.openControlPanel()`, consoleTitle: 'Konsole — Control Panel öffnen' }),
      buildUserStep('open-beamer', 'Beamer-Ansicht / zweiten Screen vorbereiten'),
      buildUserStep('change-location', 'Location / Szene im Control Panel wechseln'),
      buildActionStep('capture-scene', 'Foundry Scene-Link prüfen', { type: 'statePath', path: 'foundryLinks' }, { buttonLabel: 'Scene-Links prüfen', consoleCommand: `game.janus7.core.state.getPath('foundryLinks')`, consoleTitle: 'Konsole — Scene Links' }),
      buildUserStep('verify-beamer', 'Beamer prüft neue Location / Szene')
    ]
  },
  'P4-TC-05': {
    openApp: 'scoringView',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'state', label: 'State geladen', check: { type: 'stateLoaded' } }
    ],
    steps: [
      buildActionStep('open-scoring', 'Scoring-Ansicht öffnen', { type: 'openApp', app: 'scoringView' }, { buttonLabel: 'Scoring öffnen', consoleCommand: `game.janus7.ui.open('scoringView')`, consoleTitle: 'Konsole — Scoring öffnen' }),
      buildActionStep('capture-before', 'Scoring vor dem Test erfassen', { type: 'statePath', path: 'scoring' }, { buttonLabel: 'Vorher prüfen', consoleCommand: `game.janus7.core.state.getPath('scoring')`, consoleTitle: 'Konsole — Scoring vorher' }),
      buildUserStep('complete-lesson', 'Lektion regulär abschließen'),
      buildActionStep('capture-after', 'Scoring nach dem Test erfassen', { type: 'statePath', path: 'scoring' }, { buttonLabel: 'Nachher prüfen', consoleCommand: `game.janus7.core.state.getPath('scoring')`, consoleTitle: 'Konsole — Scoring nachher' })
    ]
  },
  'P4B-TC-04': {
    openApp: 'commandCenter',
    preconditions: [
      { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
      { id: 'state', label: 'State geladen', check: { type: 'stateLoaded' } }
    ],
    steps: [
      buildActionStep('quest-snapshot', 'Aktive Quests erfassen', { type: 'activeQuestSummary' }, { buttonLabel: 'Queststatus prüfen', consoleCommand: `game.janus7.core.state.getPath('questStates')`, consoleTitle: 'Konsole — Queststatus' }),
      buildUserStep('save-world', 'Welt / State speichern'),
      buildUserStep('reload-world', 'Browser oder Welt neu laden'),
      buildActionStep('quest-snapshot-after', 'Queststatus nach Reload prüfen', { type: 'activeQuestSummary' }, { buttonLabel: 'Queststatus nach Reload', consoleCommand: `game.janus7.core.state.getPath('questStates')`, consoleTitle: 'Konsole — Queststatus nach Reload' })
    ]
  },
  'P6-TC-04': {
    openApp: 'shell',
    preconditions: [
      { id: 'nongm', label: 'Nicht-GM-Kontext erforderlich', check: { type: 'isNotGM' } }
    ],
    steps: [
      buildActionStep('open-shell', 'Shell öffnen', { type: 'openApp', app: 'shell' }, { buttonLabel: 'Shell öffnen', consoleCommand: `game.janus7.ui.open('shell')`, consoleTitle: 'Konsole — Shell öffnen' }),
      buildActionStep('user-context', 'Aktuellen User-Kontext erfassen', { type: 'currentUser' }, { buttonLabel: 'User-Kontext prüfen', consoleCommand: `({ id: game.user.id, name: game.user.name, isGM: game.user.isGM })`, consoleTitle: 'Konsole — User-Kontext' }),
      buildUserStep('trigger-gm-action', 'GM-only Aktion auslösen und Verhalten beobachten'),
      buildActionStep('diagnostics', 'Diagnostics-Snapshot erfassen', { type: 'diagnosticsSnapshot' }, { buttonLabel: 'Diagnostics prüfen', consoleCommand: `game.janus7.diagnostics.report()`, consoleTitle: 'Konsole — Diagnostics Report' })
    ]
  },
  'P3-TC-01': {
    openApp: 'commandCenter',
    preconditions: [
      { id: 'dsa5', label: 'DSA5 aktiv', check: { type: 'systemIs', system: 'dsa5' } },
      { id: 'roll-api', label: 'Roll-API verfügbar', check: { type: 'hasPath', path: 'janus7.bridge.dsa5.rolls' } }
    ],
    steps: [
      buildActionStep('open-command-center', 'Command Center öffnen', { type: 'openApp', app: 'commandCenter' }, { buttonLabel: 'Command Center öffnen', consoleCommand: `game.janus7.ui.open('commandCenter')`, consoleTitle: 'Konsole — Command Center öffnen' }),
      buildUserStep('prepare-actor', 'Test-Actor mit passendem Talent auswählen', { consoleCommand: `const actor = game.actors.contents.find(a => a.hasPlayerOwner);\nactor`, consoleTitle: 'Konsole — Test-Actor wählen' }),
      buildUserStep('run-roll', 'DSA5-Probe regulär auslösen'),
      buildActionStep('capture-last-chat', 'Letzte Chat-Nachricht prüfen', { type: 'latestChat' }, { buttonLabel: 'Chat prüfen', consoleCommand: `game.messages.contents.at(-1)`, consoleTitle: 'Konsole — Letzte Chat-Nachricht' }),
      buildActionStep('capture-diagnostics', 'Diagnostics-Snapshot erfassen', { type: 'diagnosticsSnapshot' }, { buttonLabel: 'Diagnostics prüfen', consoleCommand: `game.janus7.diagnostics.report()`, consoleTitle: 'Konsole — Diagnostics Report' })
    ]
  },
  'P3-GC-TC-01': {
    openApp: 'commandCenter',
    preconditions: [
      { id: 'dsa5', label: 'DSA5 aktiv', check: { type: 'systemIs', system: 'dsa5' } },
      { id: 'group-check-api', label: 'GroupCheck-Bridge verfügbar', check: { type: 'hasPath', path: 'janus7.bridge.dsa5.showGroupCheckMessage' } }
    ],
    steps: [
      buildActionStep('open-command-center', 'Command Center öffnen', { type: 'openApp', app: 'commandCenter' }, { buttonLabel: 'Command Center öffnen', consoleCommand: `game.janus7.ui.open('commandCenter')`, consoleTitle: 'Konsole — Command Center öffnen' }),
      buildActionStep('spawn-group-check', 'Gruppenprobe-Nachricht erzeugen', { type: 'groupCheckMessage', payload: { skillName: 'Magiekunde', modifier: -2, maxRolls: 3, targetQs: 6, label: 'Test-Prüfung Arkanologie' } }, { buttonLabel: 'Gruppenprobe erzeugen', consoleCommand: GROUP_CHECK_COMMAND, consoleTitle: 'Konsole — Gruppenprobe erzeugen' }),
      buildActionStep('capture-last-chat', 'Chat-Nachricht prüfen', { type: 'latestChat' }, { buttonLabel: 'Chat prüfen', consoleCommand: `game.messages.contents.at(-1)`, consoleTitle: 'Konsole — Letzte Chat-Nachricht' }),
      buildUserStep('click-roll', 'Im Chat auf den Würfel-Button klicken und Ergebnis prüfen'),
      buildActionStep('capture-after-roll', 'Chat nach Würfelwurf erneut prüfen', { type: 'latestChat' }, { buttonLabel: 'Chat erneut prüfen', consoleCommand: `game.messages.contents.at(-1)`, consoleTitle: 'Konsole — Letzte Chat-Nachricht nach Wurf' })
    ]
  }
});

function fallbackOpenAppFor(test) {
  const id = String(test?.id ?? '');
  if (id === 'INT-TC-02') return 'kiRoundtrip';
  if (id === 'INT-TC-03') return 'syncPanel';
  if (id === 'INT-TC-04') return 'controlPanel';
  if (id.startsWith('INT-TC') || id.startsWith('P6-')) return 'shell';
  if (id.startsWith('P4-TC-05')) return 'scoringView';
  if (id.startsWith('P4')) return 'academyOverview';
  if (id.startsWith('P5')) return 'atmosphereDJ';
  if (id.startsWith('P3')) return 'commandCenter';
  if (id.startsWith('SEC-') || id.startsWith('REG-') || id.startsWith('PERF-')) return 'testResults';
  return 'shell';
}

function inferOpenApp(override, steps, test) {
  if (override?.openApp) return override.openApp;
  const firstOpenApp = asList(steps).find((step) => step?.action?.type === 'openApp' && step?.action?.app)?.action?.app;
  return firstOpenApp ?? fallbackOpenAppFor(test);
}

function buildConsoleSnippetsForTest(test = {}, guide = {}) {
  const snippets = [];
  const testId = String(test?.id ?? '').trim();
  if (testId) {
    snippets.push(buildSnippet(
      'Konsole — diesen Guided-Test öffnen',
      `const test = game.janus7.test.registry.get('${escapeJsString(testId)}');\nawait game.janus7.test.openGuidedManualTests({ tests: [test] });`
    ));
  }
  if (guide?.openApp) {
    snippets.push(buildSnippet(
      `Konsole — passende UI öffnen (${guide.openApp})`,
      `game.janus7.ui.open('${escapeJsString(guide.openApp)}')`
    ));
  }
  for (const step of asList(guide.steps)) {
    if (step?.consoleCommand) {
      snippets.push(buildSnippet(step.consoleTitle || `Konsole — ${step.label}`, step.consoleCommand));
    }
  }
  for (const entry of asList(test?.snippets)) {
    if (entry?.code) snippets.push(buildSnippet(entry.title || 'Konsole', entry.code));
  }
  const deduped = [];
  const seen = new Set();
  for (const entry of snippets) {
    const key = `${entry.title}::${entry.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

export function buildGuideForTest(test = {}, engine = null) {
  const override = GUIDE_OVERRIDES[String(test?.id ?? '')] ?? {};
  const preconditions = override.preconditions?.length
    ? override.preconditions
    : [
        { id: 'gm', label: 'GM-Kontext aktiv', check: { type: 'isGM' } },
        { id: 'state', label: 'State geladen', check: { type: 'stateLoaded' } }
      ];

  const providedSteps = asList(test.steps).map((step, idx) => buildUserStep(`legacy-${idx + 1}-${slugify(step)}`, step));
  const fallbackApp = fallbackOpenAppFor(test);
  const steps = override.steps?.length
    ? override.steps
    : [
        buildActionStep('open-relevant-app', 'Relevante UI öffnen', { type: 'openApp', app: fallbackApp }, { buttonLabel: 'UI öffnen', consoleCommand: `game.janus7.ui.open('${escapeJsString(fallbackApp)}')`, consoleTitle: 'Konsole — passende UI öffnen' }),
        ...providedSteps,
        buildActionStep('diagnostics-snapshot', 'Diagnostics-Snapshot erfassen', { type: 'diagnosticsSnapshot' }, { buttonLabel: 'Diagnostics prüfen', consoleCommand: `game.janus7.diagnostics.report()`, consoleTitle: 'Konsole — Diagnostics Report' })
      ];

  const requires = asList(test.requires);
  const openApp = inferOpenApp(override, steps, test);
  const guide = {
    preconditions,
    steps,
    requires,
    openApp,
    engineVersion: engine?.version ?? null
  };
  guide.snippets = buildConsoleSnippetsForTest(test, guide);
  return guide;
}

export async function runGuidedCheck(check = {}, engine = null) {
  const type = String(check?.type ?? '').trim();
  try {
    switch (type) {
      case 'isGM': {
        const ok = game?.user?.isGM === true;
        return { ok, summary: ok ? 'GM aktiv' : 'Kein GM-Kontext', details: { user: game?.user?.name ?? null, isGM: game?.user?.isGM === true } };
      }
      case 'isNotGM': {
        const ok = game?.user?.isGM !== true;
        return { ok, summary: ok ? 'Nicht-GM aktiv' : 'Aktueller Nutzer ist GM', details: { user: game?.user?.name ?? null, isGM: game?.user?.isGM === true } };
      }
      case 'stateLoaded': {
        const loaded = Boolean(engine?.core?.state?.loaded ?? engine?.core?.state?.isLoaded ?? game?.janus7?.core?.state?.loaded);
        return { ok: loaded, summary: loaded ? 'State geladen' : 'State nicht geladen', details: { loaded } };
      }
      case 'uiAppExists': {
        const app = String(check?.app ?? '');
        const exists = Boolean(game?.janus7?.ui?.apps?.[app]);
        return { ok: exists, summary: exists ? `UI-App vorhanden: ${app}` : `UI-App fehlt: ${app}`, details: { app, exists } };
      }
      case 'systemIs': {
        const system = String(check?.system ?? '');
        const actual = game?.system?.id ?? null;
        return { ok: actual === system, summary: actual === system ? `System aktiv: ${actual}` : `System mismatch: ${actual}`, details: { expected: system, actual } };
      }
      case 'hasPath': {
        const path = String(check?.path ?? '');
        const actualPath = path.startsWith('janus7.') ? path.slice('janus7.'.length) : path;
        const value = pathGet(game?.janus7 ?? engine, actualPath);
        return { ok: value != null, summary: value != null ? `Pfad vorhanden: ${path}` : `Pfad fehlt: ${path}`, details: { path, type: typeof value } };
      }
      case 'minUsers': {
        const min = Number(check?.min ?? 2);
        const active = (game?.users?.contents ?? []).filter((u) => u?.active);
        return { ok: active.length >= min, summary: `${active.length}/${min} aktive Nutzer`, details: active.map((u) => ({ id: u.id, name: u.name, active: u.active, isGM: u.isGM })) };
      }
      default:
        return { ok: false, summary: `Unbekannter Check-Typ: ${type || 'n/a'}`, details: check };
    }
  } catch (error) {
    return { ok: false, summary: error?.message ?? 'Check fehlgeschlagen', details: { error: String(error?.stack ?? error), check } };
  }
}

export async function runGuidedAction(action = {}, engine = null) {
  const type = String(action?.type ?? '').trim();
  try {
    switch (type) {
      case 'openApp': {
        const app = String(action?.app ?? 'shell');
        const instance = game?.janus7?.ui?.open?.(app);
        return { ok: Boolean(instance), summary: `UI geöffnet: ${app}`, data: { app, rendered: Boolean(instance?.rendered) }, preview: `openApp(${app})` };
      }
      case 'statePath': {
        const path = String(action?.path ?? '');
        const state = engine?.core?.state;
        const value = state?.getPath?.(path) ?? state?.get?.(path) ?? pathGet(state, path);
        return { ok: true, summary: `State-Pfad ${path}`, data: value, preview: previewValue(value) };
      }
      case 'diagnosticsSnapshot': {
        const report = engine?.diagnostics?.report?.() ?? engine?.diagnostics?.snapshot?.() ?? null;
        return { ok: Boolean(report), summary: 'Diagnostics-Snapshot erfasst', data: report, preview: previewValue(report) };
      }
      case 'latestChat': {
        const messages = game?.messages?.contents ?? [];
        const last = messages.at?.(-1) ?? messages[messages.length - 1] ?? null;
        const data = last ? {
          id: last.id,
          speaker: last.speaker,
          flavor: last.flavor ?? '',
          content: last.content ?? ''
        } : null;
        return { ok: Boolean(last), summary: last ? 'Letzte Chat-Nachricht gefunden' : 'Keine Chat-Nachricht vorhanden', data, preview: previewValue(data) };
      }
      case 'activeQuestSummary': {
        const quests = engine?.core?.state?.getPath?.('questStates') ?? engine?.core?.state?.get?.('questStates') ?? {};
        const entries = Object.entries(quests).map(([id, value]) => ({ id, stage: value?.currentNode ?? null, status: value?.status ?? 'active' }));
        return { ok: true, summary: `${entries.length} Quest-Einträge`, data: entries, preview: previewValue(entries) };
      }
      case 'currentUser': {
        const data = { id: game?.user?.id ?? null, name: game?.user?.name ?? null, isGM: game?.user?.isGM === true };
        return { ok: true, summary: `${data.name ?? 'Unbekannt'} (${data.isGM ? 'GM' : 'Player'})`, data, preview: previewValue(data) };
      }
      case 'connectedUsers': {
        const data = (game?.users?.contents ?? []).map((u) => ({ id: u.id, name: u.name, active: u.active, isGM: u.isGM }));
        return { ok: data.length > 0, summary: `${data.length} Nutzer`, data, preview: previewValue(data) };
      }
      case 'kiHistory': {
        const history = engine?.ki?.history ?? engine?.ai?.history ?? engine?.phase7?.history ?? [];
        return { ok: true, summary: 'KI-Historie gelesen', data: history, preview: previewValue(history) };
      }
      case 'aiBundlePreview': {
        const bundle = await (engine?.ki?.exportBundle?.() ?? engine?.ai?.exportBundle?.());
        return { ok: Boolean(bundle), summary: 'KI-Bundle exportiert', data: bundle, preview: previewValue(bundle) };
      }
      case 'groupCheckMessage': {
        const payload = action?.payload ?? {};
        const msgId = await game?.janus7?.bridge?.dsa5?.showGroupCheckMessage?.(payload);
        return { ok: Boolean(msgId), summary: msgId ? `Gruppenprobe erzeugt (${msgId})` : 'Gruppenprobe konnte nicht erzeugt werden', data: { msgId, payload }, preview: previewValue({ msgId, payload }) };
      }
      default:
        return { ok: false, summary: `Unbekannter Action-Typ: ${type || 'n/a'}`, data: action, preview: previewValue(action) };
    }
  } catch (error) {
    return {
      ok: false,
      summary: error?.message ?? 'Aktion fehlgeschlagen',
      data: { error: String(error?.stack ?? error), action },
      preview: error?.message ?? 'Aktion fehlgeschlagen'
    };
  }
}

export function buildEvidenceRecord(kind, id, label, result) {
  return {
    ts: new Date().toISOString(),
    kind,
    id,
    label,
    ok: result?.ok === true,
    summary: result?.summary ?? '',
    preview: result?.preview ?? previewValue(result?.data ?? result?.details ?? null),
    payload: result?.data ?? result?.details ?? null
  };
}

export function summarizeManualDecision(manualResult = {}) {
  return {
    status: manualResult?.status ?? null,
    notes: manualResult?.notes ?? '',
    updatedAt: manualResult?.updatedAt ?? null,
    updatedBy: manualResult?.updatedBy ?? null
  };
}

export const GUIDED_HARNESS_VERSION = '1.1.0';
export const GUIDED_HARNESS_MODULE = MODULE_ID;
