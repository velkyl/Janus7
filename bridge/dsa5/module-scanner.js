/**
 * @file bridge/dsa5/module-scanner.js
 * @module janus7/bridge
 * @description Central registry for active DSA5 modules and their content providers.
 */

/**
 * Base class for module-specific content providers.
 */
export class DSA5ContentProvider {
  constructor({ id, info, logger }) {
    this.id = id;
    this.info = info; // { title, packs, version }
    this.logger = logger;
  }

  /**
   * Returns a list of relevant compendium packs for this provider.
   * @param {string} [type] Optional filter (e.g., 'Item', 'Actor', 'JournalEntry')
   */
  getPacks(type) {
    if (!type) return this.info.packs;
    return this.info.packs.filter(p => p.metadata.type === type);
  }
}

/**
 * Provider for Armory (Rüstkammer) modules.
 * Covers Options 1 & 14 (Ausrüstung & Assets)
 */
export class DSA5ArmoryProvider extends DSA5ContentProvider {
  /**
   * Searches for items in the armory modules.
   * @param {string} query
   * @param {string} [type] - Optional Foundry item type (e.g., 'meleeweapon', 'armor')
   */
  async searchItems(query, type) {
    const packs = this.getPacks('Item');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex({ fields: ['system.price', 'img', 'type'] });
      const hits = index.filter(i => {
        const matchesType = !type || i.type === type;
        const matchesQuery = !normalizedQuery || i.name.toLowerCase().includes(normalizedQuery);
        return matchesType && matchesQuery;
      });
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        price: h.system?.price?.value ?? 0
      })));
    }
    return results;
  }

  /**
   * Get specific assets (images) for equipment.
   */
  async getEquipmentIcon(itemName) {
    const hits = await this.searchItems(itemName);
    return hits[0]?.img ?? null;
  }
}

/**
 * Provider for Library/Rulebook (Kodex/Compendium) modules.
 * Covers Options 2 & 15 (Bibliothek & Kalender/Regeln)
 */
export class DSA5LibraryProvider extends DSA5ContentProvider {
  async searchJournals(query) {
    const packs = this.getPacks('JournalEntry');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex();
      const hits = index.filter(j => j.name.toLowerCase().includes(normalizedQuery));
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'JournalEntry'
      })));
    }
    return results;
  }
}

export class DSA5HerbariumProvider extends DSA5ContentProvider {
  /**
   * Searches for plants in the herbarium modules.
   * @param {string} query
   */
  async getPlants(query) {
    const packs = this.getPacks('Item');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex({ fields: ['system.price', 'img', 'type'] });
      const hits = index.filter(i => i.type === 'plant' && (!normalizedQuery || i.name.toLowerCase().includes(normalizedQuery)));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'Item',
        price: h.system?.price?.value ?? 0
      })));
    }
    return results;
  }
}

/**
 * Provider for Bestiary modules.
 * Covers Option 8 (Bestiarium & Training)
 */
export class DSA5BestiaryProvider extends DSA5ContentProvider {
  /**
   * Searches for creatures in the bestiary modules.
   * @param {string} query
   */
  async getCreatures(query) {
    const packs = this.getPacks('Actor');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex({ fields: ['img', 'type'] });
      const hits = index.filter(a => (a.type === 'npc' || a.type === 'creature') && (!normalizedQuery || a.name.toLowerCase().includes(normalizedQuery)));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'Actor',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }
}

/**
 * Provider for Regional modules.
 * Covers Options 5 & 6 (Regionaler Kontext & Magna Carta Bridge)
 */
export class DSA5RegionalProvider extends DSA5ContentProvider {
  getRegionKey() {
    return this.id.replace('dsa5-', '');
  }

  /**
   * Liefert das UI-Thema für die Region.
   */
  getThemeData() {
    const key = this.getRegionKey();
    const themes = {
      thorwal: { color: '#2b5c5e', name: 'Thorwal & das Gjalskerland' },
      riverlands: { color: '#3a6629', name: 'Die Flusslande' },
      warringkingdoms: { color: '#662929', name: 'Die Streitenden Königreiche' },
      havena: { color: '#2b4b5e', name: 'Havena - Versunkene Geheimnisse' },
      desertkingdom: { color: '#c49a45', name: 'Das Wüstenreich' },
      steamingjungles: { color: '#1a472a', name: 'Die Dampfenden Dschungel' },
      winterwatch: { color: '#aab6c4', name: 'Die Winterwacht' },
      suncoast: { color: '#e6c84c', name: 'Die Sonnenküste' }
    };
    return themes[key] || { color: '#4a4a4a', name: this.info.title };
  }
}

/**
 * Provider for Social/Tavern modules.
 * Covers Option 7 (Tavernen & Gerüchte)
 */
