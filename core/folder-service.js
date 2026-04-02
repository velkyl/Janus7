/**
 * @file core/folder-service.js
 * @module janus7/core
 * @phase 1
 *
 * JanusFolderService
 *
 * Foundry-native Folder SSOT for all JANUS-managed Documents.
 *
 * Goals:
 * - Stable, predictable folder structure (idempotent).
 * - GM-only writes (Folder.create / doc.update).
 * - Minimal coupling: mapping is centralized here.
 */

import { MODULE_ID } from './common.js';
import { JanusProfileRegistry } from './profiles/index.js';

/**
 * Folder mapping.
 * NOTE: Foundry folders are typed -> root is duplicated per document type.
 *
 * @type {Record<string, {root: string[], kinds: Record<string, string[]>}>}
 */
const MAP = {
  JournalEntry: {
    root: ['__ROOT__', 'Journals'],
    kinds: {
      lesson: ['Unterricht'],
      library: ['Bibliothek'],
      curriculum: ['Lehrpläne'],
      spell: ['Zauber'],
      quest: ['Quests'],
      event: ['Chronik'],
      achievement: ['Errungenschaften'],
      npc: ['NSCs'],
      location: ['Orte'],
      calendar: ['Kalender'],
      handout: ['Handouts'],
      misc: ['Sonstiges'],
    },
  },
  Item: {
    root: ['__ROOT__', 'Items'],
    kinds: {
      lesson: ['Unterricht'],
      library: ['Bibliothek'],
      curriculum: ['Lehrpläne'],
      npc: ['NSCs'],
      location: ['Orte'],
      event: ['Chronik'],
      calendar: ['Kalender'],
      alchemy: ['Alchemie'],
      spell: ['Zauber'],
      equipment: ['Ausrüstung'],
      misc: ['Sonstiges'],
    },
  },
  Actor: {
    root: ['__ROOT__', 'Actors'],
    kinds: {
      npc: ['NSCs'],
      teacher: ['Dozenten'],
      student: ['Schüler'],
      misc: ['Sonstiges'],
    },
  },
  Scene: {
    root: ['__ROOT__', 'Scenes'],
    kinds: {
      location: ['Orte'],
      map: ['Karten'],
      misc: ['Sonstiges'],
    },
  },
  Playlist: {
    root: ['__ROOT__', 'Playlists'],
    kinds: {
      music: ['Musik'],
      sfx: ['SFX'],
      mood: ['Stimmung'],
      misc: ['Sonstiges'],
    },
  },
};

function _prefixForDocType(docType) {
  switch (docType) {
    case 'JournalEntry': return 'journal';
    case 'Item': return 'item';
    case 'Actor': return 'actor';
    case 'Scene': return 'scene';
    case 'Playlist': return 'playlist';
    default: return String(docType ?? 'doc').toLowerCase();
  }
}

/**
 * @typedef {object} JanusFolderTarget
 * @property {string} type
 * @property {string[]} path
 * @property {string} key
 */

/**
 * @typedef {object} JanusFolderResolution
 * @property {string|null} folderId
 * @property {string|null} folderKey
 * @property {string|null|undefined} type
 * @property {string[]} path
 */

/**
 * @typedef {object} JanusFolderSpec
 * @property {string} docType
 * @property {string} [kind]
 */

/**
 * Resolves and creates managed Foundry folder paths for JANUS-owned documents.
 */
export class JanusFolderService {
  /**
   * @param {{ logger?: Console }} [deps]
   */
  constructor(deps = {}) {
    this._logger = deps.logger ?? console;
    /** @type {Map<string, string>} */
    this._cache = new Map();
    /** @type {Map<string, Promise<JanusFolderResolution>>} */
    this._promises = new Map();
  }

  /**
   * Resolves a folder target for a managed JANUS document kind.
   *
   * @param {JanusFolderSpec} spec
   * @returns {JanusFolderTarget|null}
   */
  resolve(spec) {
    const docType = spec?.docType;
    if (!docType || !MAP[docType]) return null;

    const profile = JanusProfileRegistry.getActive();
    const rootName = `JANUS7 (${profile.name})`;

    const kind = (spec.kind ?? 'misc').toLowerCase();
    const map = MAP[docType];
    const leaf = map.kinds[kind] ?? map.kinds.misc ?? ['Sonstiges'];

    const path = [rootName, ...map.root.slice(1), ...leaf];
    const key = `${_prefixForDocType(docType)}.${kind}.${profile.id}`;

    return { type: docType, path, key };
  }

