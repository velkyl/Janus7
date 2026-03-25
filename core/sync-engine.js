/**
 * @file core/sync-engine.js
 * @module janus7/core
 * @phase 6
 *
 * JanusSyncEngine
 *
 * Vergleicht JANUS7-JSON-Entitäten (NPCs, Orte, Playlists) mit dem realen
 * Foundry-Weltbestand und bietet:
 *
 * 1. reconcile(type)      → Status-Report: linked / found-by-name / missing
 * 2. linkEntity(...)      → UUID in game.settings persistieren (JSON bleibt R/O)
 * 3. createFromData(...)  → Foundry-Entität aus JSON-Profil anlegen + sofort linken
 * 4. resolveUUID(type,id) → UUID-Lookup mit Overlay-Vorrang
 *
 * UUID-Persistenz-Strategie:
 *   JSON-Dateien unter data/ des aktiven JANUS7-Moduls sind im Browser READ-ONLY.
 *   Alle vergebenen UUIDs werden in game.settings('janus7','entityUUIDs')
 *   gespeichert. Das ist ein Objekt der Form:
 *     { "NPC_KOSMAAR": "Actor.abc123", "LOC_LIBRARY": "Scene.xyz", ... }
 *   Die AcademyDataApi-Methoden prüfen dieses Overlay ZUERST.
 *
 * @architecture
 *   - Kein UI-Code
 *   - Keine DSA5-Logik (Probe, Werte) – nur Entitätserstellung
 *   - Schreibt ausschließlich via game.settings / Foundry Document API
 */

import { MODULE_ID } from './common.js';
import { CompendiumLibrary } from '../bridge/compendium-library.js';
import { JanusFolderService } from './folder-service.js';
import { emitHook, HOOKS } from './hooks/emitter.js';

// ─── Konstanten ─────────────────────────────────────────────────────────────

/** game.settings-Key für die UUID-Overlay-Map */
const UUID_SETTING = 'entityUUIDs';

/**
 * Normalize JANUS ids/keys to a single canonical form.
 * Canonical: UPPERCASE, single underscores, typed prefixes like NPC_/LOC_/SCN_...
 * Examples:
 *  - npc_elrika_rebenlieb -> NPC_ELRIKA_REBENLIEB
 *  - NPC__ELRIKA_REBENLIEB -> NPC_ELRIKA_REBENLIEB
 * @param {string} raw
 * @returns {string}
 */
export function normalizeJanusId(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // collapse whitespace and common separators
  s = s.replace(/\s+/g, '_');
  s = s.replace(/-+/g, '_');
  // normalize double underscores
  while (s.includes('__')) s = s.replace(/__+/g, '_');

  // prefix normalization (case-insensitive)
  if (/^npc_/i.test(s)) s = `NPC_${s.slice(4)}`;
  if (/^pc_/i.test(s)) s = `PC_${s.slice(3)}`;
  if (/^loc_/i.test(s)) s = `LOC_${s.slice(4)}`;
  if (/^scn_/i.test(s)) s = `SCN_${s.slice(4)}`;
  if (/^qst_/i.test(s)) s = `QST_${s.slice(4)}`;
  if (/^moo_/i.test(s)) s = `MOO_${s.slice(4)}`;

  // fix accidental typed double underscore like NPC__X
  s = s.replace(/^(NPC|PC|LOC|SCN|QST|MOO)__/i, (_, p) => `${p}_`);

  return s.toUpperCase();
}

