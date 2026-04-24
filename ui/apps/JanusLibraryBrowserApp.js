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
      refreshIndex: 'onRefreshIndex',
      openSheet: 'onOpenSheet',
      executeAction: 'onExecuteAction'
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

    if (root.dataset.janusLibraryBindings !== 'true') {
      root.dataset.janusLibraryBindings = 'true';

      root.addEventListener('input', (event) => {
        const input = event.target?.closest?.('input[name="query"]');
        if (!input) return;
        this._query = input.value;
        this._onSearchInput();
      });

      root.addEventListener('change', (event) => {
        const select = event.target?.closest?.('select[name="typeFilter"]');
        if (!select) return;
        this._typeFilter = select.value;
        this._performSearch();
      });

      root.addEventListener('dragstart', (event) => {
        const item = event.target?.closest?.('li[draggable="true"]');
        if (!item) return;
        this._onDragStart({ ...event, currentTarget: item });
      });
    }

    // Trigger initial building/fetching if empty
    if (!this.libraryService?.stats()?.built && !this._isBuilding) {
      this._isBuilding = true;
      this.refresh();
      
      Promise.resolve(this.libraryService?.ensureIndex?.({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] }))
        .then(() => this._performSearch())
        .catch((err) => {
          this._getLogger().warn?.('[LibraryBrowser] Index-Aufbau fehlgeschlagen', err);
        })
        .finally(() => {
          this._isBuilding = false;
          this.refresh();
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
    const token = Symbol('library-search');
    this._searchToken = token;
    const query = this._query?.trim() || '';
    const typeFilter = this._typeFilter || null;
    
    if (!this.libraryService) return;

    if (!query && !typeFilter) {
      this._results = [];
      this.refresh();
      return;
    }

    try {
      const results = await this.libraryService.search({
        q: query,
        types: typeFilter ? [typeFilter] : null,
        limit: 100, // Hard limit for rendering speed
        sortBy: 'name'
      });
      
      // 2. Suche in offiziellen Regelwerken (Option 2: Bibliotheks-Crawler)
      const dsa5Bridge = this._getEngine()?.bridge?.dsa5;
      if (dsa5Bridge?.scanner && query.length > 2 && (!typeFilter || typeFilter === 'JournalEntry')) {
        const moduleResults = await dsa5Bridge.searchModuleLibrary(query);
        
        // Merge & De-duplicate
        for (const mRes of moduleResults) {
          if (!results.some(ri => ri.name === mRes.name)) {
            results.push({
              ...mRes,
              uuid: `Compendium.${mRes.pack}.${mRes._id}`,
              img: 'icons/svg/book.svg'
            });
          }
        }
      }

      if (this._searchToken !== token) return;
      this._results = results;
    } catch (err) {
      if (this._searchToken !== token) return;
      this._getLogger().warn?.('[LibraryBrowser] Suche fehlgeschlagen', err);
      this._results = [];
    }
    
    this.refresh();
  }

  async _preRender(options) {
    await super._preRender(options);
    const libStats = this.libraryService?.stats() ?? { packs: 0, entries: 0, built: false };
    
    // Map internal types to user readable
    const safeResults = this._results.map(r => ({
      ...r,
      img: r.img || 'icons/svg/book.svg',
      isExecutable: r.documentName === 'Macro' || r.documentName === 'RollTable'
    }));

    this.__renderCache = {
      query: this._query,
      typeFilter: this._typeFilter,
      stats: libStats,
      isBuilding: this._isBuilding,
      results: safeResults,
      limit: 100,
      overflow: safeResults.length >= 100
    };
  }

  _prepareContext(_options) {
    return {
      ...(this.__renderCache ?? {})
    };
  }

  async onRefreshIndex(event, target) {
    event?.preventDefault?.();
    const inst = this;
    if (inst._isBuilding) return;

    inst._isBuilding = true;
    inst.refresh();

    try {
      await inst.libraryService?.refresh({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] });
      await inst._performSearch();
    } catch(err) {
      inst._getLogger().error?.('Fehler beim Refresh der Bibliothek', err);
    } finally {
      inst._isBuilding = false;
      inst.refresh();
    }
  }

  async onOpenSheet(event, target) {
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
      inst._getLogger().error?.('Fehler beim Öffnen des Sheets', err);
    }
  }

  async onExecuteAction(event, target) {
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
      inst._getLogger().error?.('Fehler beim Ausführen', err);
    }
  }
}

export default JanusLibraryBrowserApp;

