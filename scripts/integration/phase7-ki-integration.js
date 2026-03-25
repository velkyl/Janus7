/**
 * Phase 7 KI Integration
 *
 * Attaches the KI export/import services and prompt templates to the
 * running JANUS7 engine. The actual work is performed by attachPhase7Ki().
 * The module also registers itself on janus7Ready and performs a best-effort
 * hot-reload attach when an engine already exists.
 */

import { JanusKiExportService } from '../../phase7/export/JanusKiExportService.js';
import { JanusKiImportService } from '../../phase7/import/JanusKiImportService.js';
import { JanusKiIoService } from '../../phase7/io/JanusKiIoService.js';
import { Prompts } from '../../phase7/ki/prompts.js';
import { HOOKS } from '../../core/hooks/topics.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';

export function attachPhase7Ki(engine) {
  if (!engine) return null;

  try {
    const logger = engine?.core?.logger;
    const state = engine?.core?.state;
    const validator = engine?.core?.validator;

    if (!engine.ki) engine.ki = {};

    // Reuse existing services on repeated attaches (hot reload / ensureKi).
    const services = engine._phase7KiServices ??= {};
    const academyData = engine?.academy?.data ?? null;

    services.exportService ??= new JanusKiExportService({ state, validator, logger, academyData, engine });
    services.importService ??= new JanusKiImportService({ state, validator, logger });
    services.ioService ??= new JanusKiIoService({ state, validator, logger, academyData, engine });

    // Export / import APIs
    engine.ki.exportBundle = (opts = {}) => services.exportService.exportBundle(opts);
    engine.ki.preflightImport = async (response, opts = {}) => services.importService.preflightImport(response, opts);
    engine.ki.previewImport = async (response, opts = {}) => services.importService.previewImport(response, opts);
    engine.ki.applyImport = async (response, opts = {}) => services.importService.applyImport(response, opts);
    engine.ki.exportToOutbox = async (opts = {}) => services.ioService.exportToOutbox(opts);
    engine.ki.importFromInbox = async (filename, opts = {}) => services.ioService.importFromInbox(filename, opts);
    engine.ki.getImportHistory = () => services.importService.getHistory();
    engine.ki.listBackups = async () => services.importService.listBackups();
    engine.ki.restoreBackup = async (fileRef, opts = {}) => services.importService.restoreBackup(fileRef, opts);
    engine.ki.prompts = Prompts;

    // Legacy alias: engine.ai.* delegates to engine.ki.* (Phase 7 SSOT)
    if (!engine.ai) engine.ai = {};
    Object.assign(engine.ai, {
      exportBundle: engine.ki.exportBundle,
      preflightImport: engine.ki.preflightImport,
      previewImport: engine.ki.previewImport,
      applyImport: engine.ki.applyImport,
      exportToOutbox: engine.ki.exportToOutbox,
      importFromInbox: engine.ki.importFromInbox,
      getImportHistory: engine.ki.getImportHistory,
      listBackups: engine.ki.listBackups,
      restoreBackup: engine.ki.restoreBackup,
      prompts: engine.ki.prompts,
    });

    // Mirror to game.janus7 convenience namespaces.
    if (typeof game !== 'undefined' && game?.janus7) {
      game.janus7.ki = game.janus7.ki ?? {};
      Object.assign(game.janus7.ki, engine.ki);
      game.janus7.ai = game.janus7.ai ?? {};
      Object.assign(game.janus7.ai, engine.ai);
    }

    logger?.debug?.('[JANUS7][Phase7] KI integration attached.');
    return engine.ki;
  } catch (err) {
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Phase7] KI integration failed', err);
    return null;
  }
}

if (typeof Hooks !== 'undefined') {
  registerRuntimeHook('janus7:ready:phase7-ki', HOOKS.ENGINE_READY, (engine) => {
    try { attachPhase7Ki(engine); } catch (_err) { /* already logged in attach */ }
  });
}

// Hot-reload / partial init safety.
try {
  if (globalThis.game?.janus7) attachPhase7Ki(globalThis.game.janus7);
} catch (_err) { /* noop */ }
