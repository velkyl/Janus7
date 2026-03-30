import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusConfigPanelApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Konfigurationspanel für Scene-Mappings und Feature-Flags.
 * GM-only. Schreibt ausschließlich über JanusConfig.set() → game.settings.
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
 * 1. Scene-Mappings  (key → Scene-UUID, z.B. "beamer" → UUID)
 * 2. Feature-Flags   (atmosphere, autoMood, beamer, academySimulation)
 *
 * GM-only. Schreibt ausschließlich über JanusConfig.set() → game.settings.
 * Kein direkter State-Zugriff.
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
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/config-panel.hbs') }
  };

  async _onRender(context, options) {
    await super._onRender(context, options);

    // Scene-Picker: Auswahl → UUID-Feld automatisch füllen
    this.element?.querySelectorAll?.('[data-scene-picker]').forEach((select) => {
      select.addEventListener('change', (ev) => {
        const uuid = ev.currentTarget.value;
        const row = ev.currentTarget.closest('[data-scene-row]');
        const uuidInput = row?.querySelector?.('[data-scene-uuid]');
        if (uuidInput && uuid) uuidInput.value = uuid;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  static async onRefresh() {
    this.refresh();
  }

  /**
   * Speichert alle Scene-Mapping-Rows aus dem Formular in game.settings.
   * Leere Keys oder leere UUIDs werden übersprungen.
   */
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
      this._getLogger().error?.('JANUS7 | saveSceneMaps failed', err);
      ui.notifications.error('Speichern fehlgeschlagen – Details in Konsole.');
    }
  }

  /**
   * Fügt eine leere Zeile für ein neues Scene-Mapping hinzu.
   * Kein direkter Save – der User füllt aus und klickt dann Speichern.
   */
  static async onAddSceneMap(event, _target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;

    // Direkt in DOM einfügen – kein Round-Trip nötig
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

  /**
   * Entfernt eine Scene-Mapping-Zeile aus dem DOM (noch kein Save).
   */
  static async onRemoveSceneMap(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    target.closest('[data-scene-row]')?.remove();
  }

  /**
   * Speichert alle Feature-Flags aus den Checkboxen.
   */
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
      this._getLogger().error?.('JANUS7 | saveFeatureFlags failed', err);
      ui.notifications.error('Speichern fehlgeschlagen – Details in Konsole.');
    }
  }

  // ---------------------------------------------------------------------------
  // Context
  // ---------------------------------------------------------------------------

  /** @override */
  async _prepareContext(_options) {
    if (!game.user?.isGM) {
      return { notReady: true, notGM: true };
    }

    // Scene-Mappings: Object → Array für Template-Iteration
    let rawMappings = {};
    try { rawMappings = JanusConfig.get('sceneMappings') ?? {}; } catch { /* unregistered */ }

    const sceneMappings = Object.entries(rawMappings).map(([key, uuid]) => ({ key, uuid }));

    // Feature-Flags
    let features = { atmosphere: false, autoMood: false, beamer: false, academySimulation: false };
    try { features = { ...features, ...(JanusConfig.get('features') ?? {}) }; } catch { /* unregistered */ }

    // Kill-Switches (für Info-Anzeige – editierbar im Foundry-Settings-Dialog)
    const killSwitches = {
      enableSimulation:  this._getBool('enableSimulation', true),
      enableAtmosphere:  this._getBool('enableAtmosphere', true),
      enableUI:          this._getBool('enableUI', true),
      enableQuestSystem: this._getBool('enableQuestSystem', true),
      enableTestRunner:  this._getBool('enableTestRunner', false),
    };

    // Verfügbare Szenen als UUID-Picker-Optionen
    const scenes = (game.scenes?.contents ?? []).map(s => ({
      uuid: s.uuid,
      name: s.name ?? s.id,
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      notReady: false,
      notGM: false,
      isGM: true,
      sceneMappings,
      features,
      killSwitches,
      scenes,
    };
  }

  /**
   * Sicherer Settings-Getter mit Fallback.
   * @private
   */
  _getBool(key, fallback = false) {
    try { return Boolean(JanusConfig.get(key)); } catch { return fallback; }
  }
}
