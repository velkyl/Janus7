/**
 * @file ui/commands/system.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * System commands for JANUS7 Command Center.
 */

import { _checkPermission, _engine, _log, _wrap } from './_shared.js';
import { MODULE_ID } from '../../core/common.js';
import { emitHook } from '../../core/hooks/emitter.js';
import { JanusUI } from '../helpers.js';
import { JanusConfig } from '../../core/config.js';

export const systemCommands = {

  // -------------------------------------------------------------------------
  // DEBUG
  // -------------------------------------------------------------------------

  async copyDiagnostics(_dataset = {}) {
    if (!_checkPermission('copyDiagnostics')) return { success: false, cancelled: true };

    const engine = _engine();
    return await _wrap('copyDiagnostics', async () => {
      const version = game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown';
      const foundryVersion = game?.version ?? 'unknown';
      const systemId = game?.system?.id ?? 'unknown';
      const systemVersion = game?.system?.version ?? 'unknown';
      const activeModules = Array.from(game?.modules ?? []).filter((m) => m.active).length;

      const state = engine?.core?.state?.dump?.() ?? null;
      const time = state?.time ?? null;
      const meta = state?.meta ?? null;

      const report = {
        ts: new Date().toISOString(),
        janus7: { version },
        foundry: { version: foundryVersion },
        system: { id: systemId, version: systemVersion },
        modules: { active: activeModules },
        state: {
          loaded: !!state,
          meta,
          time
        },
        ui: {
          user: { id: game?.user?.id, name: game?.user?.name, isGM: !!game?.user?.isGM }
        }
      };

      const text = JSON.stringify(report, null, 2);
      const ok = await JanusUI.copyToClipboard(text);
      if (!ok) throw new Error('Kopieren in Zwischenablage fehlgeschlagen');
      
      ui.notifications.info(
        game.i18n?.localize?.('JANUS7.UI.DiagnosticsCopied') 
        ?? 'JANUS7: Diagnose-Report in Zwischenablage kopiert.'
      );
      return text;
    });
  },


async openSessionPrepWizard(_dataset = {}) {
  if (!_checkPermission('openSessionPrepWizard')) return { success: false, cancelled: true };

  return await _wrap('openSessionPrepWizard', async () => {
    const app = game?.janus7?.ui?.open?.('sessionPrepWizard');
    if (!app) throw new Error('Session Prep Wizard konnte nicht geöffnet werden');
    return true;
  });
},

async openKiBackupManager(_dataset = {}) {
  if (!_checkPermission('openKiBackupManager')) return { success: false, cancelled: true };

  return await _wrap('openKiBackupManager', async () => {
    const app = game?.janus7?.ui?.open?.('kiBackupManager');
    if (!app) throw new Error('KI Backup Manager konnte nicht geöffnet werden');
    return true;
  });
},

  async openTestHarness(_dataset = {}) {
    if (!_checkPermission('openTestHarness')) return { success: false, cancelled: true };

    return await _wrap('openTestHarness', async () => {
      // JanusSettingsTestHarnessApp removed – use the integrated test result window.
      const engine = _engine();
      if (engine?.test?.openResults) {
        await engine.test.openResults();
        return true;
      }
      // Fallback: open JanusTestResultApp directly
      const { JanusTestResultApp } = await import('../apps/JanusTestResultApp.js');
      const app = new JanusTestResultApp();
      app.render(true);
      return true;
    });
  }
  ,

  // -------------------------------------------------------------------------
  // UI (client-side preferences)
  // -------------------------------------------------------------------------

  /**
   * Toggle high-contrast theme for this client.
   */

  // -------------------------------------------------------------------------
  // UI (client-side preferences)
  // -------------------------------------------------------------------------

  /**
   * Toggle high-contrast theme for this client.
   */
  async toggleHighContrast(_dataset = {}) {
    if (!_checkPermission('toggleHighContrast')) return { success: false, cancelled: true };

    return await _wrap('toggleHighContrast', async () => {
      // Route settings through core Config API (architecture contract: game.settings only in core/).
      const current = JanusConfig.getUIPreference('uiHighContrast', false);
      const next = !current;
      try { await JanusConfig.setUIPreference('uiHighContrast', next); } catch (e) {
        _log().warn?.('[JANUS7][system] uiHighContrast setting update failed:', e?.message);
      }
      try { emitHook('janus7.ui.theme.changed', { highContrast: next }); } catch {}
      ui.notifications.info(
        next
          ? (game.i18n?.localize?.('JANUS7.UI.Theme.HighContrastOn') ?? 'JANUS7: High Contrast aktiviert.')
          : (game.i18n?.localize?.('JANUS7.UI.Theme.HighContrastOff') ?? 'JANUS7: High Contrast deaktiviert.')
      );
      return next;
    });
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - State & IO
  // =========================================================================

  /**
   * Run system health check
   */
  async runHealthCheck(_dataset = {}) {
    if (!_checkPermission('runHealthCheck')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('runHealthCheck', async () => {
      const results = {
        core: { status: engine?.core ? 'OK' : 'MISSING' },
        state: { status: engine?.core?.state ? 'OK' : 'MISSING' },
        calendar: { status: engine?.academy?.calendar ? 'OK' : 'MISSING' },
        bridge: { status: engine?.bridge?.dsa5 ? 'OK' : 'MISSING' },
        quests: { status: engine?.academy?.quests ? 'OK' : 'MISSING' },
        atmosphere: { status: engine?.atmosphere ? 'OK' : 'MISSING' }
      };
      
      const allOk = Object.values(results).every(r => r.status === 'OK');
      
      console.table(results);
      ui.notifications[allOk ? 'info' : 'warn'](
        `Health Check: ${allOk ? 'All Systems OK' : 'Issues Found'}`
      );
      
      return { results, allOk };
    });
  },

  /**
   * Validate current state against schema
   */

  // =========================================================================
  // SPRINT 2 COMMANDS - Test Center
  // =========================================================================

  /**
   * Run smoke tests only
   */
  async runSmokeTests(_dataset = {}) {
    if (!_checkPermission('runSmokeTests')) return { success: false, cancelled: true };

    const engine = _engine();
    return await _wrap('runSmokeTests', async () => {
      // engine.test.runCatalog() is attached by test-runner-integration.js.
      if (engine?.test?.openResults) {
        await engine.test.openResults();
      }
      const data = engine?.test?.runCatalog
        ? await engine.test.runCatalog({ openWindow: true })
        : null;
      const summary = data?.summary ?? {};
      ui.notifications.info(`Tests: ${summary.pass ?? '?'}/${summary.total ?? '?'} PASS`);
      return data ?? { success: true };
    });
  },

  /**
   * Run full test catalog
   */
  async runFullCatalog(_dataset = {}) {
    if (!_checkPermission('runFullCatalog')) return { success: false, cancelled: true };

    const engine = _engine();
    return await _wrap('runFullCatalog', async () => {
      if (engine?.test?.openResults) {
        await engine.test.openResults();
      }
      const data = engine?.test?.runCatalog
        ? await engine.test.runCatalog({ openWindow: true })
        : null;
      const summary = data?.summary ?? {};
      ui.notifications.info(`Full Catalog: ${summary.pass ?? '?'}/${summary.total ?? '?'} PASS`);
      return data ?? { success: true };
    });
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - Audit
  // =========================================================================

  /**
   * Enable UI action tracing
   */

  // =========================================================================
  // SPRINT 2 COMMANDS - Audit
  // =========================================================================

  /**
   * Enable UI action tracing
   */
  async traceUIActions(_dataset = {}) {
    if (!_checkPermission('traceUIActions')) return { success: false, cancelled: true };
    
    globalThis.__janusUITrace = true;
    globalThis.__janusUIActionLog = globalThis.__janusUIActionLog || [];
    
    ui.notifications.info('UI Action Tracing: Enabled (check console)');
    return { success: true, tracing: true };
  },

  /**
   * View action log
   */
  async viewActionLog(_dataset = {}) {
    if (!_checkPermission('viewActionLog')) return { success: false, cancelled: true };
    
    const log = globalThis.__janusUIActionLog || [];
    console.table(log);
    ui.notifications.info(`Action Log: ${log.length} entries`);
    return { success: true, log };
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - Admin
  // =========================================================================

  /**
   * Create backup (delegates to exportState)
   */

  // =========================================================================
  // SPRINT 2 COMMANDS - DSA5 Bridge
  // =========================================================================

  /**
   * Run DSA5 bridge diagnostics
   */
  async bridgeDiagnostics(_dataset = {}) {
    if (!_checkPermission('bridgeDiagnostics')) return { success: false, cancelled: true };
    
    const engine = _engine();
    const bridge = engine?.bridge?.dsa5;
    if (!bridge) throw new Error('DSA5 Bridge not available');
    
    return await _wrap('bridgeDiagnostics', async () => {
      // Bridge exposes runDiagnostics() directly (not bridge.diagnostics.run())
      const diagnostics = await (bridge.runDiagnostics?.() ?? bridge.diagnostics?.run?.() ?? Promise.resolve({ status: 'No diagnostics available' }));
      console.table(diagnostics);
      ui.notifications.info('Bridge diagnostics completed');
      return { diagnostics };
    });
  },

  /**
   * Lookup actor by name
   */
  async bridgeActorLookup(dataset = {}) {
    if (!_checkPermission('bridgeActorLookup')) return { success: false, cancelled: true };
    
    const engine = _engine();
    const bridge = engine?.bridge?.dsa5;
    const actorName = dataset.actorName || await JanusUI.prompt({ 
      title: 'Actor Lookup', 
      label: 'Actor Name' 
    });
    
    if (!actorName) return { cancelled: true };
    
    return await _wrap('bridgeActorLookup', async () => {
      const actor = await bridge.actors.getActorByName(actorName);
      if (actor) {
        _log().debug?.('Actor found:', actor);
        ui.notifications.info(`Actor found: ${actor.name}`);
      } else {
        ui.notifications.warn(`Actor not found: ${actorName}`);
      }
      return { actor, found: !!actor };
    });
  },

  /**
   * Test bridge roll functionality
   */
  async bridgeRollTest(dataset = {}) {
    if (!_checkPermission('bridgeRollTest')) return { success: false, cancelled: true };
    
    const engine = _engine();
    const bridge = engine?.bridge?.dsa5;
    const skillName = dataset.skillName || 'Sinnesschärfe';
    const actorId = dataset.actorId || game.user.character?.uuid;
    
    if (!actorId) {
      ui.notifications.warn('No actor selected');
      return { cancelled: true };
    }
    
    return await _wrap('bridgeRollTest', async () => {
      const result = await bridge.rolls.rollSkill(actorId, skillName);
      ui.notifications.info(`Roll: ${skillName} → ${result.success ? 'Success' : 'Failure'}`);
      return { result };
    });
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - Data Catalog
  // =========================================================================

  // =========================================================================
  // ADMIN COMMANDS (destructive – GM only)
  // =========================================================================

  /**
   * Reset world state to factory defaults.
   */
  async resetWorld(_dataset = {}) {
    if (!_checkPermission('resetWorld')) return { success: false, cancelled: true };

    return await _wrap('resetWorld', async () => {
      let confirmed = false;
      try {
        confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: 'JANUS7 – World State zurücksetzen' },
          content: '<p><strong>Achtung:</strong> Der gesamte JANUS7-State wird auf Werkseinstellungen zurückgesetzt.<br>Diese Aktion kann nicht rückgängig gemacht werden.</p>',
          yes: { label: 'Zurücksetzen', icon: 'fas fa-trash' },
          no: { label: 'Abbrechen' },
          rejectClose: false,
          modal: true,
        });
      } catch (_err) {
        confirmed = false;
      }
      if (!confirmed) return { cancelled: true };

      const engine = _engine();
      const state = engine?.core?.state;
      if (!state) throw new Error('Core state nicht verfügbar');
      await state.reset?.({ save: true });
      ui.notifications.warn('JANUS7: World State wurde zurückgesetzt.');
      return { success: true };
    });
  },

  /**
   * Export current state to clipboard (backup).
   */
  async createBackup(_dataset = {}) {
    if (!_checkPermission('createBackup')) return { success: false, cancelled: true };

    return await _wrap('createBackup', async () => {
      const engine = _engine();
      const director = engine?.core?.director ?? engine?.director;
      if (!director) throw new Error('Director nicht verfügbar');

      const snapshot = director.exportState();
      const json = JSON.stringify(snapshot, null, 2);
      const ok = await JanusUI.copyToClipboard(json);
      if (!ok) {
        // Fallback: show in dialog
        await JanusUI.showTextDialog({
          title: 'JANUS7 – State Backup',
          content: `<textarea readonly style="width:100%;height:300px;font-family:monospace;font-size:11px">${json}</textarea>`,
          closeLabel: 'Schließen'
        });
      } else {
        ui.notifications.info('JANUS7: State-Backup in Zwischenablage kopiert.');
      }
      return { success: true, size: json.length };
    });
  },

  /**
   * Import state from clipboard (restore backup).
   */
  async restoreBackup(_dataset = {}) {
    if (!_checkPermission('restoreBackup')) return { success: false, cancelled: true };

    return await _wrap('restoreBackup', async () => {
      const json = await JanusUI.promptTextarea({
        title: 'JANUS7 – State Restore',
        label: 'State-JSON einfügen',
        placeholder: '{"meta":{"version":"0.9.0",...}}',
        okLabel: 'Importieren',
        cancelLabel: 'Abbrechen',
        rows: 18
      });

      if (!json || !json.trim()) return { cancelled: true };

      const engine = _engine();
      const director = engine?.core?.director ?? engine?.director;
      if (!director) throw new Error('Director nicht verfügbar');

      let parsed;
      try { parsed = JSON.parse(json); } catch (e) { throw new Error('Ungültiges JSON: ' + e.message); }

      await director.importState(parsed, { validate: false, save: true, force: true });
      ui.notifications.info('JANUS7: State erfolgreich wiederhergestellt.');
      return { success: true };
    });
  },

  // =========================================================================
  // TOOLS — Fenster direkt öffnen
  // =========================================================================

  /**
   * Öffnet das Sync-Panel (Welt-Synchronisation).
   */
  async openSyncPanel(_dataset = {}) {
    if (!_checkPermission('openSyncPanel')) return { success: false, cancelled: true };
    return await _wrap('openSyncPanel', async () => {
      const engine = _engine();
      const app = engine?.ui?.apps?.syncPanel;
      if (!app) throw new Error('syncPanel nicht registriert.');
      new app().render(true);
      return { success: true };
    });
  },

  /**
   * Öffnet das Config-Panel (Einstellungen).
   */
  async openConfigPanel(_dataset = {}) {
    if (!_checkPermission('openConfigPanel')) return { success: false, cancelled: true };
    return await _wrap('openConfigPanel', async () => {
      const engine = _engine();
      const app = engine?.ui?.apps?.configPanel;
      if (!app) throw new Error('configPanel nicht registriert.');
      new app().render(true);
      return { success: true };
    });
  },

  /**
   * Browse lessons
   */
};
