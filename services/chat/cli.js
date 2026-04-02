/**
 * @file services/chat/cli.js
 * @module janus7
 * @phase services
 *
 * Zweck:
 * Chat-CLI für JANUS7.
 * Parst `/janus <verb> [args...]` aus dem Foundry-Chat und mappt auf
 * bestehende Command-Handler in `ui/commands/`.
 *
 * Architektur:
 * - Kein eigener Befehlssatz - delegiert vollständig auf vorhandene Commands.
 * - GM-only für mutative Aktionen (wird durch Commands selbst enforced).
 * - Keine UI-Dependency im Parser (kein ApplicationV2-Import).
 * - Registrierung über `Hooks.on('chatMessage', ...)` in scripts/janus.mjs.
 *
 * Syntax:
 *   /janus <verb> [param=wert] [param=wert] ...
 *
 * Beispiele:
 *   /janus help
 *   /janus time.advanceDay
 *   /janus time.advanceDay amount=3
 *   /janus scoring.addCirclePoints circleId=feuer delta=5 reason=test
 *   /janus state.saveState
 *   /janus system.runHealthCheck
 *   /janus atmosphere.applyMood moodId=studious
 *   /janus quest.startQuest questId=Q_DEMO_LIBRARY actorId=Actor.xxx
 *
 * Mapping (CLI verb -> Command-Key):
 * Punkte in Verben werden durchgereicht. Aliase decken flat-style ab.
 */

/** @private CLI-Präfix */
const PREFIX = '/janus';

/**
 * @typedef {object} JanusParsedChatCommand
 * @property {string} verb
 * @property {Record<string, string>} dataset
 */

/**
 * Flat-Alias-Map: CLI-Kürzel -> vollständiger Command-Schlüssel.
 * Erlaubt kurze Tippvarianten ohne Namespace-Prefix.
 *
 * @type {Record<string, string>}
 */
const ALIASES = {
  'slot': 'advanceSlot',
  'phase': 'advancePhase',
  'day': 'advanceDay',
  'reset': 'resetCalendar',
  'sync': 'syncCalendar',
  'save': 'saveState',
  'export': 'exportState',
  'health': 'runHealthCheck',
  'smoke': 'runSmokeTests',
  'diag': 'bridgeDiagnostics',
  'backup': 'createBackup',
  'mood': 'applyMood',
  'atmo': 'setAtmosphereEnabled',
  'volume': 'setAtmosphereVolume',
  'quest': 'startQuest',
  'panel': 'openConfigPanel',
};

/**
 * Parst einen einzelnen `/janus`-Chat-Befehl.
 *
 * @param {string} message - Vollständige Chat-Nachricht.
 * @returns {JanusParsedChatCommand|null}
 */
export function parseChatCommand(message) {
  const trimmed = (message ?? '').trim();
  if (!trimmed.toLowerCase().startsWith(PREFIX)) return null;

  const rest = trimmed.slice(PREFIX.length).trim();
  if (!rest) return { verb: 'help', dataset: {} };

  const parts = rest.split(/\s+/);
  const rawVerb = parts[0];
  const verb = ALIASES[rawVerb] ?? rawVerb;

  const dataset = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=');
    if (eq > 0) {
      dataset[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
    } else if (!dataset._arg0) {
      dataset._arg0 = parts[i];
    }
  }

  return { verb, dataset };
}

/**
 * Führt einen geparsten Chat-Befehl aus.
 * Delegiert auf `game.janus7.commands[verb]`.
 *
 * @param {JanusParsedChatCommand} parsed
 * @param {import('../../core/index.js').Janus7Engine|null|undefined} engine
 * @returns {Promise<void>}
 */