export class DSA5SocialProvider extends DSA5ContentProvider {
  /**
   * Searches for taverns and social hubs in the modules.
   */
  async getTaverns() {
    const packs = this.getPacks('JournalEntry');
    const results = [];
    for (const pack of packs) {
      const index = await pack.getIndex();
      // Suche nach Journalen, die Tavernen beschreiben
      const hits = index.filter(j => j.name.toLowerCase().includes('schänke') || j.name.toLowerCase().includes('taverne') || j.name.toLowerCase().includes('gasthaus'));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'JournalEntry',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }
}

/**
 * Provider for Core System / Rules.
 * Covers Options 11 & 15 (Status Monitor & Kalender)
 */
export class DSA5SystemProvider extends DSA5ContentProvider {
  /**
   * Extracts calendar events (festivals, etc.) from the official Almanach.
   */
  async getCalendarEvents() {
    const packs = this.getPacks('JournalEntry');
    const results = [];
    for (const pack of packs) {
      if (!pack.metadata.name.includes('calendar') && !pack.metadata.name.includes('almanach')) continue;
      
      const index = await pack.getIndex();
      // Suche nach Seiten, die Feiertage oder Ereignisse beschreiben
      const hits = index.filter(j => 
        j.name.toLowerCase().includes('feiertag') || 
        j.name.toLowerCase().includes('ereignis') ||
        j.name.toLowerCase().includes('festum')
      );
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'JournalEntry',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }

  /**
   * Searches for rules (conditions, status effects) in the system modules.
   */
  async searchRules(query) {
    const packs = this.getPacks('JournalEntry');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex();
      const hits = index.filter(j => !normalizedQuery || j.name.toLowerCase().includes(normalizedQuery));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'JournalEntry',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }
}

/**
 * Provider for Companion modules.
 * Covers Option 12 (Begleiter)
 */
export class DSA5CompanionProvider extends DSA5ContentProvider {
  /**
   * Searches for companion actors (horses, dogs, familiars) in the modules.
   * @param {string} [query]
   */
  async getCompanions(query) {
    const packs = this.getPacks('Actor');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex({ fields: ['img', 'type'] });
      const hits = index.filter(a => (a.type === 'npc' || a.type === 'creature') && (!normalizedQuery || a.name.toLowerCase().includes(normalizedQuery)));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'Actor',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }
}

/**
 * Provider for Maps & Visual Assets.
 * Covers Option 14 (Asset-Explorer)
 */
export class DSA5AssetProvider extends DSA5ContentProvider {
  /**
   * Searches for scenes and maps in the modules.
   */
  async getScenes(query) {
    const packs = this.getPacks('Scene');
    const results = [];
    const normalizedQuery = query?.toLowerCase();

    for (const pack of packs) {
      const index = await pack.getIndex();
      const hits = index.filter(s => !normalizedQuery || s.name.toLowerCase().includes(normalizedQuery));
      
      results.push(...hits.map(h => ({ 
        ...h, 
        pack: pack.collection,
        packLabel: this.info.title,
        documentName: 'Scene',
        uuid: `Compendium.${pack.collection}.${h._id}`
      })));
    }
    return results;
  }
}

/**
 * Main Scanner class.
 */
export class DSA5ModuleScanner {
  static DSA5ContentProvider = DSA5ContentProvider;
  static DSA5ArmoryProvider = DSA5ArmoryProvider;
  static DSA5HerbariumProvider = DSA5HerbariumProvider;
  static DSA5BestiaryProvider = DSA5BestiaryProvider;
  static DSA5SocialProvider = DSA5SocialProvider;
  static DSA5CompanionProvider = DSA5CompanionProvider;
  static DSA5SystemProvider = DSA5SystemProvider;
  static DSA5AssetProvider = DSA5AssetProvider;
  static DSA5RegionalProvider = DSA5RegionalProvider;
  static DSA5LibraryProvider = DSA5LibraryProvider;

  constructor({ logger } = {}) {
    this.logger = logger ?? console;
    this.modules = new Map(); // id -> info
    this.providers = new Map(); // id -> Provider instance
  }

  /**
   * Scans for active DSA5 modules and initializes providers.
   */
  scan() {
    this.logger.info('[JANUS7][Scanner] Scanning active DSA5 modules...');
    
    // 1. Identify active DSA5 modules
    game.modules.forEach(m => {
      if (!m.active || !m.id.startsWith('dsa5-')) return;
      
      const info = {
        id: m.id,
        title: m.title,
        version: m.version,
        packs: game.packs.filter(p => p.metadata.packageName === m.id)
      };
      
      this.modules.set(m.id, info);
      
      // 2. Map to providers
      const ProviderClass = this._getProviderClass(m.id);
      if (ProviderClass) {
        this.providers.set(m.id, new ProviderClass({ 
          id: m.id, 
          info, 
          logger: this.logger 
        }));
      }
    });

    this.logger.info(`[JANUS7][Scanner] Scan complete. Found ${this.modules.size} modules, initialized ${this.providers.size} providers.`);
  }

  /**
   * Returns a specific provider by module ID.
   * @param {string} moduleId
   * @returns {DSA5ContentProvider|null}
   */
  getProvider(moduleId) {
    return this.providers.get(moduleId);
  }

  /**
   * Returns all providers of a certain class/type.
   * @param {Function} ProviderClass
   * @returns {DSA5ContentProvider[]}
   */
  getProvidersByType(ProviderClass) {
    if (!ProviderClass) return [];
    return Array.from(this.providers.values()).filter(p => p instanceof ProviderClass);
  }

  _getProviderClass(id) {
    if (id.includes('armory') || id.includes('armor')) return DSA5ArmoryProvider;
    if (id.includes('herbarium')) return DSA5HerbariumProvider;
    if (id.includes('bestiary') || id.includes('pandaemonium')) return DSA5BestiaryProvider;
    if (id.includes('taverns')) return DSA5SocialProvider;
    if (id.includes('companions')) return DSA5CompanionProvider;
    if (id.includes('core') || id.includes('almanach')) return DSA5SystemProvider;
    if (id.includes('citymaps') || id.includes('aventuria-map') || id.includes('glueandhammer')) return DSA5AssetProvider;
    
    // Regionalmodule (viele IDs, daher Fallback am Ende)
    const regionalIds = ['thorwal', 'riverlands', 'warringkingdoms', 'havena', 'desertkingdom', 'steamingjungles', 'winterwatch', 'suncoast'];
    if (regionalIds.some(r => id.includes(r))) return DSA5RegionalProvider;

    if (id.includes('compendium') || id.includes('library')) return DSA5LibraryProvider;
    
    return null;
  }
}
