import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusCommandCenterApp.js
 * @module janus7/ui
 * @phase 6
 * 
 * JANUS7 Command Center - Central Command & Diagnostics UI
 * 
 * Architecture:
 * - ApplicationV2 (Foundry v13+)
 * - Shared Command Registry with Control Panel
 * - 11 Command Categories (Doctor, State, Quest, Calendar, IO, Bridge, Audit, Test, Data, Atmosphere, Admin)
 * - GM-only access (enforced via permissions)
 * - Command execution via JanusCommands API
 * 
 * Usage:
 *   new JanusCommandCenterApp().render({ force: true });
 *   // or via Scene Control button (registered in integration)
 */

import { JanusCommands } from '../commands/index.js';
import { JanusPermissions } from '../permissions.js';
import { JanusConfig } from '../../core/config.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusCommandCenterApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  
  static DEFAULT_OPTIONS = {
    id: 'janus-command-center',
    classes: ['janus7-app'],
    window: {
      title: 'JANUS7 Command Center',
      minimizable: true,
      resizable: true
    },
    position: {
      width: 800,
      height: 600
    },
    actions: {
      executeCommand: this._onExecuteCommand,
      filterCategory: this._onFilterCategory,
      openSpotlight:  this._onOpenSpotlight,
      toggleBeamerMode: this._onToggleBeamerMode,
    }
  };

  static PARTS = {
    form: {
      template: moduleTemplatePath('templates/apps/command-center.hbs')
    }
  };

  /** @type {string} */
  _selectedCategory = 'all';

  /** @type {boolean} */
  _beamerMode = false;

  /** @type {string} */
  _inlineSearch = '';

  /** @type {HTMLElement|null} */
  _spotlightEl = null;

  /** @type {number} Spotlight Keyboard-Selected Index */
  _spotlightIdx = -1;

  /** @type {Function|null} Global Ctrl+K handler */
  _ctrlKHandler = null;

  /** @type {Record<string, unknown>} */
  _preparedCommandContext = {};

  /** @override */
  _configureRenderOptions(options) {
    // Foundry V13 expects `_configureRenderOptions` to RETURN the options object.
    // Also: some super implementations return a new object instance.
    options = super._configureRenderOptions(options ?? {}) ?? (options ?? {});

    options.window ??= {};
    delete options.title;
    delete options.icon;
    delete options.controls;
    options.window.title = "JANUS7 Command Center";
    return options;
  }

  /** @override */
  async _preRender(options) {
    await super._preRender?.(options);
    this._preparedCommandContext = this.#buildCommandContext();
  }

  /** @override */
  _prepareContext(_options) {
    return { ...this._preparedCommandContext };
  }

  #buildCommandContext() {
    return {
      isGM: game.user?.isGM ?? false,
      commandCategories: this._getCommandCategories(),
      selectedCategory: this._selectedCategory || 'all',
      beamerMode: this._beamerMode,
      systemVersion: game.modules?.get?.('Janus7')?.version ?? '?'
    };
  }

  /**
   * Get all command categories with their commands
   * @private
   * @returns {Array<{id: string, label: string, icon: string, commands: Array}>}
   */
  _getCommandCategories() {
    const phase7Enabled = JanusConfig.get('enablePhase7') !== false;
    return [
      {
        id: 'doctor',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Doctor') || 'Doctor / Health Checks',
        icon: 'fa-heartbeat',
        description: 'System diagnostics and health monitoring',
        commands: [
          { 
            id: 'runHealthCheck', 
            label: game.i18n?.localize?.('JANUS7.Commands.RunHealthCheck') || 'Run Health Check', 
            icon: 'fa-heartbeat',
            available: !!JanusCommands.runHealthCheck
          },
          { 
            id: 'validateState', 
            label: game.i18n?.localize?.('JANUS7.Commands.ValidateState') || 'Validate State', 
            icon: 'fa-check-circle',
            available: !!JanusCommands.validateState
          },
          { 
            id: 'copyDiagnostics', 
            label: game.i18n?.localize?.('JANUS7.Commands.CopyDiagnostics') || 'Copy Diagnostics', 
            icon: 'fa-clipboard',
            available: !!JanusCommands.copyDiagnostics
          }
        ]
      },
      {
        id: 'state',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.State') || 'State Inspector',
        icon: 'fa-database',
        description: 'State management and persistence',
        commands: [
          { id: 'saveState', label: 'Save State', icon: 'fa-save', available: !!JanusCommands.saveState },
          { id: 'exportState', label: 'Export State', icon: 'fa-download', available: !!JanusCommands.exportState },
          { id: 'importState', label: 'Import State', icon: 'fa-upload', available: !!JanusCommands.importState }
        ]
      },
      {
        id: 'quest',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Quest') || 'Quest Engine Console',
        icon: 'fa-scroll',
        description: 'Quest management and testing',
        commands: [
          { id: 'startQuest', label: 'Start Quest', icon: 'fa-play', available: !!JanusCommands.startQuest },
          { id: 'completeQuest', label: 'Complete Quest', icon: 'fa-check', available: !!JanusCommands.completeQuest },
          { id: 'listActiveQuests', label: 'List Active Quests', icon: 'fa-list', available: !!JanusCommands.listActiveQuests },
          { id: 'exportQuests', label: 'Export Quests', icon: 'fa-download', available: !!JanusCommands.exportQuests },
          { id: 'importQuests', label: 'Import Quests', icon: 'fa-upload', available: !!JanusCommands.importQuests }
        ]
      },
      {
        id: 'calendar',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Calendar') || 'Calendar / Akademie',
        icon: 'fa-calendar',
        description: 'Time management and progression',
        commands: [
          { id: 'advanceSlot', label: 'Advance Slot', icon: 'fa-forward', available: !!JanusCommands.advanceSlot },
          { id: 'advancePhase', label: 'Advance Phase', icon: 'fa-forward-step', available: !!JanusCommands.advancePhase },
          { id: 'advanceDay', label: 'Advance Day', icon: 'fa-calendar-day', available: !!JanusCommands.advanceDay },
          { id: 'resetCalendar', label: 'Reset Calendar', icon: 'fa-undo', available: !!JanusCommands.resetCalendar },
          { id: 'syncCalendar', label: 'Sync Calendar', icon: 'fa-sync', available: !!JanusCommands.syncCalendar }
        ]
      },
      {
        id: 'io',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.IO') || 'IO / Export-Import',
        icon: 'fa-exchange-alt',
        description: 'Data import and export operations',
        commands: [
          { id: 'exportState', label: 'Export State', icon: 'fa-download', available: !!JanusCommands.exportState },
          { id: 'importState', label: 'Import State', icon: 'fa-upload', available: !!JanusCommands.importState },
          { id: 'exportAcademy', label: 'Export Academy', icon: 'fa-school', available: !!JanusCommands.exportAcademy },
          { id: 'validateIO', label: 'Validate IO', icon: 'fa-check', available: !!JanusCommands.validateIO }
        ]
      },

      // -------------------------------------------------------------------
      // Phase 7 (Roundtrip)
      // -------------------------------------------------------------------
      {
        id: 'phase7',
        label: 'Phase 7 · KI Roundtrip',
        icon: 'fa-robot',
        description: phase7Enabled ? 'Open KI roundtrip UI (GM-only) (AI = legacy alias)' : 'Phase 7 disabled (enablePhase7=false)',
        commands: [
          { id: 'openKiRoundtrip', label: 'Open KI Roundtrip', icon: 'fa-brain', available: phase7Enabled && !!JanusCommands.openKiRoundtrip },
          { id: 'openKiBackupManager', label: 'KI Backup Manager', icon: 'fa-life-ring', available: phase7Enabled && !!JanusCommands.openKiBackupManager }
        ]
      },
      {
        id: 'bridge',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Bridge') || 'DSA5 Bridge Checks',
        icon: 'fa-bridge',
        description: 'DSA5 system integration diagnostics',
        commands: [
          { id: 'bridgeDiagnostics', label: 'Bridge Diagnostics', icon: 'fa-stethoscope', available: !!JanusCommands.bridgeDiagnostics },
          { id: 'bridgeActorLookup', label: 'Actor Lookup', icon: 'fa-user', available: !!JanusCommands.bridgeActorLookup },
          { id: 'bridgeRollTest', label: 'Roll Test', icon: 'fa-dice', available: !!JanusCommands.bridgeRollTest }
        ]
      },
      {
        id: 'audit',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Audit') || 'UI Action Audit',
        icon: 'fa-search',
        description: 'UI action tracking and debugging',
        commands: [
          { id: 'traceUIActions', label: 'Trace UI Actions', icon: 'fa-search', available: !!JanusCommands.traceUIActions },
          { id: 'viewActionLog', label: 'View Action Log', icon: 'fa-list', available: !!JanusCommands.viewActionLog }
        ]
      },
      {
        id: 'test',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Test') || 'Test Center',
        icon: 'fa-vial',
        description: 'Test execution and validation',
        commands: [
          { id: 'openTestHarness', label: 'Open Test Harness', icon: 'fa-vial', available: !!JanusCommands.openTestHarness },
          { id: 'runSmokeTests', label: 'Run Smoke Tests', icon: 'fa-flask', available: !!JanusCommands.runSmokeTests },
          { id: 'runFullCatalog', label: 'Run Full Catalog', icon: 'fa-list-check', available: !!JanusCommands.runFullCatalog }
        ]
      },
      {
        id: 'data',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Data') || 'Data Catalog Browser',
        icon: 'fa-folder-open',
        description: 'Browse academy data collections',
        commands: [
          { id: 'browseLessons', label: 'Browse Lessons', icon: 'fa-book', available: !!JanusCommands.browseLessons },
          { id: 'browseNPCs', label: 'Browse NPCs', icon: 'fa-users', available: !!JanusCommands.browseNPCs },
          { id: 'browseLocations', label: 'Browse Locations', icon: 'fa-map-marker', available: !!JanusCommands.browseLocations },
          { id: 'browseSpells', label: 'Browse Spells', icon: 'fa-wand-magic', available: !!JanusCommands.browseSpells }
        ]
      },
      {
        id: 'atmosphere',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Atmosphere') || 'Atmosphere / Audio',
        icon: 'fa-music',
        description: 'Audio and mood control',
        commands: [
          { id: 'applyMood', label: 'Apply Mood', icon: 'fa-music', available: !!JanusCommands.applyMood },
          { id: 'stopAtmosphere', label: 'Stop Atmosphere', icon: 'fa-stop', available: !!JanusCommands.stopAtmosphere },
          { id: 'setAtmosphereVolume', label: 'Set Volume', icon: 'fa-volume-up', available: !!JanusCommands.setAtmosphereVolume }
        ]
      },
      {
        id: 'tools',
        label: 'Tools & Konfiguration',
        icon: 'fa-tools',
        description: 'Sync-Panel, Config-Panel und weitere Werkzeuge',
        commands: [
          { id: 'openSyncPanel',   label: 'Welt-Synchronisation', icon: 'fa-sync-alt',    available: !!JanusCommands.openSyncPanel },
          { id: 'openConfigPanel', label: 'Konfiguration',        icon: 'fa-sliders-h',   available: !!JanusCommands.openConfigPanel },
                    { id: 'seedImportAcademyToJournals', label: 'Seed-Import: Academyâ†’Journals', icon: 'fa-seedling',    available: !!JanusCommands.seedImportAcademyToJournals },
          { id: 'openAcademyDataStudio',       label: 'Academy Data Studio',          icon: 'fa-pen-to-square', available: !!JanusCommands.openAcademyDataStudio },
          { id: 'openSessionPrepWizard',      label: 'Session Prep Wizard',         icon: 'fa-wand-sparkles', available: !!JanusCommands.openSessionPrepWizard },
          { id: 'openKiBackupManager',       label: 'KI Backup Manager',           icon: 'fa-life-ring', available: !!JanusCommands.openKiBackupManager },
          { id: 'openTestHarness',            label: 'Test-Ergebnisse',              icon: 'fa-vial',        available: !!JanusCommands.openTestHarness },
        ]
      },
      {
        id: 'admin',
        label: game.i18n?.localize?.('JANUS7.CommandCenter.Categories.Admin') || 'Admin Tools (GM-only)',
        icon: 'fa-user-shield',
        description: 'Destructive operations (use with caution)',
        commands: [
          { id: 'resetWorld', label: 'Reset World State', icon: 'fa-trash', available: !!JanusCommands.resetWorld },
          { id: 'createBackup', label: 'Create Backup', icon: 'fa-save', available: !!JanusCommands.createBackup },
          { id: 'restoreBackup', label: 'Restore Backup', icon: 'fa-undo', available: !!JanusCommands.restoreBackup }
        ]
      }
    ];
  }

  /**
   * Handle command execution
   * @private
   * @param {Event} event - Click event
   * @param {HTMLElement} target - Button element
   */
  static async _onExecuteCommand(event, target) {
    event.preventDefault();
    
    const commandId = target.dataset.commandId;
    if (!commandId) {
      this._getLogger().warn?.('[CommandCenter] No commandId in dataset');
      return;
    }
    
    const command = JanusCommands[commandId];
    if (!command) {
      ui.notifications.error(`Command not found: ${commandId}`);
      this._getLogger().error?.(`[CommandCenter] Command not found: ${commandId}`);
      return;
    }
    
    // Permission check
    if (!JanusPermissions.can(commandId, game.user)) {
      ui.notifications.error(game.i18n?.localize?.('JANUS7.UI.NoPermission.Action') || 'No permission');
      return;
    }
    
    // Execute
    try {
      const dataset = { ...target.dataset };
      const result = await command(dataset);
      
      if (result.success) {
        ui.notifications.info(`Command executed: ${commandId}`);
      } else if (!result.cancelled) {
        ui.notifications.error(`Command failed: ${commandId}`);
      }
    } catch (err) {
      this._getLogger().error?.(`[CommandCenter] Command execution failed:`, err);
      ui.notifications.error(`Command error: ${commandId}`);
    }
  }

  /**
   * Handle category filter
   * @private
   * @param {Event} event - Click event
   * @param {HTMLElement} target - Category button
   */
  static _onFilterCategory(event, target) {
    event.preventDefault();
    const categoryId = target.dataset.categoryId;
    this._selectedCategory = categoryId;
    this.render({ force: true });
  }
  // â”€â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** @override */
  async _onRender(context, options) {
    await super._onRender?.(context, options);

    const el = this.domElement;
    if (!el) return;

    // Beamer-Mode CSS-Klasse muss auf jedem Render mit dem View-State synchron bleiben.
    el.classList.toggle('j7-beamer-mode', Boolean(this._beamerMode));

    // Input-Wert darf pro Render aktualisiert werden, Listener aber nur einmal pro Root.
    const searchInput = el.querySelector('#j7-cmd-inline-search');
    if (searchInput) {
      searchInput.value = this._inlineSearch;
    }

    if (el.dataset.janusCommandBindings !== 'true') {
      el.dataset.janusCommandBindings = 'true';

      searchInput?.addEventListener('input', (event) => {
        this._inlineSearch = String(event.target?.value ?? '');
        this._filterCommands(this._inlineSearch);
      });
    }

    // Globaler Shortcut bleibt separat guardiert und wird in close() deregistriert.
    this._registerCtrlK();
  }

  /** @override */
  close(options) {
    this._deregisterCtrlK();
    this._closeSpotlight();
    return super.close(options);
  }

  // â”€â”€â”€ Ctrl+K Global Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _registerCtrlK() {
    if (this._ctrlKHandler) return;
    this._ctrlKHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        this._openSpotlight();
      }
    };
    document.addEventListener('keydown', this._ctrlKHandler, true);
  }

  _deregisterCtrlK() {
    if (this._ctrlKHandler) {
      document.removeEventListener('keydown', this._ctrlKHandler, true);
      this._ctrlKHandler = null;
    }
  }

  // â”€â”€â”€ Inline-Filter (in normaler Ansicht) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _filterCommands(query) {
    const q = query.toLowerCase().trim();
    const buttons = this.element?.querySelectorAll('.command-button') ?? [];
    for (const btn of buttons) {
      const label = (btn.querySelector('.command-label')?.textContent ?? '').toLowerCase();
      const title = (btn.title ?? '').toLowerCase();
      const match = !q || label.includes(q) || title.includes(q);
      btn.style.display = match ? '' : 'none';
    }
    // Kategorie-Container ausblenden wenn alle Buttons hidden
    const categories = this.element?.querySelectorAll('.command-category') ?? [];
    for (const cat of categories) {
      const visible = Array.from(cat.querySelectorAll('.command-button'))
        .some((b) => b.style.display !== 'none');
      cat.style.display = visible ? '' : 'none';
    }
  }

  // â”€â”€â”€ Spotlight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _buildSpotlightItems() {
    const all = [];
    for (const cat of this._getCommandCategories()) {
      for (const cmd of cat.commands) {
        all.push({ ...cmd, categoryLabel: cat.label, categoryId: cat.id, icon: cmd.icon });
      }
    }
    return all;
  }

  _openSpotlight() {
    if (this._spotlightEl) return;

    const overlay = document.createElement('div');
    overlay.className = 'j7-spotlight-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const panel = document.createElement('div');
    panel.className = 'j7-spotlight-panel';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'j7-spotlight-input-wrap';
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fas fa-search';
    inputWrap.appendChild(searchIcon);
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'j7-spotlight-input';
    searchInput.placeholder = 'Befehl suchenâ€¦';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = false;
    inputWrap.appendChild(searchInput);
    const hintSpan = document.createElement('span');
    hintSpan.className = 'j7-spotlight-hint';
    for (const key of ['â†‘â†“', 'â†µ', 'Esc']) {
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      hintSpan.appendChild(kbd);
      if (key !== 'Esc') hintSpan.append(' ');
    }
    inputWrap.appendChild(hintSpan);
    panel.appendChild(inputWrap);

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'j7-spotlight-results';
    resultsDiv.setAttribute('role', 'listbox');
    panel.appendChild(resultsDiv);

    const footer = document.createElement('div');
    footer.className = 'j7-spotlight-footer';
    for (const [keys, label] of [['â†‘â†“', 'Navigieren'], ['â†µ', 'Ausführen'], ['Esc', 'Schließen']]) {
      const span = document.createElement('span');
      for (const k of keys.split('')) {
        const kbd = document.createElement('kbd');
        kbd.textContent = k;
        span.appendChild(kbd);
      }
      span.append(` ${label}`);
      footer.appendChild(span);
    }
    panel.appendChild(footer);
    overlay.appendChild(panel);

    this._spotlightEl = overlay;
    this._spotlightIdx = -1;

    document.body.appendChild(overlay);

    const input   = overlay.querySelector('.j7-spotlight-input');
    const results = overlay.querySelector('.j7-spotlight-results');

    // Click outside â†’ close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeSpotlight();
    });

    // Input
    input.addEventListener('input', () => this._renderSpotlightResults(input.value, results));

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this._closeSpotlight(); return; }
      const items = Array.from(results.querySelectorAll('.j7-spotlight-item:not(.is-unavailable)'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._spotlightIdx = Math.min(this._spotlightIdx + 1, items.length - 1);
        this._updateSpotlightSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._spotlightIdx = Math.max(this._spotlightIdx - 1, -1);
        this._updateSpotlightSelection(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = items[this._spotlightIdx] ?? items[0];
        if (sel) sel.click();
      }
    });

    // Initial render (alles)
    this._renderSpotlightResults('', results);
    input.focus();
  }

  _renderSpotlightResults(q, container) {
    const query = q.toLowerCase().trim();
    const all   = this._buildSpotlightItems();

    const filtered = query
      ? all.filter((c) =>
          c.label?.toLowerCase().includes(query) ||
          c.categoryLabel?.toLowerCase().includes(query))
      : all;

    this._spotlightIdx = -1;
    container.replaceChildren(); // Clear container

    if (!filtered.length) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'j7-spotlight-empty';
      emptyDiv.textContent = `Keine Befehle gefunden für â€ž${q}”`;
      container.appendChild(emptyDiv);
      return;
    }

    // Gruppieren nach Kategorie
    const groups = new Map();
    for (const item of filtered.slice(0, 40)) {
      const g = groups.get(item.categoryId) ?? { label: item.categoryLabel, items: [] };
      g.items.push(item);
      groups.set(item.categoryId, g);
    }

    for (const [, group] of groups) {
      const groupLabelDiv = document.createElement('div');
      groupLabelDiv.className = 'j7-spotlight-group-label';
      groupLabelDiv.textContent = group.label;
      container.appendChild(groupLabelDiv);

      for (const cmd of group.items) {
        const unavail = !cmd.available;

        const itemDiv = document.createElement('div');
        itemDiv.className = `j7-spotlight-item ${unavail ? 'is-unavailable' : ''}`.trim();
        itemDiv.setAttribute('role', 'option');
        itemDiv.dataset.commandId = cmd.id;
        if (unavail) {
          itemDiv.setAttribute('aria-disabled', 'true');
        } else {
          itemDiv.setAttribute('tabindex', '-1');
        }

        const iconI = document.createElement('i');
        const iconClasses = `fas ${cmd.icon || ''}`.trim().split(/\s+/);
        iconI.classList.add(...iconClasses);
        itemDiv.appendChild(iconI);

        const labelSpan = document.createElement('span');
        labelSpan.className = 'j7-spotlight-item-label';
        labelSpan.textContent = cmd.label;
        itemDiv.appendChild(labelSpan);

        const catSpan = document.createElement('span');
        catSpan.className = 'j7-spotlight-item-cat';
        catSpan.textContent = group.label;
        itemDiv.appendChild(catSpan);

        container.appendChild(itemDiv);

        if (!unavail) {
          itemDiv.addEventListener('click', () => {
            const cmdId = itemDiv.dataset.commandId;
            this._closeSpotlight();
            this._executeCommandById(cmdId);
          });
        }
      }
    }
  }

  _updateSpotlightSelection(items) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-selected', i === this._spotlightIdx);
      if (i === this._spotlightIdx) items[i].scrollIntoView({ block: 'nearest' });
    }
  }

  _closeSpotlight() {
    if (this._spotlightEl) {
      this._spotlightEl.remove();
      this._spotlightEl = null;
    }
  }

  async _executeCommandById(commandId) {
    const command = JanusCommands[commandId];
    if (!command) {
      ui?.notifications?.error?.(`Befehl nicht gefunden: ${commandId}`);
      return;
    }
    if (!JanusPermissions.can(commandId, game.user)) {
      ui?.notifications?.error?.(game.i18n?.localize?.('JANUS7.UI.NoPermission.Action') || 'Keine Berechtigung');
      return;
    }
    try {
      const result = await command({});
      if (result?.success) ui?.notifications?.info?.(`âœ“ ${commandId}`);
      else if (!result?.cancelled) ui?.notifications?.warn?.(`Fehlgeschlagen: ${commandId}`);
    } catch (err) {
      this._getLogger().error?.('[CommandCenter] Spotlight-Ausführung fehlgeschlagen:', err);
      ui?.notifications?.error?.(`Fehler: ${commandId}`);
    }
  }

  // â”€â”€â”€ Action Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  static async _onOpenSpotlight(event, target) {
    event.preventDefault();
    this._openSpotlight();
  }

  static _onToggleBeamerMode(event, target) {
    event.preventDefault();
    this._beamerMode = !this._beamerMode;
    const el = this.element;
    if (el) el.classList.toggle('j7-beamer-mode', this._beamerMode);
    const btn = target;
    btn?.classList?.toggle('active', this._beamerMode);
  }

}

