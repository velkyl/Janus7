/**
 * @file academy/world-seed.js
 * @module janus7/academy
 * @phase 2
 *
 * Seed Importer: module JSON -> Foundry JournalEntries (structured flags)
 *
 * Design rules:
 * - SSOT stays structured JSON in flags.
 * - Journal text is a view (rendered from flags.data).
 * - Idempotent by default (mode: "merge").
 * - GM-only.
 */

import { MODULE_ID } from '../core/common.js';
import { JanusConfig } from '../core/config.js';
import { JanusFolderService } from '../core/folder-service.js';

function _escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function _fetchAcademyJson(file) {
  const url = `modules/${MODULE_ID}/data/academy/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JANUS7: SeedImport kann JSON nicht laden: ${url} (${res.status})`);
  return res.json();
}

function _nowIso() { return new Date().toISOString(); }

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



/**
 * Render a record into HTML for the Journal page.
 * This is a VIEW only; SSOT is flags.data.
 * @param {string} kind
 * @param {object} record
 */
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
    // Prefer overlay mapping if present
    const uuid = game?.settings?.get?.(MODULE_ID, 'entityUUIDs')?.[janusId] ?? null;
    if (uuid) {
      const doc = await (globalThis.fromUuid?.(uuid) ?? globalThis.fromUuidSync?.(uuid));
      if (doc?.documentName === 'JournalEntry') return doc;
    }
  } catch { /* ignore */ }

  // Fallback: scan
  const journals = game?.journal?.contents ?? [];
  return journals.find(j => (j?.flags?.[MODULE_ID]?.janusId === janusId)) ?? null;
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

  // overwrite
  const updates = {
    name: record?.name ?? record?.title ?? existing.name,
    folder: folder.folderId ?? existing.folder?.id ?? null,
    flags: { ...existing.flags, ...flags },
  };
  await existing.update(updates);

  // update first page content (best-effort)
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

/**
 * Seed-import the canonical academy datasets into Foundry Journals.
 * @param {{ mode?: 'merge'|'overwrite' }} opts
 */
export async function seedImportAcademyToJournals(opts = {}) {
  if (!game.user?.isGM) throw new Error('Nur GM darf Seed-Import ausführen.');

  const mode = (opts.mode === 'overwrite') ? 'overwrite' : 'merge';
  const logger = game?.janus7?.core?.logger ?? console;
  const folderSvc = new JanusFolderService({ logger });

  const [lessons, npcs, locations, events, calendar, spellCurriculum, spellsIndex, library] = await Promise.all([
    _fetchAcademyJson('lessons.json'),
    _fetchAcademyJson('npcs.json'),
    _fetchAcademyJson('locations.json'),
    _fetchAcademyJson('events.json'),
    _fetchAcademyJson('calendar.json'),
    _fetchAcademyJson('spell-curriculum.json'),
    _fetchAcademyJson('spells-index.json'),
    _fetchAcademyJson('library.json'),
]);

  const report = {
    mode,
    at: _nowIso(),
    created: 0,
    updated: 0,
    skipped: 0,
    results: [],
  };

  const work = [];
  for (const l of (lessons?.lessons ?? [])) work.push({ kind: 'lesson', dataType: 'lesson', record: l });
  for (const n of (npcs?.npcs ?? [])) work.push({ kind: 'npc', dataType: 'npc', record: n });
  for (const loc of (locations?.locations ?? [])) work.push({ kind: 'location', dataType: 'location', record: loc });
  for (const e of (events?.events ?? [])) work.push({ kind: 'event', dataType: 'event', record: e });

  // Spell curriculum (dataset blob)
  if (spellCurriculum && typeof spellCurriculum === 'object') {
    const rec = { ...spellCurriculum, id: 'ACADEMY_SPELL_CURRICULUM', name: 'Zauber-Lehrplan' };
    work.push({ kind: 'curriculum', dataType: 'spellCurriculum', record: rec });
  }

  // Spells index (dataset blob)
  if (spellsIndex && typeof spellsIndex === 'object') {
    const rec = { ...spellsIndex, id: 'ACADEMY_SPELLS_INDEX', name: 'Zauberindex' };
    work.push({ kind: 'spell', dataType: 'spellsIndex', record: rec });
  }

  // Library items (one record per item)
  for (const it of (library?.items ?? [])) {
    if (!it?.id) continue;
    work.push({ kind: 'library', dataType: 'library-item', record: { ...it, name: it.title ?? it.id } });
  }

  // Calendar is a single dataset blob (not per entry) to keep things stable.
  if (calendar && typeof calendar === 'object') {
    const calRec = { id: 'ACADEMY_CALENDAR', name: 'Kalender (Academy)', ...calendar };
    work.push({ kind: 'calendar', dataType: 'calendar', record: calRec });
  }

  for (const w of work) {
    const r = await _upsertJournalRecord({ ...w, folderSvc, mode });
    report.results.push(r);
    if (r.status === 'created') report.created += 1;
    else if (r.status === 'updated') report.updated += 1;
    else report.skipped += 1;
  }

  // Persist seed metadata (for audit + future migrations).
  try {
    const prev = JanusConfig.get('academyDataStore') ?? {};
    await JanusConfig.set('academyDataStore', {
      ...prev,
      lastSeed: { at: report.at, mode, moduleVersion: game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown' },
      counts: { created: report.created, updated: report.updated, skipped: report.skipped },
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
  spellCurriculum: { kind: 'spellCurriculum', dataType: 'spellCurriculum' },
  spellsIndex: { kind: 'spellsIndex', dataType: 'spellsIndex' },
  'library-item': { kind: 'library-item', dataType: 'library-item' },
  library: { kind: 'library', dataType: 'library' },
};

export async function upsertManagedAcademyRecord({ domainId, record, mode = 'overwrite' } = {}) {
  if (!game?.user?.isGM) throw new Error('GM only');
  const meta = MANAGED_DOMAIN_META[String(domainId ?? '').trim()];
  if (!meta) throw new Error(`Unsupported domain: ${domainId}`);
  const folderSvc = new JanusFolderService({ config: JanusConfig, logger: game?.janus7?.core?.logger ?? console });
  return _upsertJournalRecord({
    kind: meta.kind,
    dataType: meta.dataType,
    record,
    folderSvc,
    mode,
  });
}
