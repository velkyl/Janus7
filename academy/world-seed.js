/**
 * @file academy/world-seed.js
 * @module janus7/academy
 * @phase 8
 *
 * Seed Importer: module JSON (via AcademyDataApi) -> Foundry world documents.
 * Multi-Setting aware (Punin / Festum).
 */

import { MODULE_ID } from '../core/common.js';
import { JanusConfig } from '../core/config.js';
import { JanusFolderService } from '../core/folder-service.js';
import { AcademyDataApi } from './data-api.js';

const MANAGED_ACADEMY_ITEM_TYPE = 'book';
const MANAGED_ACADEMY_ITEM_IMG = 'icons/svg/book.svg';

function _escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function _nowIso() { return new Date().toISOString(); }

function _buildManagedBookSystemData(record, { kind, dataType } = {}) {
  const summary = record?.summary ?? record?.description ?? '';
  return {
    description: {
      value: renderAcademyRecord(kind, record)
    },
    gmdescription: {
      value: ''
    },
    category: String(dataType ?? kind ?? ''),
    author: String(record?.teacherNpcId ?? record?.author ?? ''),
    pages: String(record?.durationSlots ?? ''),
    releaseDate: '',
    language: '',
    quality: 0,
    rule: '',
    legality: 0,
    availability: '',
    format: 0,
    exemplarType: 0,
    otherNames: '',
    exemplar: '',
    storage: '',
    special: String(record?.id ?? ''),
    price: { value: 0 },
    quantity: { value: 1 },
    weight: { value: 0 },
    effect: {
      value: String(summary),
      attributes: ''
    },
    parent_id: '',
    tradeLocked: false
  };
}

function _renderJsonBlock(data) {
  try {
    const j = JSON.stringify(data, null, 2);
    return `<details style="margin-top:1rem"><summary><strong>Raw JSON (SSOT)</strong></summary><pre style="white-space:pre-wrap"><code>${_escapeHtml(j)}</code></pre></details>`;
  } catch {
    return '';
  }
}

function _renderLesson(lesson) {
  const skills = (lesson?.mechanics?.skills ?? [])
    .map(s => `<li>${_escapeHtml(s.systemSkillId)} (Gewicht: ${_escapeHtml(s.weight)})</li>`)
    .join('');
  const checks = (lesson?.mechanics?.checks ?? [])
    .map(c => `<li>${_escapeHtml(c.type)} — ${_escapeHtml(c.targetSkillId ?? '—')} (${_escapeHtml(c.difficulty)})</li>`)
    .join('');
  const refs = (lesson?.references?.dsa5RuleRefs ?? [])
    .map(r => `<li>${_escapeHtml(r)}</li>`).join('');

  const content = [
    `<p><strong>JANUS7 – World Data</strong> <span style="opacity:.75">(Lesson)</span></p>`,
    lesson?.summary ? `<p><em>${_escapeHtml(lesson.summary)}</em></p>` : '',
    `<p><strong>Fach:</strong> ${_escapeHtml(lesson.subject ?? '—')} | <strong>Jahr:</strong> ${_escapeHtml((lesson.yearRange ?? []).join('–') || '—')} | <strong>Dauer:</strong> ${_escapeHtml(lesson.durationSlots ?? 1)} Slot(s)</p>`,
    lesson?.teacherNpcId ? `<p><strong>Dozent (NPC-ID):</strong> <code>${_escapeHtml(lesson.teacherNpcId)}</code></p>` : '',
    skills ? `<h3>Fertigkeiten</h3><ul>${skills}</ul>` : '',
    checks ? `<h3>Proben</h3><ul>${checks}</ul>` : '',
    refs ? `<h3>DSA5-Regelverweise</h3><ul>${refs}</ul>` : '',
    _renderJsonBlock(lesson),
  ].filter(Boolean).join('\n');

  return content;
}

function _renderNpc(npc) {
  const p = npc?.profile ?? {};
  const tags = Array.isArray(npc?.tags) ? npc.tags.join(', ') : '';
  const sec = p?.sections ?? {};

  const content = [
    `<p><strong>JANUS7 – World Data</strong> <span style="opacity:.75">(NPC)</span></p>`,
    p?.subtitle ? `<p><strong>${_escapeHtml(p.subtitle)}</strong></p>` : '',
    `<p><strong>Rolle:</strong> ${_escapeHtml(npc.role ?? '—')} ${tags ? ` | <strong>Tags:</strong> ${_escapeHtml(tags)}` : ''}</p>`,
    p?.roleText ? `<p>${_escapeHtml(p.roleText)}</p>` : '',
    sec?.Aussehen ? `<h3>Aussehen</h3><p style="white-space:pre-wrap">${_escapeHtml(sec.Aussehen)}</p>` : '',
    sec?.Persönlichkeit ? `<h3>Persönlichkeit</h3><p style="white-space:pre-wrap">${_escapeHtml(sec.Persönlichkeit)}</p>` : '',
    _renderJsonBlock(npc),
  ].filter(Boolean).join('\n');

  return content;
}

