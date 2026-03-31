/**
 * @file core/ai.js
 * @module janus7
 * @phase 7
 *
 * Purpose:
 * Central AI Context & Assistance Service.
 * Generates formatted snapshots of the module state for LLM/Prompts.
 */

import { MODULE_ID } from './common.js';
import { JanusProfileRegistry } from './profiles/index.js';

/**
 * JanusAiService
 * 
 * Logic to aggregate world data into high-density context.
 */
export class JanusAiService {
  /**
   * @param {Object} deps
   * @param {import('./state.js').JanusStateCore} deps.state
   * @param {import('./logger.js').JanusLogger} deps.logger
   */
  constructor({ state, logger } = {}) {
    this.state = state;
    this.logger = logger;
  }

  /**
   * Generates a JSON snapshot optimized for AI context consumption.
   * 
   * @param {Object} [opts]
   * @param {boolean} [opts.includeDirector=false] - Include active quests and events.
   * @param {boolean} [opts.includeDiagnostics=false] - Include system health info.
   * @param {boolean} [opts.includeRegistry=false] - Include ready/pending services.
   * @returns {Object}
   */
  getContext(opts = {}) {
    const state = this.state;
    if (!state) return { error: 'State not available' };

    const moduleVersion = game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown';
    const profile = JanusProfileRegistry.getActive();
    
    // Core snapshot
    const snapshot = {
      schemaVersion: 'janus7-ai-context-v2', // Updated for profile support
      moduleId: MODULE_ID,
      moduleVersion,
      profile: {
        id: profile.id,
        name: profile.name,
        focus: profile.meta?.focus ?? 'unknown',
        region: profile.meta?.region ?? 'unknown'
      },
      worldTime: this._getWorldTimeContext(),
      state: this._getStateExport(opts),
      requested: {
        includeDirector: Boolean(opts.includeDirector),
        includeDiagnostics: Boolean(opts.includeDiagnostics)
      }
    };

    // Extension: Director context
    if (opts.includeDirector) {
      snapshot.director = {
        activeQuestIds: this._getActiveQuestIds(state),
        activeEvents: state.get('activeEvents') ?? [],
        flags: state.get('flags') ?? {}
      };
    }

    // Extension: System diagnostics
    if (opts.includeDiagnostics) {
      const engine = game.janus7;
      snapshot.diagnostics = {
        health: engine?.diagnostics?.lastReport?.health ?? 'unknown',
        errors: engine?.errors?.getReport()?.count ?? 0,
        services: engine?.services?.registry?.getReport() ?? null
      };
    }

    return snapshot;
  }

  /**
   * Performs semantic validation on a KI response payload (ChangeSets)
   * before it is processed for import.
   * 
   * @param {Object} payload 
   * @returns {Promise<{ok: boolean, errors: string[], summary: any[]}>}
   */
  async preflightImport(payload) {
    const errors = [];
    if (!payload || typeof payload !== 'object') {
      return { ok: false, errors: ['Payload muss ein Objekt sein.'], summary: [] };
    }

    const changes = payload.changes || {};

    // 1. Journal entries validation
    if (changes.journalEntries) {
      if (!Array.isArray(changes.journalEntries)) {
        errors.push('journalEntries muss ein Array sein.');
      } else {
        changes.journalEntries.forEach((entry, idx) => {
          if (entry === null || typeof entry !== 'object') {
            errors.push('journalEntries muss Objekte enthalten.');
          } else if (Object.keys(entry).length === 0) {
            errors.push('journalEntries Eintrag darf nicht leer sein.');
          }
        });
      }
    }

    // 2. Generic updates validation (e.g. calendarUpdates)
    const genericSources = ['calendarUpdates', 'eventUpdates', 'questUpdates'];
    for (const source of genericSources) {
      if (changes[source]) {
        if (!Array.isArray(changes[source])) {
          errors.push(`${source} muss ein Array sein.`);
        } else {
          changes[source].forEach((patch) => {
            if (patch === null || typeof patch !== 'object') {
              errors.push(`${source} enthält ungültige Patch-Objekte.`);
            }
          });
        }
      }
    }

    return {
      ok: errors.length === 0,
      errors,
      summary: []
    };
  }

  /** @private */
  _getWorldTimeContext() {
    const time = this.state.get('time') || {};
    return {
      year: time.year,
      trimester: time.trimester,
      week: time.week,
      day: time.day,
      phase: time.phase,
      display: `${time.day}, ${time.phase} (W${time.week}/T${time.trimester})`
    };
  }

  /** @private */
  _getStateExport(opts) {
    try {
      // Use the full export if available via IO
      const engine = game.janus7;
      if (engine?.core?.io?.exportState) {
        const raw = engine.core.io.exportState({ includeMeta: true });
        if (!opts.includeDiagnostics) delete raw.diagnostics;
        return raw;
      }
      return this.state.snapshot() || {};
    } catch (err) {
      this.logger?.warn?.('AI Context: state export failed', err);
      return { error: 'export_failed', time: this.state.get('time') };
    }
  }

  /** @private */
  _getActiveQuestIds(state) {
    const quests = state.get('questStates') || {};
    return Object.entries(quests)
      .filter(([_, q]) => q.status === 'active')
      .map(([id]) => id);
  }
}