export async function executeCommand(parsed, engine) {
  const { verb, dataset } = parsed;
  const log = engine?.core?.logger ?? console;

  if (verb === 'help') {
    _printHelp(engine);
    return;
  }

  const commands = engine?.commands;
  if (!commands) {
    ui.notifications?.warn?.('[JANUS7] Commands nicht verfügbar (Phase 6 geladen?)');
    return;
  }

  const handler = commands[verb]
    ?? commands[verb.replace('.', '')]
    ?? _findInDomains(commands, verb);

  if (typeof handler !== 'function') {
    const msg = `[JANUS7] Unbekannter Befehl: "${verb}". Tippe /janus help für eine Übersicht.`;
    ui.notifications?.warn?.(msg);
    log.warn?.(msg);
    return;
  }

  try {
    const result = await handler(dataset);
    if (result?.success === false) {
      log.warn?.(`[JANUS7][CLI] Befehl "${verb}" fehlgeschlagen:`, result.error ?? result);
    } else {
      log.debug?.(`[JANUS7][CLI] Befehl "${verb}" erfolgreich`, result);
    }
  } catch (err) {
    log.error?.(`[JANUS7][CLI] Ausnahme bei "${verb}"`, err);
    ui.notifications?.error?.(`JANUS7 /${verb}: ${err.message}`);
  }
}

/**
 * Foundry `chatMessage` Hook-Handler.
 * Gibt `false` zurück wenn der Befehl konsumiert wurde (unterdrückt Chat-Ausgabe).
 *
 * @param {ChatLog} _log
 * @param {string} message
 * @param {ChatMessageDataConstructorData} _options
 * @returns {boolean|undefined}
 */
export function handleChatMessage(_log, message, _options) {
  const parsed = parseChatCommand(message);
  if (!parsed) return undefined;

  const engine = globalThis.game?.janus7;

  executeCommand(parsed, engine).catch((err) => {
    (engine?.core?.logger ?? console).error?.('[JANUS7][CLI] handleChatMessage error', err);
  });

  return false;
}

/**
 * Sucht einen Command-Handler in Domain-Gruppen.
 * Erlaubt sowohl `advanceDay` als auch `time.advanceDay`.
 * @private
 */
function _findInDomains(commands, verb) {
  if (verb.includes('.')) {
    const [domain, method] = verb.split('.', 2);
    const domainKey = `${domain}Commands`;
    return commands[domainKey]?.[method] ?? commands[domainKey]?.[(method[0].toUpperCase() + method.slice(1))];
  }

  const domainGroups = ['timeCommands', 'stateCommands', 'systemCommands',
    'questCommands', 'academyCommands', 'atmosphereCommands', 'phase7Commands'];
  for (const g of domainGroups) {
    const grp = commands[g];
    if (typeof grp?.[verb] === 'function') return grp[verb].bind(grp);
  }
  return null;
}

/**
 * Gibt eine Hilfe-Übersicht in die Konsole und als Notification aus.
 * @private
 */
function _printHelp(engine) {
  const lines = [
    '--- JANUS7 Chat-CLI -----------------------------------',
    'Syntax: /janus <verb> [param=wert ...]',
    '',
    'Zeit:',
    '  /janus time.advanceSlot [amount=N]',
    '  /janus time.advanceDay  [amount=N]',
    '  /janus day              [amount=N]   (Alias)',
    '  /janus time.resetCalendar',
    '',
    'State:',
    '  /janus save             (/janus state.saveState)',
    '  /janus export',
    '',
    'Scoring:',
    '  /janus scoring.addCirclePoints circleId=feuer delta=5 reason=Test',
    '',
    'Quests:',
    '  /janus quest.startQuest questId=Q_DEMO_LIBRARY actorId=Actor.xxx',
    '  /janus quest startQuest questId=...',
    '',
    'Lektion / Prüfung:',
    '  /janus lesson.start  lessonId=LES_Y1_T1_ARKAN_01',
    '  /janus lesson.clear',
    '  /janus lesson.status',
    '  /janus exam.start    examId=EXAM_MAG_BASICS_01',
    '  /janus exam.clear',
    '',
    'KI (Phase 7):',
    '  /janus ki.export         [mode=full|delta|social]',
    '  /janus ki.exportOutbox   [mode=full]',
    '  /janus ki.history',
    '',
    'Atmosphere:',
    '  /janus mood moodId=studious',
    '  /janus atmosphere.applyMood moodId=studious',
    '',
    'System:',
    '  /janus health  (/janus system.runHealthCheck)',
    '  /janus smoke   (/janus system.runSmokeTests)',
    '  /janus diag    (/janus system.bridgeDiagnostics)',
    '  /janus panel   (/janus system.openConfigPanel)',
    '-------------------------------------------------------',
  ];
  (engine?.core?.logger ?? console).info?.(lines.join('\n'));
  ui.notifications?.info?.('JANUS7 CLI: Hilfe in der Browser-Konsole ausgegeben.');
}
