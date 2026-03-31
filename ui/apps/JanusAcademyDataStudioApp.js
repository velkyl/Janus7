/**
 * @file ui/apps/JanusAcademyDataStudioApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Academy Data Studio
 *
 * Goal:
 * - Edit academy dataset records inside Foundry without touching module JSON.
 * - Prefer managed Items as the editable document surface.
 * - Keep JournalEntries as readable mirrors for the existing world-edit flow.
 */

import { MODULE_ID } from '../../core/common.js';
import { JanusSyncEngine } from '../../core/sync-engine.js';
import { JanusBaseApp } from '../core/base-app.js';
import { JanusProfileRegistry } from '../../core/profiles/index.js';

const DOMAINS = [
  { id: 'lesson', label: 'Lessons / Unterricht', icon: 'fa-book' },
  { id: 'spellCurriculum', label: 'Lehrpläne (Zauber)', icon: 'fa-diagram-project' },
  { id: 'spellsIndex', label: 'Zauberindex', icon: 'fa-wand-magic-sparkles' },
  { id: 'library-item', label: 'Bibliothek', icon: 'fa-book-open' },
  { id: 'npc', label: 'NSCs', icon: 'fa-users' },
  { id: 'location', label: 'Orte', icon: 'fa-map-marker-alt' },
  { id: 'event', label: 'Events', icon: 'fa-bolt' },
  { id: 'calendar', label: 'Kalender', icon: 'fa-calendar' },
];

const FORM_DOMAINS = new Set([
  'lesson',
  'spellCurriculum',
  'spellsIndex',
  'library-item',
  'npc',
  'location',
  'event',
  'calendar',
]);

const LINK_SPECS = {
  npc: {
    bucket: 'npcs',
    documentName: 'Actor',
    label: 'Actor',
    uuidField: 'actorUuid',
  },
  location: {
    bucket: 'locations',
    documentName: 'Scene',
    label: 'Szene',
    uuidField: 'sceneUuid',
  },
};

export class JanusAcademyDataStudioApp extends JanusBaseApp {
  static _instance = null;

