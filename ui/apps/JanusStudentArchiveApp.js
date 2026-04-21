import { moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

// Nur offizielle Regel- und Quellenbände. Keine Abenteuer zulassen, um Spoiler zu vermeiden!
const SAFE_ARCHIVE_PACKAGES = [
  'dsa5-core',
  'dsa5-magic-1',
  'dsa5-magic-2',
  'dsa5-magic-3',
  'dsa5-herbarium',
  'dsa5-herbarium2',
  'dsa5-bestiary',
  'dsa5-bestiary2',
  'dsa5-compendium',
  'dsa5-compendium2',
  'dsa5-godsofaventuria',
  'dsa5-aventurian-taverns',
  'dsa5-armory',
  'dsa5-retosarmory',
  'dsa5-pandaemonium',
  'dsa5-pandaemonium2',
  'dsa5-transmutarium',
  'dsa5-animatorium',
  'dsa5-glueandhammer',
  'dsa5-optolith',
  'dsa5-almanach',
  'dsa5-aventuria-map'
];

export class JanusStudentArchiveApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-student-archive',
    classes: ['janus7-app', 'janus7-student-archive'],
    position: { width: 600, height: 750 },
    window: {
      title: 'JANUS7 · Akademie-Archiv (Lore & Wiki)',
      icon: 'fas fa-book-reader',
      resizable: true,
      minimizable: true
    },
    actions: {
      openSheet: JanusStudentArchiveApp.onOpenSheet
    }
  };

  static PARTS = {
    archive: { template: moduleTemplatePath('apps/student-archive.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._query = '';
    this._results = [];
    this._isBuilding = false;
    this._searchToken = null;
    
    // Bind search handler with debounce
    this._onSearchInput = foundry.utils.debounce(this._performSearch.bind(this), 300);
  }

  static showSingleton(options = {}) {
    if (this._instance?.rendered) {
      this._instance.bringToFront?.();
      return this._instance;
    }
    this._instance = new this(options);
    return this._instance;
  }

  get libraryService() {
    return this._getEngine()?.bridge?.library ?? null;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.domElement;
    if (!root) return;

    if (root.dataset.janusArchiveBindings !== 'true') {
      root.dataset.janusArchiveBindings = 'true';
      root.addEventListener('input', (event) => {
        const input = event.target?.closest?.('input[name="query"]');
        if (!input) return;
        this._query = input.value;
        this._onSearchInput();
      });
    }

    // Trigger initial building/fetching if empty
    if (!this.libraryService?.stats()?.built && !this._isBuilding) {
      this._isBuilding = true;
      this.refresh();
      
      Promise.resolve(this.libraryService?.ensureIndex?.({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] }))
        .then(() => this._performSearch())
        .catch((err) => {
          this._getLogger().warn?.('[StudentArchive] Index-Aufbau fehlgeschlagen', err);
        })
        .finally(() => {
          this._isBuilding = false;
          this.refresh();
        });
    }
  }

  async _performSearch() {
    const token = Symbol('archive-search');
    this._searchToken = token;
    const query = this._query?.trim() || '';
    
    if (!this.libraryService) return;

    if (!query) {
      this._results = [];
      this.refresh();
      return;
    }

    try {
      // Frage ALLE Journals über das Library Backend ab
      const allJournals = await this.libraryService.search({
        q: query,
        types: ['journal'],
        limit: 1000 // Get all to filter locally
      });
      if (this._searchToken !== token) return;

      // Filtere sicherheitsrelevante Module heraus (Whitelist-Ansatz)
      const safeJournals = allJournals.filter(entry => SAFE_ARCHIVE_PACKAGES.includes(entry.packageName));
      
      this._results = safeJournals.slice(0, 50); // Hard limit for rendering speed
      this._results.sort((a,b) => a.name.localeCompare(b.name, 'de'));

    } catch (err) {
      if (this._searchToken !== token) return;
      this._getLogger().warn?.('[StudentArchive] Suche fehlgeschlagen', err);
      this._results = [];
    }
    
    this.refresh();
  }

  _prepareContext(_options) {
    const safeResults = this._results.map(r => ({
      ...r,
      img: r.img || 'icons/svg/book.svg'
    }));

    return {
      query: this._query,
      isBuilding: this._isBuilding,
      results: safeResults,
      count: safeResults.length,
      limit: 50,
      overflow: safeResults.length >= 50
    };
  }

  static async onOpenSheet(event, target) {
    event?.preventDefault?.();
    const uuid = target?.dataset?.uuid;
    const inst = this;
    
    if (!uuid || !inst.libraryService) return;

    try {
      // Resolve lazy-loads the actual document from the compendium
      const doc = await inst.libraryService.resolve(uuid);
      if (doc && doc.sheet) {
        doc.sheet.render({ force: true });
      } else {
        ui.notifications?.warn(`Dokument ${uuid} konnte nicht aufgelöst werden.`);
      }
    } catch(err) {
      inst._getLogger().error?.('Fehler beim Öffnen des Archiv-Eintrags', err);
    }
  }
}

export default JanusStudentArchiveApp;
