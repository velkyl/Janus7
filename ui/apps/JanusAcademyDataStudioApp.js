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
    if (!this._syncEngine) {
      const logger = game?.janus7?.core?.logger ?? console;
      this._syncEngine = new JanusSyncEngine({ logger });
    }
    return this._syncEngine;
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
    const { upsertManagedAcademyRecord, upsertManagedAcademyItemRecord } = await import('../../academy/world-seed.js');
    await upsertManagedAcademyRecord({ domainId: this._domain, record, mode: 'overwrite' });
    await upsertManagedAcademyItemRecord({ domainId: this._domain, record, mode: 'overwrite' });

    try { game?.janus7?.academy?.data?.constructor?.resetCache?.(); } catch {}
    try { await game?.janus7?.academy?.data?.init?.(); } catch {}

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
    const esc = (value) => this._escape(value ?? '');
    const row = (label, name, value, type = 'text') => `
      <label class="j7-data-studio__field"><span>${label}</span><input data-j7-form="${name}" type="${type}" value="${esc(value)}" class="janus7-textarea j7-data-studio__input" /></label>`;
    const textareaRow = (label, name, value) => `
      <label class="j7-data-studio__field j7-data-studio__field--wide"><span>${label}</span><textarea data-j7-form="${name}" class="janus7-textarea j7-data-studio__input">${esc(value)}</textarea></label>`;

    if (domainId === 'lesson') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id)}
        ${row('Name', 'name', record.name)}
        ${row('Fach', 'subject', record.subject)}
        ${row('Dozent (NPC-ID)', 'teacherNpcId', record.teacherNpcId)}
        ${row('Dauer Slots', 'durationSlots', record.durationSlots ?? 1, 'number')}
        ${textareaRow('Zusammenfassung', 'summary', record.summary)}
      </div>`;
    }

    if (domainId === 'npc') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id)}
        ${row('Name', 'name', record.name)}
        ${row('Rolle', 'role', record.role)}
        ${row('Tags (CSV)', 'tagsCsv', Array.isArray(record?.tags) ? record.tags.join(', ') : '')}
        ${row('Untertitel', 'profile.subtitle', record?.profile?.subtitle ?? '')}
        ${textareaRow('Rollentext', 'profile.roleText', record?.profile?.roleText ?? '')}
        ${textareaRow('Aussehen', 'profile.sections.Aussehen', record?.profile?.sections?.Aussehen ?? '')}
        ${textareaRow('Persönlichkeit', 'profile.sections.Persönlichkeit', record?.profile?.sections?.Persönlichkeit ?? '')}
      </div>`;
    }

    if (domainId === 'location') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id)}
        ${row('Name', 'name', record.name)}
        ${row('Typ', 'type', record.type)}
        ${row('Zone', 'zone', record.zone)}
        ${textareaRow('Zusammenfassung', 'summary', record.summary)}
      </div>`;
    }

    if (domainId === 'event') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id)}
        ${row('Name', 'name', record.name)}
        ${row('Typ', 'type', record.type)}
        ${textareaRow('Zusammenfassung', 'summary', record.summary)}
      </div>`;
    }

    if (domainId === 'library-item') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id)}
        ${row('Titel', 'title', record.title ?? record.name ?? '')}
        ${row('Typ', 'type', record.type ?? '')}
        ${row('Tags (CSV)', 'tagsCsv', Array.isArray(record?.tags) ? record.tags.join(', ') : '')}
        ${textareaRow('Zusammenfassung', 'summary', record.summary ?? '')}
        ${textareaRow('Knowledge Hooks (JSON)', 'knowledgeHooksJson', JSON.stringify(record?.knowledgeHooks ?? [], null, 2))}
      </div>`;
    }

    if (domainId === 'spellCurriculum') {
      const payload = foundry.utils.deepClone(record ?? {});
      delete payload.id;
      delete payload.name;
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id ?? 'ACADEMY_SPELL_CURRICULUM')}
        ${row('Name', 'name', record.name ?? 'Zauber-Lehrplan')}
        ${textareaRow('Inhalt (JSON ohne id/name)', 'payloadJson', JSON.stringify(payload, null, 2))}
      </div>`;
    }

    if (domainId === 'spellsIndex') {
      const payload = foundry.utils.deepClone(record ?? {});
      delete payload.id;
      delete payload.name;
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id ?? 'ACADEMY_SPELLS_INDEX')}
        ${row('Name', 'name', record.name ?? 'Zauberindex')}
        ${textareaRow('Inhalt (JSON ohne id/name)', 'payloadJson', JSON.stringify(payload, null, 2))}
      </div>`;
    }

    if (domainId === 'calendar') {
      return `<div class="j7-data-studio__form">
        ${row('ID', 'id', record.id ?? 'ACADEMY_CALENDAR')}
        ${row('Name', 'name', record.name ?? 'Kalender (Academy)')}
        ${textareaRow('Meta (JSON)', 'metaJson', JSON.stringify(record?.meta ?? {}, null, 2))}
        ${textareaRow('Entries (JSON)', 'entriesJson', JSON.stringify(record?.entries ?? [], null, 2))}
      </div>`;
    }

    return `<div class="j7-data-studio__empty"><p><strong>Formularmodus noch nicht verfügbar.</strong></p></div>`;
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
    const root = document.createElement('div');
    root.className = 'janus7-app janus7-page j7-data-studio';

    if (!game?.user?.isGM) {
      root.innerHTML = `<div class="j7-data-studio__empty"><strong>GM only.</strong> Nur der GM kann den Data Studio verwenden.</div>`;
      return root;
    }

    const domain = DOMAINS.find((entry) => entry.id === this._domain) ?? DOMAINS[0];
    const docs = this._getDocs(domain.id);
    const selected = this._selectedDoc();
    const activeData = this._activeRecordData();
    const linkSpec = this._linkSpecForDomain(domain.id);
    const linkedUuid = linkSpec && activeData?.id ? this._getSync().resolveUUID(activeData.id, activeData, linkSpec.bucket) : null;
    const linkedDoc = linkedUuid ? await fromUuid(linkedUuid).catch(() => null) : null;

    const left = document.createElement('div');
    left.className = 'j7-data-studio__panel j7-data-studio__panel--list';

    const domainOptions = DOMAINS.map((entry) => `<option value="${entry.id}" ${entry.id === domain.id ? 'selected' : ''}>${entry.label}</option>`).join('');
    left.innerHTML = `
      <div class="j7-data-studio__row">
        <i class="fas ${domain.icon}"></i>
        <select data-j7="domain" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact">${domainOptions}</select>
        <select data-j7="mode" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact">
          <option value="form" ${this._editorMode === 'form' ? 'selected' : ''}>Formular</option>
          <option value="json" ${this._editorMode === 'json' ? 'selected' : ''}>JSON</option>
        </select>
      </div>
      <div class="j7-data-studio__row">
        <input data-j7="filter" type="text" aria-label="Filter records" placeholder="Filter (Name/ID)" value="${this._escape(this._filter)}" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact" />
        <button data-j7="new" class="j7-btn" title="Neuen Datensatz anlegen" aria-label="Neuen Datensatz anlegen"><i class="fas fa-plus"></i></button>
        <button data-j7="seed" class="j7-btn" title="Seed Import (Journals + Items)" aria-label="Seed Import (Journals + Items)"><i class="fas fa-seedling"></i></button>
      </div>
      <div class="j7-data-studio__meta">
        <span>Managed Records: <strong>${docs.length}</strong></span>
        <span>SSOT: <code>flags.${MODULE_ID}.data</code></span>
      </div>
      <div data-j7="list" class="j7-data-studio__list"></div>
    `;

    const list = left.querySelector('[data-j7="list"]');
    for (const doc of docs) {
      const flags = this._moduleFlags(doc);
      const isSelected = doc.uuid === this._selectedUuid;
      const badge = doc?.documentName === 'Item' ? 'Item' : 'Journal';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.uuid = doc.uuid;
      button.className = `j7-btn j7-data-studio__record${isSelected ? ' is-selected' : ''}`;
      button.innerHTML = `
        <div class="j7-data-studio__title">${this._escape(doc.name)}</div>
        <div class="j7-data-studio__subtitle"><code>${this._escape(flags?.janusId ?? '')}</code> · ${this._escape(badge)}</div>
      `;
      list.appendChild(button);
    }

    const right = document.createElement('div');
    right.className = 'j7-data-studio__panel j7-data-studio__panel--detail';

    if (!activeData) {
      right.innerHTML = `
        <div class="j7-data-studio__empty">
          <p><strong>Kein Record ausgewählt.</strong></p>
          <p>Links über <i class="fas fa-plus"></i> einen Draft anlegen oder über <i class="fas fa-seedling"></i> die verwalteten World-Dokumente erzeugen.</p>
          <p class="j7-data-studio__hint">Angezeigt werden verwaltete Journals und Items mit <code>flags.${MODULE_ID}.managed=true</code> und <code>dataType</code>. Items werden bevorzugt.</p>
        </div>`;
    } else {
      const flags = this._moduleFlags(selected) ?? { janusId: activeData?.id ?? '', dataType: domain.id };
      const editorHtml = (this._editorMode === 'form' && this._supportsForm(domain.id))
        ? this._renderForm(domain.id, activeData)
        : `<textarea data-j7="json" spellcheck="false" class="janus7-textarea j7-data-studio__json">${this._escape(JSON.stringify(activeData ?? {}, null, 2))}</textarea>`;
      const docLabel = selected?.documentName === 'Item' ? 'Item' : (selected?.documentName === 'JournalEntry' ? 'Journal' : 'Draft');
      const linkHtml = linkSpec ? `
            <div class="j7-data-studio__section-label">Foundry-Verknüpfung</div>
            <div class="j7-data-studio__notes">
              <p><strong>Ziel:</strong> ${this._escape(linkSpec.label)}</p>
              <p><strong>Status:</strong> ${linkedDoc ? 'verknüpft' : (linkedUuid ? 'UUID vorhanden, Dokument fehlt' : 'nicht verknüpft')}</p>
              <p><strong>UUID:</strong> <code>${this._escape(linkedUuid ?? '—')}</code></p>
              <p><strong>Dokument:</strong> ${this._escape(linkedDoc?.name ?? '—')}</p>
              <div data-j7="link-dropzone" class="j7-data-studio__empty" style="min-height:96px; border-style:dashed;">
                <p><strong>${this._escape(linkSpec.label)} hier ablegen</strong></p>
                <p class="j7-data-studio__hint">Drag & Drop aus der Foundry-Sidebar. Die Verknüpfung läuft über denselben Sync-Pfad wie die automatische Synchronisierung.</p>
              </div>
              <div class="j7-data-studio__row">
                ${linkedDoc ? `<button data-j7="open-link" class="j7-btn"><i class="fas fa-up-right-from-square"></i> ${this._escape(linkSpec.label)} öffnen</button>` : ''}
                ${linkedUuid ? `<button data-j7="unlink-link" class="j7-btn"><i class="fas fa-link-slash"></i> Verknüpfung lösen</button>` : ''}
              </div>
            </div>
      ` : '';

      right.innerHTML = `
        <div class="j7-data-studio__row j7-data-studio__row--spread">
          <div>
            <div class="j7-data-studio__title j7-data-studio__title--lg">${this._escape(this._displayName(activeData))}</div>
            <div class="j7-data-studio__subtitle">ID: <code>${this._escape(flags?.janusId ?? activeData?.id ?? '')}</code> · Type: <code>${this._escape(flags?.dataType ?? domain.id)}</code> · Doc: <code>${this._escape(docLabel)}</code></div>
          </div>
          <div class="j7-data-studio__row">
            ${selected ? `<button data-j7="open" class="j7-btn"><i class="fas fa-up-right-from-square"></i> Open ${this._escape(docLabel)}</button>` : ''}
            <button data-j7="save" class="j7-btn"><i class="fas fa-save"></i> Save</button>
          </div>
        </div>
        <div class="j7-data-studio__split">
          <div class="j7-data-studio__column">
            <div class="j7-data-studio__section-label">${this._editorMode === 'form' ? 'Formularmodus' : 'JSON / Expertenmodus'}</div>
            ${editorHtml}
          </div>
          <div class="j7-data-studio__column">
            <div class="j7-data-studio__section-label">Hinweise</div>
            <div class="j7-data-studio__notes">
              <p><strong>Regeln:</strong></p>
              <ul>
                <li>Speichern erzeugt bzw. aktualisiert Journal und Item gemeinsam.</li>
                <li>Items sind der bevorzugte Edit-Container im Studio.</li>
                <li>SSOT bleibt <code>flags.${MODULE_ID}.data</code>.</li>
                <li>AcademyDataApi Cache wird nach Save/Seed neu geladen.</li>
              </ul>
              <p class="j7-data-studio__hint">Bei komplexen Domänen mischt der Formmodus normale Felder mit gezielten JSON-Feldern für verschachtelte Strukturen, damit nicht alles im reinen Roh-JSON landen muss.</p>
            </div>
          </div>
        </div>
        ${linkHtml}
      `;
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
        try { game?.janus7?.academy?.data?.constructor?.resetCache?.(); } catch {}
        try { await game?.janus7?.academy?.data?.init?.(); } catch {}
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Seed Import failed: ${err?.message ?? err}`);
        this._getLogger().error?.('[DataStudio] Seed import failed', err);
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
        this._getLogger().error?.('[DataStudio] Save failed', err);
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
        this._getLogger().error?.('[DataStudio] Link drop failed', err);
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
        this._getLogger().error?.('[DataStudio] Unlink failed', err);
      }
    });
  }
}

export default JanusAcademyDataStudioApp;