  static DEFAULT_OPTIONS = {
    id: 'janus7-academy-data-studio',
    window: { title: 'JANUS7 — Academy Data Studio' },
    position: { width: 1100, height: 720 },
    resizable: true,
  };

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true, focus: true });
    return this._instance;
  }

  constructor(options = {}) {
    super(options);
    this._domain = options.domain ?? 'lesson';
    this._selectedUuid = null;
    this._filter = '';
    this._editorMode = options.editorMode ?? 'form';
    this._draft = null;
    this._syncEngine = null;
  }

  _moduleFlags(doc) {
    return doc?.flags?.[MODULE_ID] ?? {};
  }

  _recordKey(doc, domainId) {
    const flags = this._moduleFlags(doc);
    return String(flags?.janusId ?? `${flags?.dataType ?? domainId}:${doc?.name ?? doc?.id ?? doc?.uuid}`);
  }

  _getDocs(domainId) {
    const dt = String(domainId ?? '').trim();
    const collect = (docs = []) => docs.filter((doc) => {
      const flags = this._moduleFlags(doc);
      return !!(flags?.managed && String(flags?.dataType ?? '') === dt && flags?.data && typeof flags.data === 'object');
    });

    const deduped = new Map();
    const ordered = [
      ...collect(game?.journal?.contents ?? []),
      ...collect(game?.items?.contents ?? []),
    ];

    for (const doc of ordered) {
      const key = this._recordKey(doc, dt);
      const current = deduped.get(key);
      if (!current || doc?.documentName === 'Item') deduped.set(key, doc);
    }

    const docs = Array.from(deduped.values());
    docs.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')));

    const q = String(this._filter ?? '').trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => {
      const flags = this._moduleFlags(doc);
      return String(doc?.name ?? '').toLowerCase().includes(q) || String(flags?.janusId ?? '').toLowerCase().includes(q);
    });
  }

  _selectedDoc() {
    if (!this._selectedUuid) return null;
    return (game?.items?.contents ?? []).find((doc) => doc.uuid === this._selectedUuid)
      ?? (game?.journal?.contents ?? []).find((doc) => doc.uuid === this._selectedUuid)
      ?? null;
  }

  _supportsForm(domainId) {
    return FORM_DOMAINS.has(String(domainId ?? ''));
  }

  _getSync() {
    const engine = game.janus7;
    if (!engine) return null;
    return engine.services?.registry?.get('sync.engine') || engine.sync || null;
  }

  _linkSpecForDomain(domainId) {
    return LINK_SPECS[String(domainId ?? '')] ?? null;
  }

  _readDroppedUuid(event) {
    let data = null;
    try {
      const text = event?.dataTransfer?.getData?.('application/json')
        || event?.dataTransfer?.getData?.('text/plain');
      data = JSON.parse(text);
    } catch {
      return null;
    }
    return data?.uuid ?? (data?.type && data?.id ? `${data.type}.${data.id}` : null);
  }

  _setFoundryUuid(record, spec, uuid = null) {
    if (!record || !spec?.uuidField) return record;
    const next = foundry.utils.deepClone(record);
    next.foundry = next.foundry && typeof next.foundry === 'object' ? next.foundry : {};
    if (uuid) next.foundry[spec.uuidField] = uuid;
    else delete next.foundry[spec.uuidField];
    if (!Object.keys(next.foundry).length) delete next.foundry;
    return next;
  }

  async _persistRecord(record) {
    const engine = game.janus7;
    const { upsertManagedAcademyRecord, upsertManagedAcademyItemRecord } = await import('../../academy/world-seed.js');
    
    try {
      await upsertManagedAcademyRecord({ domainId: this._domain, record, mode: 'overwrite' });
      await upsertManagedAcademyItemRecord({ domainId: this._domain, record, mode: 'overwrite' });

      // Signal engine to refresh data
      const dataApi = engine?.services?.registry?.get('academy.data');
      if (dataApi) {
        if (typeof dataApi.constructor?.resetCache === 'function') dataApi.constructor.resetCache();
        if (typeof dataApi.init === 'function') await dataApi.init();
      }
    } catch (err) {
      engine?.recordError?.('ui.studio', 'persist', err);
      throw err;
    }

    const preferred = this._findPreferredDoc(this._domain, record);
    this._selectedUuid = preferred?.uuid ?? null;
    this._draft = null;
    return preferred ?? null;
  }

  _defaultRecord(domainId) {
    const idBase = `custom_${Date.now()}`;
    switch (String(domainId ?? '')) {
      case 'lesson':
        return { id: idBase, name: 'Neue Lektion', subject: '', teacherNpcId: '', durationSlots: 1, summary: '' };
      case 'npc':
        return {
          id: idBase,
          name: 'Neuer NSC',
          role: '',
          tags: [],
          profile: { subtitle: '', roleText: '', sections: { Aussehen: '', Persönlichkeit: '' } },
        };
      case 'location':
        return { id: idBase, name: 'Neuer Ort', type: '', zone: '', summary: '' };
      case 'event':
        return { id: idBase, name: 'Neues Event', type: '', summary: '' };
      case 'library-item':
        return { id: idBase, title: 'Neues Bibliothekselement', type: '', summary: '', tags: [], knowledgeHooks: [] };
      case 'spellCurriculum':
        return { id: 'ACADEMY_SPELL_CURRICULUM', name: 'Zauber-Lehrplan', sections: [] };
      case 'spellsIndex':
        return { id: 'ACADEMY_SPELLS_INDEX', name: 'Zauberindex', entries: [] };
      case 'calendar':
        return { id: 'ACADEMY_CALENDAR', name: 'Kalender (Academy)', meta: { schemaVersion: '1.0' }, entries: [] };
      default:
        return { id: idBase, name: 'Neuer Datensatz' };
    }
  }

  _activeRecordData() {
    const selected = this._selectedDoc();
    if (selected) return foundry.utils.deepClone(this._moduleFlags(selected)?.data ?? {});
    if (this._draft) return foundry.utils.deepClone(this._draft);
    return null;
  }

  _displayName(record = {}) {
    return record?.name ?? record?.title ?? record?.id ?? 'Neuer Datensatz';
  }

  _renderForm(domainId, record = {}) {
    const container = document.createElement('div');
    container.className = 'j7-data-studio__form';

    const row = (label, name, value, type = 'text') => {
      const field = document.createElement('label');
      field.className = 'j7-data-studio__field';
      const span = document.createElement('span');
      span.textContent = label;
      field.appendChild(span);
      const input = document.createElement('input');
      input.type = type;
      input.dataset.j7Form = name;
      input.className = 'janus7-textarea j7-data-studio__input';
      input.value = value ?? '';
      field.appendChild(input);
      return field;
    };

    const textareaRow = (label, name, value) => {
      const field = document.createElement('label');
      field.className = 'j7-data-studio__field j7-data-studio__field--wide';
      const span = document.createElement('span');
      span.textContent = label;
      field.appendChild(span);
      const textarea = document.createElement('textarea');
      textarea.dataset.j7Form = name;
      textarea.className = 'janus7-textarea j7-data-studio__input';
      textarea.value = value ?? '';
      field.appendChild(textarea);
      return field;
    };

    if (domainId === 'lesson') {
      container.appendChild(row('ID', 'id', record.id));
      container.appendChild(row('Name', 'name', record.name));
      container.appendChild(row('Fach', 'subject', record.subject));
      container.appendChild(row('Dozent (NPC-ID)', 'teacherNpcId', record.teacherNpcId));
      container.appendChild(row('Dauer Slots', 'durationSlots', record.durationSlots ?? 1, 'number'));
      container.appendChild(textareaRow('Zusammenfassung', 'summary', record.summary));
    } else if (domainId === 'npc') {
      container.appendChild(row('ID', 'id', record.id));
      container.appendChild(row('Name', 'name', record.name));
      container.appendChild(row('Rolle', 'role', record.role));
      container.appendChild(row('Tags (CSV)', 'tagsCsv', Array.isArray(record?.tags) ? record.tags.join(', ') : ''));
      container.appendChild(row('Untertitel', 'profile.subtitle', record?.profile?.subtitle ?? ''));
      container.appendChild(textareaRow('Rollentext', 'profile.roleText', record?.profile?.roleText ?? ''));
      container.appendChild(textareaRow('Aussehen', 'profile.sections.Aussehen', record?.profile?.sections?.Aussehen ?? ''));
      container.appendChild(textareaRow('Persönlichkeit', 'profile.sections.Persönlichkeit', record?.profile?.sections?.Persönlichkeit ?? ''));
    } else if (domainId === 'location') {
      container.appendChild(row('ID', 'id', record.id));
      container.appendChild(row('Name', 'name', record.name));
      container.appendChild(row('Typ', 'type', record.type));
      container.appendChild(row('Zone', 'zone', record.zone));
      container.appendChild(textareaRow('Zusammenfassung', 'summary', record.summary));
    } else if (domainId === 'event') {
      container.appendChild(row('ID', 'id', record.id));
      container.appendChild(row('Name', 'name', record.name));
      container.appendChild(row('Typ', 'type', record.type));
      container.appendChild(textareaRow('Zusammenfassung', 'summary', record.summary));
    } else if (domainId === 'library-item') {
      container.appendChild(row('ID', 'id', record.id));
      container.appendChild(row('Titel', 'title', record.title ?? record.name ?? ''));
      container.appendChild(row('Typ', 'type', record.type ?? ''));
      container.appendChild(row('Tags (CSV)', 'tagsCsv', Array.isArray(record?.tags) ? record.tags.join(', ') : ''));
      container.appendChild(textareaRow('Zusammenfassung', 'summary', record.summary ?? ''));
      container.appendChild(textareaRow('Knowledge Hooks (JSON)', 'knowledgeHooksJson', JSON.stringify(record?.knowledgeHooks ?? [], null, 2)));
    } else if (domainId === 'spellCurriculum') {
      const payload = foundry.utils.deepClone(record ?? {});
      delete payload.id;
      delete payload.name;
      container.appendChild(row('ID', 'id', record.id ?? 'ACADEMY_SPELL_CURRICULUM'));
      container.appendChild(row('Name', 'name', record.name ?? 'Zauber-Lehrplan'));
      container.appendChild(textareaRow('Inhalt (JSON ohne id/name)', 'payloadJson', JSON.stringify(payload, null, 2)));
    } else if (domainId === 'spellsIndex') {
      const payload = foundry.utils.deepClone(record ?? {});
      delete payload.id;
      delete payload.name;
      container.appendChild(row('ID', 'id', record.id ?? 'ACADEMY_SPELLS_INDEX'));
      container.appendChild(row('Name', 'name', record.name ?? 'Zauberindex'));
      container.appendChild(textareaRow('Inhalt (JSON ohne id/name)', 'payloadJson', JSON.stringify(payload, null, 2)));
    } else if (domainId === 'calendar') {
      container.appendChild(row('ID', 'id', record.id ?? 'ACADEMY_CALENDAR'));
      container.appendChild(row('Name', 'name', record.name ?? 'Kalender (Academy)'));
      container.appendChild(textareaRow('Meta (JSON)', 'metaJson', JSON.stringify(record?.meta ?? {}, null, 2)));
      container.appendChild(textareaRow('Entries (JSON)', 'entriesJson', JSON.stringify(record?.entries ?? [], null, 2)));
    } else {
      const empty = document.createElement('div');
      empty.className = 'j7-data-studio__empty';
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Formularmodus noch nicht verfügbar.';
      p.appendChild(strong);
      empty.appendChild(p);
      container.appendChild(empty);
    }

    return container;
  }

  _collectFormData(root, seed = {}) {
    const clone = foundry.utils.deepClone(seed ?? {});
    const setNested = (obj, path, value) => {
      const parts = String(path).split('.');
      let current = obj;
      while (parts.length > 1) {
        const key = parts.shift();
        current[key] = current[key] && typeof current[key] === 'object' ? current[key] : {};
        current = current[key];
      }
      current[parts[0]] = value;
    };

    root.querySelectorAll('[data-j7-form]').forEach((field) => {
      const key = field.dataset.j7Form;
      let value = field.value;
      if (field.type === 'number') value = Number(value || 0);
      setNested(clone, key, value);
    });
    return clone;
  }

  _parseJsonField(value, fallback, label, errors) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      errors.push(`${label}: ${err?.message ?? String(err)}`);
      return fallback;
    }
  }

  _extractEditedRecord(root, domainId, seed = {}) {
    if (this._editorMode !== 'form' || !this._supportsForm(domainId)) {
      const raw = String(root.querySelector('[data-j7="json"]')?.value ?? '').trim();
      if (!raw) throw new Error('JSON darf nicht leer sein.');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON muss ein Objekt sein.');
      }
      return parsed;
    }

    const errors = [];
    let record = this._collectFormData(root, seed);

    if (domainId === 'npc') {
      record.tags = String(record.tagsCsv ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      delete record.tagsCsv;
    } else if (domainId === 'library-item') {
      record.tags = String(record.tagsCsv ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      record.knowledgeHooks = this._parseJsonField(record.knowledgeHooksJson, seed?.knowledgeHooks ?? [], 'Knowledge Hooks JSON', errors);
      record.name = record.title ?? record.name ?? record.id;
      delete record.tagsCsv;
      delete record.knowledgeHooksJson;
    } else if (domainId === 'spellCurriculum' || domainId === 'spellsIndex') {
      const basePayload = foundry.utils.deepClone(seed ?? {});
      delete basePayload.id;
      delete basePayload.name;
      const payload = this._parseJsonField(record.payloadJson, basePayload, 'Payload JSON', errors);
      record = {
        ...payload,
        id: record.id,
        name: record.name,
      };
    } else if (domainId === 'calendar') {
      record.meta = this._parseJsonField(record.metaJson, seed?.meta ?? {}, 'Meta JSON', errors);
      record.entries = this._parseJsonField(record.entriesJson, seed?.entries ?? [], 'Entries JSON', errors);
      delete record.metaJson;
      delete record.entriesJson;
    }

    if (errors.length) {
      throw new Error(errors.join(' | '));
    }

    return record;
  }

  _findPreferredDoc(domainId, record = {}) {
    const docs = this._getDocs(domainId);
    const recordId = String(record?.id ?? '').trim();
    if (recordId) {
      const exact = docs.find((doc) => String(this._moduleFlags(doc)?.janusId ?? '') === recordId && doc?.documentName === 'Item')
        ?? docs.find((doc) => String(this._moduleFlags(doc)?.janusId ?? '') === recordId);
      if (exact) return exact;
    }

    const name = this._displayName(record);
    return docs.find((doc) => String(doc?.name ?? '') === String(name) && doc?.documentName === 'Item')
      ?? docs.find((doc) => String(doc?.name ?? '') === String(name))
      ?? null;
  }

  async _renderHTML(_context, _options) {
    const profile = JanusProfileRegistry.getActive();
    const root = document.createElement('div');
    root.className = `janus7-app janus7-page j7-data-studio j7-profile-${profile.id}`;

    if (!game?.user?.isGM) {
      const gmOnly = document.createElement('div');
      gmOnly.className = 'j7-data-studio__empty';
      const gmStrong = document.createElement('strong');
      gmStrong.textContent = 'GM only.';
      gmOnly.appendChild(gmStrong);
      gmOnly.append(' Nur der GM kann den Data Studio verwenden.');
      root.appendChild(gmOnly);
      return root;
    }

    const engine = game.janus7;
    const sync = this._getSync();
    const domain = DOMAINS.find((entry) => entry.id === this._domain) ?? DOMAINS[0];
    const docs = this._getDocs(domain.id);
    const selected = this._selectedDoc();
    const activeData = this._activeRecordData();
    const linkSpec = this._linkSpecForDomain(domain.id);
    const linkedUuid = (linkSpec && activeData?.id && sync) ? sync.resolveUUID(activeData.id, activeData, linkSpec.bucket) : null;
    const linkedDoc = linkedUuid ? await fromUuid(linkedUuid).catch(() => null) : null;

    const left = document.createElement('div');
    left.className = 'j7-data-studio__panel j7-data-studio__panel--list';

    // Profile Selector (Multi-Setting Phase 8)
    const profileRow = document.createElement('div');
    profileRow.className = 'j7-data-studio__row j7-data-studio__row--profile';
    const profileIcon = document.createElement('i');
    
    // UI/UX Polish: Iconography based on profile
    const profileIcons = { punin: 'fa-scroll', festum: 'fa-icicles' };
    const activeIcon = profileIcons[profile.id] || 'fa-map-marked-alt';
    profileIcon.className = `fas ${activeIcon}`;
    
    profileRow.appendChild(profileIcon);
    const profileSelect = document.createElement('select');
    profileSelect.dataset.j7 = 'profile';
    profileSelect.className = 'janus7-textarea j7-data-studio__input j7-data-studio__input--profile';
    for (const p of JanusProfileRegistry.list()) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.selected = p.id === JanusProfileRegistry.getActive().id;
      opt.textContent = p.name;
      profileSelect.appendChild(opt);
    }
    profileRow.appendChild(profileSelect);
    left.appendChild(profileRow);

    const topRow = document.createElement('div');
    topRow.className = 'j7-data-studio__row';
    const domainIcon = document.createElement('i');
    domainIcon.className = `fas ${domain.icon}`;
    topRow.appendChild(domainIcon);
    const domainSelect = document.createElement('select');
    domainSelect.dataset.j7 = 'domain';
    domainSelect.className = 'janus7-textarea j7-data-studio__input j7-data-studio__input--compact';
    for (const entry of DOMAINS) {
      const opt = document.createElement('option');
      opt.value = entry.id;
      opt.selected = entry.id === domain.id;
      opt.textContent = entry.label;
      domainSelect.appendChild(opt);
    }
    topRow.appendChild(domainSelect);
    const modeSelect = document.createElement('select');
    modeSelect.dataset.j7 = 'mode';
    modeSelect.className = 'janus7-textarea j7-data-studio__input j7-data-studio__input--compact';
    for (const [val, label] of [['form', 'Formular'], ['json', 'JSON']]) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.selected = this._editorMode === val;
      opt.textContent = label;
      modeSelect.appendChild(opt);
    }
    topRow.appendChild(modeSelect);
    left.appendChild(topRow);

    const filterRow = document.createElement('div');
    filterRow.className = 'j7-data-studio__row';
    const filterInput = document.createElement('input');
    filterInput.dataset.j7 = 'filter';
    filterInput.type = 'text';
    filterInput.setAttribute('aria-label', 'Filter records');
    filterInput.placeholder = 'Filter (Name/ID)';
    filterInput.value = this._filter;
    filterInput.className = 'janus7-textarea j7-data-studio__input j7-data-studio__input--compact';
    filterRow.appendChild(filterInput);
    const newBtn = document.createElement('button');
    newBtn.dataset.j7 = 'new';
    newBtn.className = 'j7-btn';
    newBtn.title = 'Neuen Datensatz anlegen';
    newBtn.setAttribute('aria-label', 'Neuen Datensatz anlegen');
    newBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-plus' }));
    filterRow.appendChild(newBtn);
    const seedBtn = document.createElement('button');
    seedBtn.dataset.j7 = 'seed';
    seedBtn.className = 'j7-btn';
    seedBtn.title = 'Seed Import (Journals + Items)';
    seedBtn.setAttribute('aria-label', 'Seed Import (Journals + Items)');
    seedBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-seedling' }));
    filterRow.appendChild(seedBtn);
    left.appendChild(filterRow);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'j7-data-studio__meta';
    const recordsSpan = document.createElement('span');
    recordsSpan.append('Managed Records: ');
    const recordsStrong = document.createElement('strong');
    recordsStrong.textContent = String(docs.length);
    recordsSpan.appendChild(recordsStrong);
    metaDiv.appendChild(recordsSpan);
    const ssotSpan = document.createElement('span');
    ssotSpan.append('SSOT: ');
    const ssotCode = document.createElement('code');
    ssotCode.textContent = `flags.${MODULE_ID}.data`;
    ssotSpan.appendChild(ssotCode);
    metaDiv.appendChild(ssotSpan);
    left.appendChild(metaDiv);

    const listDiv = document.createElement('div');
    listDiv.dataset.j7 = 'list';
    listDiv.className = 'j7-data-studio__list';
    left.appendChild(listDiv);

    const list = left.querySelector('[data-j7="list"]');
    for (const doc of docs) {
      const flags = this._moduleFlags(doc);
      const isSelected = doc.uuid === this._selectedUuid;
      const badge = doc?.documentName === 'Item' ? 'Item' : 'Journal';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.uuid = doc.uuid;
      button.className = `j7-btn j7-data-studio__record${isSelected ? ' is-selected' : ''}`;
      const titleDiv = document.createElement('div');
      titleDiv.className = 'j7-data-studio__title';
      titleDiv.textContent = doc.name;
      button.appendChild(titleDiv);
      const subtitleDiv = document.createElement('div');
      subtitleDiv.className = 'j7-data-studio__subtitle';
      const janusIdCode = document.createElement('code');
      janusIdCode.textContent = flags?.janusId ?? '';
      subtitleDiv.appendChild(janusIdCode);
      subtitleDiv.append(` · ${badge}`);
      button.appendChild(subtitleDiv);
      list.appendChild(button);
    }

    const right = document.createElement('div');
    right.className = 'j7-data-studio__panel j7-data-studio__panel--detail';

    if (!activeData) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'j7-data-studio__empty';
      const ep1 = document.createElement('p');
      const ep1Strong = document.createElement('strong');
      ep1Strong.textContent = 'Kein Record ausgewählt.';
      ep1.appendChild(ep1Strong);
      emptyDiv.appendChild(ep1);
      const ep2 = document.createElement('p');
      ep2.append('Links über ');
      ep2.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-plus' }));
      ep2.append(' einen Draft anlegen oder über ');
      ep2.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-seedling' }));
      ep2.append(' die verwalteten World-Dokumente erzeugen.');
      emptyDiv.appendChild(ep2);
      const ep3 = document.createElement('p');
      ep3.className = 'j7-data-studio__hint';
      ep3.append('Angezeigt werden verwaltete Journals und Items mit ');
      const managedCode = document.createElement('code');
      managedCode.textContent = `flags.${MODULE_ID}.managed=true`;
      ep3.appendChild(managedCode);
      ep3.append(' und ');
      const dataTypeCode = document.createElement('code');
      dataTypeCode.textContent = 'dataType';
      ep3.appendChild(dataTypeCode);
      ep3.append('. Items werden bevorzugt.');
      emptyDiv.appendChild(ep3);
      right.appendChild(emptyDiv);
    } else {
      const flags = this._moduleFlags(selected) ?? { janusId: activeData?.id ?? '', dataType: domain.id };
      const docLabel = selected?.documentName === 'Item' ? 'Item' : (selected?.documentName === 'JournalEntry' ? 'Journal' : 'Draft');

      // Header row
      const headerRow = document.createElement('div');
      headerRow.className = 'j7-data-studio__row j7-data-studio__row--spread';
      const headerInfo = document.createElement('div');
      const recordTitle = document.createElement('div');
      recordTitle.className = 'j7-data-studio__title j7-data-studio__title--lg';
      recordTitle.textContent = this._displayName(activeData);
      headerInfo.appendChild(recordTitle);
      const recordSubtitle = document.createElement('div');
      recordSubtitle.className = 'j7-data-studio__subtitle';
      recordSubtitle.append('ID: ');
      const idCode = document.createElement('code');
      idCode.textContent = flags?.janusId ?? activeData?.id ?? '';
      recordSubtitle.appendChild(idCode);
      recordSubtitle.append(' · Type: ');
      const typeCode = document.createElement('code');
      typeCode.textContent = flags?.dataType ?? domain.id;
      recordSubtitle.appendChild(typeCode);
      recordSubtitle.append(' · Doc: ');
      const docLabelCode = document.createElement('code');
      docLabelCode.textContent = docLabel;
      recordSubtitle.appendChild(docLabelCode);
      headerInfo.appendChild(recordSubtitle);
      headerRow.appendChild(headerInfo);
      const headerBtns = document.createElement('div');
      headerBtns.className = 'j7-data-studio__row';
      if (selected) {
        const openBtn = document.createElement('button');
        openBtn.dataset.j7 = 'open';
        openBtn.className = 'j7-btn';
        openBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-up-right-from-square' }));
        openBtn.append(` Open ${docLabel}`);
        headerBtns.appendChild(openBtn);
      }
      const saveBtn = document.createElement('button');
      saveBtn.dataset.j7 = 'save';
      saveBtn.className = 'j7-btn';
      saveBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-save' }));
      saveBtn.append(' Save');
      headerBtns.appendChild(saveBtn);
      headerRow.appendChild(headerBtns);
      right.appendChild(headerRow);

      // Split: editor column + notes column
      const splitDiv = document.createElement('div');
      splitDiv.className = 'j7-data-studio__split';

      const editorCol = document.createElement('div');
      editorCol.className = 'j7-data-studio__column';
      const editorLabel = document.createElement('div');
      editorLabel.className = 'j7-data-studio__section-label';
      editorLabel.textContent = this._editorMode === 'form' ? 'Formularmodus' : 'JSON / Expertenmodus';
      editorCol.appendChild(editorLabel);
      if (this._editorMode === 'form' && this._supportsForm(domain.id)) {
        // _renderForm returns a secure DOM element built via document.createElement
        editorCol.appendChild(this._renderForm(domain.id, activeData));
      } else {
        const jsonTextarea = document.createElement('textarea');
        jsonTextarea.dataset.j7 = 'json';
        jsonTextarea.spellcheck = false;
        jsonTextarea.className = 'janus7-textarea j7-data-studio__json';
        jsonTextarea.textContent = JSON.stringify(activeData ?? {}, null, 2);
        editorCol.appendChild(jsonTextarea);
      }
      splitDiv.appendChild(editorCol);

      const notesCol = document.createElement('div');
      notesCol.className = 'j7-data-studio__column';
      const notesLabel = document.createElement('div');
      notesLabel.className = 'j7-data-studio__section-label';
      notesLabel.textContent = 'Hinweise';
      notesCol.appendChild(notesLabel);
      const notesDiv = document.createElement('div');
      notesDiv.className = 'j7-data-studio__notes';
      const rulesP = document.createElement('p');
      const rulesStrong = document.createElement('strong');
      rulesStrong.textContent = 'Regeln:';
      rulesP.appendChild(rulesStrong);
      notesDiv.appendChild(rulesP);
      const ul = document.createElement('ul');
      for (const text of [
        'Speichern erzeugt bzw. aktualisiert Journal und Item gemeinsam.',
        'Items sind der bevorzugte Edit-Container im Studio.',
        null,
        'AcademyDataApi Cache wird nach Save/Seed neu geladen.'
      ]) {
        const li = document.createElement('li');
        if (text === null) {
          li.append('SSOT bleibt ');
          const ssotLiCode = document.createElement('code');
          ssotLiCode.textContent = `flags.${MODULE_ID}.data`;
          li.appendChild(ssotLiCode);
          li.append('.');
        } else {
          li.textContent = text;
        }
        ul.appendChild(li);
      }
      notesDiv.appendChild(ul);
      const hintP = document.createElement('p');
      hintP.className = 'j7-data-studio__hint';
      hintP.textContent = 'Bei komplexen Domänen mischt der Formmodus normale Felder mit gezielten JSON-Feldern für verschachtelte Strukturen, damit nicht alles im reinen Roh-JSON landen muss.';
      notesDiv.appendChild(hintP);
      notesCol.appendChild(notesDiv);
      splitDiv.appendChild(notesCol);
      right.appendChild(splitDiv);

      // Link section (conditional)
      if (linkSpec) {
        const linkSectionLabel = document.createElement('div');
        linkSectionLabel.className = 'j7-data-studio__section-label';
        linkSectionLabel.textContent = 'Foundry-Verknüpfung';
        right.appendChild(linkSectionLabel);
        const linkNotes = document.createElement('div');
        linkNotes.className = 'j7-data-studio__notes';
        const mkInfoP = (labelText, valueText) => {
          const p = document.createElement('p');
          const s = document.createElement('strong');
          s.textContent = `${labelText}:`;
          p.appendChild(s);
          p.append(` ${valueText}`);
          return p;
        };
        linkNotes.appendChild(mkInfoP('Ziel', linkSpec.label));
        linkNotes.appendChild(mkInfoP('Status', linkedDoc ? 'verknüpft' : (linkedUuid ? 'UUID vorhanden, Dokument fehlt' : 'nicht verknüpft')));
        const uuidP = document.createElement('p');
        const uuidStrong = document.createElement('strong');
        uuidStrong.textContent = 'UUID:';
        uuidP.appendChild(uuidStrong);
        uuidP.append(' ');
        const uuidCode = document.createElement('code');
        uuidCode.textContent = linkedUuid ?? '—';
        uuidP.appendChild(uuidCode);
        linkNotes.appendChild(uuidP);
        linkNotes.appendChild(mkInfoP('Dokument', linkedDoc?.name ?? '—'));
        const dropzone = document.createElement('div');
        dropzone.dataset.j7 = 'link-dropzone';
        dropzone.className = 'j7-data-studio__empty';
        dropzone.style.cssText = 'min-height:96px; border-style:dashed;';
        const dropP1 = document.createElement('p');
        const dropStrong = document.createElement('strong');
        dropStrong.textContent = `${linkSpec.label} hier ablegen`;
        dropP1.appendChild(dropStrong);
        dropzone.appendChild(dropP1);
        const dropP2 = document.createElement('p');
        dropP2.className = 'j7-data-studio__hint';
        dropP2.textContent = 'Drag & Drop aus der Foundry-Sidebar. Die Verknüpfung läuft über denselben Sync-Pfad wie die automatische Synchronisierung.';
        dropzone.appendChild(dropP2);
        linkNotes.appendChild(dropzone);
        const linkBtnRow = document.createElement('div');
        linkBtnRow.className = 'j7-data-studio__row';
        if (linkedDoc) {
          const openLinkBtn = document.createElement('button');
          openLinkBtn.dataset.j7 = 'open-link';
          openLinkBtn.className = 'j7-btn';
          openLinkBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-up-right-from-square' }));
          openLinkBtn.append(` ${linkSpec.label} öffnen`);
          linkBtnRow.appendChild(openLinkBtn);
        }
        if (linkedUuid) {
          const unlinkBtn = document.createElement('button');
          unlinkBtn.dataset.j7 = 'unlink-link';
          unlinkBtn.className = 'j7-btn';
          unlinkBtn.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-link-slash' }));
          unlinkBtn.append(' Verknüpfung lösen');
          linkBtnRow.appendChild(unlinkBtn);
        }
        linkNotes.appendChild(linkBtnRow);
        right.appendChild(linkNotes);
      }
    }

    root.appendChild(left);
    root.appendChild(right);
    return root;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  _onPostRender(_context, _options) {
    const element = this.domElement;
    if (!element) return;

    element.querySelector('[data-j7="profile"]')?.addEventListener('change', async (event) => {
      const val = String(event.target.value || 'punin');
      const { JanusConfig } = await import('../../core/config.js');
      await JanusConfig.set('activeProfile', val);
      
      const engine = this._getEngine();
      if (engine) {
        const dataApi = engine.services?.registry?.get('academy.data');
        if (dataApi) {
          if (typeof dataApi.constructor?.resetCache === 'function') dataApi.constructor.resetCache();
          await dataApi.init();
        }
      }
      this.refresh?.();
    });

    element.querySelector('[data-j7="domain"]')?.addEventListener('change', (event) => {
      this._domain = String(event.target.value);
      this._selectedUuid = null;
      this._draft = null;
      this.refresh?.();
    });

    element.querySelector('[data-j7="mode"]')?.addEventListener('change', (event) => {
      this._editorMode = String(event.target.value || 'json');
      this.refresh?.();
    });

    element.querySelector('[data-j7="filter"]')?.addEventListener('input', (event) => {
      this._filter = String(event.target.value ?? '');
      this.refresh?.(false);
    });

    element.querySelector('[data-j7="new"]')?.addEventListener('click', () => {
      this._selectedUuid = null;
      this._draft = this._defaultRecord(this._domain);
      this.refresh?.();
    });

    element.querySelector('[data-j7="seed"]')?.addEventListener('click', async () => {
      try {
        const { seedImportAcademyToJournals } = await import('../../academy/world-seed.js');
        const report = await seedImportAcademyToJournals({ mode: 'merge' });
        const docs = report?.documents ?? {};
        ui.notifications?.info?.(
          `Seed Import: Journals c=${docs?.journals?.created ?? 0}/u=${docs?.journals?.updated ?? 0}, Items c=${docs?.items?.created ?? 0}/u=${docs?.items?.updated ?? 0}`
        );
        const engine = this._getEngine();
        const dataApi = engine?.services?.registry?.get('academy.data');
        if (dataApi) {
          if (typeof dataApi.constructor?.resetCache === 'function') dataApi.constructor.resetCache();
          if (typeof dataApi.init === 'function') await dataApi.init();
        }
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Seed Import failed: ${err?.message ?? err}`);
        this._getEngine()?.recordError?.('ui.studio', 'seed_import', err);
      }
    });

    element.querySelectorAll('button[data-uuid]')?.forEach((button) => {
      button.addEventListener('click', () => {
        this._selectedUuid = button.dataset.uuid;
        this._draft = null;
        this.refresh?.();
      });
    });

    element.querySelector('[data-j7="open"]')?.addEventListener('click', async () => {
      const selected = this._selectedDoc();
      if (!selected) return;
      try {
        selected.sheet?.render?.(true);
      } catch (err) {
        ui.notifications?.error?.(`Open failed: ${err?.message ?? err}`);
      }
    });

    element.querySelector('[data-j7="save"]')?.addEventListener('click', async () => {
      const seed = this._activeRecordData() ?? {};

      try {
        const record = this._extractEditedRecord(element, this._domain, seed);
        const selected = this._selectedDoc();
        const selectedFlags = this._moduleFlags(selected);
        const selectedId = String(selectedFlags?.janusId ?? '').trim();
        const nextId = String(record?.id ?? '').trim();

        if (selectedId && nextId && selectedId !== nextId) {
          throw new Error(`id mismatch: editor.id=${nextId} vs janusId=${selectedId}`);
        }

        await this._persistRecord(record);
        ui.notifications?.info?.('Saved.');
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Save failed: ${err?.message ?? err}`);
        this._getEngine()?.recordError?.('ui.studio', 'save_record', err);
      }
    });

    const dropzone = element.querySelector('[data-j7="link-dropzone"]');
    dropzone?.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'link';
      dropzone.classList.add('janus7-drop-hover');
    });
    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('janus7-drop-hover');
    });
    dropzone?.addEventListener('drop', async (event) => {
      event.preventDefault();
      dropzone.classList.remove('janus7-drop-hover');

      const spec = this._linkSpecForDomain(this._domain);
      if (!spec) return;

      try {
        const seed = this._activeRecordData() ?? this._defaultRecord(this._domain);
        const record = this._extractEditedRecord(element, this._domain, seed);
        const janusId = String(record?.id ?? '').trim();
        if (!janusId) throw new Error('Datensatz hat keine id.');

        const uuid = this._readDroppedUuid(event);
        if (!uuid) throw new Error('Keine UUID in den Drop-Daten gefunden.');

        const doc = await fromUuid(uuid).catch(() => null);
        if (!doc) throw new Error(`Foundry-Dokument nicht gefunden: ${uuid}`);
        if (doc.documentName !== spec.documentName) {
          throw new Error(`Erwartet ${spec.documentName}, erhalten: ${doc.documentName}`);
        }

        await this._getSync().linkEntity(janusId, doc.uuid, { type: spec.bucket, saveState: true });
        const linkedRecord = this._setFoundryUuid(record, spec, doc.uuid);
        await this._persistRecord(linkedRecord);
        ui.notifications?.info?.(`Verknüpft: ${janusId} -> ${doc.name}`);
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Verknüpfung fehlgeschlagen: ${err?.message ?? err}`);
        this._getEngine()?.recordError?.('ui.studio', 'link_drop', err);
      }
    });

    element.querySelector('[data-j7="open-link"]')?.addEventListener('click', async () => {
      const spec = this._linkSpecForDomain(this._domain);
      const record = this._activeRecordData();
      if (!spec || !record?.id) return;
      const uuid = this._getSync().resolveUUID(record.id, record, spec.bucket);
      if (!uuid) return;
      const doc = await fromUuid(uuid).catch(() => null);
      doc?.sheet?.render?.(true);
    });

    element.querySelector('[data-j7="unlink-link"]')?.addEventListener('click', async () => {
      const spec = this._linkSpecForDomain(this._domain);
      if (!spec) return;

      try {
        const seed = this._activeRecordData() ?? this._defaultRecord(this._domain);
        const record = this._extractEditedRecord(element, this._domain, seed);
        const janusId = String(record?.id ?? '').trim();
        if (!janusId) throw new Error('Datensatz hat keine id.');

        await this._getSync().unlinkEntity(janusId, { type: spec.bucket, saveState: true });
        const unlinkedRecord = this._setFoundryUuid(record, spec, null);
        await this._persistRecord(unlinkedRecord);
        ui.notifications?.info?.(`Verknüpfung entfernt: ${janusId}`);
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Entfernen fehlgeschlagen: ${err?.message ?? err}`);
        this._getEngine()?.recordError?.('ui.studio', 'unlink_record', err);
      }
    });
  }
}

export default JanusAcademyDataStudioApp;
