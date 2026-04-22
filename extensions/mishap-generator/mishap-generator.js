/**
 * @file extensions/mishap-generator/mishap-generator.js
 * @phase 8 (Extension — Mishap Generator)
 *
 * Patzer-Generator für Zauberei-Akademie.
 * Horcht auf createChatMessage, erkennt DSA5 Zauber-Patzer (rollBotch)
 * und zeigt dem SL einen gewichteten Zufalls-Patzer via JanusMishapDialog.
 *
 * Boot-Aufruf erfolgt aus scripts/janus.mjs (Phase 8 Block, Feature-Flag: mishapGenerator).
 */

import { getJanusCore } from '../../core/index.js';
import { fetchModuleJson } from '../../core/common.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';
import { HOOKS } from '../../core/hooks/topics.js';

// ─── Tabellen-Cache ──────────────────────────────────────────────────────────

let _mishapTable = null;

/**
 * Lädt die Patzertabelle aus data/academy/mishaps.json (gecacht).
 * @returns {Promise<Array>}
 */
export async function loadMishapTable() {
  if (_mishapTable) return _mishapTable;
  try {
    _mishapTable = await fetchModuleJson('data/academy/mishaps.json');
    if (!Array.isArray(_mishapTable)) _mishapTable = [];
  } catch (err) {
    _log('warn', 'Patzertabelle konnte nicht geladen werden.', err);
    _mishapTable = [];
  }
  return _mishapTable;
}

/**
 * Invalidiert den Tabellen-Cache (z.B. nach Hot-Reload).
 */
export function resetMishapTableCache() {
  _mishapTable = null;
}

// ─── Gewichteter Zufalls-Algorithmus ────────────────────────────────────────

/**
 * Wählt einen gewichteten Zufallseintrag aus der Tabelle.
 * @param {Array<{weight?: number}>} table
 * @returns {object|null}
 */
function pickWeighted(table) {
  if (!table?.length) return null;
  const total = table.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= (entry.weight ?? 1);
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}

/**
 * Würfelt einen Patzer aus der geladenen Tabelle.
 * @returns {Promise<object|null>}
 */
export async function rollMishap() {
  const table = await loadMishapTable();
  return pickWeighted(table);
}

// ─── Patzer-Erkennung aus DSA5 Chat-Message ─────────────────────────────────

async function handleChatMessage(message) {
  if (!game.user?.isGM) return;

  const dsa5 = message.flags?.dsa5;
  if (!dsa5) return;

  const isBotch = dsa5.rollBotch === true || message.content?.includes('botch');
  if (!isBotch) return;

  const item = dsa5.itemData;
  if (!item || (item.type !== 'spell' && item.type !== 'ritual')) return;

  const mishap = await rollMishap();
  if (!mishap) return;

  // State-Log: letzte 20 Patzer persistieren
  try {
    const { state } = getJanusCore();
    state.transaction(() => {
      const log = state.get('academy.mishaps.log') ?? [];
      log.unshift({
        id: mishap.id,
        timestamp: Date.now(),
        spellName: item.name ?? '?',
        actorName: message.speaker?.alias ?? '?',
      });
      state.set('academy.mishaps.log', log.slice(0, 20));
    });
  } catch (err) {
    _log('debug', 'State-Log fehlgeschlagen.', err);
  }

  // Kanonischer Hook
  Hooks.callAll(HOOKS.MISHAP_GENERATED, {
    mishap,
    spellName: item.name ?? null,
    actorName: message.speaker?.alias ?? null,
    messageId: message.id,
  });

  // Dialog öffnen (lazy import vermeidet zirkuläre Abhängigkeit ui→ext)
  try {
    const { JanusMishapDialog } = await import('../../ui/apps/JanusMishapDialog.js');
    JanusMishapDialog.showForMishap(mishap, {
      spellName: item.name ?? '—',
      actorName: message.speaker?.alias ?? '—',
    });
  } catch (err) {
    _log('warn', 'Dialog konnte nicht geöffnet werden.', err);
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────

/**
 * Registriert den Patzer-Generator.
 * Wird aus scripts/janus.mjs aufgerufen (Phase 8, Feature-Flag mishapGenerator).
 */
export function bootMishapGenerator() {
  // Globale Helfer für SL-Makros
  if (game.janus7) {
    game.janus7.rollMishap = rollMishap;
    game.janus7.openMishapLog = async () => {
      const { JanusMishapDialog } = await import('../../ui/apps/JanusMishapDialog.js');
      JanusMishapDialog.showSingleton();
    };
  }

  // Hot-Reload: Tabellen-Cache invalidieren wenn mishaps.json geändert wird
  Hooks.on('janus7.academy.data.reloaded', ({ path } = {}) => {
    if (path?.includes('mishaps')) resetMishapTableCache();
  });

  registerRuntimeHook(
    'janus7:mishap:create-chat-message',
    'createChatMessage',
    (message) => {
      handleChatMessage(message).catch((err) =>
        _log('warn', 'createChatMessage-Handler fehlgeschlagen.', err)
      );
    }
  );

  _log('info', 'Patzer-Generator aktiv (20 Einträge).');
}

// ─── Logger-Helfer ───────────────────────────────────────────────────────────

function _log(level, msg, err) {
  const logger = game?.janus7?.core?.logger ?? console;
  const text = `[JANUS7][Mishap] ${msg}`;
  if (err) logger[level]?.(text, err) ?? console[level]?.(text, err);
  else     logger[level]?.(text)      ?? console[level]?.(text);
}
