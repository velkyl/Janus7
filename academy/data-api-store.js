/**
 * @file academy/data-api-store.js
 * Shared cache + low-level helpers for AcademyDataApi.
 */

import { MODULE_ID } from '../core/common.js';
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
  if (globalThis.foundry?.utils?.duplicate) return foundry.utils.duplicate(value);
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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
      lessons: { type: 'array', items: { type: 'object', required: ['id', 'name'] } },
    },
  }, 'lessons');

  validator.assertSchema(npcs, {
    type: 'object',
    required: ['meta', 'npcs'],
    properties: {
      meta: { type: 'object' },
      npcs: { type: 'array', items: { type: 'object', required: ['id', 'name'] } },
    },
  }, 'npcs');

  validator.assertSchema(calendar, {
    type: 'object',
    required: ['meta', 'entries'],
    properties: {
      meta: { type: 'object' },
      entries: { type: 'array', items: { type: 'object', required: ['id', 'year', 'trimester', 'week', 'day', 'phase'] } },
    },
  }, 'calendar');

  validator.assertSchema(locations, {
    type: 'object',
    required: ['meta', 'locations'],
    properties: {
      meta: { type: 'object' },
      locations: { type: 'array', items: { type: 'object', required: ['id', 'name'] } },
    },
  }, 'locations');

  validator.assertSchema(events, {
    type: 'object',
    required: ['meta', 'events'],
    properties: {
      meta: { type: 'object' },
      events: { type: 'array', items: { type: 'object', required: ['id', 'name', 'type'] } },
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

export async function loadJson(filename) {
  const base = String(filename ?? '').trim();
  if (!base) throw new Error('JANUS7: loadJson() filename missing');

  const nested = `modules/${MODULE_ID}/data/academy/${base}`;
  const flat = `modules/${MODULE_ID}/data/academy__${base}`;

  let response = await fetch(nested);
  if (!response.ok) response = await fetch(flat);
  if (!response.ok) {
    throw new Error(`JANUS7: Kann JSON nicht laden: ${nested} (fallback: ${flat}) (${response.status})`);
  }
  return response.json();
}

export async function loadDataJson(relPath) {
  const url = `modules/${MODULE_ID}/data/${relPath}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`JANUS7: Kann JSON nicht laden: ${url} (${response.status})`);
  return response.json();
}

export function sanitizePoolFile(poolName) {
  const safe = String(poolName ?? 'uncategorized').replace(/[^a-zA-Z0-9_\-]+/g, '_');
  return safe.length ? safe : 'uncategorized';
}
