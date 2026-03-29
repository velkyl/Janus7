import { moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusLibraryBrowserApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-library-browser',
    classes: ['janus7-app', 'janus7-library-browser'],
    position: { width: 800, height: 600 },
    window: {
      title: 'JANUS7 · Director Library Spotlight',
      icon: 'fas fa-search',
      resizable: true,
      minimizable: true
    },
    actions: {
      refreshIndex: JanusLibraryBrowserApp.onRefreshIndex,
      openSheet: JanusLibraryBrowserApp.onOpenSheet,
      executeAction: JanusLibraryBrowserApp.onExecuteAction
    }
  };

  static PARTS = {
    library: { template: moduleTemplatePath('apps/library-browser.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._query = '';
    this._typeFilter = '';
    this._results = [];
    this._isBuilding = false;
    this._buildTimeout = null;
    
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
    
    // Attach input listeners
    const input = this.element.querySelector('input[name="query"]');
    if (input) {
      input.addEventListener('input', (e) => {
        this._query = e.target.value;
        this._onSearchInput();
      });
    }

    const select = this.element.querySelector('select[name="typeFilter"]');
    if (select) {
      select.addEventListener('change', (e) => {
        this._typeFilter = e.target.value;
        this._performSearch();
      });
    }

    // Attach drag listener for items
    const listItems = this.element.querySelectorAll('li[draggable="true"]');
    for (const li of listItems) {
      li.addEventListener('dragstart', this._onDragStart.bind(this));
    }

    // Trigger initial building/fetching if empty
    if (!this.libraryService?.stats()?.built && !this._isBuilding) {
      this._isBuilding = true;
      this.refresh();
      
      this.libraryService?.ensureIndex({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] }).then(() => {
        this._isBuilding = false;
        this._performSearch();
      });
    }
  }

  _onDragStart(event) {
    const uuid = event.currentTarget.dataset.uuid;
    if (!uuid) return;
    
    // Pass the actual Foundry document type for correct dropping (Actor, Item, Scene)
    const docName = event.currentTarget.dataset.documentName || "Item";
    
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: docName,
      uuid: uuid
    }));
  }

  async _performSearch() {
    const query = this._query?.trim() || '';
    const typeFilter = this._typeFilter || null;
    
    if (!this.libraryService) return;

    if (!query && !typeFilter) {
      this._results = [];
      this.refresh();
      return;
    }

    try {
      this._results = await this.libraryService.search({
        q: query,
        types: typeFilter ? [typeFilter] : null,
        limit: 100, // Hard limit for rendering speed
        sortBy: 'name'
      });
    } catch (err) {
      this._logger?.warn('[LibraryBrowser] Suche fehlgeschlagen', err);
      this._results = [];
    }
    
    this.refresh();
  }

  async _prepareContext(_options) {
    const libStats = this.libraryService?.stats() ?? { packs: 0, entries: 0, built: false };
    
    // Map internal types to user readable
    const safeResults = this._results.map(r => ({
      ...r,
      img: r.img || 'icons/svg/book.svg',
      isExecutable: r.documentName === 'Macro' || r.documentName === 'RollTable'
    }));

    return {
      query: this._query,
      typeFilter: this._typeFilter,
      stats: libStats,
      isBuilding: this._isBuilding,
      results: safeResults,
      limit: 100,
      overflow: safeResults.length >= 100
    };
  }

  static async onRefreshIndex(event, target) {
    event?.preventDefault?.();
    const inst = this;
    if (inst._isBuilding) return;

    inst._isBuilding = true;
    inst.refresh();

    try {
      await inst.libraryService?.refresh({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] });
      await inst._performSearch();
    } catch(err) {
      inst._logger?.error('Fehler beim Refresh der Bibliothek', err);
    } finally {
      inst._isBuilding = false;
      inst.refresh();
    }
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
        doc.sheet.render(true);
      } else {
        ui.notifications?.warn(`Dokument ${uuid} konnte nicht aufgelöst werden.`);
      }
    } catch(err) {
      inst._logger?.error('Fehler beim Öffnen des Sheets', err);
    }
  }

  static async onExecuteAction(event, target) {
    event?.preventDefault?.();
    const uuid = target?.dataset?.uuid;
    const inst = this;
    
    if (!uuid || !inst.libraryService) return;

    try {
      const doc = await inst.libraryService.resolve(uuid);
      if (!doc) return;
      
      if (doc.documentName === 'Macro') {
        doc.execute();
      } else if (doc.documentName === 'RollTable') {
        doc.draw();
      } else {
        ui.notifications?.warn(`Dokument-Typ ${doc.documentName} kann nicht direkt ausgeführt werden.`);
      }
    } catch(err) {
      inst._logger?.error('Fehler beim Ausführen', err);
    }
  }
}

export default JanusLibraryBrowserApp;
