/**
 * @file phase7/export/JanusKiExportService.js
 * Implements the Phase 7 export contract for JANUS_EXPORT_V2.
 *
 * Canonical contract:
 * - version: JANUS_EXPORT_V2
 * - meta.exportedAt / meta.world / meta.version / meta.moduleVersion
 * - campaign_state: full JANUS state snapshot
 * - optional academy / references / knowledge_links / art sections
 */

import { getModuleVersion } from '../../core/version.js';
import { JanusKiBundleInvalidError } from '../errors.js';
import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

const KI_EXPORT_BUNDLE_SCHEMA = {
  type: 'object',
  required: ['version', 'meta', 'campaign_state'],
  additionalProperties: false,
  properties: {
    version: { type: 'string', enum: ['JANUS_EXPORT_V2'] },
    meta: {
      type: 'object',
      required: ['version', 'schemaVersion', 'exportedAt', 'world', 'moduleVersion'],
      additionalProperties: true,
      properties: {
        version: { type: 'string', minLength: 1 },
        schemaVersion: { type: 'string', minLength: 1 },
        exportedAt: { type: ['string', 'null'], nullable: true },
        world: { type: ['string', 'null'], nullable: true },
        moduleVersion: { type: 'string', minLength: 1 },
        stateVersion: { type: ['string', 'null'], nullable: true },
        exportMode: { type: ['string', 'null'], nullable: true }
      }
    },
    campaign_state: {
      type: 'object',
      required: ['time', 'meta'],
      additionalProperties: true,
      properties: {
        time: { type: 'object' },
        meta: { type: 'object' }
      }
    },
    academy: { type: ['object', 'null'], nullable: true, additionalProperties: true },
    references: { type: ['object', 'null'], nullable: true, additionalProperties: true },
    knowledge_links: { type: ['object', 'null'], nullable: true, additionalProperties: true },
    art: { type: ['object', 'null'], nullable: true, additionalProperties: true }
  }
};

function clone(obj) {
  try {
    if (typeof foundry !== 'undefined' && foundry?.utils?.deepClone) {
      return foundry.utils.deepClone(obj);
    }
  } catch (_) { /* fallback to JSON clone */ }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_) {
    return obj;
  }
}

function filterNulls(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

function pruneNullishDeep(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => pruneNullishDeep(entry))
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== 'object') {
    return value == null ? undefined : value;
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    const pruned = pruneNullishDeep(entry);
    if (pruned === undefined) continue;
    if (typeof pruned === 'object' && !Array.isArray(pruned) && Object.keys(pruned).length === 0) continue;
    out[key] = pruned;
  }
  return Object.keys(out).length ? out : undefined;
}

function looksLikeQuestState(entry) {
  return !!entry && typeof entry === 'object' && !Array.isArray(entry) && (
    Object.prototype.hasOwnProperty.call(entry, 'status')
    || Object.prototype.hasOwnProperty.call(entry, 'currentNodeId')
    || Object.prototype.hasOwnProperty.call(entry, 'startedAt')
  );
}

function dropTestQuestActors(value) {
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [actorId, quests] of Object.entries(value)) {
    if (/^Actor\.test_/i.test(String(actorId))) continue;
    if (quests && typeof quests === 'object' && !Array.isArray(quests)) {
      const values = Object.values(quests);
      const looksLikeQuestMap = values.every((entry) => looksLikeQuestState(entry));
      if (looksLikeQuestMap) {
        const pruned = pruneNullishDeep(quests);
        if (pruned !== undefined) out[actorId] = pruned;
        continue;
      }
      for (const [nestedId, nestedQuests] of Object.entries(quests)) {
        const flatActorId = `${actorId}.${nestedId}`;
        if (/^Actor\.test_/i.test(String(flatActorId))) continue;
        const pruned = pruneNullishDeep(nestedQuests);
        if (pruned !== undefined) out[flatActorId] = pruned;
      }
      continue;
    }
    const pruned = pruneNullishDeep(quests);
    if (pruned !== undefined) out[actorId] = pruned;
  }
  return Object.keys(out).length ? out : undefined;
}


function stableSortDeep(value) {
  if (Array.isArray(value)) return value.map((entry) => stableSortDeep(entry));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stableSortDeep(value[key]);
  return out;
}

function normalizeCurrentLocationId(locationId, staticSnapshot) {
  if (locationId == null) return undefined;
  const raw = String(locationId).trim();
  if (!raw) return undefined;
  const validIds = new Set(Array.isArray(staticSnapshot?.locations) ? staticSnapshot.locations.map((loc) => loc?.id).filter(Boolean) : []);
  if (validIds.has(raw)) return raw;
  if (/^loc_/i.test(raw) && !/^LOC_/.test(raw)) return undefined;
  return validIds.size ? undefined : raw;
}

export class JanusKiExportService {
  constructor({ state, validator, logger, academyData, engine } = {}) {
    this.state = state;
    this.validator = validator;
    this.logger = logger ?? console;
    this._academyDataRef = academyData ?? null;
    this._engineRef = engine ?? null;
  }

  get academyData() {
    return this._academyDataRef
      ?? this._engineRef?.academy?.data
      ?? globalThis.game?.janus7?.academy?.data
      ?? null;
  }

  _filterNulls(obj) { return filterNulls(obj); }

