/**
 * @file academy/world-editor.js
 * World-managed record helpers extracted from AcademyDataApi.
 */

import { MODULE_ID } from '../core/common.js';
import { clone } from './data-api-store.js';
import { collectAcademyWorldOverrides } from './world-overrides.js';
import { upsertManagedAcademyRecord } from './world-seed.js';

export const EDITABLE_DOMAIN_MAP = Object.freeze({
  lesson: { dataType: 'lesson', requiresId: true },
  spellCurriculum: { dataType: 'spellCurriculum', requiresId: false },
  spellsIndex: { dataType: 'spellsIndex', requiresId: false },
  'library-item': { dataType: 'library-item', requiresId: true },
  library: { dataType: 'library', requiresId: false },
  npc: { dataType: 'npc', requiresId: true },
  location: { dataType: 'location', requiresId: true },
  event: { dataType: 'event', requiresId: true },
  calendar: { dataType: 'calendar', requiresId: false },
});

export function listManagedJournalDocs(domainId) {
  const meta = EDITABLE_DOMAIN_MAP[String(domainId ?? '').trim()];
  if (!meta) return [];
  const docs = (globalThis.game?.journal?.contents ?? []).filter((journal) => {
    const flags = journal?.flags?.[MODULE_ID] ?? null;
    return !!(flags?.managed && String(flags?.dataType ?? '') === meta.dataType && flags?.data && typeof flags.data === 'object');
  });
  docs.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')));
  return docs;
}

export function defaultRecordName(domainId, record) {
  if (domainId === 'calendar') return record?.name ?? 'Kalender';
  if (domainId === 'spellCurriculum') return record?.name ?? 'Lehrplan';
  if (domainId === 'spellsIndex') return record?.name ?? 'Zauberindex';
  if (domainId === 'library') return record?.name ?? 'Bibliothek';
  return record?.name ?? record?.title ?? record?.id ?? 'Neuer Datensatz';
}

export function applyWorldOverrides(base, overrides) {
  const baseArr = Array.isArray(base) ? base : [];
  const overArr = Array.isArray(overrides) ? overrides : [];
  if (!overArr.length) return baseArr;

  const byId = new Map(baseArr.filter((entry) => entry && entry.id).map((entry) => [entry.id, entry]));
  for (const row of overArr) {
    if (!row?.id) continue;
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

export function loadWorldOverrides() {
  try {
    return collectAcademyWorldOverrides();
  } catch (_err) {
    return {
      lessons: [],
      npcs: [],
      locations: [],
      events: [],
      calendar: null,
      spellCurriculum: null,
      spellsIndex: null,
      libraryItems: [],
      library: null,
    };
  }
}

export function listManagedRecords(domainId) {
  return listManagedJournalDocs(domainId).map((doc) => ({
    uuid: doc.uuid,
    id: doc?.flags?.[MODULE_ID]?.janusId ?? null,
    name: doc?.name ?? '',
    domainId,
    dataType: doc?.flags?.[MODULE_ID]?.dataType ?? null,
    data: clone(doc?.flags?.[MODULE_ID]?.data ?? null),
    doc,
  }));
}

export function getManagedRecordByUuid(uuid) {
  const doc = (globalThis.game?.journal?.contents ?? []).find((entry) => entry?.uuid === uuid) ?? null;
  if (!doc) return null;
  const flags = doc?.flags?.[MODULE_ID] ?? {};
  return {
    uuid: doc.uuid,
    id: flags?.janusId ?? null,
    name: doc?.name ?? '',
    domainId: flags?.dataType ?? null,
    dataType: flags?.dataType ?? null,
    data: clone(flags?.data ?? null),
    doc,
  };
}

export function validateManagedRecord(domainId, record) {
  const meta = EDITABLE_DOMAIN_MAP[String(domainId ?? '').trim()];
  if (!meta) throw new Error(`Unsupported domain: ${domainId}`);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Record must be an object');
  }
  if (meta.requiresId && !String(record?.id ?? '').trim()) {
    throw new Error(`Record for ${domainId} requires a non-empty id`);
  }
  return true;
}

export async function saveManagedRecord({ domainId, record, mode = 'overwrite', onReload } = {}) {
  validateManagedRecord(domainId, record);
  const prepared = clone(record);
  if (!prepared.name && ['calendar', 'spellCurriculum', 'spellsIndex', 'library'].includes(String(domainId ?? ''))) {
    prepared.name = defaultRecordName(domainId, prepared);
  }
  const result = await upsertManagedAcademyRecord({ domainId, record: prepared, mode });
  if (typeof onReload === 'function') await onReload();
  return result;
}
