import { moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

// Typische aventurische Vornamen für die Akademie (M/W)
const M_NAMES = ['Alrik', 'Brin', 'Rondrigan', 'Hesindian', 'Leomar', 'Praiodan', 'Gerion', 'Gideon', 'Hal', 'Perric', 'Falk', 'Rakor', 'Roderik', 'Valerius'];
const W_NAMES = ['Alrike', 'Hesindiane', 'Rondra', 'Nyra', 'Salarina', 'Yasmina', 'Tsaja', 'Peraine', 'Lysira', 'Danila', 'Tula', 'Ayla', 'Niam'];
const SURNAMES = ['von Gareth', 'Gorm', 'Galahan', 'Sturmfels', 'Eberblut', 'Grummel', 'Schattenspiel', 'Sonnenstrahl', 'Goldenzahn', 'Wasserstein', 'Löwenhaupt', 'der Einäugige'];

function randomizeName() {
  const isMale = Math.random() > 0.5;
  const firstNames = isMale ? M_NAMES : W_NAMES;
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  return `${first} ${last}`;
}

export class JanusEnrollmentApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-enrollment-scanner',
    classes: ['janus7-app', 'janus7-enrollment'],
    position: { width: 700, height: 600 },
    window: {
      title: 'JANUS7 · Immatrikulations-Scanner (NSC Generator)',
      icon: 'fas fa-user-plus',
      resizable: true,
      minimizable: true
    },
    actions: {
      importNpc: 'onImportNpc',
      openSheet: 'onOpenSheet'
    }
  };

  static PARTS = {
    content: { template: moduleTemplatePath('apps/enrollment-scanner.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._query = '';
    this._typeFilter = 'npc';
    this._results = [];
    this._isBuilding = false;
    
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

    if (!this.libraryService?.stats()?.built && !this._isBuilding) {
      this._isBuilding = true;
      this.refresh();
      
      this.libraryService?.ensureIndex({ documentNames: ['Item', 'Actor', 'Scene', 'Macro', 'RollTable', 'JournalEntry'] }).then(() => {
        this._isBuilding = false;
        this._performSearch();
      });
    } else {
      this._performSearch();
    }
  }

  async _performSearch() {
    const query = this._query?.trim() || '';
    const typeFilter = this._typeFilter || 'npc';
    
    if (!this.libraryService) return;

    try {
      let typesToSearch = typeFilter === 'all' ? ['npc', 'character', 'creature'] : [typeFilter];
      
      const allActors = await this.libraryService.search({
        q: query,
        types: typesToSearch,
        limit: 100
      });
      
      this._results = allActors.sort((a,b) => a.name.localeCompare(b.name, 'de'));
    } catch (err) {
      this._logger?.warn('[Enrollment] Suche fehlgeschlagen', err);
      this._results = [];
    }
    
    this.refresh();
  }

  _prepareContext(_options) {
    const safeResults = this._results.map(r => ({
      ...r,
      img: r.img || 'icons/svg/mystery-man.svg',
      suggestedName: randomizeName() // Für die Vorschau (ändert sich bei refresh)
    }));

    return {
      query: this._query,
      typeFilter: this._typeFilter,
      isBuilding: this._isBuilding,
      results: safeResults,
      count: safeResults.length
    };
  }

  async onOpenSheet(event, target) {
    event?.preventDefault?.();
    const uuid = target?.dataset?.uuid;
    const inst = this;
    if (!uuid || !inst.libraryService) return;

    try {
      const doc = await inst.libraryService.resolve(uuid);
      if (doc && doc.sheet) doc.sheet.render({ force: true });
    } catch(err) {
      inst._logger?.error('Fehler beim Öffnen', err);
    }
  }

  async onImportNpc(event, target) {
    event?.preventDefault?.();
    const uuid = target?.dataset?.uuid;
    const inst = this;
    if (!uuid || !inst.libraryService) return;

    try {
      const sourceDoc = await inst.libraryService.resolve(uuid);
      if (!sourceDoc) return;
      
      // Neues Actor-Dokument in Foundry World erstellen (Klonen)
      const actorData = sourceDoc.toObject();
      actorData._id = foundry.utils.randomID();
      
      // Einen neuen Namen geben, falls es ein NPC/Archetyp ist, um Konflikte zu vermeiden
      const genName = randomizeName();
      actorData.name = `${actorData.name} - ${genName}`;

      const created = await Actor.create(actorData);
      
      if (created) {
        ui.notifications?.info(`Student/NSC generiert: ${created.name}`);
        created.sheet.render({ force: true });
      }
    } catch(err) {
      inst._logger?.error('Fehler beim Importieren des NSC', err);
      ui.notifications?.error('NSC konnte nicht in die Welt importiert werden.');
    }
  }
}

export default JanusEnrollmentApp;