function _renderLocation(loc) {
  const content = [
    `<p><strong>JANUS7 – World Data</strong> <span style="opacity:.75">(Location)</span></p>`,
    `<p><strong>Typ:</strong> ${_escapeHtml(loc.type ?? '—')}</p>`,
    loc?.zone ? `<p><strong>Zone:</strong> ${_escapeHtml(loc.zone)}</p>` : '',
    loc?.summary ? `<p><em>${_escapeHtml(loc.summary)}</em></p>` : '',
    _renderJsonBlock(loc),
  ].filter(Boolean).join('\n');

  return content;
}

function _renderEvent(ev) {
  const content = [
    `<p><strong>JANUS7 – World Data</strong> <span style="opacity:.75">(Event)</span></p>`,
    `<p><strong>Typ:</strong> ${_escapeHtml(ev.type ?? '—')}</p>`,
    ev?.summary ? `<p><em>${_escapeHtml(ev.summary)}</em></p>` : '',
    _renderJsonBlock(ev),
  ].filter(Boolean).join('\n');

  return content;
}

function _renderCalendar(cal) {
  const meta = cal?.meta ?? {};
  const entries = Array.isArray(cal?.entries) ? cal.entries.length : 0;
  const content = [
    `<p><strong>JANUS7 – World Data</strong> <span style="opacity:.75">(Calendar)</span></p>`,
    `<p><strong>Entries:</strong> ${entries} | <strong>Schema:</strong> ${_escapeHtml(meta.schemaVersion ?? '—')}</p>`,
    _renderJsonBlock(cal),
  ].filter(Boolean).join('\n');

  return content;
}

export function renderAcademyRecord(kind, record) {
  const k = String(kind ?? '').toLowerCase();
  if (k === 'lesson') return _renderLesson(record);
  if (k === 'npc') return _renderNpc(record);
  if (k === 'location') return _renderLocation(record);
  if (k === 'event') return _renderEvent(record);
  if (k === 'calendar') return _renderCalendar(record);
  return _renderJsonBlock(record);
}

async function _findExistingJournalById(janusId) {
  try {
    const uuid = game?.settings?.get?.(MODULE_ID, 'entityUUIDs')?.[janusId] ?? null;
    if (uuid) {
      const doc = await (globalThis.fromUuid?.(uuid) ?? globalThis.fromUuidSync?.(uuid));
      if (doc?.documentName === 'JournalEntry') return doc;
    }
  } catch { /* ignore */ }

  const journals = game?.journal?.contents ?? [];
  return journals.find(j => (j?.flags?.[MODULE_ID]?.janusId === janusId)) ?? null;
}

async function _findExistingItemById(janusId) {
  try {
    const uuid = game?.settings?.get?.(MODULE_ID, 'entityUUIDs')?.[janusId] ?? null;
    if (uuid) {
      const doc = await (globalThis.fromUuid?.(uuid) ?? globalThis.fromUuidSync?.(uuid));
      if (doc?.documentName === 'Item') return doc;
    }
  } catch { /* ignore */ }

  const items = game?.items?.contents ?? [];
  return items.find((item) => item?.flags?.[MODULE_ID]?.janusId === janusId) ?? null;
}

