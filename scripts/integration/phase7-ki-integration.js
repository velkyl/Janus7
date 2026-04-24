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
import { JanusKnowledgeBridge } from '../../phase7/ki/knowledge-bridge.js';
import { Prompts } from '../../phase7/ki/prompts.js';
import { JanusGeminiService } from '../../phase7/ki/GeminiService.js';
import { JanusPythonService } from '../../extensions/external-bridge/PythonService.js';
import { JanusSqliteService } from '../../extensions/external-bridge/SqliteService.js';
import { HOOKS, registerRuntimeHook } from '../core/public-api.mjs';

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
    
    const dsaBridge = engine?.bridge?.dsa5 ?? null;
    services.knowledgeBridge ??= new JanusKnowledgeBridge({ bridge: dsaBridge, state, logger });
    services.geminiService ??= new JanusGeminiService({ logger, aiService: engine.ai || engine.ki });
    services.geminiService.setKiBridge(services.knowledgeBridge);

    // External Bridges
    if (!engine.ext) engine.ext = {};
    const enablePython = engine.config.get('enableExternalPython');
    const enableSqlite = engine.config.get('enableExternalSqlite');

    if (enablePython) {
      services.python ??= new JanusPythonService({ logger, io: services.ioService });
      engine.ext.python = services.python;
      engine.markServiceReady?.('ext.python', services.python);
      logger.info("JANUS7 | External Bridge (Python) enabled.");
    }

    if (enableSqlite) {
      services.sqlite ??= new JanusSqliteService({ logger, io: services.ioService });
      engine.ext.sqlite = services.sqlite;
      engine.markServiceReady?.('ext.sqlite', services.sqlite);
      logger.info("JANUS7 | External Bridge (SQLite) enabled.");

      // Expose sync API
      engine.ext.syncSqlite = async () => {
        const data = await engine.academy.data.export();
        const dbPath = engine.config.get('sqliteDbPath') || 'janus7/data/keeper.db';
        return services.sqlite.syncDatabase(dbPath, data);
      };
    }

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
    
    // Knowledge Bridge (Semantic Search & Actions)
    engine.ki.knowledgeBridge = services.knowledgeBridge;
    engine.ki.search = (domain, query, opts) => services.knowledgeBridge.search(domain, query, opts);
    engine.ki.executeAction = (type, uuid, params) => services.knowledgeBridge.executeAction(type, uuid, params);
    
    engine.ki.prompts = Prompts;
    engine.ki.gemini = services.geminiService;

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
      search: engine.ki.search,
      executeAction: engine.ki.executeAction,
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
    engine?.markServiceReady?.('phase7.ki', engine.ki);
    return engine.ki;
  } catch (err) {
    engine?.recordWarning?.('phase7.ki', 'attach', err);
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Phase7] KI integration failed', err);
    return null;
  }
}

if (typeof Hooks !== 'undefined') {
  registerRuntimeHook('janus7:ready:phase7-ki', HOOKS.ENGINE_READY, (engine) => {
    try { attachPhase7Ki(engine); } catch (_err) { /* already logged in attach */ }
  });
}
