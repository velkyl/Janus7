import { moduleTemplatePath } from '../../core/common.js';
const { HandlebarsApplicationMixin } = foundry.applications.api;

import { JanusBaseApp } from '../core/base-app.js';

export class JanusKiBackupManagerApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true, focus: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-ki-backup-manager',
    classes: ['janus7-app', 'janus7-ki-backup-manager'],
    position: { width: 760, height: 620 },
    window: {
      title: 'JANUS7 · KI Backup Manager',
      resizable: true,
      minimizable: true,
    },
    actions: {
      refresh: JanusKiBackupManagerApp.onRefresh,
      restoreBackup: JanusKiBackupManagerApp.onRestoreBackup,
      copyRef: JanusKiBackupManagerApp.onCopyRef,
      openKiRoundtrip: () => game?.janus7?.ui?.open?.('kiRoundtrip')
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/ki-backup-manager.hbs') }
  };

  static async onRefresh(_event, _target) {
    return this.refresh?.(true);
  }

  static async onCopyRef(_event, target) {
    const ref = target?.dataset?.fileRef ?? '';
    if (!ref) return;
    try {
      await navigator?.clipboard?.writeText?.(ref);
      ui?.notifications?.info?.('Backup-Referenz kopiert.');
    } catch (_err) {
      ui?.notifications?.warn?.('Backup-Referenz konnte nicht kopiert werden.');
    }
  }

  static async onRestoreBackup(_event, target) {
    const fileRef = target?.dataset?.fileRef ?? '';
    if (!fileRef) return;
    const DialogV2 = foundry?.applications?.api?.DialogV2;
    let confirmed = false;
    try {
      if (DialogV2?.confirm) {
        confirmed = await DialogV2.confirm({
          window: { title: 'KI-Backup wiederherstellen' },
          content: `<p>Wirklich dieses Backup wiederherstellen?</p><p class="notes"><code>${fileRef}</code></p>`,
          yes: { label: 'Wiederherstellen' },
          no: { label: 'Abbrechen' },
          rejectClose: false
        });
      } else {
        confirmed = window.confirm(`Backup wiederherstellen?
${fileRef}`);
      }
    } catch (_err) {
      confirmed = false;
    }
    if (!confirmed) return;

    try {
      const api = game?.janus7?.capabilities?.ki ?? game?.janus7?.ki ?? null;
      if (!api?.restoreBackup) throw new Error('KI Restore API fehlt');
      await api.restoreBackup(fileRef, { validate: false, save: true });
      ui?.notifications?.info?.('Backup wiederhergestellt.');
      await this.refresh?.(true);
    } catch (err) {
      game?.janus7?.core?.logger?.error?.('[JANUS7][BackupManager] restore failed', err);
      ui?.notifications?.error?.(`Backup-Wiederherstellung fehlgeschlagen: ${err?.message ?? err}`);
    }
  }

  async _prepareContext(_options) {
    const engine = this._getEngine();
    const kiApi = engine?.capabilities?.ki ?? engine?.ki ?? null;
    let backups = [];
    try { backups = await (kiApi?.listBackups?.() ?? []); } catch (_err) { backups = []; }
    return {
      isGM: !!game?.user?.isGM,
      backups,
      backupCount: backups.length,
      phase7Enabled: game?.janus7?.config?.get?.('enablePhase7') !== false
    };
  }
}

export default JanusKiBackupManagerApp;