/** Status-Typen für den Reconcile-Report */
export const SyncStatus = Object.freeze({
  LINKED:               'linked',              // UUID vorhanden & Entität existiert
  FOUND_BY_NAME:        'found-by-name',        // Kein UUID, aber Name/Key matcht in Welt
  FOUND_IN_COMPENDIUM:  'found-in-compendium',  // In Foundry-Bibliothek gefunden, noch nicht importiert
  MISSING:              'missing',              // Nicht gefunden (weder Welt noch Bibliothek)
  BROKEN:               'broken',               // UUID gesetzt, aber Entität gelöscht
});

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class JanusSyncEngine {
  /**
   * @param {{ logger?: object }} deps
   */
  constructor(deps = {}) {
    this._logger = deps.logger ?? console;
    /** @type {CompendiumLibrary|null} Lazy-initialisiert beim ersten Compendium-Zugriff */
    this._compLib = null;

    /** @type {JanusFolderService} */
    this._folders = new JanusFolderService({ logger: this._logger });
  }

  /** Expose normalizer for UI helpers (Director DnD etc.). */
  normalizeJanusId(raw) {
    return normalizeJanusId(raw);
  }

  /**
   * Gibt die CompendiumLibrary-Instanz zurück (lazy-init).
   * @returns {CompendiumLibrary}
   */
  _getCompLib() {
    if (!this._compLib) {
      this._compLib = new CompendiumLibrary({ logger: this._logger });
    }
    return this._compLib;
  }

  // ─── UUID Overlay ──────────────────────────────────────────────────────────

  /**
   * Liest die gesamte UUID-Overlay-Map aus game.settings.
   * @returns {Record<string, string>}
   */
  getUUIDOverlay() {
    try {
      return game.settings.get(MODULE_ID, UUID_SETTING) ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Liest die UUID für eine einzelne Entität.
   * Prüft Overlay ZUERST, dann die JSON-Felddefinition.
   * @param {string} janusId  z.B. "NPC_KOSMAAR"
   * @param {object} [jsonEntity]  optionale JSON-Daten (für Fallback)
   * @returns {string|null}
   */
  resolveUUID(janusId, jsonEntity = null, type = null) {
    const id = normalizeJanusId(janusId);
    // Normalize reconcile types to persistent link buckets
    const t = (type === 'alchemy') ? 'items'
            : (type === 'library' || type === 'lessons' || type === 'exams') ? 'journals'
            : type;

    // 1) World overlay (legacy)
    const overlay = this.getUUIDOverlay();
    if (overlay[id]) return overlay[id];
    if (overlay[janusId]) return overlay[janusId];

    // 2) Persistenter Campaign-State (neu: foundryLinks + legacy actors.*)
    try {
      const st = game?.janus7?.core?.state;
      if (st && t) {
        const map = st.getPath?.(`foundryLinks.${t}`) ?? null;
        if (map && map[id]) return map[id];
        if (map && map[janusId]) return map[janusId];
      }
      // Convenience/Legacy maps
      if (st && type === 'npcs') {
        const m = st.getPath?.('actors.npcs') ?? null;
        if (m && m[id]) return m[id];
        if (m && m[janusId]) return m[janusId];
      }
      if (st && type === 'pcs') {
        const m = st.getPath?.('actors.pcs') ?? null;
        if (m && m[id]) return m[id];
        if (m && m[janusId]) return m[janusId];
      }
    } catch (_err) { /* noop */ }

    // 3) Fallback: UUID direkt im JSON-Objekt
    const foundryData = jsonEntity?.foundry ?? {};
    return foundryData.uuid
        ?? foundryData.actorUuid ?? foundryData.sceneUuid
        ?? foundryData.playlistUuid ?? null;
  }

  /**
   * Persistiert eine UUID-Zuweisung in game.settings.
   * @param {string} janusId
   * @param {string} uuid
   */
  async linkEntity(janusId, uuid, { type = null, saveState = true } = {}) {
    const id = normalizeJanusId(janusId);
    // 1) legacy overlay (kept for backward compatibility)
    const overlay = { ...this.getUUIDOverlay() };
    overlay[id] = uuid;
    await game.settings.set(MODULE_ID, UUID_SETTING, overlay);

    // 2) persist in campaign state (SSOT for exports/AI)
    try {
      const st = game?.janus7?.core?.state;
      if (st && type) {
        const path = `foundryLinks.${type}.${id}`;
        st.set(path, uuid);
      }
      // also keep convenience maps for PCs/NPCs (export friendliness)
      if (st && type === 'npcs') st.set(`actors.npcs.${id}`, uuid);
      if (st && type === 'pcs')  st.set(`actors.pcs.${id}`, uuid);
      if (st && saveState) await st.save({ force: true });
    } catch (err) {
      this._logger.warn?.('[Sync] Persist state link failed', err?.message);
    }

    this._logger.info?.(`[Sync] Linked ${id} → ${uuid}`);
    emitHook(HOOKS.ENTITY_LINKED, { janusId: id, uuid, type });
  }

  /**
   * Entfernt eine UUID-Zuweisung (z.B. wenn Entität gelöscht wurde).
   * @param {string} janusId
   */
  async unlinkEntity(janusId, { type = null, saveState = true } = {}) {
    const id = normalizeJanusId(janusId);
    const overlay = { ...this.getUUIDOverlay() };
    delete overlay[id];
    await game.settings.set(MODULE_ID, UUID_SETTING, overlay);

    try {
      const st = game?.janus7?.core?.state;
      if (st && type) {
        const mapPath = `foundryLinks.${type}`;
        const map = foundry.utils.deepClone(st.getPath?.(mapPath) ?? {});
        delete map[id];
        st.set(mapPath, map);
      }
      if (st && type === 'npcs') {
        const map = foundry.utils.deepClone(st.getPath?.('actors.npcs') ?? {});
        delete map[id];
        st.set('actors.npcs', map);
      }
      if (st && type === 'pcs') {
        const map = foundry.utils.deepClone(st.getPath?.('actors.pcs') ?? {});
        delete map[id];
        st.set('actors.pcs', map);
      }
      if (st && saveState) await st.save({ force: true });
    } catch (err) {
      this._logger.warn?.('[Sync] Persist state unlink failed', err?.message);
    }

    this._logger.info?.(`[Sync] Unlinked ${id}`);
  }

  // ─── Reconcile ─────────────────────────────────────────────────────────────

  /**
   * Vergleicht alle JSON-Entitäten eines Typs mit dem Foundry-Weltbestand.
   * @param {'npcs'|'locations'|'playlists'} type
   * @param {object[]} entities  Array von JSON-Einträgen
   * @returns {SyncReport[]}
   */
  async reconcile(type, entities) {
    const reports = [];
    for (const entity of entities) {
      reports.push(await this._reconcileOne(type, entity));
    }
    return reports;
  }

  /**
   * @private
   */
  async _reconcileOne(type, entity) {
    const id = entity.id;
    const resolvedUuid = this.resolveUUID(id, entity, type);

    // 1. UUID vorhanden → prüfen ob Entität noch existiert
    if (resolvedUuid) {
      const doc = await this._fromUUID(resolvedUuid);
      if (doc) {
        return {
          id, entity, status: SyncStatus.LINKED,
          uuid: resolvedUuid,
          foundryName: doc.name,
          foundryDoc: doc,
          source: 'uuid',
        };
      }
      // UUID da, aber Entität gelöscht
      return {
        id, entity, status: SyncStatus.BROKEN,
        uuid: resolvedUuid,
        foundryName: null,
        foundryDoc: null,
        source: 'uuid',
        hint: `UUID ${resolvedUuid} existiert nicht mehr in dieser Welt.`,
      };
    }

    // 2. Kein UUID → Suche nach Name/Key in Foundry-Weltbestand
    const match = this._findByNameOrKey(type, entity);
    if (match) {
      return {
        id, entity, status: SyncStatus.FOUND_BY_NAME,
        uuid: match.uuid,
        foundryName: match.name,
        foundryDoc: match,
        source: 'name',
        hint: `In Welt gefunden als "${match.name}" – UUID noch nicht gespeichert.`,
      };
    }

    // 3. Nicht in Welt → Suche in Bibliothek (Compendien aller Module)
    const docType = this._typeToDocType(type);
    if (docType) {
      const itemType  = this._typeToItemType(type);
      const searchName = entity.name ?? entity.title ?? '';
      try {
        const compLib = this._getCompLib();
        const hit = await compLib.findInCompendium(searchName, docType, {
          itemType,
          allowFuzzy: false,
        });
        if (hit) {
          return {
            id, entity, status: SyncStatus.FOUND_IN_COMPENDIUM,
            uuid: hit.uuid,         // Compendium-UUID
            foundryName: hit.name,
            foundryDoc: null,       // noch nicht in Welt
            source: 'compendium',
            compHit: hit,           // volle CompendiumHit-Info für Import
            hint: `In Bibliothek gefunden: "${hit.name}" (${hit.packLabel}) – importieren um zu verknüpfen.`,
          };
        }
      } catch (err) {
        this._logger.warn?.(`[Sync] Compendium-Lookup fehlgeschlagen für ${id}:`, err?.message);
      }
    }

    // 4. Nirgendwo gefunden
    return {
      id, entity, status: SyncStatus.MISSING,
      uuid: null,
      foundryName: null,
      foundryDoc: null,
      source: null,
      hint: `"${entity.name ?? entity.title}" weder in Welt noch in Bibliothek gefunden.`,
    };
  }

  /**
   * Mappt sync-type auf Foundry documentName.
   * @private
   */
  _typeToDocType(type) {
    const map = {
      npcs:      'Actor',
      locations: 'Scene',
      playlists: 'Playlist',
      alchemy:   'Item',
      library:   'JournalEntry',
      lessons:   'JournalEntry',
      spells:    'Item',
    };
    return map[type] ?? null;
  }

  /**
   * Mappt sync-type auf DSA5 Item-Typ (nur für Item-Packs relevant).
   * @private
   */
  _typeToItemType(type) {
    const map = {
      npcs:      null,   // Actor, kein itemType
      spells:    'spell',
      alchemy:   'alchemica',
    };
    return map[type] ?? null;
  }

  /**
   * Versucht Foundry-Entität über UUID zu laden.
   * @private
   */
  async _fromUUID(uuid) {
    try {
      return await fromUuid(uuid);
    } catch {
      return null;
    }
  }

  // ─── Entity-Erstellung ─────────────────────────────────────────────────────

  // ─── Compendium-Import ────────────────────────────────────────────────────

  /**
   * Importiert ein Dokument aus der Foundry-Bibliothek in die Welt und verknüpft es.
   *
   * @param {string} janusId     JANUS7-ID
   * @param {object} compHit     CompendiumHit von _reconcileOne
   * @param {object} [opts]
   * @param {string} [opts.folderId]
   * @returns {Promise<foundry.abstract.Document>}
   */
  async importFromCompendium(janusId, compHit, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Dokumente importieren.');
    if (!compHit?.packId) throw new Error('Kein CompendiumHit übergeben.');

    const compLib = this._getCompLib();
    const doc = await compLib.importToWorld(compHit, {}, opts);

    await this.linkEntity(janusId, doc.uuid, { type: opts.type ?? null });
    this._logger.info?.(`[Sync] Import abgeschlossen: ${janusId} → ${doc.uuid}`);
    emitHook(HOOKS.ENTITY_IMPORTED, { janusId, uuid: doc.uuid, source: compHit.packId });
    return doc;
  }

  /**
   * Batch-Import aller FOUND_IN_COMPENDIUM-Einträge eines Reports.
   * @param {object[]} report
   * @param {object} [opts]
   * @returns {Promise<{imported: number, failed: number}>}
   */
  async importAllFromCompendium(report, opts = {}) {
    const candidates = report.filter(r =>
      r.status === SyncStatus.FOUND_IN_COMPENDIUM && r.compHit
    );
    let imported = 0; let failed = 0;
    for (const entry of candidates) {
      try {
        await this.importFromCompendium(entry.id, entry.compHit, opts);
        imported++;
      } catch (err) {
        failed++;
        this._logger.warn?.(`[Sync] Batch-Import fehlgeschlagen für ${entry.id}:`, err?.message);
      }
    }
    return { imported, failed };
  }

  /**
   * Gibt Metadaten aller geladenen Packs zurück (für Debug/UI).
   * @param {string} [docType]
   * @returns {object[]}
   */
  getCompendiumSummary(docType) {
    const lib = this._getCompLib();
    const all = lib.getPacksSummary();
    return docType ? all.filter(p => p.docType === docType) : all;
  }

    /**
   * Erstellt einen Foundry-Actor aus NPC-JSON-Daten.
   * Füllt alle verfügbaren Informationen aus dem JSON-Profil.
   * @param {object} npcData  NPC-Eintrag aus npcs.json
   * @param {{ folderId?: string }} [opts]
   * @returns {Promise<Actor>}
   */
  async createActorFromNPC(npcData, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Actors anlegen.');

    // Auto-folder (JANUS7 / Actors / NSCs) unless explicitly provided.
    let folderId = opts.folderId ?? null;
    let folderKey = null;
    if (!folderId) {
      const resolved = await this._folders.ensureFor({ docType: 'Actor', kind: 'npc' });
      folderId = resolved.folderId;
      folderKey = resolved.folderKey;
    }

    const profile = npcData.profile ?? {};
    const sections = profile.sections ?? {};

    // Journal-kompatibler HTML-Block aus den Profil-Sektionen
    const bioText = this._buildBiographyHTML(profile, sections);

    // DSA5-Attribute aus den JSON-Werten auslesen (wenn vorhanden)
    const dsa5Values = this._parseDSA5Values(sections);

    const actorData = {
      name:   npcData.name,
      type:   'npc',
      img:    `icons/svg/mystery-man.svg`,
      folder: folderId,
      flags: {
        [MODULE_ID]: {
          janusId: npcData.id,
          role:    npcData.role,
          tags:    npcData.tags ?? [],
          managed: true,
          kind: 'npc',
          folderKey,
          syncedAt: new Date().toISOString(),
        }
      },
      system: {
        // DSA5 NPC-Biographie-Felder
        details: {
          biography: { value: bioText },
          species:   { value: profile.species ?? '' },
          culture:   { value: '' },
          profession: { value: profile.roleText ?? profile.subtitle ?? '' },
        },
        // DSA5-Basiswerte aus JSON (best-effort)
        ...(Object.keys(dsa5Values).length ? { characteristics: dsa5Values } : {}),
      },
    };

    const actor = await Actor.create(actorData, { ownership: { default: 0 } });
    if (!actor) throw new Error(`Actor-Erstellung fehlgeschlagen für: ${npcData.name}`);

    // UUID sofort persistieren
    await this.linkEntity(npcData.id, actor.uuid, { type: 'npcs' });
    this._logger.info?.(`[Sync] Actor erstellt: ${actor.name} (${actor.uuid})`);
    return actor;
  }

  /**
   * Erstellt eine Foundry-Scene aus Location-JSON-Daten.
   * @param {object} locData  Location-Eintrag aus locations.json
   * @param {{ folderId?: string }} [opts]
   * @returns {Promise<Scene>}
   */
  async createSceneFromLocation(locData, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Szenen anlegen.');

    // Auto-folder (JANUS7 / Scenes / Orte) unless explicitly provided.
    let folderId = opts.folderId ?? null;
    let folderKey = null;
    if (!folderId) {
      const resolved = await this._folders.ensureFor({ docType: 'Scene', kind: 'location' });
      folderId = resolved.folderId;
      folderKey = resolved.folderKey;
    }

    const profile = locData.profile ?? {};
    const sections = profile.sections ?? {};
    const descText = this._buildBiographyHTML(profile, sections);

    // NOTE: Scene.notes = NoteDocument[] (Map-Pins), KEIN Textfeld.
    // Scene hat in Foundry v13 kein freies description/biography-Feld.
    // Der Profiltext wird in flags.janus7.description gespeichert.
    const sceneData = {
      name:        locData.name,
      background:  { src: null },
      folder:      folderId,
      grid:        { type: 1, size: 100 },
      width:       1000,
      height:      1000,
      padding:     0.25,
      flags: {
        [MODULE_ID]: {
          janusId:      locData.id,
          locationType: locData.type,
          tags:         locData.tags ?? [],
          defaultMoodKey: locData.defaultMoodKey ?? null,
          managed:      true,
          kind:         'location',
          folderKey,
          description:  descText,
          syncedAt:     new Date().toISOString(),
        }
      },
    };

    const scene = await Scene.create(sceneData);
    if (!scene) throw new Error(`Scene-Erstellung fehlgeschlagen für: ${locData.name}`);

    await this.linkEntity(locData.id, scene.uuid, { type: 'locations' });
    this._logger.info?.(`[Sync] Scene erstellt: ${scene.name} (${scene.uuid})`);
    return scene;
  }

  /**
   * Erstellt eine Foundry-Playlist aus Playlist-Definition.
   * @param {{ id: string, name: string, mode?: number }} plData
   * @returns {Promise<Playlist>}
   */
  async createPlaylist(plData) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Playlists anlegen.');

    // Auto-folder (JANUS7 / Playlists / Musik) by default.
    const resolved = await this._folders.ensureFor({ docType: 'Playlist', kind: 'music' });

    const playlist = await Playlist.create({
      name:  plData.name,
      mode:  plData.mode ?? CONST.PLAYLIST_MODES.SEQUENTIAL,
      folder: resolved.folderId ?? null,
      flags: {
        [MODULE_ID]: {
          janusId:  plData.id,
          managed:  true,
          kind:     'music',
          folderKey: resolved.folderKey ?? null,
          syncedAt: new Date().toISOString(),
        }
      },
    });
    if (!playlist) throw new Error(`Playlist-Erstellung fehlgeschlagen: ${plData.name}`);

    await this.linkEntity(plData.id, playlist.uuid, { type: 'playlists' });
    this._logger.info?.(`[Sync] Playlist erstellt: ${playlist.name} (${playlist.uuid})`);
    return playlist;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Baut einen HTML-Biographie-String aus JSON-Profil-Sektionen.
   * @private
   */
  _buildBiographyHTML(profile, sections) {
    const lines = [];

    if (profile.subtitle)  lines.push(`<p><strong>${profile.subtitle}</strong></p>`);
    if (profile.roleText)  lines.push(`<p><em>${profile.roleText}</em></p>`);
    if (profile.preamble)  lines.push(`<p>${this._mdToHtml(profile.preamble)}</p>`);
    if (profile.born)      lines.push(`<p>Geboren: ${profile.born} (${profile.age ?? '?'})</p>`);
    if (profile.species)   lines.push(`<p>Spezies: ${profile.species}</p>`);
    if (profile.origin)    lines.push(`<p>Herkunft: ${profile.origin}</p>`);
    if (profile.size)      lines.push(`<p>Größe: ${profile.size}</p>`);
    if (profile.light)     lines.push(`<p>Licht: ${profile.light}</p>`);

    for (const [heading, content] of Object.entries(sections)) {
      lines.push(`<h3>${heading}</h3>`);
      lines.push(`<p>${this._mdToHtml(String(content))}</p>`);
    }

    return lines.join('\n');
  }

  /**
   * Minimales Markdown → HTML (nur Bold, Kursiv, Zeilenumbrüche).
   * @private
   */
  _mdToHtml(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Parst DSA5-Attributwerte aus der "DSA5 Werte"-Sektion.
   * Format: "- **MU:** 14 | **KL:** 17 | ..."
   * @private
   */
  _parseDSA5Values(sections) {
    const valueText = sections['DSA5 Werte (Offiziell)']
      ?? sections['DSA5 Werte']
      ?? sections['Werte']
      ?? '';

    const result = {};
    const pattern = /\*\*(\w+):\*\*\s*(\d+)/g;
    let m;
    while ((m = pattern.exec(valueText)) !== null) {
      const key = m[1].toLowerCase();
      result[key] = { value: parseInt(m[2], 10) };
    }
    return result;
  }

  // ─── Erweiterte Reconcile-Typen ───────────────────────────────────────────

  /**
   * Gibt alle bekannten Reconcile-Typen zurück.
   * Erweiterung gegenüber dem Original (npcs/locations/playlists).
   */
  getSupportedTypes() {
    return ['npcs', 'locations', 'playlists', 'alchemy', 'library', 'spells', 'lessons'];
  }

  /**
   * reconcile() Erweiterung — delegiert neue Typen an spezialisierte Methoden.
   * Überschreibt die vorherige switch-Logik in _findByNameOrKey().
   */
  _findByNameOrKey(type, entity) {
    const name   = entity.name?.trim().toLowerCase()
                ?? entity.title?.trim().toLowerCase() ?? '';
    const altKey = entity.foundry?.actorKey ?? entity.foundry?.sceneKey
                ?? entity.foundry?.itemKey  ?? entity.foundry?.journalKey ?? null;

    if (type === 'npcs') {
      return game.actors?.contents.find(a =>
        a.name?.trim().toLowerCase() === name ||
        a.name?.trim().toLowerCase() === altKey?.toLowerCase()
      ) ?? null;
    }
    if (type === 'locations') {
      return game.scenes?.contents.find(s =>
        s.name?.trim().toLowerCase() === name ||
        s.name?.trim().toLowerCase() === altKey?.toLowerCase()
      ) ?? null;
    }
    if (type === 'playlists') {
      return game.playlists?.contents.find(p =>
        p.name?.trim().toLowerCase() === name
      ) ?? null;
    }
    if (type === 'alchemy') {
      // Suche in World-Items
      return game.items?.contents.find(i =>
        i.name?.trim().toLowerCase() === name
      ) ?? null;
    }
    if (type === 'library' || type === 'lessons' || type === 'exams') {
      return game.journal?.contents.find(j =>
        j.name?.trim().toLowerCase() === name ||
        j.name?.trim().toLowerCase() === (altKey ?? '').toLowerCase()
      ) ?? null;
    }
    if (type === 'spells') {
      // Nur Compendium-Lookup — world Items als Sekundär-Fallback
      return game.items?.contents.find(i =>
        i.name?.trim().toLowerCase() === name
      ) ?? null;
    }
    return null;
  }

  // ─── Item-Erstellung (Alchemie) ────────────────────────────────────────────

  /**
   * Erstellt ein Foundry-Item aus einem Alchemie-Rezept-JSON.
   * In einer DSA5-Welt wird type 'alchemica' versucht; Fallback ist 'equipment'.
   * @param {object} recipeData  Eintrag aus alchemy-recipes.json
   * @param {{ folderId?: string }} [opts]
   * @returns {Promise<Item>}
   */
  async createItemFromRecipe(recipeData, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Items anlegen.');

    // Auto-folder (JANUS7 / Items / Alchemie) unless explicitly provided.
    let folderId = opts.folderId ?? null;
    let folderKey = null;
    if (!folderId) {
      const resolved = await this._folders.ensureFor({ docType: 'Item', kind: 'alchemy' });
      folderId = resolved.folderId;
      folderKey = resolved.folderKey;
    }

    // Qualitätsstufen als HTML-Tabelle
    const qlRows = (recipeData.qualityLevels ?? [])
      .map(ql => `<tr><td>QS ${ql.qs}</td><td>${ql.effect ?? '—'}</td></tr>`)
      .join('');
    const qlTable = qlRows
      ? `<h3>Qualitätsstufen</h3><table><tr><th>QS</th><th>Effekt</th></tr>${qlRows}</table>`
      : '';

    const description = [
      recipeData.prerequisite ? `<p><strong>Voraussetzung:</strong> ${recipeData.prerequisite}</p>` : '',
      recipeData.lab          ? `<p><strong>Labor:</strong> ${recipeData.lab}</p>` : '',
      recipeData.time         ? `<p><strong>Dauer:</strong> ${recipeData.time}</p>` : '',
      recipeData.costPerLevel ? `<p><strong>Kosten/Stufe:</strong> ${recipeData.costPerLevel}</p>` : '',
      recipeData.apValue      ? `<p><strong>AP-Wert:</strong> ${recipeData.apValue}</p>` : '',
      recipeData.ingredients?.length
        ? `<p><strong>Zutaten:</strong> ${recipeData.ingredients.join(', ')}</p>` : '',
      qlTable,
    ].filter(Boolean).join('\n');

    // DSA5 bevorzugt type 'alchemica'; bei anderen Systemen 'equipment'
    const systemId = game.system?.id ?? '';
    const itemType = systemId === 'dsa5' ? 'alchemica' : 'equipment';

    const itemData = {
      name:   recipeData.name,
      type:   itemType,
      folder: folderId,
      system: {
        description: { value: description },
        ...(systemId === 'dsa5' ? {
          difficulty: { value: recipeData.difficulty ?? 0 },
        } : {}),
      },
      flags: {
        [MODULE_ID]: {
          janusId:    recipeData.id,
          dataType:   'alchemy-recipe',
          managed:    true,
          kind:       'alchemy',
          folderKey,
          difficulty: recipeData.difficulty,
          lab:        recipeData.lab,
          syncedAt:   new Date().toISOString(),
        }
      },
    };

    const item = await Item.create(itemData);
    if (!item) throw new Error(`Item-Erstellung fehlgeschlagen: ${recipeData.name}`);

    await this.linkEntity(recipeData.id, item.uuid, { type: 'items' });
    this._logger.info?.(`[Sync] Item erstellt: ${item.name} (${item.uuid})`);
    return item;
  }

  // ─── JournalEntry-Erstellung (Bibliothek / Lektionen / Prüfungen) ─────────

  /**
   * Erstellt einen JournalEntry aus Library-Item-Daten.
   * @param {object} libData  Eintrag aus library.json
   * @param {{ folderId?: string }} [opts]
   * @returns {Promise<JournalEntry>}
   */
  async createJournalFromLibrary(libData, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Journal-Einträge anlegen.');

    // Auto-folder (JANUS7 / Journals / Bibliothek) unless explicitly provided.
    let folderId = opts.folderId ?? null;
    let folderKey = null;
    if (!folderId) {
      const resolved = await this._folders.ensureFor({ docType: 'JournalEntry', kind: 'library' });
      folderId = resolved.folderId;
      folderKey = resolved.folderKey;
    }

    const hooks = (libData.knowledgeHooks ?? [])
      .map(h => `<li><strong>${h.topic}</strong> (${h.relatedSkillId ?? '—'})</li>`)
      .join('');

    const content = [
      libData.summary ? `<p><em>${libData.summary}</em></p>` : '',
      libData.type    ? `<p><strong>Typ:</strong> ${libData.type}</p>` : '',
      hooks           ? `<h3>Wissensanknüpfungen</h3><ul>${hooks}</ul>` : '',
    ].filter(Boolean).join('\n');

    return this._createJournal({
      id:      libData.id,
      name:    libData.title ?? libData.name,
      content,
      dataType: 'library-item',
      folderId,
      flags: {
        journalKey: libData.foundry?.journalKey ?? null,
        tags:       libData.tags ?? [],
        kind:       'library',
        folderKey,
      }
    });
  }

  /**
   * Erstellt einen JournalEntry aus Lektions-Daten.
   * @param {object} lessonData  Eintrag aus lessons.json
   * @param {{ folderId?: string }} [opts]
   * @returns {Promise<JournalEntry>}
   */
  async createJournalFromLesson(lessonData, opts = {}) {
    if (!game.user?.isGM) throw new Error('Nur GM darf Journal-Einträge anlegen.');

    // Auto-folder (JANUS7 / Journals / Unterricht) unless explicitly provided.
    let folderId = opts.folderId ?? null;
    let folderKey = null;
    if (!folderId) {
      const resolved = await this._folders.ensureFor({ docType: 'JournalEntry', kind: 'lesson' });
      folderId = resolved.folderId;
      folderKey = resolved.folderKey;
    }

    const skills = (lessonData.mechanics?.skills ?? [])
      .map(s => `<li>${s.systemSkillId} (Gewicht: ${s.weight})</li>`)
      .join('');
    const checks = (lessonData.mechanics?.checks ?? [])
      .map(c => `<li>${c.type} — ${c.targetSkillId ?? '—'} (${c.difficulty})</li>`)
      .join('');
    const refs = (lessonData.references?.dsa5RuleRefs ?? [])
      .map(r => `<li>${r}</li>`).join('');

    const content = [
      lessonData.summary ? `<p><em>${lessonData.summary}</em></p>` : '',
      `<p><strong>Fach:</strong> ${lessonData.subject ?? '—'} | <strong>Jahr:</strong> ${(lessonData.yearRange ?? []).join('–')} | <strong>Dauer:</strong> ${lessonData.durationSlots ?? 1} Slot(s)</p>`,
      skills ? `<h3>Fertigkeiten</h3><ul>${skills}</ul>` : '',
      checks ? `<h3>Proben</h3><ul>${checks}</ul>` : '',
      refs   ? `<h3>DSA5-Regelverweise</h3><ul>${refs}</ul>` : '',
    ].filter(Boolean).join('\n');

    return this._createJournal({
      id:      lessonData.id,
      name:    lessonData.name,
      content,
      dataType: 'lesson',
      folderId,
      flags: {
        subject:   lessonData.subject,
        yearRange: lessonData.yearRange,
        tags:      lessonData.tags ?? [],
        kind:      'lesson',
        folderKey,
      }
    });
  }

  /**
   * Gemeinsame JournalEntry-Erstellungs-Hilfsmethode.
   * @private
   */
  async _createJournal({ id, name, content, dataType, folderId, flags }) {
    const journal = await JournalEntry.create({
      name,
      folder: folderId ?? null,
      pages: [{
        name:  'Inhalt',
        type:  'text',
        text:  { content, format: 1 },
      }],
      flags: {
        [MODULE_ID]: {
          janusId:  id,
          dataType,
          managed:  true,
          kind:     flags?.kind ?? null,
          folderKey: flags?.folderKey ?? null,
          syncedAt: new Date().toISOString(),
          ...flags,
        }
      },
    });
    if (!journal) throw new Error(`Journal-Erstellung fehlgeschlagen: ${name}`);
    await this.linkEntity(id, journal.uuid, { type: 'journals' });
    this._logger.info?.(`[Sync] JournalEntry erstellt: ${journal.name} (${journal.uuid})`);
    return journal;
  }

  // ─── Compendium-Lookup (Zauber) ────────────────────────────────────────────

  /**
   * Sucht einen Zauber in allen geladenen Compendien (DSA5-System-Packs).
   * Gibt UUID zurück wenn gefunden, sonst null.
   * Führt KEINEN CREATE durch — Zauber sind Systemdaten.
   * @param {string} spellName
   * @returns {Promise<string|null>} UUID
   */
  async findSpellInCompendium(spellName) {
    const normalized = spellName.trim().toLowerCase();
    for (const pack of game.packs ?? []) {
      // Nur Item-Packs durchsuchen
      if (pack.metadata?.type !== 'Item') continue;
      try {
        const index = await pack.getIndex({ fields: ['name', 'type'] });
        const entry = index.find(e =>
          e.name?.toLowerCase() === normalized
        );
        if (entry) return `Compendium.${pack.collection}.Item.${entry._id}`;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Reconcile für Zauber: Compendium-Lookup + Overlay-Check.
   * @param {object[]} spellEntities  Einträge aus spells-index.json
   * @returns {Promise<SyncReport[]>}
   */
  async reconcileSpells(spellEntities) {
    const reports = [];
    for (const spell of spellEntities) {
      const id   = `SPELL_${spell.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      const uuid = this.resolveUUID(id);

      if (uuid) {
        // Prüfe ob Compendium-UUID noch erreichbar ist
        const doc = await this._fromUUID(uuid);
        reports.push({
          id, entity: spell,
          status:      doc ? SyncStatus.LINKED : SyncStatus.BROKEN,
          uuid,
          foundryName: doc?.name ?? null,
          source:      'uuid',
          hint:        doc ? null : `UUID ${uuid} nicht mehr erreichbar`,
        });
        continue;
      }

      // Compendium-Suche
      const compUuid = await this.findSpellInCompendium(spell.name);
      if (compUuid) {
        reports.push({
          id, entity: spell,
          status:      SyncStatus.FOUND_BY_NAME,
          uuid:        compUuid,
          foundryName: spell.name,
          source:      'compendium',
          hint:        `In Compendium gefunden – bitte verknüpfen um UUID zu speichern.`,
          autoLinkable: true,  // kann automatisch verlinkt werden
        });
      } else {
        reports.push({
          id, entity: spell,
          status:      SyncStatus.MISSING,
          uuid:        null,
          foundryName: null,
          source:      null,
          hint:        `"${spell.name}" in keinem geladenen Item-Compendium gefunden.`,
          readonly:    true,   // kein Create-Button (Systemdaten)
        });
      }
    }
    return reports;
  }

  /**
   * Auto-linked alle Zauber die per Compendium FOUND_BY_NAME sind.
   * @param {SyncReport[]} spellReports
   * @returns {Promise<{linked: number, failed: number}>}
   */
  async autoLinkSpells(spellReports) {
    let linked = 0; let failed = 0;
    for (const r of spellReports) {
      if (!r.autoLinkable || !r.uuid) continue;
      try {
        await this.linkEntity(r.id, r.uuid);
        linked++;
      } catch {
        failed++;
      }
    }
    return { linked, failed };
  }

  /**
   * Registriert das UUID-Overlay-Setting. Wird von JanusConfig.registerSettings() aufgerufen.
   * @static
   */
  static registerSetting() {
    game.settings.register(MODULE_ID, UUID_SETTING, {
      name: 'JANUS7: Entity UUID Overlay',
      hint: 'Verknüpfungen zwischen JANUS7-JSON-IDs und Foundry-UUIDs. Nicht manuell bearbeiten.',
      scope: 'world',
      config: false,
      type: Object,
      default: {},
    });
  }
}

export default JanusSyncEngine;