  /**
   * Ensures that a managed folder path exists and returns the resolved folder id.
   *
   * @param {JanusFolderTarget} target
   * @returns {Promise<JanusFolderResolution>}
   */
  async ensurePath(target) {
    const { type, path, key } = target ?? {};
    if (!type || !Array.isArray(path) || path.length === 0 || !key) {
      throw new Error('JanusFolderService.ensurePath: invalid target');
    }

    if (this._cache.has(key)) {
      return { folderId: this._cache.get(key), folderKey: key, type, path };
    }

    if (this._promises.has(key)) {
      return this._promises.get(key);
    }

    const promise = (async () => {
      try {
        if (!game.user?.isGM) {
          throw new Error('Nur GM darf Folder anlegen.');
        }

        let parent = null;
        for (const name of path) {
          const parentId = parent?.id ?? null;
          const existing = game.folders?.find((f) =>
            f.type === type &&
            f.name === name &&
            ((parentId && f.folder?.id === parentId) || (!parentId && !f.folder))
          ) ?? null;

          if (existing) {
            parent = existing;
            continue;
          }

          parent = await Folder.create({ name, type, folder: parentId });
        }

        const folderId = parent?.id;
        if (!folderId) {
          throw new Error(`Folder create failed for ${type}:${path.join(' / ')}`);
        }

        this._cache.set(key, folderId);
        this._logger.debug?.(`[Folders] ensured ${key} -> ${folderId}`);
        return { folderId, folderKey: key, type, path };
      } finally {
        this._promises.delete(key);
      }
    })();

    this._promises.set(key, promise);
    return promise;
  }

  /**
   * Resolves and ensures a managed folder path in one call.
   *
   * @param {JanusFolderSpec} spec
   * @returns {Promise<JanusFolderResolution>}
   */
  async ensureFor(spec) {
    const target = this.resolve(spec);
    if (!target) return { folderId: null, folderKey: null, type: spec?.docType, path: [] };
    const res = await this.ensurePath(target);
    return res;
  }

  /**
   * Legacy alias for `resolve()`.
   *
   * @param {JanusFolderSpec} spec
   * @returns {JanusFolderTarget|null}
   */
  resolveFolder(spec) {
    return this.resolve(spec);
  }

  /**
   * Legacy alias that accepts either a resolved target or a folder spec.
   *
   * @param {JanusFolderTarget|JanusFolderSpec} targetOrSpec
   * @returns {Promise<JanusFolderResolution>}
   */
  async ensureFolderPath(targetOrSpec) {
    const target = Array.isArray(targetOrSpec?.path) && targetOrSpec?.type && targetOrSpec?.key
      ? targetOrSpec
      : this.resolve(targetOrSpec);
    if (!target) return { folderId: null, folderKey: null, type: targetOrSpec?.docType ?? null, path: [] };
    return this.ensurePath(target);
  }

  /**
   * Legacy alias for `ensureFor()`.
   *
   * @param {JanusFolderSpec} spec
   * @returns {Promise<JanusFolderResolution>}
   */
  async ensureFolder(spec) {
    return this.ensureFor(spec);
  }

  /**
   * Best-effort kind inference from JANUS document flags.
   *
   * @param {foundry.abstract.Document} doc
   * @param {string} docType
   * @returns {string}
   */
  static inferKind(doc, docType) {
    const flags = doc?.flags?.[MODULE_ID] ?? doc?.flags?.janus7 ?? {};
    if (flags?.kind) return String(flags.kind);

    if (docType === 'JournalEntry') {
      if (flags?.dataType === 'lesson') return 'lesson';
      if (flags?.dataType === 'library-item') return 'library';
      if (flags?.dataType === 'achievement') return 'achievement';
      return 'misc';
    }
    if (docType === 'Item') {
      if (flags?.dataType === 'alchemy-recipe') return 'alchemy';
      return 'misc';
    }
    if (docType === 'Scene') return 'location';
    if (docType === 'Playlist') return 'music';
    if (docType === 'Actor') return 'npc';
    return 'misc';
  }
}

export default JanusFolderService;
