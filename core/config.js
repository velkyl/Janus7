import { MODULE_ID } from './common.js';

/**
 * Zentraler Zugriff auf game.settings für JANUS7.
 */
/**
 * JanusConfig
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class JanusConfig {
  static KILL_SWITCHES = Object.freeze({
    simulation: 'enableSimulation',
    atmosphere: 'enableAtmosphere',
    ui: 'enableUI',
    quests: 'enableQuestSystem',
    phase7: 'enablePhase7',
    gemini: 'enableGemini'
  });

  /**
   * Registers all JANUS7 Foundry settings.
   *
   * @returns {void}
   */
  static registerSettings() {
    game.settings.register(MODULE_ID, 'debugLevel', {
      name: 'JANUS7.Settings.DebugLevel.Name',
      hint: 'JANUS7.Settings.DebugLevel.Hint',
      scope: 'world',
      config: true,
      type: String,
      default: 'info',
      choices: {
        debug: 'JANUS7.Settings.DebugLevel.Choices.Debug',
        info: 'JANUS7.Settings.DebugLevel.Choices.Info',
        warn: 'JANUS7.Settings.DebugLevel.Choices.Warn',
        error: 'JANUS7.Settings.DebugLevel.Choices.Error',
        fatal: 'JANUS7.Settings.DebugLevel.Choices.Fatal'
      }
    });

    game.settings.register(MODULE_ID, 'activeProfile', {
      name: 'JANUS7.Settings.ActiveProfile.Name',
      hint: 'JANUS7.Settings.ActiveProfile.Hint',
      scope: 'world',
      config: true,
      type: String,
      default: 'punin',
      choices: {
        punin: 'JANUS7.Settings.ActiveProfile.Choices.Punin',
        festum: 'JANUS7.Settings.ActiveProfile.Choices.Festum',
        lowangen: 'JANUS7.Settings.ActiveProfile.Choices.Lowangen',
        custom: 'JANUS7.Settings.ActiveProfile.Choices.Custom'
      }
    });


    game.settings.register(MODULE_ID, 'slotResolverMaxLessons', {
      name: 'JANUS7.Settings.SlotResolverMaxLessons.Name',
      hint: 'JANUS7.Settings.SlotResolverMaxLessons.Hint',
      scope: 'world',
      config: true,
      type: Number,
      default: 1,
      range: { min: 1, max: 5, step: 1 }
    });

    game.settings.register(MODULE_ID, 'autoSave', {
      name: 'JANUS7.Settings.AutoSave.Name',
      hint: 'JANUS7.Settings.AutoSave.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    // UI: High-contrast mode (client-side accessibility)
    game.settings.register(MODULE_ID, 'uiHighContrast', {
      name: 'JANUS7.Settings.UiHighContrast.Name',
      hint: 'JANUS7.Settings.UiHighContrast.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false
    });

    // UI: Render Phase-4 event messages as ChatMessages (client-side, optional)
    game.settings.register(MODULE_ID, 'uiEventMessagesToChat', {
      name: 'JANUS7.Settings.UiEventMessagesToChat.Name',
      hint: 'JANUS7.Settings.UiEventMessagesToChat.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false
    });

    // Scene UUID Mapping (Hybrid/Beamer support)
    game.settings.register(MODULE_ID, 'sceneMappings', {
      name: 'JANUS7.Settings.SceneMappings.Name',
      hint: 'JANUS7.Settings.SceneMappings.Hint',
      scope: 'world',
      config: false,
      type: Object,
      default: {}
    });

    // Feature flags (Kill-Switches for optional subsystems)
    game.settings.register(MODULE_ID, 'features', {
      name: 'JANUS7.Settings.Features.Name',
      hint: 'JANUS7.Settings.Features.Hint',
      scope: 'world',
      config: false,
      type: Object,
      default: {
        atmosphere: false,
        autoMood: false,
        beamer: false,
        academySimulation: false,
        thesisManager: true,
        laborInterface: true,
        doomEngine: true
      }
    });

    // ---------------------------------------------------------------------
    // Feature Kill-Switches (user-facing)
    // ---------------------------------------------------------------------

    game.settings.register(MODULE_ID, 'enableSimulation', {
      name: 'JANUS7.Settings.EnableSimulation.Name',
      hint: 'JANUS7.Settings.EnableSimulation.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(MODULE_ID, 'enableAtmosphere', {
      name: 'JANUS7.Settings.EnableAtmosphere.Name',
      hint: 'JANUS7.Settings.EnableAtmosphere.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(MODULE_ID, 'enableUI', {
      name: 'JANUS7.Settings.EnableUI.Name',
      hint: 'JANUS7.Settings.EnableUI.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(MODULE_ID, 'enableQuestSystem', {
      name: 'JANUS7.Settings.EnableQuestSystem.Name',
      hint: 'JANUS7.Settings.EnableQuestSystem.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    // Phase 7: KI / AI Roundtrip (Kill-Switch)
    game.settings.register(MODULE_ID, 'enablePhase7', {
      name: 'JANUS7.Settings.EnablePhase7.Name',
      hint: 'JANUS7.Settings.EnablePhase7.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    // Persistierte Ergebnisse geführter manueller Tests.
    game.settings.register(MODULE_ID, 'manualTestResults', {
      name: 'JANUS7: Manual Test Results',
      hint: 'Persistierte Ergebnisse geführter manueller Tests.',
      scope: 'world',
      config: false,
      type: Object,
      default: {}
    });

    // Test Runner: run integrated smoke tests on startup + show result window
    game.settings.register(MODULE_ID, 'enableTestRunner', {
      name: 'JANUS7.Settings.EnableTestRunner.Name',
      hint: 'JANUS7.Settings.EnableTestRunner.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false
    });

    // ---------------------------------------------------------------------
    // Calendar / Time coupling (DSA5 calendar as the authoritative day model)
    // ---------------------------------------------------------------------

    game.settings.register(MODULE_ID, 'syncWithDSA5Calendar', {
      name: 'JANUS7.Settings.SyncWithDSA5Calendar.Name',
      hint: 'JANUS7.Settings.SyncWithDSA5Calendar.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    // UUID-Overlay: verknüpft JANUS7-JSON-IDs mit Foundry-UUIDs
    // Wird von JanusSyncEngine verwaltet – nicht manuell bearbeiten.
    game.settings.register(MODULE_ID, 'entityUUIDs', {
      name: 'JANUS7: Entity UUID Overlay',
      hint: 'Verknüpfungen zwischen JANUS7-JSON-IDs und Foundry-UUIDs.',
      scope: 'world',
      config: false,
      type: Object,
      default: {},
    });

    // Phase 2+: World-managed academy data store (optional).
    // Used by the Academy Seed Importer + Data Studio.
    // SSOT is structured JSON (in flags), NOT free-form journal text.
    game.settings.register(MODULE_ID, 'academyDataStore', {
      name: 'JANUS7: Academy Data Store',
      hint: 'Metadaten zum World-Import der Academy-Datensätze (Seed Import / Data Studio).',
      scope: 'world',
      config: false,
      type: Object,
      default: {},
    });

    // How many *real* seconds correspond to one JANUS slot.
    // Default: 6h => 4 slots/day maps cleanly to a 24h DSA5 day.
    game.settings.register(MODULE_ID, 'calendarSlotSeconds', {
      name: 'JANUS7.Settings.CalendarSlotSeconds.Name',
      hint: 'JANUS7.Settings.CalendarSlotSeconds.Hint',
      scope: 'world',
      config: true,
      type: Number,
      // Default maps the canonical 10-slot day to 24h.
      // 86400 / 10 = 8640 seconds (2h 24m)
      default: 8640,
      range: { min: 900, max: 86400, step: 900 }
    });

    // ── JanusCron Konfiguration ──────────────────────────────────────────

    game.settings.register(MODULE_ID, 'cronWeeklyEnabled', {
      name: 'JANUS7.Settings.CronWeeklyEnabled.Name',
      hint: 'JANUS7.Settings.CronWeeklyEnabled.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register(MODULE_ID, 'cronTrimesterEnabled', {
      name: 'JANUS7.Settings.CronTrimesterEnabled.Name',
      hint: 'JANUS7.Settings.CronTrimesterEnabled.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    // ── Gemini AI Konfiguration ──────────────────────────────────────────

    game.settings.register(MODULE_ID, 'geminiApiKey', {
      name: 'JANUS7.Settings.GeminiApiKey.Name',
      hint: 'JANUS7.Settings.GeminiApiKey.Hint',
      scope: 'world',
      config: true,
      type: String,
      default: '',
    });

    game.settings.register(MODULE_ID, 'enableGemini', {
      name: 'JANUS7.Settings.EnableGemini.Name',
      hint: 'JANUS7.Settings.EnableGemini.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
    });

    // Gemini System Prompt
    game.settings.register(MODULE_ID, 'geminiSystemPrompt', {
      name: 'JANUS7.Settings.GeminiSystemPrompt.Name',
      hint: 'JANUS7.Settings.GeminiSystemPrompt.Hint',
      scope: 'world',
      config: true,
      default: 'Wahre die Lore von Aventurien und den Tonfall eines erfahrenen Spielleiters. Antworte auf Deutsch.',
      type: String
    });

    // Imagen Visual Prompt (Style)
    game.settings.register(MODULE_ID, 'imagenSystemPrompt', {
      name: 'JANUS7.Settings.ImagenSystemPrompt.Name',
      hint: 'JANUS7.Settings.ImagenSystemPrompt.Hint',
      scope: 'world',
      config: true,
      default: 'Digital Art, DSA Style, Cinematic Lighting, Highly Detailed, Aventurian Aesthetic.',
      type: String
    });

    // Gemini Models selection
    game.settings.register(MODULE_ID, 'geminiTextModel', {
      name: 'JANUS7.Settings.GeminiTextModel.Name',
      hint: 'JANUS7.Settings.GeminiTextModel.Hint',
      scope: 'world',
      config: false,
      default: 'models/gemini-1.5-flash',
      type: String
    });

    game.settings.register(MODULE_ID, 'geminiVisualModel', {
      name: 'JANUS7.Settings.GeminiVisualModel.Name',
      hint: 'JANUS7.Settings.GeminiVisualModel.Hint',
      scope: 'world',
      config: false,
      default: 'models/imagen-3.0-generate-001',
      type: String
    });

    game.settings.register(MODULE_ID, 'availableGeminiTextModels', {
      name: 'JANUS7: Available Gemini Text Models',
      hint: 'Gecachte Liste der verfÃ¼gbaren Textmodelle von der Google API.',
      scope: 'world',
      config: false,
      type: Array,
      default: [
        { id: 'models/gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'models/gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
      ]
    });

    game.settings.register(MODULE_ID, 'availableGeminiImageModels', {
      name: 'JANUS7: Available Gemini Image Models',
      hint: 'Gecachte Liste der verfÃ¼gbaren Bildmodelle von der Google API.',
      scope: 'world',
      config: false,
      type: Array,
      default: [
        { id: 'models/imagen-3.0-generate-001', name: 'Imagen 3.0' }
      ]
    });

    game.settings.register(MODULE_ID, 'availableGeminiModels', {
      name: 'JANUS7: Available Gemini Models',
      hint: 'Gecachte Liste der verfügbaren Modelle von der Google API.',
      scope: 'world',
      config: false,
      type: Array,
      default: [
        { id: 'models/gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'models/gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'models/imagen-3.0-generate-001', name: 'Imagen 3.0' }
      ]
    });
  }

  /**
   * Reads a JANUS7 setting value by key.
   *
   * @param {string} key
   * @returns {unknown}
   */
  static get(key) {
    // Backwards-compat aliases (older builds / migrations)
    if (key === 'enableQuest') key = 'enableQuestSystem';
    // Guard: settings may not be registered yet during the init hook.
    // In that case return the safe default (true for all kill-switches).
    try {
      return game.settings.get(MODULE_ID, key);
    } catch (err) {
      // Expected during init before registerSettings() runs.
      if (String(err?.message ?? '').includes('not a registered game setting')) return true;
      throw err;
    }
  }

  /**
   * Writes a JANUS7 setting value.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<unknown>}
   */
  static async set(key, value) {
    return game.settings.set(MODULE_ID, key, value);
  }

  /**
   * Reads a non-JANUS world/system setting through the same central gateway.
   *
   * @param {string} namespace
   * @param {string} key
   * @returns {unknown}
   */
  static getForeign(namespace, key) {
    return game.settings.get(String(namespace ?? ''), String(key ?? ''));
  }

  /**
   * Writes a non-JANUS world/system setting through the central gateway.
   *
   * @param {string} namespace
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<unknown>}
   */
  static async setForeign(namespace, key, value) {
    return await game.settings.set(String(namespace ?? ''), String(key ?? ''), value);
  }

  /**
   * Resolve a configured Scene UUID by key (e.g. "mainHall", "beamer").
   * @param {string} key
   * @returns {string|null}
   */
  static getSceneUUID(key) {
    const map = this.get('sceneMappings') || {};
    return map?.[key] ?? null;
  }

  /**
   * Feature-Flag Gatekeeper.
   * @param {string} feature
   * @returns {boolean}
   */
  static isFeatureEnabled(feature) {
    const flags = this.get('features') || {};
    return Boolean(flags?.[feature]);
  }

  /**
   * User-facing Kill-Switch: whether a subsystem is enabled.
   * Keep this API small and explicit so we can harden + test it.
   * @param {"simulation"|"atmosphere"|"ui"|"quests"} subsystem
   * @returns {boolean}
   */
  static isSubsystemEnabled(subsystem) {
    switch (subsystem) {
      case 'simulation': return Boolean(this.get('enableSimulation'));
      case 'atmosphere': return Boolean(this.get('enableAtmosphere'));
      case 'ui': return Boolean(this.get('enableUI'));
      case 'quests': return Boolean(this.get('enableQuestSystem'));
      case 'gemini': return Boolean(this.get('enableGemini'));
      default: return true;
    }
  }

  /**
   * Returns the configured global debug level.
   *
   * @returns {unknown}
   */
  static debugLevel() {
    return this.get('debugLevel');
  }

  /**
   * Applies the configured log level to a logger instance when supported.
   *
   * @param {{ setLevel?: (level: unknown) => void }|null|undefined} logger
   * @returns {void}
   */
  static applyToLogger(logger) {
    if (!logger || typeof logger.setLevel !== 'function') return;
    const level = this.debugLevel();
    if (level) logger.setLevel(level);
  }

  // ---------------------------------------------------------------------------
  // UI Preferences (client-scoped) — Architecture Contract:
  // All game.settings reads/writes for UI preferences MUST go through here.
  // This keeps game.settings usage strictly inside core/.
  // ---------------------------------------------------------------------------

  /**
   * Reads a client-scoped UI preference.
   * @param {'uiHighContrast'} key
   * @param {unknown} [fallback]
   * @returns {unknown}
   */
  static getUIPreference(key, fallback = undefined) {
    try {
      return game.settings.get(MODULE_ID, key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Writes a client-scoped UI preference.
   * @param {'uiHighContrast'} key
   * @param {unknown} value
   * @returns {Promise<unknown>}
   */
  static async setUIPreference(key, value) {
    return game.settings.set(MODULE_ID, key, value);
  }
}
