import { moduleTemplatePath } from '../../core/common.js';
const { HandlebarsApplicationMixin } = foundry.applications.api;

import { JanusBaseApp } from '../core/base-app.js';
import { JanusSessionPrepService } from '../../phase8/session-prep/JanusSessionPrepService.js';

export class JanusSessionPrepWizardApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true, focus: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-session-prep-wizard',
    classes: ['janus7-app', 'janus7-session-prep'],
    position: { width: 920, height: 760 },
    window: {
      title: 'JANUS7 · Session Prep Wizard',
      resizable: true,
      minimizable: true,
    },
    actions: {
      refresh: JanusSessionPrepWizardApp.onRefresh,
      openAcademyOverview: () => game?.janus7?.ui?.open?.('academyOverview'),
      openAtmosphereDJ: () => game?.janus7?.ui?.open?.('atmosphereDJ'),
      openAcademyDataStudio: () => game?.janus7?.ui?.open?.('academyDataStudio'),
      openCommandCenter: () => game?.janus7?.ui?.open?.('commandCenter'),
      openKiRoundtrip: () => game?.janus7?.ui?.open?.('kiRoundtrip'),
      openKiBackupManager: () => game?.janus7?.ui?.open?.('kiBackupManager'),
      copySeed: JanusSessionPrepWizardApp.onCopySeed
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/session-prep-wizard.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._report = null;
    this._service = null;
  }

  static async onRefresh(_event, _target) {
    this._report = null;
    return this.refresh?.(true);
  }

  static async onCopySeed(event, target) {
    const box = target?.closest?.('.j7-seed-card');
    const textarea = box?.querySelector?.('textarea');
    const value = textarea?.value ?? textarea?.textContent ?? '';
    if (!value) return;
    try {
      await navigator?.clipboard?.writeText?.(value);
      ui?.notifications?.info?.('Textbaustein kopiert.');
    } catch (_err) {
      ui?.notifications?.warn?.('Textbaustein konnte nicht kopiert werden.');
    }
  }

  async _prepareContext(options) {
    const engine = this._getEngine();
    if (!engine) return { notReady: true };

    this._service ??= new JanusSessionPrepService({ engine, logger: this._getLogger() });
    this._report = await this._service.buildReport({ horizonSlots: 3 });

    const report = this._report ?? {};
    const current = report.currentSlot ?? {};

    return {
      isGM: !!game?.user?.isGM,
      generatedAt: report.generatedAt ?? new Date().toISOString(),
      slotRef: report.slotRef ?? {},
      suggestions: report.suggestions ?? [],
      currentLessons: current.lessons ?? [],
      currentExams: current.exams ?? [],
      currentEvents: current.events ?? [],
      upcoming: report.upcoming ?? [],
      quests: report.quests ?? { total: 0, items: [] },
      activeLocation: report.activeLocation ?? null,
      diagnostics: report.diagnostics ?? { health: 'unknown', warnings: [] },
      contentSeeds: report.contentSeeds ?? [],
    };
  }
}

export default JanusSessionPrepWizardApp;
