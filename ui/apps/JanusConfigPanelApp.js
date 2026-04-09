import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusConfigPanelApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Konfigurationspanel für Scene-Mappings und Feature-Flags.
 * GM-only. Schreibt ausschließlich über JanusConfig.set() -> game.settings.
 * Kein direkter State-Zugriff.
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';
import { JanusConfig } from '../../core/config.js';

/**
 * JanusConfigPanelApp
 *
 * Konfigurationspanel für Einstellungen, die NICHT im Foundry-Standard-
 * Settings-Dialog erscheinen (config: false) oder eine bessere UX brauchen:
 *
 * 1. Scene-Mappings  (key -> Scene-UUID, z.B. "beamer" -> UUID)
 * 2. Feature-Flags   (atmosphere, autoMood, beamer, academySimulation)
 * 3. AI-Models       (Gemini Text/Visual model selection)
 *
 * @extends {HandlebarsApplicationMixin(JanusBaseApp)}
 */
export class JanusConfigPanelApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus7-config-panel',
    classes: ['janus7-app', 'janus7-config-panel'],
    position: { width: 860, height: 680 },
    window: {
      title: 'JANUS7 · Konfiguration',
      resizable: true,
    },
    actions: {
      refresh:          JanusConfigPanelApp.onRefresh,
      saveSceneMaps:    JanusConfigPanelApp.onSaveSceneMaps,
      addSceneMap:      JanusConfigPanelApp.onAddSceneMap,
      removeSceneMap:   JanusConfigPanelApp.onRemoveSceneMap,
      saveFeatureFlags: JanusConfigPanelApp.onSaveFeatureFlags,
      fetchGeminiModels: JanusConfigPanelApp.onFetchGeminiModels,
      saveAiModels:     JanusConfigPanelApp.onSaveAiModels,
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/config-panel.hbs') }
  };

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.domElement;
    if (!root) return;
    if (root.dataset.janusConfigBindings === 'true') return;
    root.dataset.janusConfigBindings = 'true';

    root.addEventListener('change', (ev) => {
      const select = ev.target?.closest?.('[data-scene-picker]');
      if (!select) return;
      const uuid = select.value;
      const row = select.closest('[data-scene-row]');
      const uuidInput = row?.querySelector?.('[data-scene-uuid]');
      if (uuidInput && uuid) uuidInput.value = uuid;
    });
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  static async onRefresh() {
    this.refresh();
  }

  static async onSaveSceneMaps(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return ui.notifications.warn('Nur GM darf Konfiguration ändern.');

    const rows = this.element?.querySelectorAll?.('[data-scene-row]') ?? [];
    const mappings = {};

    rows.forEach((row) => {
      const key = row.querySelector('[data-scene-key]')?.value?.trim() ?? '';
      const uuid = row.querySelector('[data-scene-uuid]')?.value?.trim() ?? '';
      if (key && uuid) mappings[key] = uuid;
    });

    try {
      await JanusConfig.set('sceneMappings', mappings);
      ui.notifications.info('JANUS7: Scene-Mappings gespeichert.');
      this.refresh();
    } catch (err) {
      ui.notifications.error('Speichern fehlgeschlagen.');
    }
  }

  static async onAddSceneMap(event, _target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;

    const container = this.element?.querySelector?.('[data-scene-rows]');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'janus7-config-row';
    row.setAttribute('data-scene-row', '');

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'janus7-input';
    keyInput.setAttribute('data-scene-key', '');
    keyInput.placeholder = 'key (z.B. beamer)';
    row.appendChild(keyInput);

    const uuidInput = document.createElement('input');
    uuidInput.type = 'text';
    uuidInput.className = 'janus7-input';
    uuidInput.setAttribute('data-scene-uuid', '');
    uuidInput.placeholder = 'Scene UUID';
    row.appendChild(uuidInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'janus-btn janus-btn--icon';
    removeBtn.dataset.action = 'removeSceneMap';
    removeBtn.title = 'Entfernen';
    const trashIcon = document.createElement('i');
    trashIcon.className = 'fas fa-trash';
    removeBtn.appendChild(trashIcon);
    row.appendChild(removeBtn);

    container.appendChild(row);
  }

  static async onRemoveSceneMap(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    target.closest('[data-scene-row]')?.remove();
  }

  static async onSaveFeatureFlags(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return ui.notifications.warn('Nur GM darf Feature-Flags ändern.');

    const el = this.element;
    const flags = {
      atmosphere:        el?.querySelector?.('[data-flag="atmosphere"]')?.checked        ?? false,
      autoMood:          el?.querySelector?.('[data-flag="autoMood"]')?.checked          ?? false,
      beamer:            el?.querySelector?.('[data-flag="beamer"]')?.checked            ?? false,
      academySimulation: el?.querySelector?.('[data-flag="academySimulation"]')?.checked ?? false,
    };

    try {
      await JanusConfig.set('features', flags);
      ui.notifications.info('JANUS7: Feature-Flags gespeichert.');
      this.refresh();
    } catch (err) {
      ui.notifications.error('Speichern fehlgeschlagen.');
    }
  }

  static async onFetchGeminiModels(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const gemini = game.janus7?.ki?.gemini;
    if (!gemini) return ui.notifications.error('Gemini Service nicht verfügbar.');
    try {
      ui.notifications.info('JANUS7: Modelle werden abgerufen...');
      await gemini.fetchAvailableModels();
      ui.notifications.info('JANUS7: Modellliste aktualisiert.');
      this.refresh();
    } catch (err) {
      ui.notifications.error(`Fehler beim Abrufen: ${err.message}`);
    }
  }

  static async onSaveAiModels(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const el = this.element;
    const textModel = el?.querySelector?.('[data-setting="geminiTextModel"]')?.value;
    const visualModel = el?.querySelector?.('[data-setting="geminiVisualModel"]')?.value;
    try {
      if (textModel) await JanusConfig.set('geminiTextModel', textModel);
      if (visualModel) await JanusConfig.set('geminiVisualModel', visualModel);
      ui.notifications.info('JANUS7: KI-Modell-Einstellungen gespeichert.');
      this.refresh();
    } catch (err) {
      ui.notifications.error('Speichern fehlgeschlagen.');
    }
  }

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  /** @override */
  async _prepareContext(_options) {
    if (!game.user?.isGM) return { notReady: true, notGM: true };

    const rawMappings = JanusConfig.get('sceneMappings') ?? {};
    const sceneMappings = Object.entries(rawMappings).map(([key, uuid]) => ({ key, uuid }));

    const features = { atmosphere: false, autoMood: false, beamer: false, academySimulation: false, ...(JanusConfig.get('features') ?? {}) };

    const killSwitches = {
      enableSimulation:  this._getBool('enableSimulation', true),
      enableAtmosphere:  this._getBool('enableAtmosphere', true),
      enableUI:          this._getBool('enableUI', true),
      enableQuestSystem: this._getBool('enableQuestSystem', true),
      enableTestRunner:  this._getBool('enableTestRunner', false),
    };

    const scenes = (game.scenes?.contents ?? []).map(s => ({
      uuid: s.uuid,
      name: s.name ?? s.id,
    })).sort((a, b) => a.name.localeCompare(b.name));

    const availableModels = JanusConfig.get('availableGeminiModels') || [];
    const currentTextModel = JanusConfig.get('geminiTextModel');
    const currentVisualModel = JanusConfig.get('geminiVisualModel');

    return {
      notReady: false,
      notGM: false,
      isGM: true,
      sceneMappings,
      features,
      killSwitches,
      scenes,
      availableModels,
      currentTextModel,
      currentVisualModel,
    };
  }

  _getBool(key, fallback = false) {
    try { return Boolean(JanusConfig.get(key)); } catch { return fallback; }
  }
}
