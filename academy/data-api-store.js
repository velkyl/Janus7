/**
 * @file academy/data-api-store.js
 * Shared cache + low-level helpers for AcademyDataApi.
 */

import { moduleAssetPath } from '../core/common.js';
import { getJanusCore } from '../core/index.js';

let _academyCache = null;
const _contentCache = {
  reg: null,
  loading: null,
};

export function getAcademyCache() {
  return _academyCache;
}

export function setAcademyCache(value) {
  _academyCache = value;
  return _academyCache;
}

export function resetAcademyCache() {
  _academyCache = null;
}

export function getContentCache() {
  return _contentCache;
}

export function resetContentCache() {
  _contentCache.reg = null;
  _contentCache.loading = null;
}

export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) deepFreeze(obj[key]);
  return obj;
}

export function clone(value) {
  if (value === undefined) return undefined;
  return foundry.utils.deepClone(value);
}

export function unready(label, fallback) {
  const core = getJanusCore();
  core?.logger?.warn?.(`[JANUS7] AcademyDataApi accessed before init: ${label}`);
  return fallback;
}

export function validateOptionalDataset(validator, key, data, label) {
  if (!validator || !data) return;
  const result = validator.validate(key, data);
  if (!result?.valid) {
    const list = Array.isArray(result?.errors) ? result.errors.join(' | ') : 'unknown validation error';
    throw new Error(`JANUS7: Validation failed for ${label}: ${list}`);
  }
}

export function logReferenceDiagnostics(logger, result) {
  if (!result) return;
  for (const msg of result.errors ?? []) logger?.error?.(`[JANUS7][AcademyDataApi] ${msg}`);
  for (const msg of result.warnings ?? []) logger?.warn?.(`[JANUS7][AcademyDataApi] ${msg}`);
}

export function validateExtendedDatasets(extensions) {
  const ensureUnique = (arr, key, label) => {
    const seen = new Set();
    for (const row of Array.isArray(arr) ? arr : []) {
      const id = String(row?.[key] ?? '').trim();
      if (!id) continue;
      if (seen.has(id)) throw new Error(`JANUS7: Duplicate id in ${label}: ${id}`);
      seen.add(id);
    }
  };

  ensureUnique(extensions?.social_links?.socialLinks, 'id', 'social_links.socialLinks');
  ensureUnique(extensions?.milestones?.milestones, 'id', 'milestones.milestones');
  ensureUnique(extensions?.collections?.collections, 'id', 'collections.collections');
  ensureUnique(extensions?.resources?.resources, 'id', 'resources.resources');
  ensureUnique(extensions?.school_stats?.stats, 'id', 'school_stats.stats');
}

export function validateAcademyDatasets(validator, lessons, npcs, calendar, locations, events) {
  validator.assertSchema(lessons, {
    type: 'object',
    required: ['meta', 'lessons'],
    properties: {
      meta: { type: 'object' },
      lessons: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id:   { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }, 'lessons');

  validator.assertSchema(npcs, {
    type: 'object',
    required: ['meta', 'npcs'],
    properties: {
      meta: { type: 'object' },
      npcs: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id:   { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }, 'npcs');

  validator.assertSchema(calendar, {
    type: 'object',
    required: ['meta', 'entries'],
    properties: {
      meta: { type: 'object' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'year', 'trimester', 'week', 'day', 'phase'],
          properties: {
            id: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }, 'calendar');

  validator.assertSchema(locations, {
    type: 'object',
    required: ['meta', 'locations'],
    properties: {
      meta: { type: 'object' },
      locations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id:   { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }, 'locations');

  validator.assertSchema(events, {
    type: 'object',
    required: ['meta', 'events'],
    properties: {
      meta: { type: 'object' },
      events: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'type'],
          properties: {
            id:   { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
            type: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  }, 'events');

  const ensureUnique = (arr, label) => {
    const seen = new Set();
    for (const entry of arr) {
      if (!entry?.id) continue;
      if (seen.has(entry.id)) throw new Error(`JANUS7: Duplicate id in ${label}: ${entry.id}`);
      seen.add(entry.id);
    }
  };

  ensureUnique(lessons.lessons, 'lessons.lessons');
  ensureUnique(npcs.npcs, 'npcs.npcs');
  ensureUnique(calendar.entries, 'calendar.entries');
  ensureUnique(locations.locations, 'locations.locations');
  ensureUnique(events.events, 'events.events');
}

import { JanusProfileRegistry } from '../core/profiles/index.js';

/**
 * Shared logic to resolve a JSON asset across multiple possible locations.
 * Priority: Profile-Academy -> Profile-Root -> Academy-Nested -> Data-Root -> Flat-Fallback.
 * @param {string} base - The relative path (e.g. 'lessons.json' or 'quests/index.json')
 * @returns {Promise<Response|null>}
 * @private
 */
async function _resolveAsset(base) {
  const filename = String(base ?? '').trim().replace(/^\/+/, '');
  if (!filename) return null;

  const profile = JanusProfileRegistry.getActive();
  // Strip academy/ prefix if it exists to avoid double-prefixing in the academy fallbacks
  const isAcademyNamespace = filename.startsWith('academy/');
  const relativePath = filename.replace(/^academy\//, '');
  
  const attempts = [
    { url: moduleAssetPath(`data/profiles/${profile.id}/academy/${relativePath}`), label: 'profile-academy' },
    { url: moduleAssetPath(`data/profiles/${profile.id}/${relativePath}`),          label: 'profile-direct' }
  ];

  // 3. Central Academy Data Store (nested)
  const shouldTryAcademyNested = isAcademyNamespace || !filename.includes('/');
  if (shouldTryAcademyNested) {
    attempts.push({ 
      url: moduleAssetPath(`data/academy/${relativePath}`), 
      label: 'nested' 
    });
  }

  // 4. Base Data Root (e.g. for data/quests/ or data/events/)
  attempts.push({ 
    url: moduleAssetPath(`data/${filename}`), 
    label: 'base' 
  });

  // 5. Flat Fallback (for legacy naming)
  if (filename.includes('/')) {
    const flatName = filename.replace(/\//g, '__');
    attempts.push({ 
      url: moduleAssetPath(`data/academy__${flatName}`), 
      label: 'flat' 
    });
  }

  // Iterate over attempts using fetch
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url);
      if (response.ok) return response;
    } catch (_e) {
      // Network/CORS errors handled silently
    }
  }

  return null;
}

export async function loadJson(filename) {
  const response = await _resolveAsset(filename);
  if (!response) {
    getJanusCore()?.logger?.error?.(`[JANUS7:academy:data] CRITICAL: JSON "${filename}" could not be loaded from any expected path.`);
    throw new Error(`JANUS7: Kann JSON "${filename}" nicht laden. (404 an allen Fallback-Paths)`);
  }
  return response.json();
}

export async function loadDataJson(relPath) {
  const response = await _resolveAsset(relPath);
  if (!response) {
    throw new Error(`JANUS7: loadDataJson("${relPath}") failed at all paths.`);
  }
  return response.json();
}

export function sanitizePoolFile(poolName) {
  const safe = String(poolName ?? 'uncategorized').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return safe.length ? safe : 'uncategorized';
}
