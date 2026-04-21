import { JanusBaseApp } from '../core/base-app.js';
import { moduleTemplatePath } from '../../core/common.js';
import { getJanusCore } from '../../core/index.js';
import { getDragDropClass } from '../../core/foundry-compat.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

function _resolveThesisScholarActor(thesis = {}) {
  const scholarId = String(thesis?.scholarId ?? '').trim();
  return scholarId ? game.actors.get(scholarId) ?? null : null;
}

function _normalizeThesisQuality(rollResult = {}) {
  const quality = Number(rollResult?.quality ?? rollResult?.raw?.result?.qualityStep ?? NaN);
  if (Number.isFinite(quality) && quality > 0) return quality;
  return rollResult?.success ? 1 : 0;
}

/**
 * JanusThesisApp
 * ApplicationV2 for managing scholar research progress.
 */
export class JanusThesisApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-thesis-manager',
    classes: ['janus7-app', 'janus7-thesis-manager', 'premium-surface'],
    position: { width: 600, height: 700 },
    window: {
      title: 'Thesis Manager · Recherche-Zentrum',
      resizable: true,
      minimizable: true,
      icon: 'fas fa-book-reader'
    },
    actions: {
      evaluateSource: JanusThesisApp.onEvaluateSource,
      removeSource: JanusThesisApp.onRemoveSource
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('extensions/thesis-manager/thesis-app.hbs')
    }
  };

  constructor(options = {}) {
    super(options);
    this._dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  _prepareContext(_options) {
    const { state } = getJanusCore();
    const theses = state.get('academy.theses') || {};

    const thesesList = Object.entries(theses).map(([id, data]) => {
      const actor = _resolveThesisScholarActor(data);
      const currentQS = Number(data?.currentQS ?? 0);
      const requiredQS = Math.max(1, Number(data?.requiredQS ?? 1));
      const progress = Math.min(100, Math.round((currentQS / requiredQS) * 100));

      return {
        id,
        ...data,
        scholarName: actor?.name || 'Unbekannter Scholar',
        progress,
        statusLabel: this.#getStatusLabel(data.status),
        isReady: data.status === 'ready_for_defense' || progress >= 100
      };
    });

    return { theses: thesesList };
  }

  #getStatusLabel(status) {
    const labels = {
      in_progress: 'In Bearbeitung',
      ready_for_defense: 'Bereit zur Verteidigung',
      completed: 'Abgeschlossen'
    };
    return labels[status] || status;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.domElement) return;
    this._dragDrop.forEach((dragDrop) => dragDrop.bind(this.domElement));
  }

  #createDragDropHandlers() {
    const DragDropImpl = getDragDropClass();
    if (!DragDropImpl) return [];
    return [new DragDropImpl({
      dropSelector: '.j7-thesis-drop-zone',
      callbacks: {
        drop: this.#onDrop.bind(this)
      }
    })];
  }

  async #onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type !== 'JournalEntry') return;

    const thesisId = event.target.closest('[data-thesis-id]')?.dataset.thesisId;
    if (!thesisId) return;

    const { state, logger } = getJanusCore();

    await state.transaction(async (tx) => {
      const theses = foundry.utils.deepClone(tx.get('academy.theses') || {});
      const thesis = theses[thesisId];
      if (!thesis) return;

      thesis.sources = Array.isArray(thesis.sources) ? thesis.sources : [];
      if (!thesis.sources.includes(data.uuid)) {
        thesis.sources.push(data.uuid);
        tx.set('academy.theses', theses);
        logger.info(`JANUS | Quelle ${data.uuid} zu Thesis ${thesisId} hinzugefügt.`);
        ui.notifications.info('Quelle erfolgreich hinzugefügt.');
      }
    });

    this.render({ force: true });
  }

  static async onEvaluateSource(_event, target) {
    const thesisId = target.closest('[data-thesis-id]')?.dataset.thesisId;
    if (!thesisId) return;

    const { state, logger, dsa5 } = getJanusCore();
    const theses = state.get('academy.theses') || {};
    const thesis = theses[thesisId];
    if (!thesis) return;

    if (!Array.isArray(thesis.sources) || thesis.sources.length === 0) {
      ui.notifications.warn('Keine Quellen zum Auswerten vorhanden.');
      return;
    }

    const actor = _resolveThesisScholarActor(thesis);
    if (!actor) {
      ui.notifications.warn('Kein Scholar-Actor für diese Thesis gefunden.');
      return;
    }

    if (typeof dsa5?.rollSkill !== 'function') {
      ui.notifications.warn('DSA5-Roll-Bridge ist nicht verfügbar.');
      return;
    }

    try {
      ui.notifications.info(`${actor.name} wertet eine Quelle aus (Magiekunde)...`);
      const rollResult = await dsa5.rollSkill(actor, 'Magiekunde', {
        silent: true,
        dsa5: { fastForward: true, dialog: false }
      });
      const gainedQuality = _normalizeThesisQuality(rollResult);
      if (!rollResult?.success || gainedQuality <= 0) {
        ui.notifications.warn(`${actor.name} konnte keine belastbaren Erkenntnisse gewinnen.`);
        return;
      }

      await state.transaction(async (tx) => {
        const nextTheses = foundry.utils.deepClone(tx.get('academy.theses') || {});
        const nextThesis = nextTheses[thesisId];
        if (!nextThesis) return;

        nextThesis.currentQS = Number(nextThesis.currentQS ?? 0) + gainedQuality;
        if (Number(nextThesis.currentQS) >= Math.max(1, Number(nextThesis.requiredQS ?? 1))) {
          nextThesis.status = 'ready_for_defense';
        }

        tx.set('academy.theses', nextTheses);
        logger.info(`JANUS | Thesis ${thesisId} Progress: +${gainedQuality} QS`);
      });

      this.render({ force: true });
    } catch (err) {
      logger?.warn?.('JANUS | Thesis evaluation failed', err);
      ui.notifications.warn(err?.message ?? 'Magiekunde-Probe fehlgeschlagen.');
    }
  }

  static async onRemoveSource(_event, target) {
    const thesisId = target.closest('[data-thesis-id]')?.dataset.thesisId;
    const sourceUuid = target.dataset.uuid;
    if (!thesisId || !sourceUuid) return;

    const { state } = getJanusCore();
    await state.transaction(async (tx) => {
      const theses = foundry.utils.deepClone(tx.get('academy.theses') || {});
      const thesis = theses[thesisId];
      if (thesis && Array.isArray(thesis.sources)) {
        thesis.sources = thesis.sources.filter((source) => source !== sourceUuid);
        tx.set('academy.theses', theses);
      }
    });
    this.render({ force: true });
  }

  static showSingleton() {
    if (this._instance) {
      this._instance.render({ force: true });
      this._instance.bringToFront();
      return this._instance;
    }
    this._instance = new this();
    this._instance.render({ force: true });
    return this._instance;
  }
}
