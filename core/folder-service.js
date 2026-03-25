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

const ROOT = 'JANUS7';

/**
 * Folder mapping.
 * NOTE: Foundry folders are typed → root is duplicated per document type.
 *
 * @type {Record<string, {root: string[], kinds: Record<string, string[]>}>}
 */
const MAP = {
  JournalEntry: {
    root: [ROOT, 'Journals'],
    kinds: {
      lesson:       ['Unterricht'],
      library:      ['Bibliothek'],
      curriculum:   ['Lehrpläne'],
      spell:        ['Zauber'],
      quest:        ['Quests'],
      event:        ['Chronik'],
      achievement:  ['Errungenschaften'],
      npc:          ['NSCs'],
      location:     ['Orte'],
      calendar:     ['Kalender'],
      handout:      ['Handouts'],
      misc:         ['Sonstiges'],
    },
  },
  Item: {
    root: [ROOT, 'Items'],
    kinds: {
      alchemy:    ['Alchemie'],
      spell:      ['Zauber'],
      equipment:  ['Ausrüstung'],
      misc:       ['Sonstiges'],
    },
  },
  Actor: {
    root: [ROOT, 'Actors'],
    kinds: {
      npc:     ['NSCs'],
      teacher: ['Dozenten'],
      student: ['Schüler'],
      misc:    ['Sonstiges'],
    },
  },
  Scene: {
    root: [ROOT, 'Scenes'],
    kinds: {
      location: ['Orte'],
      map:      ['Karten'],
      misc:     ['Sonstiges'],
    },
  },
  Playlist: {
    root: [ROOT, 'Playlists'],
    kinds: {
      music: ['Musik'],
      sfx:   ['SFX'],
      mood:  ['Stimmung'],
      misc:  ['Sonstiges'],
    },
  },
};

function _prefixForDocType(docType) {
  switch (docType) {
    case 'JournalEntry': return 'journal';
    case 'Item':         return 'item';
    case 'Actor':        return 'actor';
    case 'Scene':        return 'scene';
    case 'Playlist':     return 'playlist';
    default:             return String(docType ?? 'doc').toLowerCase();
  }
}

export class JanusFolderService {
  /**
   * @param {{ logger?: object }} deps
   */
  constructor(deps = {}) {
    this._logger = deps.logger ?? console;
    /** @type {Map<string,string>} */
    this._cache = new Map();
    /** @type {Map<string,Promise<any>>} */
    this._promises = new Map();
  }

  /**
   * Resolve a folder target for a given JANUS domain kind.
   * @param {{ docType: string, kind?: string }} spec
   * @returns {{ type: string, path: string[], key: string } | null}
   */
  resolve(spec) {
    const docType = spec?.docType;
    if (!docType || !MAP[docType]) return null;

    const kind = (spec.kind ?? 'misc').toLowerCase();
    const map = MAP[docType];
    const leaf = map.kinds[kind] ?? map.kinds.misc ?? ['Sonstiges'];
    const path = [...map.root, ...leaf];
    const key = `${_prefixForDocType(docType)}.${kind}`;
    return { type: docType, path, key };
  }

  /**
   * Ensure the folder path exists and return its id.
   * @param {{ type: string, path: string[], key: string }} target
   * @returns {Promise<{ folderId: string, folderKey: string, type: string, path: string[] }>}
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
          const existing = game.folders?.find(f =>
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
        this._logger.debug?.(`[Folders] ensured ${key} → ${folderId}`);
        return { folderId, folderKey: key, type, path };
      } finally {
        this._promises.delete(key);
      }
    })();

    this._promises.set(key, promise);
    return promise;
  }

  /**
   * Convenience: resolve + ensure.
   * @param {{ docType: string, kind?: string }} spec
   * @returns {Promise<{ folderId: string, folderKey: string, type: string, path: string[] } | { folderId: null, folderKey: null, type: string, path: string[] } >}
   */
  async ensureFor(spec) {
    const target = this.resolve(spec);
    if (!target) return { folderId: null, folderKey: null, type: spec?.docType, path: [] };
    const res = await this.ensurePath(target);
    return res;
  }


  /** Alias für ältere Tests / Aufrufer. */
  resolveFolder(spec) {
    return this.resolve(spec);
  }

  /** Alias: erwartet entweder ein resolve()-Target oder ein spec-Objekt. */
  async ensureFolderPath(targetOrSpec) {
    const target = Array.isArray(targetOrSpec?.path) && targetOrSpec?.type && targetOrSpec?.key
      ? targetOrSpec
      : this.resolve(targetOrSpec);
    if (!target) return { folderId: null, folderKey: null, type: targetOrSpec?.docType ?? null, path: [] };
    return this.ensurePath(target);
  }

  /** Alias: resolve + ensure, toleriert ältere Aufrufer. */
  async ensureFolder(spec) {
    return this.ensureFor(spec);
  }

  /**
   * Utility: best-effort derive a kind from a document's JANUS flags.
   * @param {object} doc
   * @param {string} docType
   * @returns {string}
   */
  static inferKind(doc, docType) {
    const flags = doc?.flags?.[MODULE_ID] ?? doc?.flags?.janus7 ?? {};
    if (flags?.kind) return String(flags.kind);

    // Backwards compatibility heuristics
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
