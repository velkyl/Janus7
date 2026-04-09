import { MODULE_ID } from '../../core/common.js';
import { JanusReportCardOutputService } from '../../phase8/report-cards/JanusReportCardOutputService.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @file ui/apps/JanusReportCardApp.js
 * @module janus7
 *
 * JanusReportCardApp:
 * - Visualisierung und Export von Trimester-Zeugnissen.
 * - Nutzt JanusReportCardOutputService für Datenaufbereitung.
 */
export class JanusReportCardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.service = new JanusReportCardOutputService();
    this._data = { drafts: [], periodLabel: '' };
  }

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

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/apps/report-cards.hbs`,
      scrollable: ['.j7-app__content']
    }
  };

  /** @override */
  async _prepareContext(options) {
    const { drafts, pdfBundle } = await this.service.buildArtifacts();
    this._data = {
      drafts: drafts ?? [],
      periodLabel: pdfBundle?.periodLabel ?? 'Aktuelles Trimester'
    };
    return this._data;
  }

  // -------------------------
  // Handlers
  // -------------------------

  static async _onExportPdf(event, target) {
    const app = this;
    try {
      ui.notifications.info('Bereite Zeugnis-Export vor...');
      await app.service.exportPdf();
    } catch (err) {
      ui.notifications.error(`Export fehlgeschlagen: ${err.message}`);
    }
  }

  static async _onWriteJournals(event, target) {
    const app = this;
    try {
      const result = await app.service.writeJournals();
      ui.notifications.info(`Journal-Sync abgeschlossen: ${result.journalName}`);
    } catch (err) {
      ui.notifications.error(`Sync fehlgeschlagen: ${err.message}`);
    }
  }

  static async _onRefresh(event, target) {
    this.render({ force: true });
  }
}

export default JanusReportCardApp;
