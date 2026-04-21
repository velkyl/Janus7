import { MODULE_ID } from '../../core/common.js';
import { createJanusReportCardOutputService } from '../../scripts/extensions/phase8-api.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @file ui/apps/JanusReportCardApp.js
 * @module janus7
 *
 * JanusReportCardApp:
 * - Visualisierung und Export von Trimester-Zeugnissen.
 * - Nutzt JanusReportCardOutputService für Datenaufbereitung.
 */
export class JanusReportCardApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  /** @type {Promise<object>|null} */
  #servicePromise = null;

  /** @type {object|null} Transient cache for sanitized render data */
  __renderCache = null;

  async #getService() {
    this.#servicePromise ??= createJanusReportCardOutputService({
      engine: game?.janus7 ?? null,
      logger: game?.janus7?.core?.logger ?? console
    });
    return await this.#servicePromise;
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: 'janus-report-cards',
    classes: ['janus7', 'j7-app', 'j7-report-cards-window'],
    tag: 'section',
    window: {
      title: 'JANUS7 · Akademie-Zeugnisse (Drafts)',
      icon: 'fas fa-file-certificate',
      resizable: true,
      controls: [
        {
          action: 'export-pdf',
          icon: 'fas fa-file-pdf',
          label: 'Export PDF',
          ownership: 'OWNER'
        }
      ]
    },
    position: { width: 850, height: 700 },
    actions: {
      'export-pdf': JanusReportCardApp._onExportPdf,
      'write-journals': JanusReportCardApp._onWriteJournals,
      'refresh': JanusReportCardApp._onRefresh
    }
  };

  /** @inheritdoc */
  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/apps/report-cards.hbs`,
      scrollable: ['.j7-app__content']
    }
  };

  /**
   * Moves async data fetching out of the render pipeline into _preRender.
   * This avoids blocking the UI lock during complex result aggregation.
   * @override
   */
  async _preRender(_options) {
    await super._preRender(_options);
    try {
      const service = await this.#getService();
      const data = await service.buildArtifacts();
      this.__renderCache = {
        drafts: data?.drafts ?? [],
        periodLabel: data?.pdfBundle?.periodLabel ?? game.i18n.localize('JANUS7.ReportCards.CurrentTrimester')
      };
    } catch (err) {
      console.error('[JANUS7][ReportCard] Failed to build artifacts in _preRender:', err);
      this.__renderCache = { drafts: [], periodLabel: 'Error', error: err.message };
    }
  }

  /**
   * Strictly synchronous context preparation.
   * Reads from the validated __renderCache to ensure instant painting.
   * @override
   */
  _prepareContext(_options) {
    return {
      ...(this.__renderCache ?? { drafts: [], periodLabel: '' }),
      isGM: game.user.isGM
    };
  }

  // -------------------------
  // Handlers
  // -------------------------

  static async _onExportPdf(_event, _target) {
    const app = this;
    try {
      ui.notifications.info(game.i18n.localize('JANUS7.Notifications.PreparingExport'));
      const service = await app.#getService();
      await service.exportPdf();
    } catch (err) {
      ui.notifications.error(`Export Error: ${err.message}`);
    }
  }

  static async _onWriteJournals(_event, _target) {
    const app = this;
    try {
      const service = await app.#getService();
      const result = await service.writeJournals();
      ui.notifications.info(`${game.i18n.localize('JANUS7.Notifications.SyncDone')}: ${result.journalName}`);
    } catch (err) {
      ui.notifications.error(`Sync Error: ${err.message}`);
    }
  }

  static async _onRefresh(_event, _target) {
    this.render({ force: true });
  }
}

export default JanusReportCardApp;
