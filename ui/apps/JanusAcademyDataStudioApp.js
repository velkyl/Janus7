/**
 * @file ui/apps/JanusAcademyDataStudioApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Academy Data Studio (MVP)
 *
 * Goal:
 * - Edit academy dataset records inside Foundry (without touching module JSON).
 * - SSOT is structured JSON stored in JournalEntry flags.
 * - Journal text is regenerated from JSON (view only).
 */

import { MODULE_ID } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';

const DOMAINS = [
  { id: 'lesson',   label: 'Lessons / Unterricht', icon: 'fa-book' },
  { id: 'spellCurriculum', label: 'Lehrpläne (Zauber)',    icon: 'fa-diagram-project' },
  { id: 'spellsIndex',      label: 'Zauberindex',          icon: 'fa-wand-magic-sparkles' },
  { id: 'library-item',     label: 'Bibliothek',           icon: 'fa-book-open' },
  { id: 'npc',      label: 'NSCs',                  icon: 'fa-users' },
  { id: 'location', label: 'Orte',                  icon: 'fa-map-marker-alt' },
  { id: 'event',    label: 'Events',                icon: 'fa-bolt' },
  { id: 'calendar', label: 'Kalender',              icon: 'fa-calendar' },
];

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
  }

  _getDocs(domainId) {
    const dt = String(domainId ?? '').trim();
    const docs = (game?.journal?.contents ?? []).filter(j => {
      const f = j?.flags?.[MODULE_ID] ?? null;
      return !!(f?.managed && String(f.dataType ?? '') === dt && f.data && typeof f.data === 'object');
    });

    // stable sort
    docs.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')));

    const q = String(this._filter ?? '').trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => String(d?.name ?? '').toLowerCase().includes(q) || String(d?.flags?.[MODULE_ID]?.janusId ?? '').toLowerCase().includes(q));
  }

  _selectedDoc() {
    if (!this._selectedUuid) return null;
    return (game?.journal?.contents ?? []).find(j => j.uuid === this._selectedUuid) ?? null;
  }


  _dataApi() {
    return game?.janus7?.academy?.data ?? null;
  }

  _supportsForm(domainId) {
    return ['lesson', 'npc', 'location', 'event'].includes(String(domainId ?? ''));
  }

  _defaultRecord(domainId) {
    const idBase = `custom_${Date.now()}`;
    switch (String(domainId ?? '')) {
      case 'lesson':
        return { id: idBase, name: 'Neue Lektion', subject: '', teacherNpcId: '', durationSlots: 1, summary: '' };
      case 'npc':
        return { id: idBase, name: 'Neuer NSC', role: '', tags: [], profile: { subtitle: '', roleText: '', sections: { Aussehen: '', Persönlichkeit: '' } } };
      case 'location':
        return { id: idBase, name: 'Neuer Ort', type: '', zone: '', summary: '' };
      case 'event':
        return { id: idBase, name: 'Neues Event', type: '', summary: '' };
      case 'calendar':
        return { id: 'calendar', name: 'Kalender', meta: { schemaVersion: '1.0' }, entries: [] };
      default:
        return { id: idBase, name: 'Neuer Datensatz' };
    }
  }

  _activeRecordData() {
    const sel = this._selectedDoc();
    if (sel) return foundry.utils.deepClone(sel?.flags?.[MODULE_ID]?.data ?? {});
    if (this._draft) return foundry.utils.deepClone(this._draft);
    return null;
  }

  _renderForm(domainId, record = {}) {
    const esc = (v) => this._escape(v ?? '');
    const row = (label, name, value, type = 'text') => `
      <label class="j7-data-studio__field"><span>${label}</span><input data-j7-form="${name}" type="${type}" value="${esc(value)}" class="janus7-textarea j7-data-studio__input" /></label>`;
    const textareaRow = (label, name, value) => `
      <label class="j7-data-studio__field j7-data-studio__field--wide"><span>${label}</span><textarea data-j7-form="${name}" class="janus7-textarea j7-data-studio__input">${esc(value)}</textarea></label>`;

    if (domainId === 'lesson') {
      return `<div class="j7-data-studio__form">${row('ID', 'id', record.id)}${row('Name', 'name', record.name)}${row('Fach', 'subject', record.subject)}${row('Dozent (NPC-ID)', 'teacherNpcId', record.teacherNpcId)}${row('Dauer Slots', 'durationSlots', record.durationSlots ?? 1, 'number')}${textareaRow('Zusammenfassung', 'summary', record.summary)}</div>`;
    }
    if (domainId === 'npc') {
      return `<div class="j7-data-studio__form">${row('ID', 'id', record.id)}${row('Name', 'name', record.name)}${row('Rolle', 'role', record.role)}${row('Untertitel', 'profile.subtitle', record?.profile?.subtitle ?? '')}<label class="j7-data-studio__field"><span>Rollentext</span><textarea data-j7-form="profile.roleText" class="janus7-textarea j7-data-studio__input">${esc(record?.profile?.roleText ?? '')}</textarea></label><label class="j7-data-studio__field"><span>Aussehen</span><textarea data-j7-form="profile.sections.Aussehen" class="janus7-textarea j7-data-studio__input">${esc(record?.profile?.sections?.Aussehen ?? '')}</textarea></label><label class="j7-data-studio__field"><span>Persönlichkeit</span><textarea data-j7-form="profile.sections.Persönlichkeit" class="janus7-textarea j7-data-studio__input">${esc(record?.profile?.sections?.Persönlichkeit ?? '')}</textarea></label></div>`;
    }
    if (domainId === 'location') {
      return `<div class="j7-data-studio__form">${row('ID', 'id', record.id)}${row('Name', 'name', record.name)}${row('Typ', 'type', record.type)}${row('Zone', 'zone', record.zone)}${textareaRow('Zusammenfassung', 'summary', record.summary)}</div>`;
    }
    if (domainId === 'event') {
      return `<div class="j7-data-studio__form">${row('ID', 'id', record.id)}${row('Name', 'name', record.name)}${row('Typ', 'type', record.type)}${textareaRow('Zusammenfassung', 'summary', record.summary)}</div>`;
    }
    return `<div class="j7-data-studio__empty"><p><strong>Formularmodus noch nicht verfügbar.</strong></p><p>Für ${this._escape(domainId)} steht aktuell der JSON-/Expertenmodus bereit.</p></div>`;
  }

  _collectFormData(root, seed = {}) {
    const clone = foundry.utils.deepClone(seed ?? {});
    const setNested = (obj, path, value) => {
      const parts = String(path).split('.');
      let cur = obj;
      while (parts.length > 1) {
        const key = parts.shift();
        cur[key] = cur[key] && typeof cur[key] === 'object' ? cur[key] : {};
        cur = cur[key];
      }
      cur[parts[0]] = value;
    };
    root.querySelectorAll('[data-j7-form]').forEach((field) => {
      const key = field.dataset.j7Form;
      let value = field.value;
      if (field.type === 'number') value = Number(value || 0);
      setNested(clone, key, value);
    });
    return clone;
  }


  async _renderHTML(_context, _options) {
    const root = document.createElement('div');
    root.className = 'janus7-app janus7-page j7-data-studio';

    if (!game?.user?.isGM) {
      root.innerHTML = `<div class="j7-data-studio__empty"><strong>GM only.</strong> Nur der GM kann den Data Studio verwenden.</div>`;
      return root;
    }

    const domain = DOMAINS.find(d => d.id === this._domain) ?? DOMAINS[0];
    const docs = this._getDocs(domain.id);
    const sel = this._selectedDoc();

    // left
    const left = document.createElement('div');
    left.className = 'j7-data-studio__panel j7-data-studio__panel--list';

    const domainOptions = DOMAINS.map(d => `<option value="${d.id}" ${d.id===domain.id?'selected':''}>${d.label}</option>`).join('');

    left.innerHTML = `
      <div class="j7-data-studio__row">
        <i class="fas ${domain.icon}"></i>
        <select data-j7="domain" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact">${domainOptions}</select>
        <select data-j7="mode" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact">
          <option value="form" ${this._editorMode==='form'?'selected':''}>Formular</option>
          <option value="json" ${this._editorMode==='json'?'selected':''}>JSON</option>
        </select>
      </div>
      <div class="j7-data-studio__row">
        <input data-j7="filter" type="text" aria-label="Filter records" placeholder="Filter (Name/ID)" value="${this._escape(this._filter)}" class="janus7-textarea j7-data-studio__input j7-data-studio__input--compact" />
        <button data-j7="new" class="j7-btn" title="Neuen Datensatz anlegen" aria-label="Neuen Datensatz anlegen"><i class="fas fa-plus"></i></button>
        <button data-j7="seed" class="j7-btn" title="Seed Import (merge)" aria-label="Seed Import (merge)"><i class="fas fa-seedling"></i></button>
      </div>
      <div class="j7-data-studio__meta">
        <span>Records: <strong>${docs.length}</strong></span>
        <span>SSOT: flags.data</span>
      </div>
      <div data-j7="list" class="j7-data-studio__list"></div>
    `;

    const list = left.querySelector('[data-j7="list"]');
    for (const d of docs) {
      const f = d.flags?.[MODULE_ID] ?? {};
      const isSel = d.uuid === this._selectedUuid;
      const btn = document.createElement('button');
      btn.className = 'j7-btn';
      btn.type = 'button';
      btn.dataset.uuid = d.uuid;
      btn.className = `j7-btn j7-data-studio__record${isSel ? ' is-selected' : ''}`;
      btn.innerHTML = `
        <div class="j7-data-studio__title">${this._escape(d.name)}</div>
        <div class="j7-data-studio__subtitle"><code>${this._escape(f.janusId ?? '')}</code></div>
      `;
      list.appendChild(btn);
    }

    // right
    const right = document.createElement('div');
    right.className = 'j7-data-studio__panel j7-data-studio__panel--detail';

    const activeData = this._activeRecordData();
    if (!activeData) {
      right.innerHTML = `
        <div class="j7-data-studio__empty">
          <p><strong>Kein Record ausgewählt.</strong></p>
          <p>Nutze links <i class="fas fa-plus"></i> für einen neuen Datensatz oder <i class="fas fa-seedling"></i> für den Startimport.</p>
          <p class="j7-data-studio__hint">Hinweis: Nur Records mit <code>flags.${MODULE_ID}.managed=true</code> und <code>dataType</code> werden hier angezeigt.</p>
        </div>`;
    } else {
      const f = sel?.flags?.[MODULE_ID] ?? { janusId: activeData?.id ?? '', dataType: domain.id };
      const json = JSON.stringify(activeData ?? {}, null, 2);
      const editorHtml = (this._editorMode === 'form' && this._supportsForm(domain.id))
        ? this._renderForm(domain.id, activeData)
        : `<textarea data-j7="json" spellcheck="false" class="janus7-textarea j7-data-studio__json">${this._escape(json)}</textarea>`;
      right.innerHTML = `
        <div class="j7-data-studio__row j7-data-studio__row--spread">
          <div>
            <div class="j7-data-studio__title j7-data-studio__title--lg">${this._escape(sel?.name ?? activeData?.name ?? 'Neuer Datensatz')}</div>
            <div class="j7-data-studio__subtitle">ID: <code>${this._escape(f.janusId ?? activeData?.id ?? '')}</code> · Type: <code>${this._escape(f.dataType ?? domain.id)}</code></div>
          </div>
          <div class="j7-data-studio__row">
            ${sel ? `<button data-j7="open" class="j7-btn"><i class="fas fa-book-open"></i> Open Journal</button>` : ''}
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
                <li>Schreiben läuft API-first über <code>academy/data-api.js</code>.</li>
                <li>SSOT bleibt <code>flags.${MODULE_ID}.data</code>.</li>
                <li>Journal-Text wird als View neu gerendert.</li>
                <li>AcademyDataApi Cache wird nach Save neu geladen.</li>
              </ul>
              <p class="j7-data-studio__hint">Formularmodus ist aktuell für Lessons, NSCs, Orte und Events ausgebaut. Andere Domänen bleiben vorerst im JSON-Modus.</p>
            </div>
          </div>
        </div>
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
    const el = this.domElement;
    if (!el) return;

    // Domain change
    el.querySelector('[data-j7="domain"]')?.addEventListener('change', (ev) => {
      this._domain = String(ev.target.value);
      this._selectedUuid = null;
      this.refresh?.();
    });

    el.querySelector('[data-j7="mode"]')?.addEventListener('change', (ev) => {
      this._editorMode = String(ev.target.value || 'json');
      this.refresh?.();
    });

    // Filter
    el.querySelector('[data-j7="filter"]')?.addEventListener('input', (ev) => {
      this._filter = String(ev.target.value ?? '');
      this.refresh?.(false);
    });

    el.querySelector('[data-j7="new"]')?.addEventListener('click', () => {
      this._selectedUuid = null;
      this._draft = this._defaultRecord(this._domain);
      this.refresh?.();
    });

    // Seed import (merge)
    el.querySelector('[data-j7="seed"]')?.addEventListener('click', async () => {
      try {
        const { seedImportAcademyToJournals } = await import('../../academy/world-seed.js');
        const report = await seedImportAcademyToJournals({ mode: 'merge' });
        ui.notifications?.info?.(`Seed Import: created=${report.created} updated=${report.updated} skipped=${report.skipped}`);
        // Reset cache so UI/engine sees new data
        try { game?.janus7?.academy?.data?.constructor?.resetCache?.(); } catch {}
        try { await game?.janus7?.academy?.data?.init?.(); } catch {}
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Seed Import failed: ${err?.message ?? err}`);
        this._getLogger().error?.('[DataStudio] Seed import failed', err);
      }
    });

    // Select record
    el.querySelectorAll('button[data-uuid]')?.forEach(btn => {
      btn.addEventListener('click', () => {
        this._selectedUuid = btn.dataset.uuid;
        this._draft = null;
        this.refresh?.();
      });
    });

    // Open journal
    el.querySelector('[data-j7="open"]')?.addEventListener('click', async () => {
      const sel = this._selectedDoc();
      if (!sel) return;
      try { sel.sheet?.render?.(true); } catch {}
    });

    // Save
    el.querySelector('[data-j7="save"]')?.addEventListener('click', async () => {
      const sel = this._selectedDoc();
      if (!sel) return;
      const f = sel.flags?.[MODULE_ID] ?? {};
      const ta = el.querySelector('[data-j7="json"]');
      const raw = String(ta?.value ?? '').trim();

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') throw new Error('JSON must be an object');
        if (parsed.id && f.janusId && String(parsed.id) !== String(f.janusId)) {
          throw new Error(`id mismatch: JSON.id=${parsed.id} vs janusId=${f.janusId}`);
        }

        const nextFlags = {
          ...f,
          data: parsed,
          syncedAt: new Date().toISOString(),
          source: { ...(f.source ?? {}), kind: 'world-edit' },
        };

        // Regenerate journal page content
        const { renderAcademyRecord } = await import('../../academy/world-seed.js');
        const html = renderAcademyRecord(f.kind ?? f.dataType, parsed);

        await sel.update({ flags: { ...sel.flags, [MODULE_ID]: nextFlags } });
        try {
          const p0 = sel.pages?.contents?.[0] ?? sel.pages?.[0] ?? null;
          if (p0?.id) {
            await sel.updateEmbeddedDocuments('JournalEntryPage', [{ _id: p0.id, text: { content: html, format: 1 } }]);
          }
        } catch (e) {
          this._getLogger().warn?.('[DataStudio] Page update failed (non-fatal)', e);
        }

        // Reset cache so engine sees it
        try { game?.janus7?.academy?.data?.constructor?.resetCache?.(); } catch {}
        try { await game?.janus7?.academy?.data?.init?.(); } catch {}

        ui.notifications?.info?.('Saved.');
        this.refresh?.();
      } catch (err) {
        ui.notifications?.error?.(`Save failed: ${err?.message ?? err}`);
      }
    });
  }
}

export default JanusAcademyDataStudioApp;