async function _upsertJournalRecord({ kind, dataType, record, folderSvc, mode }) {
  const id = String(record?.id ?? '').trim();
  if (!id) throw new Error('SeedImport: record.id missing');

  const existing = await _findExistingJournalById(id);
  if (existing && mode === 'merge') {
    return { id, status: 'skipped', uuid: existing.uuid };
  }

  const folder = await folderSvc.ensureFor({ docType: 'JournalEntry', kind });

  const render =
    kind === 'lesson' ? _renderLesson :
    kind === 'npc' ? _renderNpc :
    kind === 'location' ? _renderLocation :
    kind === 'event' ? _renderEvent :
    kind === 'calendar' ? _renderCalendar :
    (() => _renderJsonBlock(record));

  const flags = {
    [MODULE_ID]: {
      janusId: id,
      dataType,
      managed: true,
      kind,
      folderKey: folder.folderKey ?? null,
      source: { kind: 'seed', moduleVersion: game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown' },
      seededAt: _nowIso(),
      syncedAt: _nowIso(),
      data: record,
    }
  };

  const page = {
    name: 'Inhalt',
    type: 'text',
    text: { content: render(record), format: 1 },
  };

  if (!existing) {
    const j = await JournalEntry.create({
      name: record?.name ?? record?.title ?? id,
      folder: folder.folderId ?? null,
      pages: [page],
      flags,
    });
    if (!j) throw new Error(`SeedImport: JournalEntry create failed for ${id}`);
    try {
      await game?.janus7?.sync?.linkEntity?.(id, j.uuid);
    } catch { /* optional */ }
    return { id, status: 'created', uuid: j.uuid };
  }

  const updates = {
    name: record?.name ?? record?.title ?? existing.name,
    folder: folder.folderId ?? existing.folder?.id ?? null,
    flags: { ...existing.flags, ...flags },
  };
  await existing.update(updates);

  try {
    const p0 = existing.pages?.contents?.[0] ?? existing.pages?.[0] ?? null;
    if (p0?.id) {
      await existing.updateEmbeddedDocuments('JournalEntryPage', [{
        _id: p0.id,
        name: 'Inhalt',
        type: 'text',
        text: { content: render(record), format: 1 },
      }]);
    }
  } catch { /* ignore */ }

  try {
    await game?.janus7?.sync?.linkEntity?.(id, existing.uuid);
  } catch { /* optional */ }

  return { id, status: 'updated', uuid: existing.uuid };
}

function _itemKindForRecord(kind, dataType) {
  if (dataType === 'spellCurriculum') return 'curriculum';
  if (dataType === 'spellsIndex') return 'spell';
  if (dataType === 'library-item') return 'library';
  if (dataType === 'calendar') return 'calendar';
  if (['lesson', 'npc', 'location', 'event', 'library', 'curriculum', 'spell', 'calendar'].includes(String(kind ?? ''))) {
    return kind;
  }
  return 'misc';
}

async function _upsertItemRecord({ kind, dataType, record, folderSvc, mode }) {
  const id = String(record?.id ?? '').trim();
  if (!id) throw new Error('SeedImport: record.id missing');

  const existing = await _findExistingItemById(id);
  if (existing && mode === 'merge') {
    return { id, status: 'skipped', uuid: existing.uuid };
  }

  const itemKind = _itemKindForRecord(kind, dataType);
  const folder = await folderSvc.ensureFor({ docType: 'Item', kind: itemKind });
  const flags = {
    [MODULE_ID]: {
      janusId: id,
      dataType,
      managed: true,
      kind: itemKind,
      sourceKind: kind,
      folderKey: folder.folderKey ?? null,
      seededAt: _nowIso(),
      syncedAt: _nowIso(),
      data: record,
    }
  };

  const itemData = {
    name: record?.name ?? record?.title ?? id,
    type: MANAGED_ACADEMY_ITEM_TYPE,
    img: MANAGED_ACADEMY_ITEM_IMG,
    folder: folder.folderId ?? null,
    system: _buildManagedBookSystemData(record, { kind, dataType }),
    flags,
  };

  if (!existing) {
    const item = await Item.create(itemData);
    if (!item) throw new Error(`SeedImport: Item create failed for ${id}`);
    try {
      await game?.janus7?.sync?.linkEntity?.(id, item.uuid, { type: 'items' });
    } catch { /* optional */ }
    return { id, status: 'created', uuid: item.uuid };
  }

  await existing.update({
    name: itemData.name,
    img: itemData.img,
    folder: itemData.folder,
    system: itemData.system,
    flags: { ...existing.flags, ...flags },
  }, { diff: false });

  try {
    await game?.janus7?.sync?.linkEntity?.(id, existing.uuid, { type: 'items' });
  } catch { /* optional */ }

  return { id, status: 'updated', uuid: existing.uuid };
}

/**
 * Seed-import the academy datasets for the ACTIVE profile.
 * Optimized for Phase 8 Multi-Setting support.
 */
export async function seedImportAcademyToJournals(opts = {}) {
  if (!game.user?.isGM) throw new Error('Nur GM darf Seed-Import ausführen.');
  if (!AcademyDataApi.isReady) {
    await AcademyDataApi.init();
  }

  const mode = (opts.mode === 'overwrite') ? 'overwrite' : 'merge';
  const folderSvc = new JanusFolderService({ logger: game?.janus7?.core?.logger ?? console });

  const report = {
    mode,
    at: _nowIso(),
    created: 0,
    updated: 0,
    skipped: 0,
    documents: {
      journals: { created: 0, updated: 0, skipped: 0 },
      items: { created: 0, updated: 0, skipped: 0 },
    },
    results: [],
  };

  const work = [];
  // Load profile-aware datasets via API
  for (const l of AcademyDataApi.getLessons()) work.push({ kind: 'lesson', dataType: 'lesson', record: l });
  for (const n of AcademyDataApi.getNpcs()) work.push({ kind: 'npc', dataType: 'npc', record: n });
  for (const loc of AcademyDataApi.getLocations()) work.push({ kind: 'location', dataType: 'location', record: loc });
  for (const e of AcademyDataApi.getEvents()) work.push({ kind: 'event', dataType: 'event', record: e });

  const spellCurriculum = AcademyDataApi.getSpellCurriculum();
  if (spellCurriculum) {
    work.push({ kind: 'curriculum', dataType: 'spellCurriculum', record: { ...spellCurriculum, id: 'ACADEMY_SPELL_CURRICULUM', name: 'Zauber-Lehrplan' } });
  }

  const spellsIndex = AcademyDataApi.getSpellsIndex();
  if (spellsIndex) {
    work.push({ kind: 'spell', dataType: 'spellsIndex', record: { ...spellsIndex, id: 'ACADEMY_SPELLS_INDEX', name: 'Zauberindex' } });
  }

  for (const it of AcademyDataApi.getLibraryItems()) {
    work.push({ kind: 'library', dataType: 'library-item', record: { ...it, name: it.title ?? it.id } });
  }

  const calendar = AcademyDataApi.getCalendarEntries();
  if (calendar) {
    work.push({ kind: 'calendar', dataType: 'calendar', record: { id: 'ACADEMY_CALENDAR', name: 'Kalender (Academy)', entries: calendar } });
  }

  for (const w of work) {
    const journalResult = await _upsertJournalRecord({ ...w, folderSvc, mode });
    const itemResult = await _upsertItemRecord({ ...w, folderSvc, mode });
    report.results.push({ id: w.record?.id, dataType: w.dataType, journal: journalResult, item: itemResult });

    for (const [bucket, result] of [['journals', journalResult], ['items', itemResult]]) {
      if (result.status === 'created') {
        report.created += 1;
        report.documents[bucket].created += 1;
      } else if (result.status === 'updated') {
        report.updated += 1;
        report.documents[bucket].updated += 1;
      } else {
        report.skipped += 1;
        report.documents[bucket].skipped += 1;
      }
    }
  }

  // Persist seed metadata
  try {
    const prev = JanusConfig.get('academyDataStore') ?? {};
    await JanusConfig.set('academyDataStore', {
      ...prev,
      lastSeed: { at: report.at, mode, moduleVersion: game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown' },
    });
  } catch { /* ignore */ }

  return report;
}

const MANAGED_DOMAIN_META = {
  lesson: { kind: 'lesson', dataType: 'lesson' },
  npc: { kind: 'npc', dataType: 'npc' },
  location: { kind: 'location', dataType: 'location' },
  event: { kind: 'event', dataType: 'event' },
  calendar: { kind: 'calendar', dataType: 'calendar' },
  spellCurriculum: { kind: 'curriculum', dataType: 'spellCurriculum' },
  spellsIndex: { kind: 'spell', dataType: 'spellsIndex' },
  'library-item': { kind: 'library', dataType: 'library-item' },
};

export async function upsertManagedAcademyRecord({ domainId, record, mode = 'overwrite' } = {}) {
  if (!game?.user?.isGM) throw new Error('GM only');
  const meta = MANAGED_DOMAIN_META[String(domainId ?? '').trim()];
  if (!meta) throw new Error(`Unsupported domain: ${domainId}`);
  const folderSvc = new JanusFolderService({ logger: game?.janus7?.core?.logger ?? console });
  return _upsertJournalRecord({ kind: meta.kind, dataType: meta.dataType, record, folderSvc, mode });
}

export async function upsertManagedAcademyItemRecord({ domainId, record, mode = 'overwrite' } = {}) {
  if (!game?.user?.isGM) throw new Error('GM only');
  const meta = MANAGED_DOMAIN_META[String(domainId ?? '').trim()];
  if (!meta) throw new Error(`Unsupported domain: ${domainId}`);
  const folderSvc = new JanusFolderService({ logger: game?.janus7?.core?.logger ?? console });
  return _upsertItemRecord({ kind: meta.kind, dataType: meta.dataType, record, folderSvc, mode });
}