  _buildAcademySnapshot() {
    const api = this.academyData;
    if (!api) return null;
    const ready = api.isReady ?? false;
    if (!ready) {
      this.logger?.debug?.('[KI Export] AcademyDataApi not ready — academy snapshot skipped');
      return null;
    }

    const snapshot = {};
    const safe = (fn) => { try { const r = fn(); return Array.isArray(r) ? r : []; } catch(_) { return []; } };

    const npcs = safe(() => api.getNpcs());
    if (npcs.length) {
      snapshot.npcs = npcs.map((n) => ({
        id: n.id,
        name: n.name,
        ...(n.role ? { role: n.role } : {}),
        ...(n.type ? { type: n.type } : {}),
        ...(n.subject ? { subject: n.subject } : {}),
        ...(n.personality ? { personality: n.personality } : {}),
        ...(n.faction ? { faction: n.faction } : {})
      })).filter((n) => n.id);
    }

    const lessons = safe(() => api.getLessons());
    if (lessons.length) {
      snapshot.lessons = lessons.map((l) => ({
        id: l.id,
        name: l.name,
        ...(l.subject ? { subject: l.subject } : {}),
        ...(l.level ? { level: l.level } : {}),
        ...(l.teacher ? { teacher: l.teacher } : {})
      })).filter((l) => l.id);
    }

    const locations = safe(() => api.getLocations());
    if (locations.length) {
      snapshot.locations = locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        ...(loc.type ? { type: loc.type } : {}),
        ...(loc.description ? { description: loc.description } : {})
      })).filter((loc) => loc.id);
    }

    return Object.keys(snapshot).length ? snapshot : null;
  }

  _validateBundle(bundle) {
    if (!this.validator?.validateSchema) return bundle;
    const res = this.validator.validateSchema(bundle, KI_EXPORT_BUNDLE_SCHEMA, 'KI export bundle');
    if (!res?.valid) {
      const errors = Array.isArray(res?.errors) ? res.errors : [];
      throw new JanusKiBundleInvalidError('KI export bundle validation failed', { errors });
    }
    return bundle;
  }

  exportBundle({ mode = 'lite' } = {}) {
    const stateObj = clone(this.state?.get?.() ?? {});
    const stateMeta = stateObj?.meta ?? {};
    const moduleVersion = getModuleVersion();
    const meta = {
      version: moduleVersion,
      schemaVersion: '2.0',
      exportedAt: null,
      world: null,
      moduleVersion,
      stateVersion: stateMeta.version ?? moduleVersion,
      exportMode: mode
    };

    try {
      meta.world = (typeof game !== 'undefined' && game?.world?.id != null) ? game.world.id : null;
    } catch (_) {
      meta.world = null;
    }

    const campaignState = stateObj;
    delete campaignState.test;
    // Ensure required schema fields exist (campaign_state.meta and campaign_state.time)
    campaignState.meta = campaignState.meta ?? {};
    campaignState.time = campaignState.time ?? { year: 1039, trimester: 1, week: 1, dayIndex: 0, slotIndex: 0 };
    if (campaignState?.academy && typeof campaignState.academy === 'object') {
      delete campaignState.academy._testMarker;
    }
    if (!campaignState.meta.version) campaignState.meta.version = moduleVersion;
    if (campaignState?.foundryLinks) {
      for (const bucket of ['npcs', 'pcs', 'locations', 'scenes', 'journals', 'playlists', 'items', 'rollTables', 'macros']) {
        if (campaignState.foundryLinks[bucket]) {
          campaignState.foundryLinks[bucket] = filterNulls(campaignState.foundryLinks[bucket]);
        }
      }
      campaignState.foundryLinks = pruneNullishDeep(campaignState.foundryLinks) ?? {};
    }
    if (campaignState?.actors?.npcs) campaignState.actors.npcs = filterNulls(campaignState.actors.npcs);
    if (campaignState?.academy?.calendar) campaignState.academy.calendar = filterNulls(campaignState.academy.calendar);
    if (campaignState?.academy?.quests) campaignState.academy.quests = dropTestQuestActors(campaignState.academy.quests) ?? {};
    if (campaignState?.academy?.social?.relationships) {
      campaignState.academy.social.relationships = pruneNullishDeep(campaignState.academy.social.relationships) ?? {};
    }

    const staticSnapshot = mode !== 'lite' ? this._buildAcademySnapshot() : null;
    const normalizedCurrentLocationId = normalizeCurrentLocationId(stateObj?.academy?.currentLocationId, staticSnapshot);
    if (campaignState?.academy && typeof campaignState.academy === 'object') {
      if (normalizedCurrentLocationId) campaignState.academy.currentLocationId = normalizedCurrentLocationId;
      else delete campaignState.academy.currentLocationId;
    }

    let academy;
    if (mode !== 'lite') {
      academy = staticSnapshot ? {
        ...staticSnapshot,
        ...(normalizedCurrentLocationId ? { currentLocationId: normalizedCurrentLocationId } : {})
      } : undefined;
    }

    let references;
    let knowledgeLinks;
    let art;
    if (mode === 'full') {
      const fl = stateObj?.foundryLinks ?? {};
      references = pruneNullishDeep({
        npcs: this._filterNulls(fl.npcs ?? {}),
        pcs: this._filterNulls(fl.pcs ?? {}),
        locations: this._filterNulls(fl.locations ?? {}),
        scenes: this._filterNulls(fl.scenes ?? {}),
        journals: this._filterNulls(fl.journals ?? {})
      });
      knowledgeLinks = undefined;
      art = undefined;
    }

    const bundle = {
      version: 'JANUS_EXPORT_V2',
      meta,
      campaign_state: campaignState
    };
    if (academy && Object.keys(academy).length) bundle.academy = academy;
    if (references && Object.keys(references).length) bundle.references = references;
    if (knowledgeLinks !== undefined) bundle.knowledge_links = knowledgeLinks;
    if (art !== undefined) bundle.art = art;

    const stableBundle = stableSortDeep(bundle);
    this._validateBundle(stableBundle);
    emitHook(HOOKS.KI_EXPORTED, { mode, meta: stableBundle.meta, bundleVersion: stableBundle.version });
    return stableBundle;
  }
}
