import { moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusQuartermasterApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-quartermaster',
    classes: ['janus7-app', 'janus7-quartermaster'],
    position: { width: 750, height: 650 },
    window: {
      title: 'JANUS7 · Akademie-Quartiermeister',
      icon: 'fas fa-coins',
      resizable: true,
      minimizable: true
    },
    actions: {
      buyItem: 'onBuyItem',
      openSheet: 'onOpenSheet'
    }
  };

  static PARTS = {
    market: { template: moduleTemplatePath('apps/quartermaster.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._query = '';
    this._typeFilter = 'equipment';
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

  get journalBridge() {
    return this._getEngine()?.bridge?.journal ?? null;
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
      
      this.libraryService?.ensureIndex({ documentNames: ['Item', 'Actor', 'Scene'] }).then(() => {
        this._isBuilding = false;
        this._performSearch();
      });
    } else {
      this._performSearch();
    }
  }

  async _performSearch() {
    const query = this._query?.trim() || '';
    const typeFilter = this._typeFilter || 'equipment';
    
    if (!this.libraryService) return;

    try {
      // Bestimme die gesuchten Foundry Item Typen
      let typesToSearch = [typeFilter];
      if (typeFilter === 'all') {
        typesToSearch = ['equipment', 'consumable', 'meleeweapon', 'rangeweapon', 'armor', 'plant', 'poison', 'disease'];
      }

      // 1. Suche im internen Library Service
      const rawItems = await this.libraryService.search({
        q: query,
        types: typesToSearch,
        limit: 100
      });

      // 2. Suche in offiziellen DSA5 Modulen (Option 1: Smart Quartermaster)
      const dsa5Bridge = this._getEngine()?.bridge?.dsa5;
      if (dsa5Bridge?.scanner && query.length > 2) {
        const moduleItems = [];
        for (const t of typesToSearch) {
          moduleItems.push(...await dsa5Bridge.searchModuleArmory(query, t));
        }
        
        // Merge & De-duplicate
        for (const mItem of moduleItems) {
          if (!rawItems.some(ri => ri.name === mItem.name)) {
            rawItems.push({
              ...mItem,
              uuid: `Compendium.${mItem.pack}.${mItem._id}`
            });
          }
        }
      }
      
      // Filtere alles weg, was keinen brauchbaren Namen hat
      this._results = rawItems
        .filter(i => i.name && !i.name.includes("Unbekannt"))
        .sort((a,b) => a.name.localeCompare(b.name, 'de'));
        
    } catch (err) {
      this._logger?.warn('[Quartermaster] Suche fehlgeschlagen', err);
      this._results = [];
    }
    
    this.refresh();
  }

  _prepareContext(_options) {
    // Wer kauft ein? Der Actor des Spielers oder ein selektierter Token des GMs
    let buyer = game.user?.character;
    if (!buyer && game.user?.isGM && canvas.tokens?.controlled?.length > 0) {
      buyer = canvas.tokens.controlled[0].actor;
    }

    const safeResults = this._results.map(r => ({
      ...r,
      img: r.img || 'icons/svg/item-bag.svg',
      // Foundry DSA5 speichert Items oft in Kreuzern/Silber â€“ wir geben den rohen Zahlenwert als Indikator aus
      priceDisplay: r.price > 0 ? `${r.price}` : 'Kostenlos'
    }));

    return {
      query: this._query,
      typeFilter: this._typeFilter,
      isBuilding: this._isBuilding,
      results: safeResults,
      buyerName: buyer?.name || "Kein Käufer gewählt",
      hasBuyer: !!buyer,
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

  async onBuyItem(event, target) {
    event?.preventDefault?.();
    const uuid = target?.dataset?.uuid;
    const price = target?.dataset?.price || 0;
    const inst = this;
    
    if (!uuid || !inst.libraryService) return;

    // Finde den Käufer
    let buyer = game.user?.character;
    if (!buyer && game.user?.isGM && canvas.tokens?.controlled?.length > 0) {
      buyer = canvas.tokens.controlled[0].actor;
    }

    if (!buyer) {
      ui.notifications?.warn("Es wurde kein Käufer gefunden (Wähle einen Token oder einen Spieler-Charakter).");
      return;
    }

    try {
      // 1. Geld abziehen (wenn Preis > 0)
      if (Number(price) > 0 && inst.journalBridge) {
        // Nutze GM-Rechte Check oder delegiere an Bridge
        const paySuccess = await inst.journalBridge.handlePayment(buyer, String(price), 'pay');
        if (!paySuccess && game.user?.isGM) {
           ui.notifications?.warn("Zahlung via DSA5Payment fehlgeschlagen. Item wird dennoch transferiert.");
        }
      }

      // 2. Dokument holen
      const sourceDoc = await inst.libraryService.resolve(uuid);
      if (!sourceDoc) {
        ui.notifications?.error("Gegenstand nicht im Lager gefunden!");
        return;
      }

      // 3. Dem Inventar hinzufügen
      const itemData = sourceDoc.toObject();
      await Item.create(itemData, { parent: buyer });
      
      ui.notifications?.info(`Gekauft: ${itemData.name} für ${buyer.name}.`);
    } catch(err) {
      inst._logger?.error('Fehler beim Kauf', err);
      ui.notifications?.error('Der Handel konnte nicht abgeschlossen werden.');
    }
  }
}

export default JanusQuartermasterApp;

